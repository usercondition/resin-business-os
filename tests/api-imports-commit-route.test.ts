import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireRoleMock,
  enforceRateLimitMock,
  parseCommitImportInputMock,
  checkIdempotencyMock,
  commitStagedImportMock,
  storeIdempotencyResultMock,
} = vi.hoisted(() => ({
  requireRoleMock: vi.fn(),
  enforceRateLimitMock: vi.fn(),
  parseCommitImportInputMock: vi.fn(),
  checkIdempotencyMock: vi.fn(),
  commitStagedImportMock: vi.fn(),
  storeIdempotencyResultMock: vi.fn(),
}));

vi.mock("@/lib/security/auth", () => ({
  requireRole: requireRoleMock,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  enforceRateLimit: enforceRateLimitMock,
}));

vi.mock("@/server/imports/import-commit-service", () => ({
  parseCommitImportInput: parseCommitImportInputMock,
  commitStagedImport: commitStagedImportMock,
}));

vi.mock("@/server/imports/idempotency-service", () => ({
  checkIdempotency: checkIdempotencyMock,
  storeIdempotencyResult: storeIdempotencyResultMock,
}));

import { POST } from "@/app/api/imports/commit/route";

function makeRequest(body: unknown, idempotencyKey?: string) {
  return new Request("https://example.com/api/imports/commit", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(idempotencyKey ? { "x-idempotency-key": idempotencyKey } : {}),
    },
    body: JSON.stringify(body),
  }) as unknown as import("next/server").NextRequest;
}

describe("/api/imports/commit route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns replayed idempotent response", async () => {
    requireRoleMock.mockReturnValue({ userId: "u1", role: "OWNER" });
    enforceRateLimitMock.mockResolvedValue(null);
    parseCommitImportInputMock.mockReturnValue({ syncLogId: "s1", dryRun: false });
    checkIdempotencyMock.mockResolvedValue({ replay: true, statusCode: 200, response: { replayed: true } });

    const res = await POST(makeRequest({ syncLogId: "s1" }, "idem-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.replayed).toBe(true);
    expect(commitStagedImportMock).not.toHaveBeenCalled();
  });

  it("commits and stores idempotency when no replay", async () => {
    requireRoleMock.mockReturnValue({ userId: "u2", role: "OWNER" });
    enforceRateLimitMock.mockResolvedValue(null);
    parseCommitImportInputMock.mockReturnValue({ syncLogId: "s2", dryRun: false });
    checkIdempotencyMock.mockResolvedValue({ replay: false });
    commitStagedImportMock.mockResolvedValue({ syncLogId: "s2", committed: 3 });

    const res = await POST(makeRequest({ syncLogId: "s2" }, "idem-2"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(commitStagedImportMock).toHaveBeenCalledWith({ syncLogId: "s2", dryRun: false });
    expect(storeIdempotencyResultMock).toHaveBeenCalledWith(
      "import:commit",
      "idem-2",
      { syncLogId: "s2", dryRun: false },
      { syncLogId: "s2", committed: 3 },
      200,
    );
  });
});
