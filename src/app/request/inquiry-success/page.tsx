import Link from "next/link";

export default function InquirySuccessStaffPage() {
  return (
    <main className="mx-auto max-w-md py-8">
      <section className="minimal-panel">
        <h1 className="text-lg font-semibold">Inquiry sent</h1>
        <p className="minimal-muted mt-2 text-sm">Preview flow completed.</p>
        <Link className="minimal-cta mt-4 inline-block" href="/request">
          Back to client forms
        </Link>
      </section>
    </main>
  );
}
