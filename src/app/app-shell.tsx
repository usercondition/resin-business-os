"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Props = {
  children: React.ReactNode;
  /** From server: valid shop session cookie. Used so staff keep header/sidebar on client-facing routes. */
  hasStaffShopSession?: boolean;
};

const THEME_KEY = "resin-business-os-theme";

/** Shareable client URLs (portal + public forms). */
function matchesClientFacingRoute(pathname: string | null) {
  if (!pathname) return false;
  return (
    pathname === "/public/request" ||
    pathname.startsWith("/public/request/") ||
    pathname === "/public/inquiry" ||
    pathname.startsWith("/public/inquiry/") ||
    pathname === "/public/order-form" ||
    pathname.startsWith("/public/order-form/") ||
    pathname === "/public/print-request" ||
    pathname.startsWith("/public/print-request/") ||
    pathname === "/portal" ||
    pathname.startsWith("/portal/")
  );
}

/**
 * Client-only surfaces (shareable URLs): no chrome when the visitor is not signed in as staff.
 * When `hasStaffShopSession` is true, portal and /public/* keep the normal shell for preview.
 */
function isPublicStandalonePath(pathname: string | null, hasStaffShopSession: boolean) {
  if (!pathname) {
    return false;
  }
  if (pathname === "/login" || pathname.startsWith("/login/")) {
    return true;
  }

  if (!matchesClientFacingRoute(pathname)) {
    return false;
  }

  if (hasStaffShopSession) {
    return false;
  }

  return true;
}

const MENU_GROUPS: { title: string; items: { href: string; label: string }[] }[] = [
  {
    title: "Hub",
    items: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/portal", label: "Customer portal" },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/orders/active", label: "Active orders" },
      { href: "/orders", label: "All orders" },
      { href: "/intake", label: "Intake" },
      { href: "/messages", label: "Messages" },
      { href: "/customers", label: "Customers" },
      { href: "/inventory", label: "Inventory" },
    ],
  },
  {
    title: "Insights",
    items: [
      { href: "/analytics", label: "Analytics" },
      { href: "/ops/imports", label: "Import review" },
    ],
  },
];

export default function AppShell({ children, hasStaffShopSession = false }: Props) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = stored === "dark" || (!stored && prefersDark) ? "dark" : "light";
    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    window.localStorage.setItem(THEME_KEY, nextTheme);
  }

  function isActiveRoute(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/session", { method: "DELETE", credentials: "include" });
      window.location.href = "/login";
    } finally {
      setSigningOut(false);
    }
  }

  if (isPublicStandalonePath(pathname, hasStaffShopSession)) {
    return (
      <div className="public-standalone min-h-screen bg-[var(--bg)] px-4 py-6 text-[var(--text)]">
        {children}
      </div>
    );
  }

  return (
    <div className="app-frame">
      <aside className="app-sidebar" aria-label="Main navigation">
        <div className="app-sidebar-brand">
          <Link href="/dashboard">Resin OS</Link>
        </div>

        <nav className="app-sidebar-nav">
          {MENU_GROUPS.map((group) => (
            <div className="app-nav-group" key={group.title}>
              <p className="app-nav-group-label">{group.title}</p>
              <ul className="app-nav-list">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link className={isActiveRoute(item.href) ? "is-active" : undefined} href={item.href}>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="app-sidebar-footer">
          <button className="app-sidebar-link" disabled={signingOut} onClick={() => void signOut()} type="button">
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
          <button className="app-sidebar-link" onClick={toggleTheme} type="button">
            {theme === "light" ? "Dark mode" : "Light mode"}
          </button>
        </div>
      </aside>

      <div className="app-main">
        {hasStaffShopSession && matchesClientFacingRoute(pathname) ? (
          <p className="staff-client-preview-banner" role="status">
            <strong>Staff preview.</strong>{" "}
            <span className="staff-client-preview-banner__muted">
              Visitors without a shop sign-in see this page without the app shell.
            </span>
          </p>
        ) : null}
        {children}
      </div>
    </div>
  );
}
