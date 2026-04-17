import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";

import { handleRouteError, ok } from "@/lib/api";
import { requireRole } from "@/lib/security/auth";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { checkIdempotency, storeIdempotencyResult } from "@/server/imports/idempotency-service";
import { commitStagedImport, parseCommitImportInput } from "@/server/imports/import-commit-service";

export async function POST(request: NextRequest) {
  try {
    const actor = requireRole(request, [UserRole.OWNER, UserRole.ADMIN]);
    if (actor instanceof Response) return actor;
    const limited = await enforceRateLimit(request, "imports:commit", 40, 60_000);
    if (limited) return limited;

    const body = await request.json();
    const parsed = parseCommitImportInput(body);
    const idempotencyKey = request.headers.get("x-idempotency-key");
    const scope = "import:commit";

    const replay = await checkIdempotency(scope, idempotencyKey, parsed);
    if (replay.replay) {
      return ok(replay.response, { status: replay.statusCode });
    }

    const result = await commitStagedImport(parsed);
    await storeIdempotencyResult(scope, idempotencyKey, parsed, result, 200);

    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
}

