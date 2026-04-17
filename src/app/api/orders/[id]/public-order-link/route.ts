import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";

import { handleRouteError, ok } from "@/lib/api";
import { guardRoute } from "@/lib/security/guard";
import { createPublicOrderEditUrl } from "@/server/domain/orders/public-order-workflow-service";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const guarded = await guardRoute(request, {
      roles: [UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF],
      rateLimit: { scope: "orders:public-order-link", limit: 80, windowMs: 60_000 },
    });
    if (guarded instanceof Response) {
      return guarded;
    }

    const { token, url } = createPublicOrderEditUrl(params.id, request.nextUrl.origin);
    return ok({ url, token });
  } catch (error) {
    return handleRouteError(error);
  }
}
