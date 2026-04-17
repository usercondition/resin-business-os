import { NextRequest } from "next/server";

import { handleRouteError, ok, okPage } from "@/lib/api";
import { db } from "@/lib/db";
import { parsePagination } from "@/lib/pagination/params";
import { requireAuth } from "@/lib/security/auth";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const actor = requireAuth(request);
    if (actor instanceof Response) return actor;
    const limited = await enforceRateLimit(request, "timeline:list", 120, 60_000);
    if (limited) return limited;

    const entityType = request.nextUrl.searchParams.get("entityType") ?? undefined;
    const entityId = request.nextUrl.searchParams.get("entityId") ?? undefined;

    if (!entityType || !entityId) {
      return okPage([], { page: 1, pageSize: 25, total: 0 });
    }

    const pagination = parsePagination(request);
    const [events, total] = await Promise.all([
      db.activityLog.findMany({
        where: {
          entityType,
          entityId,
        },
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      db.activityLog.count({ where: { entityType, entityId } }),
    ]);

    return okPage(events, {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

