"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { OrderIntakeStrip } from "@/components/order-intake-strip";
import { OrderPortalPanel } from "@/components/order-portal-panel";

const shopFetch: RequestInit = { credentials: "include" };

type OrderDetailResponse = {
  order: {
    id: string;
    orderNumber: string;
    status: string;
    productionStatus: string;
    paymentStatus: string;
    deliveryStatus?: string | null;
    balanceDue: string;
    customer: { id: string; fullName: string };
    items: Array<{ id: string; itemName: string; quantity: number; lineTotal: string }>;
    productionJobs: Array<{ id: string; status: string; machineName?: string | null }>;
    payments: Array<{ id: string; amount: string; method: string; paidAt: string }>;
    deliveries: Array<{ id: string; type: string; status: string; scheduledAt?: string | null }>;
  };
  timeline: Array<{ id: string; action: string; createdAt: string }>;
};

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [data, setData] = useState<OrderDetailResponse | null>(null);
  const [message, setMessage] = useState("Loading...");
  const [portalUrl, setPortalUrl] = useState("");

  useEffect(() => {
    setPortalUrl(`${window.location.origin}/portal`);
  }, []);

  useEffect(() => {
    async function load() {
      const response = await fetch(`/api/orders/${params.id}`, shopFetch);
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
    <main className="mx-auto max-w-4xl py-2">
      <button
        className="app-button mb-3"
        onClick={() => {
          if (window.history.length > 1) router.back();
          else router.push("/orders");
        }}
        type="button"
      >
        Back to orders
      </button>
      <h1 className="text-xl font-semibold">Order</h1>
      <p className="minimal-muted mt-1 text-sm">Complete order context: workflow state, client updates, and timeline.</p>
      <p className="minimal-muted mt-1 text-sm">{message}</p>

      {data?.order ? (
        <OrderIntakeStrip orderId={data.order.id} orderNumber={data.order.orderNumber} status={data.order.status} />
      ) : null}

      <section className="minimal-panel mt-3">
        <h2 className="text-lg font-semibold">{data?.order.orderNumber ?? "-"}</h2>
        <p className="minimal-muted mt-1 text-sm">Customer: {data?.order.customer.fullName ?? "-"}</p>
        <p className="minimal-muted mt-1 text-sm">
          Status: {data?.order.status} | Production: {data?.order.productionStatus} | Payment: {data?.order.paymentStatus}
        </p>
        <p className="minimal-muted mt-1 text-sm">Balance due: {String(data?.order.balanceDue ?? 0)}</p>
      </section>

      {portalUrl ? <OrderPortalPanel orderId={params.id} portalUrl={portalUrl} /> : null}

      <section className="minimal-panel mt-3">
        <h3 className="text-base font-semibold">Items</h3>
        <ul className="minimal-muted mt-2 list-disc pl-5 text-sm">
          {(data?.order.items ?? []).map((item) => (
            <li key={item.id}>
              {item.itemName} x{item.quantity} — {String(item.lineTotal)}
            </li>
          ))}
        </ul>
      </section>

      <section className="minimal-panel mt-3">
        <h3 className="text-base font-semibold">Timeline</h3>
        <ul className="minimal-muted mt-2 list-disc pl-5 text-sm">
          {(data?.timeline ?? []).slice(0, 40).map((event) => (
            <li key={event.id}>
              {event.action} — {new Date(event.createdAt).toLocaleString()}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
