import { describe, expect, it } from "vitest";

import { parseEmailFromHeader } from "@/server/integrations/resend/parse-from-header";

describe("parseEmailFromHeader", () => {
  it("parses name and angle-bracket email", () => {
    expect(parseEmailFromHeader('Acme <onboarding@resend.dev>')).toEqual({
      fromEmail: "onboarding@resend.dev",
      fromName: "Acme",
    });
  });

  it("parses quoted display name", () => {
    expect(parseEmailFromHeader('"Jane Doe" <jane@example.com>')).toEqual({
      fromEmail: "jane@example.com",
      fromName: "Jane Doe",
    });
  });

  it("parses bare email", () => {
    expect(parseEmailFromHeader("solo@example.com")).toEqual({
      fromEmail: "solo@example.com",
    });
  });
});
