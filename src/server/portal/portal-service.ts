import { PortalMessageAuthor } from "@prisma/client";

import { db } from "@/lib/db";
import { appendTimelineEvent } from "@/server/timeline/timeline-service";

import { namesMatchCustomer } from "./portal-name-match";

const MESSAGE_MAX = 4000;
const IMAGE_MAX_BYTES = 600_000;
const ALLOWED_IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

function dec(n: { toString(): string }) {
  return n.toString();
}

export async function findOrderForPortalLogin(orderNumber: string) {
  return db.order.findFirst({
    where: { orderNumber: { equals: orderNumber.trim(), mode: "insensitive" } },
    include: { customer: true },
  });
}

export async function assertPortalCredentials(
  firstName: string,
  lastName: string,
  orderNumber: string,
) {
  const order = await findOrderForPortalLogin(orderNumber);
  if (!order || !namesMatchCustomer(firstName, lastName, order.customer.fullName)) {
    throw new Error("We could not verify those details. Check your first name, last name, and order number.");
  }
  return order;
}

export async function loadPortalOrderBundle(orderId: string) {
  const [order, messages, photos, timeline] = await Promise.all([
    db.order.findUniqueOrThrow({
      where: { id: orderId },
      include: {
        customer: { select: { fullName: true } },
        items: { orderBy: { sortOrder: "asc" } },
        productionJobs: true,
        deliveries: true,
      },
    }),
    db.orderPortalMessage.findMany({
      where: { orderId },
      orderBy: { createdAt: "asc" },
      include: { staffUser: { select: { name: true } } },
    }),
    db.orderProgressPhoto.findMany({
      where: { orderId, visibleToClient: true },
      orderBy: { createdAt: "desc" },
      select: { id: true, caption: true, mimeType: true, imageBase64: true, createdAt: true },
    }),
    db.activityLog.findMany({
      where: { entityType: "order", entityId: orderId },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
  ]);

  return {
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      productionStatus: order.productionStatus,
      paymentStatus: order.paymentStatus,
      deliveryStatus: order.deliveryStatus,
      dueDate: order.dueDate?.toISOString() ?? null,
      subtotal: dec(order.subtotal),
      tax: dec(order.tax),
      discount: dec(order.discount),
      total: dec(order.total),
      balanceDue: dec(order.balanceDue),
      notes: order.notes,
      customerName: order.customer.fullName,
      items: order.items.map((i) => ({
        id: i.id,
        itemName: i.itemName,
        quantity: i.quantity,
        lineTotal: dec(i.lineTotal),
      })),
      productionJobs: order.productionJobs.map((j) => ({
        id: j.id,
        status: j.status,
        machineName: j.machineName,
      })),
      deliveries: order.deliveries.map((d) => ({
        id: d.id,
        type: d.type,
        status: d.status,
        scheduledAt: d.scheduledAt?.toISOString() ?? null,
      })),
    },
    messages: messages.map((m) => ({
      id: m.id,
      body: m.body,
      author: m.author,
      staffName: m.staffUser?.name ?? null,
      createdAt: m.createdAt.toISOString(),
    })),
    photos: photos.map((p) => ({
      id: p.id,
      caption: p.caption,
      mimeType: p.mimeType,
      dataUrl: `data:${p.mimeType};base64,${p.imageBase64}`,
      createdAt: p.createdAt.toISOString(),
    })),
    timeline: timeline.map((t) => ({
      id: t.id,
      action: t.action,
      createdAt: t.createdAt.toISOString(),
    })),
  };
}

export async function createPortalClientMessage(orderId: string, body: string) {
  const trimmed = body.trim();
  if (!trimmed || trimmed.length > MESSAGE_MAX) {
    throw new Error(`Message must be 1–${MESSAGE_MAX} characters.`);
  }
  const msg = await db.orderPortalMessage.create({
    data: {
      orderId,
      body: trimmed,
      author: PortalMessageAuthor.CLIENT,
    },
  });
  await appendTimelineEvent({
    entityType: "order",
    entityId: orderId,
    action: "portal.client_message",
    payload: { messageId: msg.id },
  });
  return msg;
}

export async function createPortalStaffMessage(orderId: string, staffUserId: string, body: string) {
  const trimmed = body.trim();
  if (!trimmed || trimmed.length > MESSAGE_MAX) {
    throw new Error(`Message must be 1–${MESSAGE_MAX} characters.`);
  }
  const msg = await db.orderPortalMessage.create({
    data: {
      orderId,
      body: trimmed,
      author: PortalMessageAuthor.STAFF,
      staffUserId,
    },
  });
  await appendTimelineEvent({
    entityType: "order",
    entityId: orderId,
    actorUserId: staffUserId,
    action: "portal.staff_message",
    payload: { messageId: msg.id },
  });
  return msg;
}

export async function createPortalStaffPhoto(
  orderId: string,
  staffUserId: string,
  input: { mimeType: string; imageBase64: string; caption?: string | null; visibleToClient?: boolean },
) {
  const mime = input.mimeType.trim().toLowerCase();
  if (!ALLOWED_IMAGE_MIMES.has(mime)) {
    throw new Error("Only JPEG, PNG, or WebP images are allowed.");
  }
  const raw = input.imageBase64.replace(/\s/g, "");
  let sizeBytes: number;
  try {
    sizeBytes = Buffer.from(raw, "base64").length;
  } catch {
    throw new Error("Invalid image data.");
  }
  if (sizeBytes > IMAGE_MAX_BYTES) {
    throw new Error(`Image too large (max ${IMAGE_MAX_BYTES / 1000}KB).`);
  }
  const photo = await db.orderProgressPhoto.create({
    data: {
      orderId,
      mimeType: mime,
      imageBase64: raw,
      caption: input.caption?.trim() || null,
      visibleToClient: input.visibleToClient !== false,
      uploadedByUserId: staffUserId,
    },
  });
  await appendTimelineEvent({
    entityType: "order",
    entityId: orderId,
    actorUserId: staffUserId,
    action: "portal.progress_photo",
    payload: { photoId: photo.id },
  });
  return photo;
}

export async function loadStaffPortalFeed(orderId: string) {
  const [messages, photos] = await Promise.all([
    db.orderPortalMessage.findMany({
      where: { orderId },
      orderBy: { createdAt: "asc" },
      include: { staffUser: { select: { name: true, email: true } } },
    }),
    db.orderProgressPhoto.findMany({
      where: { orderId },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return {
    messages: messages.map((m) => ({
      id: m.id,
      body: m.body,
      author: m.author,
      staffName: m.staffUser?.name ?? null,
      createdAt: m.createdAt.toISOString(),
    })),
    photos: photos.map((p) => ({
      id: p.id,
      caption: p.caption,
      mimeType: p.mimeType,
      visibleToClient: p.visibleToClient,
      dataUrl: `data:${p.mimeType};base64,${p.imageBase64}`,
      createdAt: p.createdAt.toISOString(),
    })),
  };
}
