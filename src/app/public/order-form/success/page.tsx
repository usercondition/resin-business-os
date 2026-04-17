import Link from "next/link";

export default function PublicOrderFormSuccessPage() {
  return (
    <main className="mx-auto max-w-md py-8">
      <section className="minimal-panel">
        <h1 className="text-xl font-semibold tracking-tight">Order received</h1>
        <p className="minimal-muted mt-2 text-sm">
          Your order was created. You will receive confirmation from the shop shortly.
        </p>
        <Link className="minimal-cta mt-5 inline-block" href="/public/order-form">
          Submit another order
        </Link>
      </section>
    </main>
  );
}
