import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function okPage<T>(
  data: T,
  meta: { page: number; pageSize: number; total: number },
  init?: ResponseInit,
) {
  return NextResponse.json({ ok: true, data, meta }, init);
}

export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ ok: false, error: { message, details } }, { status });
}

export function handleRouteError(error: unknown) {
  if (error instanceof ZodError) {
    return fail("Validation failed", 422, error.flatten());
  }

  if (error instanceof Error) {
    return fail(error.message, 500);
  }

  return fail("Unexpected server error", 500);
}
