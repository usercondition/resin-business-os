"use client";

import { useEffect, useState } from "react";

import { IconUsers } from "@/components/icons";
import { PageHeader } from "@/components/page-header";

type CustomerDetailResponse = {
  customer: {
    id: string;
    fullName: string;
    phone?: string | null;
    email?: string | null;
    leads: Array<{ id: string; title: string; status: string }>;
    orders: Array<{ id: string; orderNumber: string; status: string; balanceDue: string }>;
  };
  timeline: Array<{ id: string; action: string; createdAt: string }>;
};

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<CustomerDetailResponse | null>(null);
  const [message, setMessage] = useState("Loading...");

  useEffect(() => {
    async function load() {
      const response = await fetch(`/api/customers/${params.id}`, { credentials: "include" });
      const json = await response.json();
      if (json.ok) {
        setData(json.data);
        setMessage("Loaded");
      } else {
        setMessage(`Failed: ${json.error?.message ?? "unknown"}`);
      }
    }

    void load();
  }, [params.id]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-4">
      <PageHeader description={message} icon={IconUsers} title="Customer detail" />

      <section className="minimal-panel mt-3">
        <h2 className="text-lg font-semibold text-[color:var(--text)]">{data?.customer.fullName ?? "-"}</h2>
        <p className="minimal-muted text-sm">{data?.customer.phone ?? "No phone"}</p>
        <p className="minimal-muted text-sm">{data?.customer.email ?? "No email"}</p>
      </section>

      <section className="minimal-panel mt-3">
        <h3 className="text-base font-semibold text-[color:var(--text)]">Orders</h3>
        <ul className="mt-2 list-disc pl-5 text-sm text-[color:var(--text)]">
          {(data?.customer.orders ?? []).map((order) => (
            <li key={order.id}>
              <a className="link-terminal underline" href={`/orders/${order.id}`}>
                {order.orderNumber}
              </a>{" "}
              - {order.status} - balance {String(order.balanceDue)}
            </li>
          ))}
        </ul>
      </section>

      <section className="minimal-panel mt-3">
        <h3 className="text-base font-semibold text-[color:var(--text)]">Timeline</h3>
        <ul className="mt-2 list-disc pl-5 text-sm text-[color:var(--text)]">
          {(data?.timeline ?? []).slice(0, 40).map((event) => (
            <li key={event.id}>
              {event.action} - {new Date(event.createdAt).toLocaleString()}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
