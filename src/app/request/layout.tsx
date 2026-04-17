import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Client forms",
  description: "Share inquiry and full order links with customers.",
};

export default function RequestSectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
