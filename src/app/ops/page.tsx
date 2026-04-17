"use client";

import { FormEvent, useState } from "react";

type ApiResult = {
  ok: boolean;
  data?: unknown;
  error?: { message: string };
};

async function callApi(path: string, method: string, body?: unknown): Promise<ApiResult> {
  const response = await fetch(path, {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return response.json();
}

export default function OpsPage() {
  const [customerName, setCustomerName] = useState("");
  const [leadTitle, setLeadTitle] = useState("");
  const [orderCustomerId, setOrderCustomerId] = useState("");
  const [orderItemName, setOrderItemName] = useState("Custom Resin Part");
  const [orderQty, setOrderQty] = useState(1);
  const [orderPrice, setOrderPrice] = useState(25);
  const [statusOrderId, setStatusOrderId] = useState("");
  const [nextStatus, setNextStatus] = useState("CONFIRMED");
  const [message, setMessage] = useState("Ready");

  async function submitCustomer(event: FormEvent) {
    event.preventDefault();
    const result = await callApi("/api/customers", "POST", { fullName: customerName, tags: [] });
    setMessage(result.ok ? "Customer created" : `Customer failed: ${result.error?.message}`);
  }

  async function submitLead(event: FormEvent) {
    event.preventDefault();
    const result = await callApi("/api/leads", "POST", {
      source: "manual",
      title: leadTitle,
    });
    setMessage(result.ok ? "Lead created" : `Lead failed: ${result.error?.message}`);
  }

  async function submitOrder(event: FormEvent) {
    event.preventDefault();
    const result = await callApi("/api/orders", "POST", {
      customerId: orderCustomerId,
      items: [
        {
          itemName: orderItemName,
          quantity: Number(orderQty),
          unitPrice: Number(orderPrice),
        },
      ],
      tax: 0,
      discount: 0,
    });
    setMessage(result.ok ? "Order created" : `Order failed: ${result.error?.message}`);
  }

  async function submitStatus(event: FormEvent) {
    event.preventDefault();
    const result = await callApi("/api/orders/status?kind=order", "POST", {
      orderId: statusOrderId,
      status: nextStatus,
    });
    setMessage(result.ok ? "Order status updated" : `Status update failed: ${result.error?.message}`);
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-4">
      <h1 className="text-xl font-semibold">Ops Quick Actions</h1>
      <p className="minimal-muted text-sm">Mobile-first forms for day-to-day entry and status changes.</p>
      <p className="minimal-panel p-2 text-sm">{message}</p>
      <a className="app-button" href="/ops/imports">
        Open Import Review Queue
      </a>

      <form className="minimal-panel p-3" onSubmit={submitCustomer}>
        <h2 className="text-base font-semibold">New Customer</h2>
        <input
          className="mt-2 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
          placeholder="Customer name"
          value={customerName}
          onChange={(event) => setCustomerName(event.target.value)}
          required
        />
        <button className="minimal-cta mt-2 w-full text-center" type="submit">
          Create Customer
        </button>
      </form>

      <form className="minimal-panel p-3" onSubmit={submitLead}>
        <h2 className="text-base font-semibold">New Lead</h2>
        <input
          className="mt-2 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
          placeholder="Lead title"
          value={leadTitle}
          onChange={(event) => setLeadTitle(event.target.value)}
          required
        />
        <button className="minimal-cta mt-2 w-full text-center" type="submit">
          Create Lead
        </button>
      </form>

      <form className="minimal-panel p-3" onSubmit={submitOrder}>
        <h2 className="text-base font-semibold">Quick Order</h2>
        <input
          className="mt-2 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
          placeholder="Customer ID"
          value={orderCustomerId}
          onChange={(event) => setOrderCustomerId(event.target.value)}
          required
        />
        <input
          className="mt-2 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
          placeholder="Item name"
          value={orderItemName}
          onChange={(event) => setOrderItemName(event.target.value)}
          required
        />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input
            className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
            type="number"
            min={1}
            value={orderQty}
            onChange={(event) => setOrderQty(Number(event.target.value))}
          />
          <input
            className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
            type="number"
            min={0}
            step="0.01"
            value={orderPrice}
            onChange={(event) => setOrderPrice(Number(event.target.value))}
          />
        </div>
        <button className="minimal-cta mt-2 w-full text-center" type="submit">
          Create Order
        </button>
      </form>

      <form className="minimal-panel p-3" onSubmit={submitStatus}>
        <h2 className="text-base font-semibold">Update Order Status</h2>
        <input
          className="mt-2 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
          placeholder="Order ID"
          value={statusOrderId}
          onChange={(event) => setStatusOrderId(event.target.value)}
          required
        />
        <select
          className="mt-2 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
          value={nextStatus}
          onChange={(event) => setNextStatus(event.target.value)}
        >
          <option value="CONFIRMED">CONFIRMED</option>
          <option value="IN_PRODUCTION">IN_PRODUCTION</option>
          <option value="READY">READY</option>
          <option value="DELIVERED">DELIVERED</option>
          <option value="CLOSED">CLOSED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
        <button className="minimal-cta mt-2 w-full text-center" type="submit">
          Update Status
        </button>
      </form>
    </main>
  );
}
