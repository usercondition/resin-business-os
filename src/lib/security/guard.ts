import { UserRole } from "@prisma/client";
import { NextRequest } from "next/server";

import { parsePagination } from "@/lib/pagination/params";
import { requireAuth, requireRole, RequestActor } from "@/lib/security/auth";
import { getRequestContext, RequestContext } from "@/lib/security/request-context";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export type GuardedRequest = {
  actor: RequestActor;
  context: RequestContext;
  pagination: ReturnType<typeof parsePagination>;
};

type GuardOptions = {
  roles?: UserRole[];
  rateLimit?: {
    scope: string;
    limit: number;
    windowMs: number;
  };
  parsePaging?: boolean;
};

export async function guardRoute(
  request: NextRequest,
  options: GuardOptions = {},
): Promise<GuardedRequest | Response> {
  const actor = options.roles?.length
    ? requireRole(request, options.roles)
    : requireAuth(request);

  if (actor instanceof Response) {
    return actor;
  }

  if (options.rateLimit) {
    const limited = await enforceRateLimit(
      request,
      options.rateLimit.scope,
      options.rateLimit.limit,
      options.rateLimit.windowMs,
    );
    if (limited) {
      return limited;
    }
  }

  return {
    actor,
    context: getRequestContext(request),
    pagination: options.parsePaging ? parsePagination(request) : parsePagination(request),
  };
}
