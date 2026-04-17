import { QuoteStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { createAuditLog } from "@/server/audit/audit-service";
import { appendTimelineEvent } from "@/server/timeline/timeline-service";
import { z } from "zod";

const convertQuoteSchema = z.object({
  quoteId: z.string().cuid(),
  actorUserId: z.string().cuid().optional(),
});

export async function convertQuoteToApproved(quoteId: string, actorUserId?: string) {
  const quote = await db.quote.update({
    where: { id: quoteId },
    data: {
      status: QuoteStatus.APPROVED,
      approvedAt: new Date(),
    },
  });

  await createAuditLog({
    actorUserId,
    entityType: "quote",
    entityId: quote.id,
    action: "quote.approved",
    after: quote,
  });

  await appendTimelineEvent({
    actorUserId,
    entityType: "quote",
    entityId: quote.id,
    action: "approved",
  });

  return quote;
}

export function parseConvertQuoteInput(input: unknown) {
  return convertQuoteSchema.parse(input);
}
