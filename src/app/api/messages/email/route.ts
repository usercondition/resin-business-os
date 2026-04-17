import { NextRequest } from "next/server";

import { handleRouteError, ok } from "@/lib/api";
import { db } from "@/lib/db";
import { parsePagination } from "@/lib/pagination/params";
import { requireAuth } from "@/lib/security/auth";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const actor = requireAuth(request);
    if (actor instanceof Response) return actor;
    const limited = await enforceRateLimit(request, "messages:email:list", 120, 60_000);
    if (limited) return limited;

    const pagination = parsePagination(request);
    const search = request.nextUrl.searchParams.get("search") ?? undefined;

    const [messages, total] = await Promise.all([
      db.conversation.findMany({
        where: {
          channel: "email",
          ...(search
            ? {
                OR: [
                  { messageText: { contains: search, mode: "insensitive" } },
                  { customer: { fullName: { contains: search, mode: "insensitive" } } },
                  { customer: { email: { contains: search, mode: "insensitive" } } },
                ],
              }
            : {}),
        },
        include: { customer: true },
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      db.conversation.count({
        where: {
          channel: "email",
          ...(search
            ? {
                OR: [
                  { messageText: { contains: search, mode: "insensitive" } },
                  { customer: { fullName: { contains: search, mode: "insensitive" } } },
                  { customer: { email: { contains: search, mode: "insensitive" } } },
                ],
              }
            : {}),
        },
      }),
    ]);

    return ok({
      items: messages,
      meta: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
