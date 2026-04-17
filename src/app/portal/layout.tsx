import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Order portal",
  description: "View your order status and message the shop.",
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
