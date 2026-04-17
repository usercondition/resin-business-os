import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { z } from "zod";

import { handleRouteError, ok } from "@/lib/api";
import { requireRole } from "@/lib/security/auth";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { emitDomainEvent } from "@/server/integrations/events/event-bus-service";

const emitEventSchema = z.object({
  eventName: z.string().min(2),
  entityType: z.string().min(2),
  entityId: z.string().min(2),
  payload: z.record(z.unknown()).default({}),
});

export async function POST(request: NextRequest) {
  try {
    const actor = requireRole(request, [UserRole.OWNER, UserRole.ADMIN]);
    if (actor instanceof Response) return actor;
    const limited = await enforceRateLimit(request, "events:emit", 40, 60_000);
    if (limited) return limited;

    const body = await request.json();
    const parsed = emitEventSchema.parse(body);
    const result = await emitDomainEvent(parsed);
    return ok(result, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

