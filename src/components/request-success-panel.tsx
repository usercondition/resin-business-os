type Props = {
  /** Where “Submit another” sends the user (hub preview vs public form). */
  anotherHref: string;
};

export function RequestSuccessPanel({ anotherHref }: Props) {
  return (
    <main className="mx-auto max-w-2xl py-6">
      <section className="minimal-panel">
        <h1 className="text-2xl font-semibold tracking-tight">We got your request</h1>
        <p className="minimal-muted mt-2 text-sm">
          Thanks — we will reach out soon with next steps or a quote.
        </p>
        <a className="minimal-cta mt-5 inline-block" href={anotherHref}>
          Submit another request
        </a>
      </section>
    </main>
  );
}
