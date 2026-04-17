import { DeliveryStatus, DeliveryType } from "@prisma/client";
import { z } from "zod";

import { db } from "@/lib/db";
import { createAuditLog } from "@/server/audit/audit-service";
import { appendTimelineEvent } from "@/server/timeline/timeline-service";

const createDeliverySchema = z.object({
  orderId: z.string().cuid(),
  type: z.nativeEnum(DeliveryType),
  scheduledAt: z.coerce.date().optional(),
  locationText: z.string().optional(),
  recipientName: z.string().optional(),
  notes: z.string().optional(),
});

const updateDeliverySchema = z.object({
  id: z.string().cuid(),
  status: z.nativeEnum(DeliveryStatus),
  scheduledAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional(),
  locationText: z.string().optional(),
  recipientName: z.string().optional(),
  notes: z.string().optional(),
});

export async function createDelivery(input: unknown, actorUserId?: string) {
  const parsed = createDeliverySchema.parse(input);

  const delivery = await db.delivery.create({
    data: {
      orderId: parsed.orderId,
      type: parsed.type,
      scheduledAt: parsed.scheduledAt,
      locationText: parsed.locationText,
      recipientName: parsed.recipientName,
      notes: parsed.notes,
      status: DeliveryStatus.SCHEDULED,
    },
  });

  await createAuditLog({
    actorUserId,
    entityType: "delivery",
    entityId: delivery.id,
    action: "delivery.created",
    after: delivery,
  });

  await appendTimelineEvent({
    actorUserId,
    entityType: "order",
    entityId: delivery.orderId,
    action: "delivery_created",
    payload: { deliveryId: delivery.id, type: delivery.type },
  });

  return delivery;
}

export async function updateDelivery(input: unknown, actorUserId?: string) {
  const parsed = updateDeliverySchema.parse(input);

  const existing = await db.delivery.findUniqueOrThrow({ where: { id: parsed.id } });

  const updated = await db.delivery.update({
    where: { id: parsed.id },
    data: {
      status: parsed.status,
      scheduledAt: parsed.scheduledAt,
      completedAt:
        parsed.status === DeliveryStatus.COMPLETED ? parsed.completedAt ?? new Date() : parsed.completedAt,
      locationText: parsed.locationText,
      recipientName: parsed.recipientName,
      notes: parsed.notes,
    },
  });

  await createAuditLog({
    actorUserId,
    entityType: "delivery",
    entityId: updated.id,
    action: "delivery.updated",
    before: existing,
    after: updated,
  });

  await appendTimelineEvent({
    actorUserId,
    entityType: "order",
    entityId: updated.orderId,
    action: "delivery_updated",
    payload: { deliveryId: updated.id, status: updated.status },
  });

  return updated;
}

export async function listDeliveries(orderId?: string) {
  return db.delivery.findMany({
    where: orderId ? { orderId } : undefined,
    include: { order: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}
