import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Intake",
  description: "Share client links: inquiry, quick item spec, and full order form.",
};

export default function IntakeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
