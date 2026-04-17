import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inquiry (redirect)",
  description: "This URL forwards to the inquiry form.",
};

export default function PublicRequestLayout({ children }: { children: React.ReactNode }) {
  return children;
}
