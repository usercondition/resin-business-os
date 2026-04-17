import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";

import { handleRouteError, ok } from "@/lib/api";
import { requireRole } from "@/lib/security/auth";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import {
  updateOrderDeliveryStatus,
  updateOrderProductionStatus,
  updateOrderStatus,
} from "@/server/domain/orders/order-status-service";

export async function POST(request: NextRequest) {
  try {
    const actor = requireRole(request, [UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF]);
    if (actor instanceof Response) return actor;
    const limited = await enforceRateLimit(request, "orders:status-update", 120, 60_000);
    if (limited) return limited;

    const body = await request.json();

    const kind = request.nextUrl.searchParams.get("kind") ?? "order";

    if (kind === "production") {
      const updated = await updateOrderProductionStatus(body, actor.userId);
      return ok(updated);
    }

    if (kind === "delivery") {
      const updated = await updateOrderDeliveryStatus(body, actor.userId);
      return ok(updated);
    }

    const updated = await updateOrderStatus(body, actor.userId);
    return ok(updated);
  } catch (error) {
    return handleRouteError(error);
  }
}

