export default function InventoryPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-4">
      <h1 className="text-xl font-semibold">Inventory</h1>
      <p className="minimal-muted mt-1 text-sm">
        Inventory control center for resin materials, consumables, and reorder priorities.
      </p>

      <section className="minimal-panel mt-4">
        <h2 className="text-base font-semibold">Core Inventory Modules</h2>
        <ul className="minimal-muted mt-2 list-disc pl-5 text-sm">
          <li>Material stock levels by type and color</li>
          <li>Low-stock alert thresholds</li>
          <li>Purchase and restock log</li>
          <li>Per-order material consumption tracking</li>
        </ul>
      </section>
    </main>
  );
}
