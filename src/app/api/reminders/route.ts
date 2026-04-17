import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";

import { handleRouteError, ok } from "@/lib/api";
import { requireRole } from "@/lib/security/auth";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { generateFollowUpReminders } from "@/server/reminders/reminder-service";

export async function POST(request: NextRequest) {
  try {
    const actor = requireRole(request, [UserRole.OWNER, UserRole.ADMIN]);
    if (actor instanceof Response) return actor;
    const limited = await enforceRateLimit(request, "reminders:run", 20, 60_000);
    if (limited) return limited;

    const result = await generateFollowUpReminders(actor.userId);
    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
}

