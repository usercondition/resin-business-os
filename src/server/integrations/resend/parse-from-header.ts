/**
 * Parse a From header like `Name <user@example.com>` or a bare address.
 */
export function parseEmailFromHeader(from: string): { fromEmail: string; fromName?: string } {
  const trimmed = from.trim();
  const angle = trimmed.match(/<([^<>]+@[^<>]+)>/);
  if (angle) {
    const email = angle[1].trim();
    const namePart = trimmed
      .slice(0, trimmed.indexOf("<"))
      .trim()
      .replace(/^"(.*)"$/, "$1");
    return { fromEmail: email, fromName: namePart || undefined };
  }
  return { fromEmail: trimmed };
}
