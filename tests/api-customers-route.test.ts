import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  guardRouteMock,
  createCustomerMock,
  findManyMock,
  countMock,
} = vi.hoisted(() => ({
  guardRouteMock: vi.fn(),
  createCustomerMock: vi.fn(),
  findManyMock: vi.fn(),
  countMock: vi.fn(),
}));

vi.mock("@/lib/security/guard", () => ({
  guardRoute: guardRouteMock,
}));

vi.mock("@/server/domain/customers/customer-service", () => ({
  createCustomer: createCustomerMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    customer: {
      findMany: findManyMock,
      count: countMock,
    },
  },
}));

import { GET, POST } from "@/app/api/customers/route";

function makeRequest(method: string, url = "https://example.com/api/customers", body?: unknown) {
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

describe("/api/customers route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns auth response when guard blocks GET", async () => {
    guardRouteMock.mockResolvedValue(new Response(JSON.stringify({ ok: false }), { status: 401 }));

    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(401);
  });

  it("returns paged customers when guard passes GET", async () => {
    guardRouteMock.mockResolvedValue({
      actor: { userId: "u1", role: "ADMIN" },
      context: { requestId: "r1" },
      pagination: { page: 1, pageSize: 25, skip: 0, take: 25 },
    });
    findManyMock.mockResolvedValue([{ id: "c1", fullName: "A" }]);
    countMock.mockResolvedValue(1);

    const res = await GET(makeRequest("GET"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.meta.total).toBe(1);
  });

  it("passes actor and context into createCustomer", async () => {
    guardRouteMock.mockResolvedValue({
      actor: { userId: "actor-1", role: "ADMIN" },
      context: { requestId: "req-1", ipAddress: "127.0.0.1" },
      pagination: { page: 1, pageSize: 25, skip: 0, take: 25 },
    });
    createCustomerMock.mockResolvedValue({ id: "c2" });

    const res = await POST(makeRequest("POST", "https://example.com/api/customers", { fullName: "Test" }));

    expect(res.status).toBe(201);
    expect(createCustomerMock).toHaveBeenCalledWith(
      { fullName: "Test" },
      "actor-1",
      { requestId: "req-1", ipAddress: "127.0.0.1" },
    );
  });
});
