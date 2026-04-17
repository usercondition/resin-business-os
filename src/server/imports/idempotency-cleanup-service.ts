import { db } from "@/lib/db";

export async function cleanupExpiredIdempotencyKeys() {
  const now = new Date();

  const result = await db.idempotencyKey.deleteMany({
    where: {
      expiresAt: {
        lt: now,
      },
    },
  });

  return {
    deleted: result.count,
    cleanedAt: now.toISOString(),
  };
}
