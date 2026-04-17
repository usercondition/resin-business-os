import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";

import { handleRouteError, ok } from "@/lib/api";
import { requireRole } from "@/lib/security/auth";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { checkIdempotency, storeIdempotencyResult } from "@/server/imports/idempotency-service";
import {
  parseGoogleSheetSyncInput,
  stageGoogleSheetSync,
} from "@/server/imports/google-sheets-import-service";

export async function POST(request: NextRequest) {
  try {
    const actor = requireRole(request, [UserRole.OWNER, UserRole.ADMIN]);
    if (actor instanceof Response) return actor;
    const limited = await enforceRateLimit(request, "imports:sheets-stage", 40, 60_000);
    if (limited) return limited;

    const body = await request.json();
    const parsed = parseGoogleSheetSyncInput(body);
    const idempotencyKey = request.headers.get("x-idempotency-key");
    const scope = "import:sheets-stage";
    const replay = await checkIdempotency(scope, idempotencyKey, parsed);

    if (replay.replay) {
      return ok(replay.response, { status: replay.statusCode });
    }

    const result = await stageGoogleSheetSync(parsed);
    await storeIdempotencyResult(scope, idempotencyKey, parsed, result, 201);
    return ok(result, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

