import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Print request",
  description: "Request a custom print — we will follow up with a quote.",
};

export default function RequestSectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
