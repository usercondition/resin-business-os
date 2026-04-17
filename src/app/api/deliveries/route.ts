import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";

import { handleRouteError, ok, okPage } from "@/lib/api";
import { parsePagination } from "@/lib/pagination/params";
import { requireAuth, requireRole } from "@/lib/security/auth";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { createDelivery, listDeliveries, updateDelivery } from "@/server/domain/orders/delivery-service";

export async function GET(request: NextRequest) {
  try {
    const actor = requireAuth(request);
    if (actor instanceof Response) return actor;
    const limited = await enforceRateLimit(request, "deliveries:list", 120, 60_000);
    if (limited) return limited;
    const pagination = parsePagination(request);

    const orderId = request.nextUrl.searchParams.get("orderId") ?? undefined;
    const deliveries = await listDeliveries(orderId);
    const paged = deliveries.slice(pagination.skip, pagination.skip + pagination.take);
    return okPage(paged, {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total: deliveries.length,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = requireRole(request, [UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF]);
    if (actor instanceof Response) return actor;
    const limited = await enforceRateLimit(request, "deliveries:create", 80, 60_000);
    if (limited) return limited;

    const body = await request.json();
    const delivery = await createDelivery(body, actor.userId);
    return ok(delivery, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const actor = requireRole(request, [UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF]);
    if (actor instanceof Response) return actor;
    const limited = await enforceRateLimit(request, "deliveries:update", 80, 60_000);
    if (limited) return limited;

    const body = await request.json();
    const delivery = await updateDelivery(body, actor.userId);
    return ok(delivery);
  } catch (error) {
    return handleRouteError(error);
  }
}

