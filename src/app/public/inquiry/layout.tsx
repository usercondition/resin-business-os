import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inquiry",
  description: "Contact us about a custom project.",
};

export default function PublicInquiryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
