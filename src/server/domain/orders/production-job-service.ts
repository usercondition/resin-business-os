import { ProductionStatus } from "@prisma/client";
import { z } from "zod";

import { db } from "@/lib/db";
import { createAuditLog } from "@/server/audit/audit-service";
import { appendTimelineEvent } from "@/server/timeline/timeline-service";

const createJobSchema = z.object({
  orderId: z.string().cuid(),
  machineName: z.string().optional(),
  queuePosition: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

const updateJobSchema = z.object({
  id: z.string().cuid(),
  status: z.nativeEnum(ProductionStatus),
  failureReason: z.string().optional(),
  qualityCheckStatus: z.string().optional(),
  notes: z.string().optional(),
});

export async function createProductionJob(input: unknown, actorUserId?: string) {
  const parsed = createJobSchema.parse(input);

  const job = await db.productionJob.create({
    data: {
      orderId: parsed.orderId,
      machineName: parsed.machineName,
      queuePosition: parsed.queuePosition,
      notes: parsed.notes,
      status: ProductionStatus.QUEUED,
    },
  });

  await createAuditLog({
    actorUserId,
    entityType: "production_job",
    entityId: job.id,
    action: "production_job.created",
    after: job,
  });

  await appendTimelineEvent({
    actorUserId,
    entityType: "order",
    entityId: job.orderId,
    action: "production_job_created",
    payload: { jobId: job.id },
  });

  return job;
}

export async function updateProductionJob(input: unknown, actorUserId?: string) {
  const parsed = updateJobSchema.parse(input);

  const existing = await db.productionJob.findUniqueOrThrow({ where: { id: parsed.id } });

  const updated = await db.productionJob.update({
    where: { id: parsed.id },
    data: {
      status: parsed.status,
      failureReason: parsed.failureReason,
      qualityCheckStatus: parsed.qualityCheckStatus,
      notes: parsed.notes,
      startedAt: parsed.status === ProductionStatus.PRINTING ? existing.startedAt ?? new Date() : existing.startedAt,
      finishedAt:
        parsed.status === ProductionStatus.COMPLETE || parsed.status === ProductionStatus.FAILED
          ? new Date()
          : existing.finishedAt,
    },
  });

  await createAuditLog({
    actorUserId,
    entityType: "production_job",
    entityId: updated.id,
    action: "production_job.updated",
    before: existing,
    after: updated,
  });

  await appendTimelineEvent({
    actorUserId,
    entityType: "order",
    entityId: updated.orderId,
    action: "production_job_updated",
    payload: { jobId: updated.id, status: updated.status },
  });

  return updated;
}

export async function listProductionJobs(orderId?: string) {
  return db.productionJob.findMany({
    where: orderId ? { orderId } : undefined,
    orderBy: [{ queuePosition: "asc" }, { createdAt: "desc" }],
    include: { order: true },
    take: 200,
  });
}
