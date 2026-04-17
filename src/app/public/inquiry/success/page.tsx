import Link from "next/link";

export default function PublicInquirySuccessPage() {
  return (
    <main className="mx-auto max-w-md py-8">
      <section className="minimal-panel">
        <h1 className="text-xl font-semibold tracking-tight">Thanks — we received your inquiry</h1>
        <p className="minimal-muted mt-2 text-sm">We will follow up soon.</p>
        <Link className="minimal-cta mt-5 inline-block" href="/public/inquiry">
          Send another inquiry
        </Link>
      </section>
    </main>
  );
}
