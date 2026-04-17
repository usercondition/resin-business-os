"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Props = {
  children: React.ReactNode;
};

const THEME_KEY = "resin-business-os-theme";
const SIDEBAR_MODE_KEY = "resin-business-os-sidebar-mode";
const GROUPS_KEY = "resin-business-os-sidebar-groups";

/** Public client surfaces (shareable URLs): no header or sidebar. */
function isPublicStandalonePath(pathname: string | null) {
  if (!pathname) {
    return false;
  }
  if (pathname === "/public/request" || pathname.startsWith("/public/request/")) {
    return true;
  }
  if (pathname === "/public/inquiry" || pathname.startsWith("/public/inquiry/")) {
    return true;
  }
  if (pathname === "/public/order-form" || pathname.startsWith("/public/order-form/")) {
    return true;
  }
  return pathname === "/portal" || pathname.startsWith("/portal/");
}

const MENU_GROUPS = [
  {
    title: "Hub",
    items: [
      { href: "/", label: "Home", icon: "⌂" },
      { href: "/dashboard", label: "Dashboard", icon: "◫" },
      { href: "/portal", label: "Customer portal", icon: "◐" },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/ops", label: "Quick Ops", icon: "✦" },
      { href: "/request", label: "Client forms", icon: "✎" },
      { href: "/messages", label: "Messages", icon: "✉" },
      { href: "/orders", label: "Orders", icon: "▣" },
      { href: "/customers", label: "Customers", icon: "◉" },
      { href: "/inventory", label: "Inventory", icon: "▤" },
    ],
  },
  {
    title: "Insights",
    items: [
      { href: "/analytics", label: "Analytics", icon: "▥" },
      { href: "/ops/imports", label: "Import Review", icon: "⇅" },
    ],
  },
];

export default function AppShell({ children }: Props) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isCompact, setIsCompact] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchLastX, setTouchLastX] = useState<number | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = stored === "dark" || (!stored && prefersDark) ? "dark" : "light";
    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");

    const savedSidebarMode = window.localStorage.getItem(SIDEBAR_MODE_KEY);
    setIsCompact(savedSidebarMode === "compact");

    const savedGroups = window.localStorage.getItem(GROUPS_KEY);
    if (savedGroups) {
      try {
        setCollapsedGroups(JSON.parse(savedGroups) as Record<string, boolean>);
      } catch {
        setCollapsedGroups({});
      }
    }
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    window.localStorage.setItem(THEME_KEY, nextTheme);
  }

  function toggleCompactMode() {
    const next = !isCompact;
    setIsCompact(next);
    window.localStorage.setItem(SIDEBAR_MODE_KEY, next ? "compact" : "expanded");
  }

  function toggleGroup(title: string) {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [title]: !prev[title] };
      window.localStorage.setItem(GROUPS_KEY, JSON.stringify(next));
      return next;
    });
  }

  function isActiveRoute(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function handleTouchStart(event: React.TouchEvent<HTMLElement>) {
    const startX = event.touches[0]?.clientX;
    if (typeof startX === "number") {
      setTouchStartX(startX);
      setTouchLastX(startX);
    }
  }

  function handleTouchMove(event: React.TouchEvent<HTMLElement>) {
    const nextX = event.touches[0]?.clientX;
    if (typeof nextX === "number") {
      setTouchLastX(nextX);
    }
  }

  function handleTouchEnd() {
    if (touchStartX === null || touchLastX === null) return;
    const delta = touchLastX - touchStartX;

    if (!isMenuOpen && touchStartX < 32 && delta > 48) {
      setIsMenuOpen(true);
    }
    if (isMenuOpen && delta < -48) {
      setIsMenuOpen(false);
    }

    setTouchStartX(null);
    setTouchLastX(null);
  }

  if (isPublicStandalonePath(pathname)) {
    return (
      <div className="public-standalone min-h-screen bg-[var(--bg)] px-4 py-6 text-[var(--text)]">
        {children}
      </div>
    );
  }

  return (
    <>
      <header className="app-topbar">
        <button
          aria-expanded={isMenuOpen}
          className="app-button"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          type="button"
        >
          <span className="app-button-icon" aria-hidden>
            ≡
          </span>
          Menu
        </button>
        <Link className="app-brand" href="/">
          <span className="app-brand-dot" aria-hidden />
          Resin OS
        </Link>
        <div className="app-actions">
          <button className="app-button desktop-only" onClick={toggleCompactMode} type="button">
            <span className="app-button-icon" aria-hidden>
              {isCompact ? "▢" : "▥"}
            </span>
            {isCompact ? "Expand" : "Compact"}
          </button>
          <button className="app-button" onClick={toggleTheme} type="button">
            <span className="app-button-icon" aria-hidden>
              {theme === "light" ? "◐" : "◑"}
            </span>
            {theme === "light" ? "Dark" : "Light"}
          </button>
        </div>
      </header>

      <aside
        className={`app-menu left ${isMenuOpen ? "open" : ""} ${isCompact ? "compact" : ""}`}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onTouchStart={handleTouchStart}
      >
        <div className="app-menu-header">
          <p className="app-menu-title">Navigation</p>
        </div>
        <nav className="app-menu-nav">
          {MENU_GROUPS.map((group) => (
            <section className="app-menu-group" key={group.title}>
              <button
                className="app-menu-group-toggle"
                onClick={() => toggleGroup(group.title)}
                type="button"
              >
                <span>{group.title}</span>
                <span className="app-menu-group-caret">{collapsedGroups[group.title] ? "▸" : "▾"}</span>
              </button>
              {!collapsedGroups[group.title]
                ? group.items.map((item) => (
                    <Link
                      className={isActiveRoute(item.href) ? "active" : ""}
                      href={item.href}
                      key={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      title={isCompact ? item.label : undefined}
                    >
                      <span className="app-menu-icon">{item.icon}</span>
                      <span className="app-menu-label">{item.label}</span>
                    </Link>
                  ))
                : null}
            </section>
          ))}
        </nav>
      </aside>

      {isMenuOpen ? (
        <button
          aria-label="Close menu overlay"
          className="app-overlay"
          onClick={() => setIsMenuOpen(false)}
          type="button"
        />
      ) : null}

      <div
        className={`app-content ${
          isMenuOpen ? (isCompact ? "with-sidebar-compact" : "with-sidebar") : "sidebar-collapsed"
        }`}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onTouchStart={handleTouchStart}
      >
        {children}
      </div>
    </>
  );
}
