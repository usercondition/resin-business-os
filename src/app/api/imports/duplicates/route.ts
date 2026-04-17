import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";

import { handleRouteError, ok, okPage } from "@/lib/api";
import { parsePagination } from "@/lib/pagination/params";
import { requireAuth, requireRole } from "@/lib/security/auth";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { listDuplicateRows, parseResolveDuplicate, resolveDuplicate } from "@/server/imports/duplicate-review-service";

export async function GET(request: NextRequest) {
  try {
    const actor = requireAuth(request);
    if (actor instanceof Response) return actor;
    const limited = await enforceRateLimit(request, "imports:duplicates:list", 60, 60_000);
    if (limited) return limited;

    const syncLogId = request.nextUrl.searchParams.get("syncLogId") ?? undefined;
    const pagination = parsePagination(request);
    const duplicates = await listDuplicateRows(syncLogId);
    const paged = duplicates.slice(pagination.skip, pagination.skip + pagination.take);
    return okPage(paged, {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total: duplicates.length,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const actor = requireRole(request, [UserRole.OWNER, UserRole.ADMIN]);
    if (actor instanceof Response) return actor;
    const limited = await enforceRateLimit(request, "imports:duplicates:resolve", 40, 60_000);
    if (limited) return limited;

    const body = await request.json();
    const parsed = parseResolveDuplicate(body);

    const resolved = await resolveDuplicate(parsed);
    return ok(resolved);
  } catch (error) {
    return handleRouteError(error);
  }
}

