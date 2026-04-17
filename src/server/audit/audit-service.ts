import { db } from "@/lib/db";

type AuditInput = {
  actorUserId?: string;
  entityType: string;
  entityId: string;
  action: string;
  before?: unknown;
  after?: unknown;
  context?: unknown;
  ipAddress?: string;
  requestId?: string;
};

export async function createAuditLog(input: AuditInput) {
  return db.activityLog.create({
    data: {
      actorUserId: input.actorUserId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      beforeJson: input.before as object | undefined,
      afterJson: input.after as object | undefined,
      contextJson: input.context as object | undefined,
      ipAddress: input.ipAddress,
      ...(input.requestId
        ? {
            // Preserve request correlation for incident tracing.
            contextJson: {
              ...(input.context as Record<string, unknown> | undefined),
              requestId: input.requestId,
            },
          }
        : {}),
    },
  });
}
