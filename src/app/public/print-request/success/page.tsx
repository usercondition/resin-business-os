import Link from "next/link";

export default function PublicPrintRequestSuccessPage() {
  return (
    <main className="mx-auto max-w-md py-8">
      <section className="minimal-panel">
        <h1 className="text-lg font-semibold">Thanks — we received your spec</h1>
        <p className="minimal-muted mt-2 text-sm">The shop will follow up using your preferred contact method.</p>
        <Link className="minimal-cta mt-5 inline-block" href="/public/print-request">
          Submit another
        </Link>
      </section>
    </main>
  );
}
