import { db } from "@/lib/db";
import { createAuditLog } from "@/server/audit/audit-service";
import { appendTimelineEvent } from "@/server/timeline/timeline-service";

export async function generateFollowUpReminders(actorUserId?: string) {
  const now = new Date();

  const [staleLeads, unpaidOrders, dueSoonOrders] = await Promise.all([
    db.lead.findMany({
      where: {
        nextFollowUpAt: { lte: now },
        status: { in: ["NEW", "CONTACTED", "QUALIFIED", "QUOTED"] },
      },
      take: 200,
    }),
    db.order.findMany({
      where: {
        paymentStatus: { in: ["PENDING", "PARTIAL"] },
        status: { notIn: ["CLOSED", "CANCELLED"] },
      },
      take: 200,
    }),
    db.order.findMany({
      where: {
        dueDate: {
          gte: now,
          lte: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
        },
        status: { in: ["CONFIRMED", "IN_PRODUCTION", "READY"] },
      },
      take: 200,
    }),
  ]);

  const reminders = [
    ...staleLeads.map((lead) => ({
      entityType: "lead",
      entityId: lead.id,
      action: "reminder.lead_follow_up",
      context: { title: lead.title, dueAt: lead.nextFollowUpAt },
    })),
    ...unpaidOrders.map((order) => ({
      entityType: "order",
      entityId: order.id,
      action: "reminder.payment_follow_up",
      context: { orderNumber: order.orderNumber, balanceDue: order.balanceDue },
    })),
    ...dueSoonOrders.map((order) => ({
      entityType: "order",
      entityId: order.id,
      action: "reminder.delivery_due_soon",
      context: { orderNumber: order.orderNumber, dueDate: order.dueDate },
    })),
  ];

  for (const reminder of reminders) {
    await appendTimelineEvent({
      actorUserId,
      entityType: reminder.entityType,
      entityId: reminder.entityId,
      action: reminder.action,
      payload: reminder.context,
    });
  }

  await createAuditLog({
    actorUserId,
    entityType: "system",
    entityId: "reminder-engine",
    action: "reminders.generated",
    after: { count: reminders.length },
  });

  return {
    generated: reminders.length,
    staleLeads: staleLeads.length,
    unpaidOrders: unpaidOrders.length,
    dueSoonOrders: dueSoonOrders.length,
  };
}
