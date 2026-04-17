import { DeliveryStatus, OrderStatus, PaymentStatus, ProductionStatus } from "@prisma/client";
import { z } from "zod";

import { db } from "@/lib/db";
import { createAuditLog } from "@/server/audit/audit-service";
import { appendTimelineEvent } from "@/server/timeline/timeline-service";

const orderTransitionMap: Record<OrderStatus, OrderStatus[]> = {
  NEW: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  CONFIRMED: [OrderStatus.IN_PRODUCTION, OrderStatus.CANCELLED],
  IN_PRODUCTION: [OrderStatus.READY, OrderStatus.CANCELLED],
  READY: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  DELIVERED: [OrderStatus.CLOSED],
  CLOSED: [],
  CANCELLED: [],
};

const productionTransitionMap: Record<ProductionStatus, ProductionStatus[]> = {
  QUEUED: [ProductionStatus.PRINTING, ProductionStatus.FAILED],
  PRINTING: [ProductionStatus.POST_PROCESSING, ProductionStatus.FAILED],
  POST_PROCESSING: [ProductionStatus.QA, ProductionStatus.FAILED],
  QA: [ProductionStatus.COMPLETE, ProductionStatus.FAILED],
  COMPLETE: [],
  FAILED: [ProductionStatus.QUEUED],
};

const updateOrderStatusSchema = z.object({
  orderId: z.string().cuid(),
  status: z.nativeEnum(OrderStatus),
});

const updateProductionStatusSchema = z.object({
  orderId: z.string().cuid(),
  productionStatus: z.nativeEnum(ProductionStatus),
});

const updateDeliveryStatusSchema = z.object({
  orderId: z.string().cuid(),
  deliveryStatus: z.nativeEnum(DeliveryStatus),
});

export async function updateOrderStatus(input: unknown, actorUserId?: string) {
  const parsed = updateOrderStatusSchema.parse(input);

  const current = await db.order.findUniqueOrThrow({ where: { id: parsed.orderId } });
  const allowedNext = orderTransitionMap[current.status];

  if (!allowedNext.includes(parsed.status)) {
    throw new Error(`Invalid order status transition: ${current.status} -> ${parsed.status}`);
  }

  const updated = await db.order.update({
    where: { id: parsed.orderId },
    data: { status: parsed.status },
  });

  await createAuditLog({
    actorUserId,
    entityType: "order",
    entityId: updated.id,
    action: "order.status_changed",
    before: { status: current.status },
    after: { status: updated.status },
  });

  await appendTimelineEvent({
    actorUserId,
    entityType: "order",
    entityId: updated.id,
    action: "status_changed",
    payload: { from: current.status, to: updated.status },
  });

  return updated;
}

export async function updateOrderProductionStatus(input: unknown, actorUserId?: string) {
  const parsed = updateProductionStatusSchema.parse(input);

  const current = await db.order.findUniqueOrThrow({ where: { id: parsed.orderId } });
  const allowedNext = productionTransitionMap[current.productionStatus];

  if (!allowedNext.includes(parsed.productionStatus)) {
    throw new Error(
      `Invalid production status transition: ${current.productionStatus} -> ${parsed.productionStatus}`,
    );
  }

  const updated = await db.order.update({
    where: { id: parsed.orderId },
    data: { productionStatus: parsed.productionStatus },
  });

  await createAuditLog({
    actorUserId,
    entityType: "order",
    entityId: updated.id,
    action: "order.production_status_changed",
    before: { productionStatus: current.productionStatus },
    after: { productionStatus: updated.productionStatus },
  });

  await appendTimelineEvent({
    actorUserId,
    entityType: "order",
    entityId: updated.id,
    action: "production_status_changed",
    payload: { from: current.productionStatus, to: updated.productionStatus },
  });

  return updated;
}

export async function updateOrderDeliveryStatus(input: unknown, actorUserId?: string) {
  const parsed = updateDeliveryStatusSchema.parse(input);

  const current = await db.order.findUniqueOrThrow({ where: { id: parsed.orderId } });

  const nextPaymentStatus =
    parsed.deliveryStatus === DeliveryStatus.COMPLETED && Number(current.balanceDue) <= 0
      ? PaymentStatus.PAID
      : current.paymentStatus;

  const updated = await db.order.update({
    where: { id: parsed.orderId },
    data: {
      deliveryStatus: parsed.deliveryStatus,
      paymentStatus: nextPaymentStatus,
      status: parsed.deliveryStatus === DeliveryStatus.COMPLETED ? OrderStatus.DELIVERED : current.status,
    },
  });

  await createAuditLog({
    actorUserId,
    entityType: "order",
    entityId: updated.id,
    action: "order.delivery_status_changed",
    before: { deliveryStatus: current.deliveryStatus },
    after: { deliveryStatus: updated.deliveryStatus },
  });

  await appendTimelineEvent({
    actorUserId,
    entityType: "order",
    entityId: updated.id,
    action: "delivery_status_changed",
    payload: { from: current.deliveryStatus, to: updated.deliveryStatus },
  });

  return updated;
}
