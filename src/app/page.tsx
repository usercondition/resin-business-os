import {
  IconClipboardList,
  IconLayoutDashboard,
  IconLayers,
  IconPackage,
  IconUsers,
} from "@/components/icons";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <header className="minimal-panel mb-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-[var(--muted-foreground)]" aria-hidden>
            <IconLayers size={28} />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Resin Business OS</h1>
            <p className="minimal-muted mt-2 text-sm">
              Minimal operations console for leads, orders, payments, production, and delivery.
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="minimal-panel">
          <h2 className="text-base font-semibold">Status Tracks</h2>
          <ul className="minimal-muted mt-2 list-disc pl-5 text-sm">
            <li>Leads: new -&gt; won/lost</li>
            <li>Quotes: draft -&gt; approved/declined</li>
            <li>Orders: new -&gt; closed</li>
            <li>Payments: pending/partial/paid</li>
            <li>Production: queued -&gt; complete</li>
          </ul>
        </article>

        <article className="minimal-panel">
          <h2 className="text-base font-semibold">Quick Links</h2>
          <ul className="minimal-muted mt-2 list-disc pl-5 text-sm">
            <li>Use Quick Ops for rapid data entry</li>
            <li>Use Dashboard for KPI snapshots</li>
            <li>Use Import Review for sync cleanup</li>
          </ul>
          <a className="minimal-cta mt-3 inline-flex items-center gap-2" href="/ops">
            <IconClipboardList size={16} />
            Open Ops Quick Actions
          </a>
          <div className="mt-2 flex flex-wrap gap-2">
            <a className="app-button inline-flex items-center gap-2" href="/dashboard">
              <IconLayoutDashboard size={15} />
              Open Dashboard
            </a>
            <a className="app-button inline-flex items-center gap-2" href="/customers">
              <IconUsers size={15} />
              Customer Lookup
            </a>
            <a className="app-button inline-flex items-center gap-2" href="/orders">
              <IconPackage size={15} />
              Order Lookup
            </a>
          </div>
        </article>
      </section>
    </main>
  );
}
