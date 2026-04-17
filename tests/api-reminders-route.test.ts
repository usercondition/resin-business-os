import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireRoleMock,
  enforceRateLimitMock,
  generateFollowUpRemindersMock,
} = vi.hoisted(() => ({
  requireRoleMock: vi.fn(),
  enforceRateLimitMock: vi.fn(),
  generateFollowUpRemindersMock: vi.fn(),
}));

vi.mock("@/lib/security/auth", () => ({
  requireRole: requireRoleMock,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  enforceRateLimit: enforceRateLimitMock,
}));

vi.mock("@/server/reminders/reminder-service", () => ({
  generateFollowUpReminders: generateFollowUpRemindersMock,
}));

import { POST } from "@/app/api/reminders/route";

function makeRequest() {
  return new Request("https://example.com/api/reminders", { method: "POST" }) as unknown as import("next/server").NextRequest;
}

describe("/api/reminders route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns auth response when role guard fails", async () => {
    requireRoleMock.mockReturnValue(new Response(JSON.stringify({ ok: false }), { status: 403 }));

    const res = await POST(makeRequest());
    expect(res.status).toBe(403);
  });

  it("returns rate-limited response when limiter triggers", async () => {
    requireRoleMock.mockReturnValue({ userId: "u1", role: "ADMIN" });
    enforceRateLimitMock.mockResolvedValue(new Response(JSON.stringify({ ok: false }), { status: 429 }));

    const res = await POST(makeRequest());
    expect(res.status).toBe(429);
  });

  it("runs reminder engine when allowed", async () => {
    requireRoleMock.mockReturnValue({ userId: "u1", role: "ADMIN" });
    enforceRateLimitMock.mockResolvedValue(null);
    generateFollowUpRemindersMock.mockResolvedValue({ generated: 3 });

    const res = await POST(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(generateFollowUpRemindersMock).toHaveBeenCalledWith("u1");
  });
});
