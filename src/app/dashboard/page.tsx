"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Metrics = {
  leadOpen: number;
  quoteDraftOrSent: number;
  ordersActive: number;
  unpaidOrders: number;
  overdueOrders: number;
  monthlyRevenue: number;
  productionByStatus: Array<{ productionStatus: string; _count: { _all: number } }>;
  inboundMessages24h: number;
  pendingImportDuplicates: number;
  dueFollowUps: number;
  nextSteps: {
    draftInquiryOrdersCount: number;
    recentDraftInquiryOrders: Array<{ id: string; orderNumber: string; customerName: string }>;
  };
  recentInboundMessages: Array<{
    id: string;
    customerName: string;
    channel: string;
    messageText: string;
    receivedAt: string;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    entityType: string;
    createdAt: string;
  }>;
};

const shopFetch: RequestInit = { credentials: "include" };
const shopJsonFetch: RequestInit = {
  credentials: "include",
  headers: { "Content-Type": "application/json" },
};

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [message, setMessage] = useState("Loading...");

  async function loadData() {
    const response = await fetch("/api/dashboard", shopFetch);
    const json = await response.json();
    if (json.ok) {
      setMetrics(json.data);
      setMessage("Dashboard loaded");
    } else {
      setMessage(`Failed to load dashboard: ${json.error?.message ?? "unknown"}`);
    }
  }

  async function runReminders() {
    const response = await fetch("/api/reminders", {
      method: "POST",
      ...shopJsonFetch,
    });
    const json = await response.json();
    setMessage(json.ok ? `Reminders generated: ${json.data.generated}` : `Reminder run failed: ${json.error?.message}`);
  }

  useEffect(() => {
    void loadData();
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-4 py-4">
      <h1 className="text-xl font-semibold">Operations Dashboard</h1>
      <p className="minimal-muted mt-1 text-sm">
        At-a-glance hub for sales pipeline, reply queue, import review, and production priorities.
      </p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="status-pill">Live Operations View</p>
        <p className="minimal-muted text-xs">Auto-refresh available with manual controls.</p>
      </div>
      <p className="minimal-panel minimal-panel-elevated mt-3 text-sm">{message}</p>

      <NextStepsStrip metrics={metrics} />

      <div className="minimal-grid-dynamic mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Open Leads" value={metrics?.leadOpen ?? 0} />
        <StatCard label="Active Quotes" value={metrics?.quoteDraftOrSent ?? 0} />
        <StatCard label="Active Orders" value={metrics?.ordersActive ?? 0} />
        <StatCard label="Unpaid Orders" value={metrics?.unpaidOrders ?? 0} />
        <StatCard label="Overdue Orders" value={metrics?.overdueOrders ?? 0} />
        <StatCard label="Month Revenue" value={metrics ? `$${metrics.monthlyRevenue.toFixed(2)}` : "$0.00"} />
        <StatCard label="Inbound (24h)" value={metrics?.inboundMessages24h ?? 0} />
        <StatCard label="Reply / Follow-up" value={metrics?.dueFollowUps ?? 0} />
      </div>

      <div className="minimal-grid-dynamic mt-4 grid gap-4 lg:grid-cols-3">
        <section className="minimal-panel minimal-panel-elevated lg:col-span-1">
          <h2 className="text-base font-semibold">Production Queue</h2>
          <ul className="minimal-muted mt-2 list-disc pl-5 text-sm">
            {(metrics?.productionByStatus ?? []).map((entry) => (
              <li key={entry.productionStatus}>
                {entry.productionStatus}: {entry._count._all}
              </li>
            ))}
          </ul>
        </section>

        <section className="minimal-panel minimal-panel-elevated lg:col-span-1">
          <h2 className="text-base font-semibold">Reply Queue</h2>
          <p className="minimal-muted mt-1 text-xs">
            Recent inbound messages that may need responses.
          </p>
          <div className="mt-2 grid gap-2">
            {(metrics?.recentInboundMessages ?? []).map((message) => (
              <article className="rounded-md border border-[var(--border)] p-2 transition-colors hover:border-[var(--primary)]" key={message.id}>
                <p className="text-sm font-medium">{message.customerName}</p>
                <p className="minimal-muted text-xs">
                  {message.channel} - {new Date(message.receivedAt).toLocaleString()}
                </p>
                <p className="minimal-muted mt-1 line-clamp-2 text-xs">{message.messageText}</p>
              </article>
            ))}
            {(metrics?.recentInboundMessages ?? []).length === 0 ? (
              <p className="minimal-muted text-sm">No inbound messages right now.</p>
            ) : null}
          </div>
        </section>

        <section className="minimal-panel minimal-panel-elevated lg:col-span-1">
          <h2 className="text-base font-semibold">System Watch</h2>
          <ul className="minimal-muted mt-2 grid gap-2 text-sm">
            <li className="rounded-md border border-[var(--border)] px-2 py-1">
              Pending import duplicates: {metrics?.pendingImportDuplicates ?? 0}
            </li>
            <li className="rounded-md border border-[var(--border)] px-2 py-1">
              Follow-ups due now: {metrics?.dueFollowUps ?? 0}
            </li>
            <li className="rounded-md border border-[var(--border)] px-2 py-1">
              Unpaid orders: {metrics?.unpaidOrders ?? 0}
            </li>
          </ul>
        </section>
      </div>

      <section className="minimal-panel minimal-panel-elevated mt-4">
        <h2 className="text-base font-semibold">Recent Activity</h2>
        <div className="mt-2 grid gap-2">
          {(metrics?.recentActivity ?? []).map((activity) => (
            <article className="rounded-md border border-[var(--border)] px-2 py-2 transition-colors hover:border-[var(--accent)]" key={activity.id}>
              <p className="text-sm font-medium">{activity.action}</p>
              <p className="minimal-muted text-xs">
                {activity.entityType} - {new Date(activity.createdAt).toLocaleString()}
              </p>
            </article>
          ))}
          {(metrics?.recentActivity ?? []).length === 0 ? (
            <p className="minimal-muted text-sm">No activity yet.</p>
          ) : null}
        </div>
      </section>

      <div className="mt-4 flex flex-wrap gap-2">
        <button className="minimal-cta" onClick={loadData}>
          Refresh Metrics
        </button>
        <button className="app-button" onClick={runReminders}>
          Run Reminder Engine
        </button>
        <a className="app-button" href="/ops/imports">
          Open Import Review
        </a>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <article className="minimal-panel minimal-panel-elevated p-3">
      <p className="minimal-muted text-xs uppercase tracking-wide">{label}</p>
      <p className="minimal-kpi-value mt-1 text-xl font-semibold">{value}</p>
    </article>
  );
}

