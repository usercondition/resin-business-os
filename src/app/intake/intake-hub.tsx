"use client";

import Link from "next/link";
import { useState } from "react";

import { IconCopy, IconExternalLink, IconInbox } from "@/components/icons";
import { PageHeader } from "@/components/page-header";

export function IntakeHub() {
  const [note, setNote] = useState("");

  async function copyUrl(path: string, label: string) {
    const url = `${window.location.origin}${path}`;
    await navigator.clipboard.writeText(url);
    setNote(`${label} copied.`);
  }

  return (
    <main className="mx-auto max-w-4xl py-4">
      <PageHeader
        description={
          <>
            Three client links — each does one job. Use <strong>Inquiry</strong> for most first contacts; use{" "}
            <strong>Quick spec</strong> when they already have a parts list; use <strong>Full order</strong> for pricing
            and checkout-style detail (or send a token link from an order to finish the same order).
          </>
        }
        icon={IconInbox}
        title="Intake"
      />
      {note ? <p className="minimal-panel mt-3 text-sm">{note}</p> : null}

      <div className="mt-6 grid items-stretch gap-4 md:grid-cols-3">
        <section className="minimal-panel flex h-full flex-col gap-2">
          <h2 className="text-base font-semibold">1 · Inquiry</h2>
          <p className="minimal-muted text-sm">First contact: message + subject. Creates customer, lead, and draft order.</p>
          <button
            className="app-button mt-auto inline-flex items-center justify-center gap-2"
            onClick={() => void copyUrl("/public/inquiry", "Inquiry link")}
            type="button"
          >
            <IconCopy size={16} />
            Copy inquiry link
          </button>
          <Link className="minimal-cta inline-flex items-center justify-center gap-2 text-center text-sm" href="/intake/preview-inquiry">
            <IconExternalLink size={15} />
            Preview (signed in)
          </Link>
        </section>

        <section className="minimal-panel flex h-full flex-col gap-2">
          <h2 className="text-base font-semibold">2 · Quick item spec</h2>
          <p className="minimal-muted text-sm">Structured rows (item, qty, material, color). Lead only — no draft order.</p>
          <button
            className="app-button mt-auto inline-flex items-center justify-center gap-2"
            onClick={() => void copyUrl("/public/print-request", "Quick spec link")}
            type="button"
          >
            <IconCopy size={16} />
            Copy quick spec link
          </button>
          <Link className="minimal-cta inline-flex items-center justify-center gap-2 text-center text-sm" href="/intake/preview-print-spec">
            <IconExternalLink size={15} />
            Preview (signed in)
          </Link>
        </section>

        <section className="minimal-panel flex h-full flex-col gap-2">
          <h2 className="text-base font-semibold">3 · Full order</h2>
          <p className="minimal-muted text-sm">Line items with pricing, tax, address. Blank = new order; token URL = edit existing order.</p>
          <button
            className="app-button mt-auto inline-flex items-center justify-center gap-2"
            onClick={() => void copyUrl("/public/order-form", "Full order form link")}
            type="button"
          >
            <IconCopy size={16} />
            Copy full order link
          </button>
          <Link className="minimal-cta inline-flex items-center justify-center gap-2 text-center text-sm" href="/intake/preview-order">
            <IconExternalLink size={15} />
            Preview (signed in)
          </Link>
        </section>
      </div>

      <section className="minimal-panel mt-6">
        <h3 className="text-sm font-semibold">Suggested workflow</h3>
        <ol className="minimal-muted mt-2 list-decimal space-y-1 pl-5 text-sm">
          <li>Send the inquiry (or quick spec) link.</li>
          <li>When ready, open the draft order in Orders and use &quot;Copy client edit link&quot; for the full order form.</li>
          <li>Client submits; you see updates on the dashboard, timeline, and email (if configured).</li>
        </ol>
      </section>
    </main>
  );
}
