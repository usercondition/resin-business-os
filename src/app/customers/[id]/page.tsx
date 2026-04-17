"use client";

import { useEffect, useState } from "react";

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
      const response = await fetch(`/api/customers/${params.id}`);
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
      <h1 className="text-xl font-semibold text-slate-900">Customer Detail</h1>
      <p className="mt-1 text-sm text-slate-600">{message}</p>

      <section className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">{data?.customer.fullName ?? "-"}</h2>
        <p className="text-sm text-slate-600">{data?.customer.phone ?? "No phone"}</p>
        <p className="text-sm text-slate-600">{data?.customer.email ?? "No email"}</p>
      </section>

      <section className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-base font-semibold">Orders</h3>
        <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
          {(data?.customer.orders ?? []).map((order) => (
            <li key={order.id}>
              <a className="underline" href={`/orders/${order.id}`}>
                {order.orderNumber}
              </a>{" "}
              - {order.status} - balance {String(order.balanceDue)}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-base font-semibold">Timeline</h3>
        <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
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
