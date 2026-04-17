import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Place an order",
  description: "Submit a complete order with line items and pricing.",
};

export default function PublicOrderFormLayout({ children }: { children: React.ReactNode }) {
  return children;
}
