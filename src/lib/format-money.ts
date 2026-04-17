/** USD for US-style shop UI (manual orders, public forms). */
export function formatUsd(amount: number, opts?: { maximumFractionDigits?: number }) {
  const max = opts?.maximumFractionDigits ?? 2;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: max,
  }).format(Number.isFinite(amount) ? amount : 0);
}

/** Parse user-typed money; strips $ and commas. */
export function parseMoneyInput(raw: string): number {
  const cleaned = raw.replace(/[$,\s]/g, "");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}
