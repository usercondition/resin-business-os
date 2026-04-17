"use client";

import { useEffect, useMemo, useState } from "react";

import { IconActivity, IconSearch } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { formatUsd } from "@/lib/format-money";

type OrderRow = {
  id: string;
  orderNumber: string;
  status: string;
  productionStatus: string;
  paymentStatus: string;
  deliveryStatus?: string | null;
  total: string;
  balanceDue: string;
  dueDate?: string | null;
  customer: { fullName: string };
};

const shopFetch: RequestInit = { credentials: "include" };

const CLOSED_ORDER_STATUSES = new Set(["CLOSED", "CANCELLED"]);

export default function ActiveOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("Loading active orders...");

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/orders?page=1&pageSize=200", shopFetch);
        const json = await response.json();
        if (!json.ok) {
          throw new Error(json.error?.message ?? "Failed to load orders");
        }
        setOrders(json.data ?? []);
        setMessage("Active orders loaded.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Failed to load orders");
      }
    }
    void load();
  }, []);

  const activeOrders = useMemo(
    () =>
      orders.filter((order) => !CLOSED_ORDER_STATUSES.has(order.status)).filter((order) => {
        if (!search.trim()) return true;
        const q = search.trim().toLowerCase();
        return (
          order.orderNumber.toLowerCase().includes(q) ||
          order.customer.fullName.toLowerCase().includes(q) ||
          order.status.toLowerCase().includes(q) ||
          order.productionStatus.toLowerCase().includes(q) ||
          order.paymentStatus.toLowerCase().includes(q)
        );
      }),
    [orders, search],
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-4">
      <PageHeader
        description="Live operational queue of open orders. Closed and cancelled orders are excluded."
        icon={IconActivity}
        title="Active orders"
      />
      <p className="minimal-panel mt-3 text-sm">{message}</p>

      <section className="minimal-panel mt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Open order containers ({activeOrders.length})</h2>
          <div className="relative w-full max-w-xs">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]">
              <IconSearch size={16} />
            </span>
            <input
              className="w-full rounded-md border border-[var(--border)] bg-transparent py-2 pl-9 pr-3 text-sm"
              placeholder="Search active orders"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        <div className="mt-3 grid gap-2">
          {activeOrders.map((order) => (
            <article className="rounded-md border border-[var(--border)] p-3" key={order.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{order.orderNumber}</p>
                  <p className="minimal-muted text-xs">Customer: {order.customer.fullName}</p>
                  <p className="minimal-muted text-xs">
                    {order.status} · production {order.productionStatus} · payment {order.paymentStatus}
                    {order.deliveryStatus ? ` · delivery ${order.deliveryStatus}` : ""}
                  </p>
                  <p className="minimal-muted text-xs">
                    Total {formatUsd(Number(order.total))} · Balance {formatUsd(Number(order.balanceDue))}
                  </p>
                </div>
                <div className="flex gap-2">
                  <a className="app-button" href={`/orders/${order.id}`}>
                    Open
                  </a>
                  <a className="app-button" href="/orders">
                    All orders
                  </a>
                </div>
              </div>
            </article>
          ))}
          {activeOrders.length === 0 ? (
            <p className="minimal-muted text-sm">No active orders found.</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
