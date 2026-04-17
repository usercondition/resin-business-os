import { UserRole } from "@prisma/client";
import { NextRequest } from "next/server";

import { fail } from "@/lib/api";

export type RequestActor = {
  userId: string;
  role: UserRole;
};

export function getRequestActor(request: NextRequest): RequestActor | null {
  const userId = request.headers.get("x-user-id");
  const roleHeader = request.headers.get("x-user-role");

  if (!userId || !roleHeader) {
    return null;
  }

  const role = roleHeader.toUpperCase();
  if (!Object.values(UserRole).includes(role as UserRole)) {
    return null;
  }

  return { userId, role: role as UserRole };
}

export function requireAuth(request: NextRequest): RequestActor | Response {
  const actor = getRequestActor(request);
  if (!actor) {
    return fail("Authentication required", 401);
  }
  return actor;
}

export function requireRole(
  request: NextRequest,
  allowed: UserRole[],
): RequestActor | Response {
  const actor = getRequestActor(request);
  if (!actor) {
    return fail("Authentication required", 401);
  }

  if (!allowed.includes(actor.role)) {
    return fail("Insufficient permissions", 403);
  }

  return actor;
}
