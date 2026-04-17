import { z } from "zod";

import { db } from "@/lib/db";

const resolveDuplicateSchema = z.object({
  importRowId: z.string().cuid(),
  resolution: z.enum(["accept_duplicate", "force_commit", "skip"]),
});

export function parseResolveDuplicate(input: unknown) {
  return resolveDuplicateSchema.parse(input);
}

export async function listDuplicateRows(syncLogId?: string) {
  return db.importRow.findMany({
    where: {
      status: "duplicate",
      ...(syncLogId ? { syncLogId } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
}

export async function resolveDuplicate(input: z.infer<typeof resolveDuplicateSchema>) {
  const row = await db.importRow.findUniqueOrThrow({ where: { id: input.importRowId } });

  if (input.resolution === "skip" || input.resolution === "accept_duplicate") {
    return db.importRow.update({
      where: { id: row.id },
      data: {
        status: input.resolution === "skip" ? "skipped" : "committed",
        errorMessage: input.resolution === "skip" ? "Skipped by reviewer" : null,
      },
    });
  }

  return db.importRow.update({
    where: { id: row.id },
    data: {
      status: "needs_manual_merge",
      errorMessage: "Manual merge requested",
    },
  });
}
