import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quick item spec",
  description: "Submit a structured list of print items to the shop.",
};

export default function PublicPrintRequestLayout({ children }: { children: React.ReactNode }) {
  return children;
}
