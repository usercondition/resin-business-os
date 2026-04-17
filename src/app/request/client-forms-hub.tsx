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
        Canonical flow: <strong>Inquiry</strong> {"->"} draft order created automatically {"->"} send tokenized{" "}
        <strong>full order form</strong> from that order container.
      </p>
      {note ? <p className="minimal-panel mt-3 text-sm">{note}</p> : null}

      <div className="mt-6 grid items-stretch gap-4 md:grid-cols-2">
        <section className="minimal-panel flex h-full flex-col gap-3">
          <h2 className="text-base font-semibold">Inquiry (initial contact)</h2>
          <p className="minimal-muted text-sm">Creates a lead + customer record. No line-item pricing.</p>
          <button className="app-button mt-auto" onClick={() => void copyUrl("/public/inquiry", "Inquiry link")} type="button">
            Copy inquiry link
          </button>
          <Link className="minimal-cta text-center text-sm" href="/request/preview-inquiry">
            Preview inquiry form
          </Link>
        </section>

        <section className="minimal-panel flex h-full flex-col gap-3">
          <h2 className="text-base font-semibold">Full order form</h2>
          <p className="minimal-muted text-sm">Creates a real order with items, tax/discount, and customer address.</p>
          <button
            className="app-button mt-auto"
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

      <section className="minimal-panel mt-6">
        <h3 className="text-sm font-semibold">How to use this</h3>
        <ol className="minimal-muted mt-2 list-decimal space-y-1 pl-5 text-sm">
          <li>Send inquiry link first.</li>
          <li>After inquiry arrives, open the draft order in Orders.</li>
          <li>Use &quot;Copy client edit link&quot; on that order to send the prefilled full-order form.</li>
          <li>Client edits quantities/items and submits; the same order updates.</li>
        </ol>
      </section>
    </main>
  );
}
