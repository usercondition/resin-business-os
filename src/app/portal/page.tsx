"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { IconGlobe } from "@/components/icons";
import { PageHeader } from "@/components/page-header";

export default function PortalLoginPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [message, setMessage] = useState("Sign in with the name on your order and your order number.");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("Signing in...");
    try {
      const res = await fetch("/api/portal/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, orderNumber }),
      });
      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error?.message ?? "Sign-in failed");
      }
      router.push("/portal/order");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md py-8">
      <PageHeader
        description={
          <>
            Each order belongs to the customer on that order. Use your <strong>first name</strong>,{" "}
            <strong>last name</strong> (as they appear on the order), and your <strong>order number</strong> (for example
            ORD-2026-XXXXXXXX).
          </>
        }
        icon={IconGlobe}
        title="Order portal"
      />
      <p className="minimal-panel mt-4 text-sm">{message}</p>
      <form className="minimal-panel mt-4 grid gap-3" onSubmit={onSubmit}>
        <label className="text-sm">
          First name
          <input
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
            autoComplete="given-name"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </label>
        <label className="text-sm">
          Last name
          <input
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
            autoComplete="family-name"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </label>
        <label className="text-sm">
          Order number
          <input
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
            autoComplete="off"
            placeholder="ORD-2026-…"
            required
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
          />
        </label>
        <button className="minimal-cta inline-flex items-center justify-center gap-2" disabled={loading} type="submit">
          <IconGlobe size={16} />
          {loading ? "Signing in…" : "View order"}
        </button>
      </form>
      <p className="minimal-muted mt-6 text-center text-xs">
        <a className="underline" href="/dashboard">
          Open shop dashboard
        </a>
      </p>
    </main>
  );
}
