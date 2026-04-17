import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { z } from "zod";

import { handleRouteError, ok } from "@/lib/api";
import { guardRoute } from "@/lib/security/guard";
import { createPortalStaffMessage } from "@/server/portal/portal-service";

const bodySchema = z.object({
  body: z.string().min(1).max(4000),
});

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const guarded = await guardRoute(request, {
      roles: [UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF],
      rateLimit: { scope: "orders:portal:message", limit: 80, windowMs: 60_000 },
    });
    if (guarded instanceof Response) {
      return guarded;
    }

    const parsed = bodySchema.parse(await request.json());
    const msg = await createPortalStaffMessage(params.id, guarded.actor.userId, parsed.body);
    return ok({ id: msg.id, createdAt: msg.createdAt.toISOString() }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
