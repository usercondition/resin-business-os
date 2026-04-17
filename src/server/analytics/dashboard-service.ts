import { OrderStatus, PaymentStatus, ProductionStatus } from "@prisma/client";

import { db } from "@/lib/db";

export async function getDashboardMetrics() {
  const [leadOpen, quoteDraftOrSent, ordersActive, unpaidOrders, overdueOrders, monthlyRevenueAgg] =
    await Promise.all([
      db.lead.count({ where: { status: { in: ["NEW", "CONTACTED", "QUALIFIED", "QUOTED"] } } }),
      db.quote.count({ where: { status: { in: ["DRAFT", "SENT"] } } }),
      db.order.count({
        where: {
          status: {
            in: [OrderStatus.NEW, OrderStatus.CONFIRMED, OrderStatus.IN_PRODUCTION, OrderStatus.READY],
          },
        },
      }),
      db.order.count({ where: { paymentStatus: { in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL] } } }),
      db.order.count({
        where: {
          dueDate: { lt: new Date() },
          status: { notIn: [OrderStatus.CLOSED, OrderStatus.CANCELLED] },
        },
      }),
      db.payment.aggregate({
        _sum: { amount: true },
        where: {
          paidAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);

  const [productionByStatus, inboundMessages24h, pendingImportDuplicates, recentInboundMessages, dueFollowUps, recentActivity] =
    await Promise.all([
      db.order.groupBy({
        by: ["productionStatus"],
        _count: { _all: true },
        where: {
          productionStatus: {
            in: [
              ProductionStatus.QUEUED,
              ProductionStatus.PRINTING,
              ProductionStatus.POST_PROCESSING,
              ProductionStatus.QA,
            ],
          },
        },
      }),
      db.conversation.count({
        where: {
          direction: "inbound",
          createdAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24) },
        },
      }),
      db.importRow.count({ where: { status: "duplicate" } }),
      db.conversation.findMany({
        where: { direction: "inbound" },
        include: { customer: true },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      db.lead.count({
        where: {
          nextFollowUpAt: { lte: new Date() },
          status: { in: ["NEW", "CONTACTED", "QUALIFIED", "QUOTED"] },
        },
      }),
      db.activityLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
    ]);

  return {
    leadOpen,
    quoteDraftOrSent,
    ordersActive,
    unpaidOrders,
    overdueOrders,
    monthlyRevenue: Number(monthlyRevenueAgg._sum.amount ?? 0),
    productionByStatus,
    inboundMessages24h,
    pendingImportDuplicates,
    dueFollowUps,
    recentInboundMessages: recentInboundMessages.map((message) => ({
      id: message.id,
      customerName: message.customer.fullName,
      channel: message.channel,
      messageText: message.messageText,
      receivedAt: message.createdAt,
    })),
    recentActivity: recentActivity.map((event) => ({
      id: event.id,
      action: event.action,
      entityType: event.entityType,
      createdAt: event.createdAt,
    })),
  };
}
