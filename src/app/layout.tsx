import type { Metadata } from "next";
import { cookies } from "next/headers";
import { JetBrains_Mono } from "next/font/google";
import { unstable_noStore } from "next/cache";

import { readShopSessionFromCookie, SHOP_SESSION_COOKIE } from "@/server/auth/shop-session";

import AppShell from "./app-shell";
import "./globals.css";

/** Ensure cookie/session reads always run in a request context (avoids static prerender edge cases). */
export const dynamic = "force-dynamic";

const terminalFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-terminal",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Resin Business OS",
  description: "Lead-to-delivery operating system for resin printing",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  unstable_noStore();
  const shopCookie = cookies().get(SHOP_SESSION_COOKIE)?.value;
  const hasStaffShopSession = readShopSessionFromCookie(shopCookie) !== null;

  return (
    <html className={terminalFont.variable} lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var key = "resin-business-os-theme";
                  var stored = localStorage.getItem(key);
                  var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                  var theme = stored || (prefersDark ? "dark" : "light");
                  if (theme === "dark") document.documentElement.classList.add("dark");
                  else document.documentElement.classList.remove("dark");
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <AppShell hasStaffShopSession={hasStaffShopSession}>{children}</AppShell>
      </body>
    </html>
  );
}
