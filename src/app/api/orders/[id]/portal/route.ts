import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";

import { handleRouteError, ok } from "@/lib/api";
import { guardRoute } from "@/lib/security/guard";
import { loadStaffPortalFeed } from "@/server/portal/portal-service";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const guarded = await guardRoute(request, {
      roles: [UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF],
      rateLimit: { scope: "orders:portal:read", limit: 120, windowMs: 60_000 },
    });
    if (guarded instanceof Response) {
      return guarded;
    }

    const feed = await loadStaffPortalFeed(params.id);
    return ok(feed);
  } catch (error) {
    return handleRouteError(error);
  }
}
