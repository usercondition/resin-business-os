import { LeadStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { createAuditLog } from "@/server/audit/audit-service";
import { leadInputSchema } from "@/server/domain/common/validation";
import { appendTimelineEvent } from "@/server/timeline/timeline-service";

type ServiceContext = {
  requestId?: string;
  ipAddress?: string;
};

export async function createLead(
  input: unknown,
  actorUserId?: string,
  context?: ServiceContext,
) {
  const parsed = leadInputSchema.parse(input);

  const lead = await db.lead.create({
    data: {
      customerId: parsed.customerId,
      source: parsed.source,
      externalSourceId: parsed.externalSourceId,
      title: parsed.title,
      description: parsed.description,
      estimatedValue: parsed.estimatedValue,
      nextFollowUpAt: parsed.nextFollowUpAt,
      status: LeadStatus.NEW,
    },
  });

  await createAuditLog({
    actorUserId,
    entityType: "lead",
    entityId: lead.id,
    action: "lead.created",
    after: lead,
    requestId: context?.requestId,
    ipAddress: context?.ipAddress,
  });

  await appendTimelineEvent({
    actorUserId,
    entityType: "lead",
    entityId: lead.id,
    action: "created",
    payload: { source: lead.source },
    requestId: context?.requestId,
  });

  return lead;
}
