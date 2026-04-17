import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { z } from "zod";

import { handleRouteError, ok } from "@/lib/api";
import { guardRoute } from "@/lib/security/guard";
import { createPortalStaffPhoto } from "@/server/portal/portal-service";

const bodySchema = z.object({
  mimeType: z.string().min(3).max(64),
  imageBase64: z.string().min(20),
  caption: z.string().max(500).optional().nullable(),
  visibleToClient: z.boolean().optional(),
});

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const guarded = await guardRoute(request, {
      roles: [UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF],
      rateLimit: { scope: "orders:portal:photo", limit: 40, windowMs: 60_000 },
    });
    if (guarded instanceof Response) {
      return guarded;
    }

    const parsed = bodySchema.parse(await request.json());
    const photo = await createPortalStaffPhoto(params.id, guarded.actor.userId, parsed);
    return ok(
      {
        id: photo.id,
        createdAt: photo.createdAt.toISOString(),
        visibleToClient: photo.visibleToClient,
      },
      { status: 201 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
