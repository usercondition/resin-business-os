import type { Metadata } from "next";
import AppShell from "./app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Resin Business OS",
  description: "Lead-to-delivery operating system for resin printing",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
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
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
