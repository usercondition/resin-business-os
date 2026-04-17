import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";

import { handleRouteError, ok, okPage } from "@/lib/api";
import { db } from "@/lib/db";
import { guardRoute } from "@/lib/security/guard";
import { createOrder } from "@/server/domain/orders/order-service";

export async function GET(request: NextRequest) {
  try {
    const guarded = await guardRoute(request, {
      rateLimit: { scope: "orders:list", limit: 120, windowMs: 60_000 },
      parsePaging: true,
    });
    if (guarded instanceof Response) return guarded;

    const search = request.nextUrl.searchParams.get("search") ?? undefined;
    const [orders, total] = await Promise.all([
      db.order.findMany({
        where: search
          ? {
              OR: [
                { orderNumber: { contains: search, mode: "insensitive" } },
                { customer: { fullName: { contains: search, mode: "insensitive" } } },
              ],
            }
          : undefined,
        include: { customer: true, items: true, payments: true },
        orderBy: { createdAt: "desc" },
        skip: guarded.pagination.skip,
        take: guarded.pagination.take,
      }),
      db.order.count({
        where: search
          ? {
              OR: [
                { orderNumber: { contains: search, mode: "insensitive" } },
                { customer: { fullName: { contains: search, mode: "insensitive" } } },
              ],
            }
          : undefined,
      }),
    ]);
    return okPage(orders, {
      page: guarded.pagination.page,
      pageSize: guarded.pagination.pageSize,
      total,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const guarded = await guardRoute(request, {
      roles: [UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF],
      rateLimit: { scope: "orders:create", limit: 80, windowMs: 60_000 },
    });
    if (guarded instanceof Response) return guarded;

    const body = await request.json();
    const order = await createOrder(body, guarded.actor.userId, guarded.context);
    return ok(order, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

