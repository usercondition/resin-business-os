function normalizeSegment(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Match portal login first + last name to `Customer.fullName`.
 * Accepts exact "First Last" or first token + last token (e.g. "Jane Q. Public").
 */
export function namesMatchCustomer(firstName: string, lastName: string, fullName: string): boolean {
  const f = normalizeSegment(firstName);
  const l = normalizeSegment(lastName);
  const full = normalizeSegment(fullName);
  if (!f || !l || !full) {
    return false;
  }
  if (full === `${f} ${l}`) {
    return true;
  }
  const parts = full.split(" ").filter(Boolean);
  if (parts.length >= 2 && parts[0] === f && parts[parts.length - 1] === l) {
    return true;
  }
  return false;
}
