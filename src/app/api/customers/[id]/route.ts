import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";

import { handleRouteError, ok } from "@/lib/api";
import { guardRoute } from "@/lib/security/guard";
import { getCustomerDetail } from "@/server/analytics/detail-service";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const guarded = await guardRoute(request, {
      roles: [UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF],
      rateLimit: { scope: "customers:detail", limit: 120, windowMs: 60_000 },
    });
    if (guarded instanceof Response) {
      return guarded;
    }

    const detail = await getCustomerDetail(params.id);
    return ok(detail);
  } catch (error) {
    return handleRouteError(error);
  }
}
