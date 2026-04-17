import { db } from "@/lib/db";
import { toPrismaJson } from "@/lib/prisma-json";

export async function emitDomainEvent(input: {
  eventName: string;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
}) {
  const integration = await db.integration.upsert({
    where: {
      provider_accountLabel: {
        provider: "n8n",
        accountLabel: "event-bus",
      },
    },
    create: {
      provider: "n8n",
      accountLabel: "event-bus",
      status: "active",
    },
    update: {
      status: "active",
      lastSyncAt: new Date(),
    },
  });

  const syncLog = await db.syncLog.create({
    data: {
      integrationId: integration.id,
      syncType: "event_emit",
      direction: "outbound",
      entityType: input.entityType,
      entityId: input.entityId,
      status: "queued",
      startedAt: new Date(),
      errorDetailsJson: toPrismaJson({
        eventName: input.eventName,
        payload: input.payload,
      }),
    },
  });

  return {
    eventId: syncLog.id,
    eventName: input.eventName,
    queued: true,
  };
}
