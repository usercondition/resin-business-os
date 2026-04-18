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

/** Structured HTTP error for route handlers (handled by `handleRouteError`). */
export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number = 400,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

function firstZodMessage(error: ZodError): string {
  const first = error.errors[0];
  if (!first) return "Validation failed";
  const path = first.path.length ? `${first.path.join(".")}: ` : "";
  return `${path}${first.message}`;
}

export function handleRouteError(error: unknown) {
  if (error instanceof ZodError) {
    return fail(firstZodMessage(error), 422, error.flatten());
  }

  if (error instanceof HttpError) {
    return fail(error.message, error.status);
  }

  if (error instanceof Error) {
    return fail(error.message, 500);
  }

  return fail("Unexpected server error", 500);
}
