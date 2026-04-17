"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { IconLogOut, IconPackage } from "@/components/icons";

type Bundle = {
  order: {
    orderNumber: string;
    status: string;
    productionStatus: string;
    paymentStatus: string;
    deliveryStatus: string | null;
    dueDate: string | null;
    balanceDue: string;
    total: string;
    customerName: string;
    items: Array<{ id: string; itemName: string; quantity: number; lineTotal: string }>;
    productionJobs: Array<{ id: string; status: string; machineName: string | null }>;
    deliveries: Array<{ id: string; type: string; status: string; scheduledAt: string | null }>;
  };
  messages: Array<{ id: string; body: string; author: string; staffName: string | null; createdAt: string }>;
  photos: Array<{ id: string; caption: string | null; dataUrl: string; createdAt: string }>;
  timeline: Array<{ id: string; action: string; createdAt: string }>;
};

export default function PortalOrderPage() {
  const router = useRouter();
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [message, setMessage] = useState("Loading…");
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/portal/order");
    const json = await res.json();
    if (res.status === 401 || !json.ok) {
      router.replace("/portal");
      return;
    }
    setBundle(json.data);
    setMessage("Signed in");
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function signOut() {
    await fetch("/api/portal/session", { method: "DELETE" });
    router.replace("/portal");
    router.refresh();
  }

  async function sendReply(e: FormEvent) {
    e.preventDefault();
    const text = reply.trim();
    if (!text) return;
    setSending(true);
    try {
      const res = await fetch("/api/portal/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error?.message ?? "Send failed");
      }
      setReply("");
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  if (!bundle) {
    return (
      <main className="mx-auto max-w-3xl py-8">
        <p className="text-sm">{message}</p>
      </main>
    );
  }

  const { order } = bundle;

  return (
    <main className="mx-auto max-w-3xl py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 text-[var(--muted-foreground)]" aria-hidden>
            <IconPackage size={24} />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{order.orderNumber}</h1>
            <p className="minimal-muted mt-1 text-sm">{order.customerName}</p>
            <p className="minimal-muted mt-1 text-sm">Review status updates, progress photos, and chat with the shop.</p>
          </div>
        </div>
        <button className="app-button inline-flex items-center gap-2 text-sm" onClick={() => void signOut()} type="button">
          <IconLogOut size={15} />
          Sign out
        </button>
      </div>

      <section className="minimal-panel mt-4 text-sm">
        <p>
          <span className="font-semibold">Status:</span> {order.status}
        </p>
        <p className="mt-1">
          <span className="font-semibold">Production:</span> {order.productionStatus} ·{" "}
          <span className="font-semibold">Payment:</span> {order.paymentStatus}
        </p>
        {order.deliveryStatus ? (
          <p className="mt-1">
            <span className="font-semibold">Delivery:</span> {order.deliveryStatus}
          </p>
        ) : null}
        <p className="mt-1">
          <span className="font-semibold">Balance due:</span> {order.balanceDue}
        </p>
      </section>

      <section className="minimal-panel mt-4">
        <h2 className="text-base font-semibold">Progress photos</h2>
        {bundle.photos.length === 0 ? (
          <p className="minimal-muted mt-2 text-sm">No photos yet.</p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {bundle.photos.map((p) => (
              <li className="rounded-md border border-[var(--border)] p-2" key={p.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt={p.caption ?? "Progress"} className="h-auto max-h-48 w-full rounded object-contain" src={p.dataUrl} />
                {p.caption ? <p className="minimal-muted mt-1 text-xs">{p.caption}</p> : null}
                <p className="minimal-muted mt-1 text-xs">{new Date(p.createdAt).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="minimal-panel mt-4">
        <h2 className="text-base font-semibold">Messages</h2>
        <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto text-sm">
          {bundle.messages.map((m) => (
            <li
              className={`rounded-md border px-3 py-2 ${
                m.author === "CLIENT" ? "border-[var(--primary)] bg-[var(--panel)]" : "border-[var(--border)]"
              }`}
              key={m.id}
            >
              <p className="text-xs text-[var(--muted-foreground)]">
                {m.author === "CLIENT" ? "You" : m.staffName ?? "Shop"} · {new Date(m.createdAt).toLocaleString()}
              </p>
              <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
            </li>
          ))}
        </ul>
        <form className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={sendReply}>
          <label className="min-w-0 flex-1 text-sm">
            Your message
            <textarea
              className="mt-1 min-h-20 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
            />
          </label>
          <button className="minimal-cta shrink-0" disabled={sending} type="submit">
            {sending ? "Sending…" : "Send"}
          </button>
        </form>
      </section>

      <section className="minimal-panel mt-4">
        <h2 className="text-base font-semibold">Activity</h2>
        <ul className="minimal-muted mt-2 max-h-64 list-disc space-y-1 overflow-y-auto pl-5 text-xs">
          {bundle.timeline.slice(0, 50).map((t) => (
            <li key={t.id}>
              {t.action} — {new Date(t.createdAt).toLocaleString()}
            </li>
          ))}
        </ul>
      </section>

      <section className="minimal-panel mt-4">
        <h2 className="text-base font-semibold">Line items</h2>
        <ul className="minimal-muted mt-2 list-disc pl-5 text-sm">
          {order.items.map((i) => (
            <li key={i.id}>
              {i.itemName} × {i.quantity} — {i.lineTotal}
            </li>
          ))}
        </ul>
      </section>

      <p className="minimal-muted mt-6 text-center text-xs">
        <a className="underline" href="/dashboard">
          Open shop dashboard
        </a>
      </p>
    </main>
  );
}
