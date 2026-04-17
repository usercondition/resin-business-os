import { db } from "@/lib/db";

type TimelineInput = {
  entityType: string;
  entityId: string;
  action: string;
  actorUserId?: string;
  payload?: Record<string, unknown>;
  requestId?: string;
};

export async function appendTimelineEvent(input: TimelineInput) {
  return db.activityLog.create({
    data: {
      actorUserId: input.actorUserId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: `timeline.${input.action}`,
      contextJson: {
        ...(input.payload ?? {}),
        ...(input.requestId ? { requestId: input.requestId } : {}),
      },
    },
  });
}
