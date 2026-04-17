import { PaymentStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { createAuditLog } from "@/server/audit/audit-service";
import { paymentInputSchema } from "@/server/domain/common/validation";
import { appendTimelineEvent } from "@/server/timeline/timeline-service";

type ServiceContext = {
  requestId?: string;
  ipAddress?: string;
};

export async function logManualPayment(
  input: unknown,
  actorUserId?: string,
  context?: ServiceContext,
) {
  const parsed = paymentInputSchema.parse(input);

  const payment = await db.payment.create({
    data: {
      orderId: parsed.orderId,
      customerId: parsed.customerId,
      amount: parsed.amount,
      method: parsed.method,
      paidAt: parsed.paidAt,
      referenceCode: parsed.referenceCode,
      notes: parsed.notes,
      status: PaymentStatus.PAID,
      loggedById: actorUserId,
    },
    include: {
      order: true,
    },
  });

  const newBalance = Number(payment.order.balanceDue) - Number(parsed.amount);
  const nextPaymentStatus =
    newBalance <= 0 ? PaymentStatus.PAID : newBalance < Number(payment.order.total) ? PaymentStatus.PARTIAL : PaymentStatus.PENDING;

  await db.order.update({
    where: { id: payment.orderId },
    data: {
      balanceDue: newBalance,
      paymentStatus: nextPaymentStatus,
    },
  });

  await createAuditLog({
    actorUserId,
    entityType: "payment",
    entityId: payment.id,
    action: "payment.logged",
    after: payment,
    requestId: context?.requestId,
    ipAddress: context?.ipAddress,
  });

  await appendTimelineEvent({
    actorUserId,
    entityType: "order",
    entityId: payment.orderId,
    action: "payment_logged",
    payload: { method: payment.method, amount: payment.amount },
    requestId: context?.requestId,
  });

  return payment;
}
