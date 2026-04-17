import { IconBarChart3 } from "@/components/icons";
import { PageHeader } from "@/components/page-header";

export default function AnalyticsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-4">
      <PageHeader
        description="Premium insights hub for conversion trends, order velocity, and production efficiency."
        icon={IconBarChart3}
        title="Analytics"
      />

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
