"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogoutButton } from "@/components/ui/logout-button";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

/* ── SVG Icons (20×20, stroke-based) ────────────────────── */

function IconHome() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}

function IconClipboard() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconPill() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.5 1.5l-8 8a5.66 5.66 0 0 0 8 8l8-8a5.66 5.66 0 0 0-8-8z" />
      <path d="M6.5 13.5l5-5" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function IconChevronLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

/* ── Nav definition ─────────────────────────────────────── */

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Inicio", icon: <IconHome /> },
  { href: "/consultas", label: "Consultas", icon: <IconClipboard /> },
  { href: "/pacientes", label: "Pacientes", icon: <IconUsers /> },
  { href: "/tratamientos", label: "Tratamientos", icon: <IconPill /> },
  { href: "/onboarding", label: "Perfil", icon: <IconUser /> },
  { href: "/ajustes", label: "Ajustes", icon: <IconSettings /> },
];

// Bottom nav shows the 5 most important items
const BOTTOM_NAV_ITEMS = NAV_ITEMS.filter((item) => item.href !== "/onboarding");

/* ── Sidebar (desktop, lg+) ─────────────────────────────── */

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`hidden lg:flex sticky top-0 h-screen flex-col border-r border-border bg-card transition-all duration-300 ${
        collapsed ? "w-[72px]" : "w-[240px]"
      }`}
    >
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-sm font-bold text-white shadow-sm">
          G
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-[15px] font-bold text-ink tracking-tight leading-tight">Glyph</p>
            <p className="text-[12px] text-ink-soft leading-tight">Clinica digital</p>
          </div>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-all duration-200 ${
                isActive
                  ? "bg-surface-glow text-accent shadow-sm"
                  : "text-ink-soft hover:bg-bg-soft hover:text-ink"
              }`}
            >
              <span
                className={`shrink-0 transition-colors ${
                  isActive ? "text-accent" : "text-ink-soft group-hover:text-ink"
                }`}
              >
                {item.icon}
              </span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom area: logout + collapse toggle */}
      <div className="border-t border-border px-3 py-3 space-y-2">
        <LogoutButton mode={collapsed ? "icon" : "full"} />
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-bg-soft px-3 py-2 text-xs font-medium text-ink-soft transition hover:bg-bg hover:text-ink"
          title={collapsed ? "Expandir menu" : "Contraer menu"}
        >
          {collapsed ? <IconChevronRight /> : <><IconChevronLeft /> <span>Contraer</span></>}
        </button>
      </div>
    </aside>
  );
}

/* ── Bottom Nav (mobile, < lg) ──────────────────────────── */

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around border-t border-border bg-card/95 px-2 py-1.5 backdrop-blur-sm lg:hidden" aria-label="Navegacion principal movil">
      {BOTTOM_NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-1.5 text-[11px] font-medium transition-all ${
              isActive
                ? "text-accent"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            <span
              className={`transition-transform ${
                isActive ? "scale-110 text-accent" : ""
              }`}
            >
              {item.icon}
            </span>
            <span>{item.label}</span>
            {isActive && (
              <span className="mt-0.5 h-1 w-4 rounded-full bg-accent" />
            )}
          </Link>
        );
      })}
      <LogoutButton mode="nav" />
    </nav>
  );
}
