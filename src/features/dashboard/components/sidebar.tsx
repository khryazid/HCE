"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogoutButton } from "@/features/auth/components/logout-button";
import {
  Home,
  ClipboardList,
  Users,
  Pill,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard",    label: "Inicio",        icon: <Home       className="h-5 w-5" /> },
  { href: "/consultas",    label: "Consultas",     icon: <ClipboardList className="h-5 w-5" /> },
  { href: "/pacientes",    label: "Pacientes",     icon: <Users      className="h-5 w-5" /> },
  { href: "/tratamientos", label: "Tratamientos",  icon: <Pill       className="h-5 w-5" /> },
  { href: "/ajustes",      label: "Ajustes",       icon: <Settings   className="h-5 w-5" /> },
];

/* ── Sidebar (desktop lg+) ──────────────────────────────────────────────── */

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`hidden lg:flex sticky top-0 h-screen flex-col border-r border-border/60 bg-card/95 backdrop-blur-sm transition-all duration-300 ${
        collapsed ? "w-[72px]" : "w-[240px]"
      }`}
    >
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 border-b border-border/60 px-4">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white shadow-sm"
          style={{ background: "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)" }}
        >
          G
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-[15px] font-extrabold tracking-tight text-ink leading-tight">
              Glyph
            </p>
            <p className="text-[11px] text-ink-soft leading-tight">Motor clínico</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-all duration-200 ${
                isActive
                  ? "bg-accent/10 text-accent"
                  : "text-ink-soft hover:bg-bg-soft hover:text-ink"
              }`}
            >
              {/* Active pill indicator */}
              {isActive && (
                <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-accent" />
              )}
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

      {/* Bottom */}
      <div className="border-t border-border/60 px-3 py-3 space-y-2">
        <LogoutButton mode={collapsed ? "icon" : "full"} />
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-bg-soft px-3 py-2 text-xs font-medium text-ink-soft transition hover:bg-bg hover:text-ink"
          title={collapsed ? "Expandir menú" : "Contraer menú"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Contraer</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

/* ── Mobile Header ──────────────────────────────────────────────────────── */

export function MobileHeader() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/60 bg-card/95 px-4 lg:hidden">
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white shadow-sm"
          style={{ background: "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)" }}
        >
          G
        </div>
        <div>
          <p className="text-[14px] font-extrabold tracking-tight text-ink leading-tight">Glyph</p>
          <p className="text-[11px] text-ink-soft leading-tight">Motor clínico</p>
        </div>
      </div>
      <LogoutButton mode="icon" />
    </header>
  );
}

/* ── Bottom Nav (mobile) ────────────────────────────────────────────────── */

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 flex items-stretch border-t border-border/60 bg-card/95 backdrop-blur-sm lg:hidden"
      aria-label="Navegación principal móvil"
    >
      {NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
              isActive ? "text-accent" : "text-ink-soft"
            }`}
          >
            {isActive && (
              <span className="absolute inset-x-3 top-0 h-0.5 rounded-b-full bg-accent" />
            )}
            <span className={`transition-transform duration-150 ${isActive ? "scale-110" : ""}`}>
              {item.icon}
            </span>
            <span className="leading-none">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
