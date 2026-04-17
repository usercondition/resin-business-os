"use client";

import Link from "next/link";
import { useState } from "react";

export function ClientFormsHub() {
  const [note, setNote] = useState("");

  async function copyUrl(path: string, label: string) {
    const url = `${window.location.origin}${path}`;
    await navigator.clipboard.writeText(url);
    setNote(`${label} copied.`);
  }

  return (
    <main className="mx-auto max-w-3xl py-4">
      <h1 className="text-xl font-semibold tracking-tight">Client forms</h1>
      <p className="minimal-muted mt-2 text-sm">
        Share the <strong>inquiry</strong> link for first contact. When they are ready to commit, send the{" "}
        <strong>full order</strong> link so they can enter line items, pricing, materials, and shipping details.
      </p>
      {note ? <p className="minimal-panel mt-3 text-sm">{note}</p> : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <section className="minimal-panel flex flex-col gap-3">
          <h2 className="text-base font-semibold">Inquiry (initial contact)</h2>
          <p className="minimal-muted text-sm">Creates a lead + customer record. No line-item pricing.</p>
          <button className="app-button" onClick={() => void copyUrl("/public/inquiry", "Inquiry link")} type="button">
            Copy inquiry link
          </button>
          <Link className="minimal-cta text-center text-sm" href="/request/preview-inquiry">
            Preview inquiry form
          </Link>
        </section>

        <section className="minimal-panel flex flex-col gap-3">
          <h2 className="text-base font-semibold">Full order form</h2>
          <p className="minimal-muted text-sm">Creates a real order with items, tax/discount, and customer address.</p>
          <button
            className="app-button"
            onClick={() => void copyUrl("/public/order-form", "Full order form link")}
            type="button"
          >
            Copy full order form link
          </button>
          <Link className="minimal-cta text-center text-sm" href="/request/preview-order">
            Preview full order form
          </Link>
        </section>
      </div>

      <p className="minimal-muted mt-6 text-xs">
        Legacy URL <code className="rounded bg-[var(--border)] px-1">/public/request</code> redirects to the inquiry
        form.
      </p>
    </main>
  );
}
