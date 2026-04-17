import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";

import { handleRouteError, ok } from "@/lib/api";
import { guardRoute } from "@/lib/security/guard";
import { getOrderDetail } from "@/server/analytics/detail-service";
import { deleteOrder, updateOrder } from "@/server/domain/orders/order-service";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const guarded = await guardRoute(request, {
      rateLimit: { scope: "orders:detail", limit: 120, windowMs: 60_000 },
    });
    if (guarded instanceof Response) return guarded;

    const detail = await getOrderDetail(params.id);
    return ok(detail);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const guarded = await guardRoute(request, {
      roles: [UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF],
      rateLimit: { scope: "orders:update", limit: 80, windowMs: 60_000 },
    });
    if (guarded instanceof Response) return guarded;

    const body = await request.json();
    const updated = await updateOrder(
      { ...body, orderId: params.id },
      guarded.actor.userId,
      guarded.context,
    );

    return ok(updated);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const guarded = await guardRoute(request, {
      roles: [UserRole.OWNER, UserRole.ADMIN],
      rateLimit: { scope: "orders:delete", limit: 40, windowMs: 60_000 },
    });
    if (guarded instanceof Response) return guarded;

    const deleted = await deleteOrder(params.id, guarded.actor.userId, guarded.context);
    return ok(deleted);
  } catch (error) {
    return handleRouteError(error);
  }
}
