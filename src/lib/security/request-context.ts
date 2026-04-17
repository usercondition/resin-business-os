import { randomUUID } from "crypto";

import { NextRequest } from "next/server";

export type RequestContext = {
  requestId: string;
  ipAddress?: string;
};

export function getRequestContext(request: NextRequest): RequestContext {
  const requestId =
    request.headers.get("x-request-id") ??
    request.headers.get("x-correlation-id") ??
    randomUUID();

  const ipAddress =
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    undefined;

  return { requestId, ipAddress };
}
