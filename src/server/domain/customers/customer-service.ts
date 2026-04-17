import { db } from "@/lib/db";
import { createAuditLog } from "@/server/audit/audit-service";
import { customerInputSchema } from "@/server/domain/common/validation";
import { appendTimelineEvent } from "@/server/timeline/timeline-service";

type ServiceContext = {
  requestId?: string;
  ipAddress?: string;
};

export async function createCustomer(
  input: unknown,
  actorUserId?: string,
  context?: ServiceContext,
) {
  const parsed = customerInputSchema.parse(input);

  const customer = await db.customer.create({
    data: {
      fullName: parsed.fullName,
      phone: parsed.phone,
      email: parsed.email,
      preferredContactChannel: parsed.preferredContactChannel,
      defaultAddress: parsed.defaultAddress,
      notes: parsed.notes,
      tagsJson: parsed.tags,
      createdById: actorUserId,
    },
  });

  await createAuditLog({
    actorUserId,
    entityType: "customer",
    entityId: customer.id,
    action: "customer.created",
    after: customer,
    requestId: context?.requestId,
    ipAddress: context?.ipAddress,
  });

  await appendTimelineEvent({
    actorUserId,
    entityType: "customer",
    entityId: customer.id,
    action: "created",
    requestId: context?.requestId,
  });

  return customer;
}
