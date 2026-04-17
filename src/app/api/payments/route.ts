import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";

import { handleRouteError, ok, okPage } from "@/lib/api";
import { db } from "@/lib/db";
import { guardRoute } from "@/lib/security/guard";
import { logManualPayment } from "@/server/domain/payments/payment-service";

export async function GET(request: NextRequest) {
  try {
    const guarded = await guardRoute(request, {
      rateLimit: { scope: "payments:list", limit: 120, windowMs: 60_000 },
      parsePaging: true,
    });
    if (guarded instanceof Response) return guarded;

    const orderId = request.nextUrl.searchParams.get("orderId") ?? undefined;

    const [payments, total] = await Promise.all([
      db.payment.findMany({
        where: orderId ? { orderId } : undefined,
        include: {
          order: true,
          customer: true,
        },
        orderBy: { paidAt: "desc" },
        skip: guarded.pagination.skip,
        take: guarded.pagination.take,
      }),
      db.payment.count({ where: orderId ? { orderId } : undefined }),
    ]);

    return okPage(payments, {
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
      rateLimit: { scope: "payments:create", limit: 80, windowMs: 60_000 },
    });
    if (guarded instanceof Response) return guarded;

    const body = await request.json();

    const payment = await logManualPayment(body, guarded.actor.userId, guarded.context);

    return ok(payment, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

