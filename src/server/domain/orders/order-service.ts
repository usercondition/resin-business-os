import { randomUUID } from "crypto";

import { DeliveryStatus, OrderStatus, PaymentStatus, ProductionStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { toPrismaJsonOptional } from "@/lib/prisma-json";
import { createAuditLog } from "@/server/audit/audit-service";
import { customerInputSchema } from "@/server/domain/common/validation";
import { createCustomer } from "@/server/domain/customers/customer-service";
import { appendTimelineEvent } from "@/server/timeline/timeline-service";
import { z } from "zod";

const orderItemSchema = z.object({
  itemName: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  materialType: z.string().optional(),
  color: z.string().optional(),
  printSpec: z.record(z.unknown()).optional(),
});

const createOrderSchema = z
  .object({
    customerId: z.string().cuid().optional(),
    newCustomer: customerInputSchema.optional(),
    leadId: z.string().cuid().optional(),
    quoteId: z.string().cuid().optional(),
    dueDate: z.coerce.date().optional(),
    notes: z.string().optional(),
    tax: z.number().nonnegative().default(0),
    discount: z.number().nonnegative().default(0),
    items: z.array(orderItemSchema).min(1),
  })
  .superRefine((val, ctx) => {
    const hasId = Boolean(val.customerId);
    const hasNew = Boolean(val.newCustomer);
    if (hasId === hasNew) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide exactly one of customerId or newCustomer",
        path: hasId && hasNew ? ["customerId"] : ["newCustomer"],
      });
    }
  });

const updateOrderSchema = z.object({
  orderId: z.string().cuid(),
  customerId: z.string().cuid(),
  leadId: z.string().cuid().optional(),
  quoteId: z.string().cuid().optional(),
  dueDate: z.coerce.date().optional(),
  notes: z.string().optional(),
  tax: z.number().nonnegative().default(0),
  discount: z.number().nonnegative().default(0),
  status: z.nativeEnum(OrderStatus).optional(),
  productionStatus: z.nativeEnum(ProductionStatus).optional(),
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  deliveryStatus: z.nativeEnum(DeliveryStatus).optional().nullable(),
  items: z.array(orderItemSchema).min(1),
});

type ServiceContext = {
  requestId?: string;
  ipAddress?: string;
};

export async function createOrder(
  input: unknown,
  actorUserId?: string,
  context?: ServiceContext,
) {
  const parsed = createOrderSchema.parse(input);

  let customerId: string;
  if (parsed.newCustomer) {
    const customer = await createCustomer(
      {
        ...parsed.newCustomer,
        tags: [...(parsed.newCustomer.tags ?? []), "manual_order"],
        notes: parsed.newCustomer.notes?.trim()
          ? parsed.newCustomer.notes
          : "Created from manual order entry",
      },
      actorUserId,
      context,
    );
    customerId = customer.id;
  } else {
    customerId = parsed.customerId as string;
  }

  const subtotal = parsed.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const total = subtotal + parsed.tax - parsed.discount;

  const order = await db.order.create({
    data: {
      customerId,
      leadId: parsed.leadId,
      quoteId: parsed.quoteId,
      orderNumber: `ORD-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`,
      status: OrderStatus.NEW,
      productionStatus: ProductionStatus.QUEUED,
      dueDate: parsed.dueDate,
      subtotal,
      tax: parsed.tax,
      discount: parsed.discount,
      total,
      balanceDue: total,
      notes: parsed.notes,
      createdById: actorUserId,
      items: {
        create: parsed.items.map((item, index) => ({
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
    include: {
      items: true,
    },
  });

  await createAuditLog({
    actorUserId,
    entityType: "order",
    entityId: order.id,
    action: "order.created",
    after: order,
    requestId: context?.requestId,
    ipAddress: context?.ipAddress,
  });

  await appendTimelineEvent({
    actorUserId,
    entityType: "order",
    entityId: order.id,
    action: "created",
    payload: { orderNumber: order.orderNumber },
    requestId: context?.requestId,
  });

  return order;
}

export async function listOrders(search?: string) {
  return db.order.findMany({
    where: search
      ? {
          OR: [
            { orderNumber: { contains: search, mode: "insensitive" } },
            { customer: { fullName: { contains: search, mode: "insensitive" } } },
          ],
        }
      : undefined,
    include: {
      customer: true,
      items: true,
      payments: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function updateOrder(
  input: unknown,
  actorUserId?: string,
  context?: ServiceContext,
) {
  const parsed = updateOrderSchema.parse(input);
  const existing = await db.order.findUniqueOrThrow({
    where: { id: parsed.orderId },
    include: { items: true },
  });

  const subtotal = parsed.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const total = subtotal + parsed.tax - parsed.discount;

  const paidTotal = await db.payment.aggregate({
    _sum: { amount: true },
    where: { orderId: parsed.orderId },
  });
  const balanceDue = total - Number(paidTotal._sum.amount ?? 0);

  const updated = await db.$transaction(async (tx) => {
    await tx.orderItem.deleteMany({ where: { orderId: parsed.orderId } });

    return tx.order.update({
      where: { id: parsed.orderId },
      data: {
        customerId: parsed.customerId,
        leadId: parsed.leadId,
        quoteId: parsed.quoteId,
        dueDate: parsed.dueDate,
        notes: parsed.notes,
        tax: parsed.tax,
        discount: parsed.discount,
        subtotal,
        total,
        balanceDue,
        ...(parsed.status ? { status: parsed.status } : {}),
        ...(parsed.productionStatus ? { productionStatus: parsed.productionStatus } : {}),
        ...(parsed.paymentStatus ? { paymentStatus: parsed.paymentStatus } : {}),
        ...(parsed.deliveryStatus !== undefined ? { deliveryStatus: parsed.deliveryStatus } : {}),
        items: {
          create: parsed.items.map((item, index) => ({
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
      include: { items: true },
    });
  });

  await createAuditLog({
    actorUserId,
    entityType: "order",
    entityId: updated.id,
    action: "order.updated",
    before: existing,
    after: updated,
    requestId: context?.requestId,
    ipAddress: context?.ipAddress,
  });

  await appendTimelineEvent({
    actorUserId,
    entityType: "order",
    entityId: updated.id,
    action: "updated",
    payload: { orderNumber: updated.orderNumber },
    requestId: context?.requestId,
  });

  return updated;
}

export async function deleteOrder(
  orderId: string,
  actorUserId?: string,
  context?: ServiceContext,
) {
  const existing = await db.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: true, payments: true, deliveries: true, productionJobs: true },
  });

  await db.$transaction(async (tx) => {
    await tx.orderItem.deleteMany({ where: { orderId } });
    await tx.payment.deleteMany({ where: { orderId } });
    await tx.delivery.deleteMany({ where: { orderId } });
    await tx.productionJob.deleteMany({ where: { orderId } });
    await tx.order.delete({ where: { id: orderId } });
  });

  await createAuditLog({
    actorUserId,
    entityType: "order",
    entityId: orderId,
    action: "order.deleted",
    before: existing,
    requestId: context?.requestId,
    ipAddress: context?.ipAddress,
  });

  await appendTimelineEvent({
    actorUserId,
    entityType: "order",
    entityId: orderId,
    action: "deleted",
    payload: { orderNumber: existing.orderNumber },
    requestId: context?.requestId,
  });

  return { deleted: true, orderId };
}
