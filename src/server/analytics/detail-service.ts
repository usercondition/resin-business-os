import { db } from "@/lib/db";

export async function getCustomerDetail(customerId: string) {
  const customer = await db.customer.findUniqueOrThrow({
    where: { id: customerId },
    include: {
      leads: { orderBy: { updatedAt: "desc" } },
      quotes: { orderBy: { updatedAt: "desc" } },
      orders: {
        orderBy: { updatedAt: "desc" },
        include: { payments: true, deliveries: true },
      },
      payments: { orderBy: { paidAt: "desc" } },
    },
  });

  const timeline = await db.activityLog.findMany({
    where: {
      OR: [{ entityType: "customer", entityId: customerId }, { entityType: "order", entityId: { in: customer.orders.map((o) => o.id) } }],
    },
    orderBy: { createdAt: "desc" },
    take: 250,
  });

  return { customer, timeline };
}

export async function getOrderDetail(orderId: string) {
  const order = await db.order.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      customer: true,
      items: true,
      payments: true,
      deliveries: true,
      productionJobs: true,
    },
  });

  const timeline = await db.activityLog.findMany({
    where: { entityType: "order", entityId: orderId },
    orderBy: { createdAt: "desc" },
    take: 250,
  });

  return { order, timeline };
}
