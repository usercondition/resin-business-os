"use client";

import { useState } from "react";

export default function CustomerLookupPage() {
  const [customerId, setCustomerId] = useState("");

  return (
    <main className="mx-auto max-w-md px-4 py-4">
      <h1 className="text-xl font-semibold text-slate-900">Customer Timeline Lookup</h1>
      <p className="mt-1 text-sm text-slate-600">Open a customer detail view quickly by ID.</p>
      <input
        className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        value={customerId}
        onChange={(e) => setCustomerId(e.target.value)}
        placeholder="Customer ID"
      />
      <a
        className="mt-2 inline-block rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
        href={customerId ? `/customers/${customerId}` : "#"}
      >
        Open Customer
      </a>
    </main>
  );
}
