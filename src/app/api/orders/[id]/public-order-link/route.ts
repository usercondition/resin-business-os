import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";

import { handleRouteError, ok } from "@/lib/api";
import { env } from "@/lib/env";
import { guardRoute } from "@/lib/security/guard";
import { createPublicOrderEditToken } from "@/server/public-order-edit-token";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const guarded = await guardRoute(request, {
      roles: [UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF],
      rateLimit: { scope: "orders:public-order-link", limit: 80, windowMs: 60_000 },
    });
    if (guarded instanceof Response) {
      return guarded;
    }

    const token = createPublicOrderEditToken(params.id);
    const origin = env.APP_URL || request.nextUrl.origin;
    const url = `${origin.replace(/\/$/, "")}/public/order-form?token=${encodeURIComponent(token)}`;
    return ok({ url, token });
  } catch (error) {
    return handleRouteError(error);
  }
}
