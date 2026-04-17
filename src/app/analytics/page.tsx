export default function AnalyticsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-4">
      <h1 className="text-xl font-semibold">Analytics</h1>
      <p className="minimal-muted mt-1 text-sm">
        Premium insights hub for conversion trends, order velocity, and production efficiency.
      </p>

      <section className="minimal-panel mt-4">
        <h2 className="text-base font-semibold">Coming Next</h2>
        <ul className="minimal-muted mt-2 list-disc pl-5 text-sm">
          <li>Lead source conversion by channel (Facebook, OfferUp, imports)</li>
          <li>Quote win-rate and average turnaround time</li>
          <li>Revenue by week/month and payment method mix</li>
          <li>Production throughput and failure/reprint trends</li>
        </ul>
      </section>
    </main>
  );
}
