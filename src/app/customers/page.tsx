"use client";

import { useEffect, useMemo, useState } from "react";

import { IconArrowRight, IconSearch, IconUsers } from "@/components/icons";
import { PageHeader } from "@/components/page-header";

type Customer = {
  id: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  preferredContactChannel?: string | null;
  defaultAddress?: string | null;
  notes?: string | null;
};

const shopFetch: RequestInit = { credentials: "include" };

export default function CustomerLookupPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("Loading customers...");

  useEffect(() => {
    async function loadCustomers() {
      try {
        const response = await fetch("/api/customers?page=1&pageSize=500", shopFetch);
        const json = await response.json();
        if (!json.ok) {
          throw new Error(json.error?.message ?? "Failed to load customers");
        }
        setCustomers(json.data ?? []);
        setMessage("Customers loaded.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Failed to load customers");
      }
    }
    void loadCustomers();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((customer) => {
      const blob = [
        customer.fullName,
        customer.email ?? "",
        customer.phone ?? "",
        customer.preferredContactChannel ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [customers, search]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-4">
      <PageHeader
        description="Alphabetical customer list with personal and contact details."
        icon={IconUsers}
        title="Customers"
      />
      <p className="minimal-panel minimal-panel-elevated mt-3 text-sm">{message}</p>

      <div className="relative mt-4 max-w-sm">
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]">
          <IconSearch size={16} />
        </span>
        <input
          className="w-full rounded-md border border-[var(--border)] bg-transparent py-2 pl-9 pr-3 text-sm"
          placeholder="Search customers"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <section className="minimal-grid-dynamic mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((customer) => (
          <article className="minimal-panel minimal-panel-elevated" key={customer.id}>
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-base font-semibold">{customer.fullName}</h2>
              <a className="app-button inline-flex items-center gap-1 text-xs" href={`/customers/${customer.id}`}>
                Open
                <IconArrowRight size={12} />
              </a>
            </div>
            <p className="minimal-muted mt-2 text-xs">ID: {customer.id}</p>
            <div className="mt-3 grid gap-1 text-sm">
              <p>
                <span className="minimal-muted">Email:</span> {customer.email || "—"}
              </p>
              <p>
                <span className="minimal-muted">Phone:</span> {customer.phone || "—"}
              </p>
              <p>
                <span className="minimal-muted">Preferred contact:</span> {customer.preferredContactChannel || "—"}
              </p>
              <p>
                <span className="minimal-muted">Address:</span> {customer.defaultAddress || "—"}
              </p>
            </div>
            {customer.notes ? (
              <p className="minimal-muted mt-3 rounded-md border border-[var(--border)] p-2 text-xs">{customer.notes}</p>
            ) : null}
          </article>
        ))}
        {filtered.length === 0 ? <p className="minimal-muted text-sm">No customers found.</p> : null}
      </section>
    </main>
  );
}
