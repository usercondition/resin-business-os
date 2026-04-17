import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireRoleMock,
  enforceRateLimitMock,
  parseCsvImportMock,
  checkIdempotencyMock,
  stageCsvImportMock,
  storeIdempotencyResultMock,
} = vi.hoisted(() => ({
  requireRoleMock: vi.fn(),
  enforceRateLimitMock: vi.fn(),
  parseCsvImportMock: vi.fn(),
  checkIdempotencyMock: vi.fn(),
  stageCsvImportMock: vi.fn(),
  storeIdempotencyResultMock: vi.fn(),
}));

vi.mock("@/lib/security/auth", () => ({
  requireRole: requireRoleMock,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  enforceRateLimit: enforceRateLimitMock,
}));

vi.mock("@/server/imports/csv-import-service", () => ({
  parseCsvImport: parseCsvImportMock,
  stageCsvImport: stageCsvImportMock,
}));

vi.mock("@/server/imports/idempotency-service", () => ({
  checkIdempotency: checkIdempotencyMock,
  storeIdempotencyResult: storeIdempotencyResultMock,
}));

import { POST } from "@/app/api/imports/csv/route";

function makeRequest(body: unknown, idempotencyKey?: string) {
  return new Request("https://example.com/api/imports/csv", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(idempotencyKey ? { "x-idempotency-key": idempotencyKey } : {}),
    },
    body: JSON.stringify(body),
  }) as unknown as import("next/server").NextRequest;
}

describe("/api/imports/csv route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("replays previous idempotent response", async () => {
    requireRoleMock.mockReturnValue({ userId: "u1", role: "OWNER" });
    enforceRateLimitMock.mockResolvedValue(null);
    parseCsvImportMock.mockReturnValue({ source: "x", entityType: "lead", rows: [{ a: 1 }] });
    checkIdempotencyMock.mockResolvedValue({ replay: true, statusCode: 201, response: { syncLogId: "s-r" } });

    const res = await POST(makeRequest({ source: "x", entityType: "lead", rows: [{ a: 1 }] }, "k1"));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data.syncLogId).toBe("s-r");
    expect(stageCsvImportMock).not.toHaveBeenCalled();
  });

  it("stages import and stores idempotency", async () => {
    requireRoleMock.mockReturnValue({ userId: "u2", role: "OWNER" });
    enforceRateLimitMock.mockResolvedValue(null);
    parseCsvImportMock.mockReturnValue({ source: "x", entityType: "lead", rows: [{ a: 1 }] });
    checkIdempotencyMock.mockResolvedValue({ replay: false });
    stageCsvImportMock.mockResolvedValue({ syncLogId: "s-new", stagedRows: 1 });

    const parsed = { source: "x", entityType: "lead", rows: [{ a: 1 }] };
    const res = await POST(makeRequest(parsed, "k2"));
    expect(res.status).toBe(201);
    expect(stageCsvImportMock).toHaveBeenCalledWith(parsed);
    expect(storeIdempotencyResultMock).toHaveBeenCalledWith(
      "import:csv-stage",
      "k2",
      parsed,
      { syncLogId: "s-new", stagedRows: 1 },
      201,
    );
  });
});
