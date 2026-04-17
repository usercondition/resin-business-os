import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  guardRouteMock,
  createOrderMock,
  findManyMock,
  countMock,
} = vi.hoisted(() => ({
  guardRouteMock: vi.fn(),
  createOrderMock: vi.fn(),
  findManyMock: vi.fn(),
  countMock: vi.fn(),
}));

vi.mock("@/lib/security/guard", () => ({
  guardRoute: guardRouteMock,
}));

vi.mock("@/server/domain/orders/order-service", () => ({
  createOrder: createOrderMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    order: {
      findMany: findManyMock,
      count: countMock,
    },
  },
}));

import { GET, POST } from "@/app/api/orders/route";

function makeRequest(method: string, url = "https://example.com/api/orders", body?: unknown) {
  const req = new Request(url, {
    method,
    headers: {
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  }) as unknown as import("next/server").NextRequest;
  (req as unknown as { nextUrl: URL }).nextUrl = new URL(url);
  return req;
}

describe("/api/orders route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns paged order data on GET", async () => {
    guardRouteMock.mockResolvedValue({
      actor: { userId: "u1", role: "ADMIN" },
      context: { requestId: "r1" },
      pagination: { page: 2, pageSize: 10, skip: 10, take: 10 },
    });
    findManyMock.mockResolvedValue([{ id: "o1", orderNumber: "ORD-1" }]);
    countMock.mockResolvedValue(55);

    const res = await GET(makeRequest("GET", "https://example.com/api/orders?page=2&pageSize=10"));
    const json = await res.json();

    expect(json.meta.page).toBe(2);
    expect(json.meta.pageSize).toBe(10);
    expect(json.meta.total).toBe(55);
  });

  it("passes request context to createOrder on POST", async () => {
    guardRouteMock.mockResolvedValue({
      actor: { userId: "actor-2", role: "ADMIN" },
      context: { requestId: "req-2", ipAddress: "127.0.0.2" },
      pagination: { page: 1, pageSize: 25, skip: 0, take: 25 },
    });
    createOrderMock.mockResolvedValue({ id: "o2" });

    const body = { customerId: "c1", items: [{ itemName: "x", quantity: 1, unitPrice: 10 }] };
    const res = await POST(makeRequest("POST", "https://example.com/api/orders", body));

    expect(res.status).toBe(201);
    expect(createOrderMock).toHaveBeenCalledWith(body, "actor-2", {
      requestId: "req-2",
      ipAddress: "127.0.0.2",
    });
  });
});
