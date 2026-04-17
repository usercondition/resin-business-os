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

    const [emailMessages, portalMessages] = await Promise.all([
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
        take: 200,
      }),
      db.orderPortalMessage.findMany({
        where: {
          ...(search
            ? {
                OR: [
                  { body: { contains: search, mode: "insensitive" } },
                  { order: { customer: { fullName: { contains: search, mode: "insensitive" } } } },
                  { order: { customer: { email: { contains: search, mode: "insensitive" } } } },
                  { order: { orderNumber: { contains: search, mode: "insensitive" } } },
                ],
              }
            : {}),
        },
        include: {
          order: {
            include: { customer: true },
          },
          staffUser: true,
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
    ]);

    const combined = [
      ...emailMessages.map((m) => ({
        id: m.id,
        customerId: m.customerId,
        direction: m.direction,
        messageText: m.messageText,
        createdAt: m.createdAt,
        customer: m.customer,
        messageType: "email" as const,
      })),
      ...portalMessages.map((m) => ({
        id: `portal-${m.id}`,
        customerId: m.order.customerId,
        direction: m.author === "CLIENT" ? "inbound" : "outbound",
        messageText: m.body,
        createdAt: m.createdAt,
        customer: {
          ...m.order.customer,
          fullName: `${m.order.customer.fullName} (${m.order.orderNumber})`,
        },
        messageType: "portal" as const,
      })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const pageItems = combined.slice(pagination.skip, pagination.skip + pagination.take);

    return ok({
      items: pageItems,
      meta: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total: combined.length,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
