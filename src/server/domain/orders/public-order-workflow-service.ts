import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { toPrismaJsonOptional } from "@/lib/prisma-json";
import { createAuditLog } from "@/server/audit/audit-service";
import { createPublicOrderEditToken, verifyPublicOrderEditToken } from "@/server/public-order-edit-token";
import { appendTimelineEvent } from "@/server/timeline/timeline-service";

type PublicOrderCustomerInput = {
  fullName: string;
  phone?: string;
  email?: string;
  preferredContactChannel?: string;
  defaultAddress?: string;
  notes?: string;
};

type PublicOrderItemInput = {
  itemName: string;
  quantity: number;
  unitPrice: number;
  materialType?: string;
  color?: string;
  printSpec?: Record<string, unknown>;
};

type PublicOrderSubmitInput = {
  customer: PublicOrderCustomerInput;
  dueDate?: Date;
  notes?: string;
  tax: number;
  discount: number;
  items: PublicOrderItemInput[];
};

type RequestMeta = {
  requestId?: string;
  ipAddress?: string;
};

export function createPublicOrderEditUrl(orderId: string, requestOrigin?: string) {
  const token = createPublicOrderEditToken(orderId);
  const origin = (env.APP_URL || requestOrigin || "").replace(/\/$/, "");
  return {
    token,
    url: `${origin}/public/order-form?token=${encodeURIComponent(token)}`,
  };
}

export async function createInquiryDraftOrder(input: {
  customerId: string;
  leadId: string;
  subject: string;
  message: string;
  budget?: number;
  dueDate?: Date;
  requestMeta?: RequestMeta;
}) {
  const draftSubtotal = Number(input.budget ?? 0);
  const draftOrder = await db.order.create({
    data: {
      customerId: input.customerId,
      leadId: input.leadId,
      orderNumber: `INQ-${new Date().getFullYear()}-${input.leadId.slice(-8).toUpperCase()}`,
      notes: [
        `Draft from inquiry: ${input.subject}`,
        input.message,
        `Budget: ${input.budget ?? "N/A"}`,
        `Due: ${input.dueDate ? input.dueDate.toISOString() : "N/A"}`,
      ].join("\n\n"),
      dueDate: input.dueDate,
      subtotal: draftSubtotal,
      tax: 0,
      discount: 0,
      total: draftSubtotal,
      balanceDue: draftSubtotal,
      items: {
        create: [
          {
            itemName: input.subject,
            quantity: 1,
            unitPrice: draftSubtotal,
            lineTotal: draftSubtotal,
            sortOrder: 0,
            printSpecJson: {
              inquiryMessage: input.message,
            },
          },
        ],
      },
    },
  });

  await appendTimelineEvent({
    entityType: "order",
    entityId: draftOrder.id,
    action: "inquiry_order_draft_created",
    payload: { leadId: input.leadId, subject: input.subject },
    requestId: input.requestMeta?.requestId,
  });

  return draftOrder;
}

export async function getPublicOrderPrefill(token: string) {
  const session = verifyPublicOrderEditToken(token);
  if (!session) {
    return null;
  }
  const order = await db.order.findUnique({
    where: { id: session.orderId },
    include: { customer: true, items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!order) {
    return null;
  }
  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    customer: {
      fullName: order.customer.fullName,
      phone: order.customer.phone ?? "",
      email: order.customer.email ?? "",
      preferredContactChannel: order.customer.preferredContactChannel ?? "",
      defaultAddress: order.customer.defaultAddress ?? "",
      notes: order.customer.notes ?? "",
    },
    order: {
      dueDate: order.dueDate ? order.dueDate.toISOString().slice(0, 10) : "",
      notes: order.notes ?? "",
      tax: Number(order.tax.toString()),
      discount: Number(order.discount.toString()),
      items: order.items.map((i) => ({
        itemName: i.itemName,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice.toString()),
        materialType: i.materialType ?? "",
        color: i.color ?? "",
        printNotes:
          i.printSpecJson && typeof i.printSpecJson === "object" && "notes" in (i.printSpecJson as object)
            ? String((i.printSpecJson as { notes?: unknown }).notes ?? "")
            : "",
      })),
    },
  };
}

export async function applyPublicOrderUpdate(input: {
  token: string;
  submit: PublicOrderSubmitInput;
  requestMeta?: RequestMeta;
}) {
  const session = verifyPublicOrderEditToken(input.token);
  if (!session) {
    return { kind: "invalid_token" } as const;
  }
  const existing = await db.order.findUnique({
    where: { id: session.orderId },
    include: { customer: true, items: true },
  });
  if (!existing) {
    return { kind: "not_found" } as const;
  }

  const subtotal = input.submit.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const total = subtotal + input.submit.tax - input.submit.discount;
  const paid = await db.payment.aggregate({
    _sum: { amount: true },
    where: { orderId: existing.id },
  });
  const balanceDue = total - Number(paid._sum.amount ?? 0);

  await db.$transaction(async (tx) => {
    await tx.customer.update({
      where: { id: existing.customerId },
      data: {
        fullName: input.submit.customer.fullName.trim(),
        phone: input.submit.customer.phone?.trim() || null,
        email: input.submit.customer.email?.trim() || null,
        preferredContactChannel: input.submit.customer.preferredContactChannel?.trim() || null,
        defaultAddress: input.submit.customer.defaultAddress?.trim() || null,
        notes: input.submit.customer.notes?.trim() || null,
      },
    });

    await tx.orderItem.deleteMany({ where: { orderId: existing.id } });
    await tx.order.update({
      where: { id: existing.id },
      data: {
        dueDate: input.submit.dueDate,
        notes: input.submit.notes?.trim() || null,
        tax: input.submit.tax,
        discount: input.submit.discount,
        subtotal,
        total,
        balanceDue,
        items: {
          create: input.submit.items.map((item, index) => ({
            itemName: item.itemName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            materialType: item.materialType,
            color: item.color,
            printSpecJson: toPrismaJsonOptional(item.printSpec),
            lineTotal: item.quantity * item.unitPrice,
            sortOrder: index,
          })),
        },
      },
    });
  });

  await createAuditLog({
    entityType: "order",
    entityId: existing.id,
    action: "public_order_form.updated",
    after: { customerId: existing.customerId },
    requestId: input.requestMeta?.requestId,
    ipAddress: input.requestMeta?.ipAddress,
  });
  await appendTimelineEvent({
    entityType: "order",
    entityId: existing.id,
    action: "public_order_form_updated",
    payload: { orderNumber: existing.orderNumber },
    requestId: input.requestMeta?.requestId,
  });

  return {
    kind: "ok" as const,
    orderId: existing.id,
    orderNumber: existing.orderNumber,
  };
}
