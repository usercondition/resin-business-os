import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireRoleMock,
  enforceRateLimitMock,
  updateOrderStatusMock,
  updateOrderProductionStatusMock,
  updateOrderDeliveryStatusMock,
} = vi.hoisted(() => ({
  requireRoleMock: vi.fn(),
  enforceRateLimitMock: vi.fn(),
  updateOrderStatusMock: vi.fn(),
  updateOrderProductionStatusMock: vi.fn(),
  updateOrderDeliveryStatusMock: vi.fn(),
}));

vi.mock("@/lib/security/auth", () => ({
  requireRole: requireRoleMock,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  enforceRateLimit: enforceRateLimitMock,
}));

vi.mock("@/server/domain/orders/order-status-service", () => ({
  updateOrderStatus: updateOrderStatusMock,
  updateOrderProductionStatus: updateOrderProductionStatusMock,
  updateOrderDeliveryStatus: updateOrderDeliveryStatusMock,
}));

import { POST } from "@/app/api/orders/status/route";

function makeRequest(kind?: string, body: unknown = { orderId: "o1", status: "CONFIRMED" }) {
  const query = kind ? `?kind=${kind}` : "";
  const url = `https://example.com/api/orders/status${query}`;
  const req = new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as import("next/server").NextRequest;
  (req as unknown as { nextUrl: URL }).nextUrl = new URL(url);
  return req;
}

describe("/api/orders/status route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks when role auth fails", async () => {
    requireRoleMock.mockReturnValue(new Response(JSON.stringify({ ok: false }), { status: 403 }));

    const res = await POST(makeRequest());
    expect(res.status).toBe(403);
  });

  it("blocks when rate limited", async () => {
    requireRoleMock.mockReturnValue({ userId: "u1", role: "ADMIN" });
    enforceRateLimitMock.mockResolvedValue(new Response(JSON.stringify({ ok: false }), { status: 429 }));

    const res = await POST(makeRequest());
    expect(res.status).toBe(429);
  });

  it("routes to production status updater", async () => {
    requireRoleMock.mockReturnValue({ userId: "u2", role: "ADMIN" });
    enforceRateLimitMock.mockResolvedValue(null);
    updateOrderProductionStatusMock.mockResolvedValue({ id: "o1", productionStatus: "PRINTING" });

    const res = await POST(makeRequest("production", { orderId: "o1", productionStatus: "PRINTING" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(updateOrderProductionStatusMock).toHaveBeenCalledWith(
      { orderId: "o1", productionStatus: "PRINTING" },
      "u2",
    );
  });

  it("routes to delivery updater", async () => {
    requireRoleMock.mockReturnValue({ userId: "u3", role: "ADMIN" });
    enforceRateLimitMock.mockResolvedValue(null);
    updateOrderDeliveryStatusMock.mockResolvedValue({ id: "o1", deliveryStatus: "COMPLETED" });

    const res = await POST(makeRequest("delivery", { orderId: "o1", deliveryStatus: "COMPLETED" }));
    expect(res.status).toBe(200);
    expect(updateOrderDeliveryStatusMock).toHaveBeenCalled();
  });

  it("uses default order status updater", async () => {
    requireRoleMock.mockReturnValue({ userId: "u4", role: "ADMIN" });
    enforceRateLimitMock.mockResolvedValue(null);
    updateOrderStatusMock.mockResolvedValue({ id: "o1", status: "CONFIRMED" });

    const res = await POST(makeRequest(undefined, { orderId: "o1", status: "CONFIRMED" }));
    expect(res.status).toBe(200);
    expect(updateOrderStatusMock).toHaveBeenCalledWith({ orderId: "o1", status: "CONFIRMED" }, "u4");
  });
});