function NextStepsStrip({ metrics }: { metrics: Metrics | null }) {
  if (!metrics) return null;

  const drafts = metrics.nextSteps?.draftInquiryOrdersCount ?? 0;
  const recent = metrics.nextSteps?.recentDraftInquiryOrders ?? [];
  const followUps = metrics.dueFollowUps ?? 0;
  const hasAction = drafts > 0 || followUps > 0;

  return (
    <section
      className={`minimal-panel minimal-panel-elevated mt-3 ${hasAction ? "border-l-4 border-[var(--primary)]" : ""}`}
    >
      <h2 className="text-base font-semibold">Next steps</h2>
      <p className="minimal-muted mt-1 text-sm">
        Quick links:{" "}
        <Link className="link-terminal font-medium underline" href="/intake">
          Intake
        </Link>
        {" · "}
        <Link className="link-terminal font-medium underline" href="/orders/active">
          Active orders
        </Link>
        {" · "}
        <Link className="link-terminal font-medium underline" href="/messages">
          Messages
        </Link>
      </p>
      <ul className="minimal-muted mt-3 list-none space-y-2 pl-0 text-sm">
        {drafts > 0 ? (
          <li className="rounded-md border border-[var(--border)] px-3 py-2">
            <strong className="text-[var(--text)]">{drafts} inquiry draft order(s)</strong> — send each client the full
            order form from the order page, or open an order below.
            {recent.length > 0 ? (
              <ul className="mt-2 space-y-1 pl-0">
                {recent.map((o) => (
                  <li key={o.id}>
                    <Link className="link-terminal underline" href={`/orders/${o.id}`}>
                      {o.orderNumber}
                    </Link>
                    <span className="text-[var(--muted)]"> · {o.customerName}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ) : (
          <li className="rounded-md border border-[var(--border)] px-3 py-2 text-[var(--muted)]">
            No inquiry draft orders waiting on a client full-order link.
          </li>
        )}
        {followUps > 0 ? (
          <li className="rounded-md border border-[var(--border)] px-3 py-2">
            <strong className="text-[var(--text)]">{followUps} lead follow-up(s) due</strong> — review open leads and
            update next steps.
          </li>
        ) : null}
      </ul>
    </section>
  );
}
