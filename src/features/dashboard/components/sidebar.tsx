"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { useOverdueCount } from "@/features/dashboard/hooks/use-overdue-count";
import {
  Home,
  ClipboardList,
  CalendarDays,
  Users,
  Pill,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Cloudy,
  CloudLightning
} from "lucide-react";
import { SYNC_STARTED_EVENT, SYNC_FINISHED_EVENT } from "@/lib/sync/sync-worker";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard",    label: "Inicio",       icon: <Home         className="h-[18px] w-[18px]" /> },
  { href: "/agenda",       label: "Agenda",       icon: <CalendarDays className="h-[18px] w-[18px]" /> },
  { href: "/consultas",    label: "Consultas",    icon: <ClipboardList className="h-[18px] w-[18px]" /> },
  { href: "/pacientes",    label: "Pacientes",    icon: <Users        className="h-[18px] w-[18px]" /> },
  { href: "/tratamientos", label: "Tratamientos", icon: <Pill         className="h-[18px] w-[18px]" /> },
  { href: "/ajustes",      label: "Ajustes",      icon: <Settings     className="h-[18px] w-[18px]" /> },
];

/* ── Logo mark — sello de cobre ─────────────────────────────── */
function GlyphMark({ size = 36 }: { size?: number }) {
  return (
    <div
      style={{
        width: size, height: size,
        borderRadius: "10px",
        background: "var(--accent)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
        boxShadow: "0 2px 8px var(--accent-glow)",
      }}
    >
      <span
        style={{
          fontFamily: "'Space Grotesk', system-ui, sans-serif",
          fontSize: size * 0.44,
          fontWeight: 700,
          color: "#FBF6F0",
          lineHeight: 1,
          letterSpacing: "-.04em",
        }}
      >
        G
      </span>
    </div>
  );
}

/* ── Sidebar (desktop lg+) ──────────────────────────────────── */
export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const overdueCount = useOverdueCount();

  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsOnline(navigator.onLine);
    const on  = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    const onSyncStart = () => setIsSyncing(true);
    const onSyncFinish = () => setIsSyncing(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    window.addEventListener(SYNC_STARTED_EVENT, onSyncStart);
    window.addEventListener(SYNC_FINISHED_EVENT, onSyncFinish);
    return () => { 
      window.removeEventListener("online", on); 
      window.removeEventListener("offline", off);
      window.removeEventListener(SYNC_STARTED_EVENT, onSyncStart);
      window.removeEventListener(SYNC_FINISHED_EVENT, onSyncFinish);
    };
  }, []);

  return (
    <aside
      style={{
        background: "var(--card)",
        borderRight: "1px solid var(--border)",
        transition: "width 0.28s cubic-bezier(.4,0,.2,1)",
        width: collapsed ? "72px" : "220px",
        position: "sticky",
        top: 0,
        height: "100vh",
      }}
      className="hidden shrink-0 flex-col lg:flex"
    >
      {/* Brand */}
      <div
        style={{
          height: 60,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: collapsed ? "0 17px" : "0 16px",
          borderBottom: "1px solid var(--border)",
          overflow: "hidden",
          transition: "padding .28s",
        }}
      >
        <GlyphMark size={34} />
        {!collapsed && (
          <div style={{ overflow: "hidden", minWidth: 0 }}>
            <p
              style={{
                fontFamily: "'Space Grotesk', system-ui, sans-serif",
                fontSize: "1rem",
                fontWeight: 700,
                color: "var(--ink)",
                letterSpacing: "-.03em",
                lineHeight: 1.2,
                whiteSpace: "nowrap",
              }}
            >
              Glyph
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              <span className={`relative flex h-1.5 w-1.5 shrink-0`}>
                {isSyncing ? (
                  <>
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                  </>
                ) : isOnline ? (
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-teal-500"></span>
                ) : (
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500"></span>
                )}
              </span>
              <p
                style={{
                  fontSize: ".65rem",
                  color: "var(--ink-faint)",
                  fontFamily: "'Outfit', system-ui, sans-serif",
                  letterSpacing: ".04em",
                  textTransform: "uppercase",
                  lineHeight: 1,
                }}
              >
                {isSyncing ? "Sincronizando..." : isOnline ? "Sincronizado" : "Offline"}
              </p>
            </div>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="px-3 pb-2 pt-3">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", {
              key: "k", ctrlKey: true, bubbles: true
            }))}
            className="flex w-full items-center gap-2 rounded-xl border border-border bg-bg-soft px-3 py-2 text-sm text-ink-soft transition hover:border-accent/30 hover:text-ink"
          >
            <svg className="h-4 w-4 shrink-0 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            Buscar
            <div className="ml-auto flex items-center gap-1">
              <kbd className="inline-flex h-5 items-center rounded border border-border bg-card px-1.5 text-[10px] font-medium">⌘</kbd>
              <kbd className="inline-flex h-5 items-center rounded border border-border bg-card px-1.5 text-[10px] font-medium">K</kbd>
            </div>
          </button>
        </div>
      )}

      {/* Nav */}
      <nav
        style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2 }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: collapsed ? "10px" : "9px 12px",
                borderRadius: "9px",
                justifyContent: collapsed ? "center" : "flex-start",
                position: "relative",
                transition: "background .18s, color .18s",
                textDecoration: "none",
                background: isActive ? "var(--accent-dim)" : "transparent",
                color: isActive ? "var(--accent)" : "var(--ink-soft)",
                fontFamily: "var(--font-ui)",
                fontSize: ".86rem",
                fontWeight: isActive ? 600 : 500,
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = "var(--bg-soft)";
                  (e.currentTarget as HTMLElement).style.color = "var(--ink)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "var(--ink-soft)";
                }
              }}
            >
              {/* Left accent bar */}
              {isActive && (
                <span
                  style={{
                    position: "absolute",
                    left: 0, top: "50%",
                    height: "60%", width: "2px",
                    transform: "translateY(-50%)",
                    borderRadius: "0 2px 2px 0",
                    background: "var(--accent)",
                  }}
                />
              )}
              <span style={{ flexShrink: 0, display: "flex", position: "relative" }}>
                {item.icon}
              </span>
              {!collapsed && <span style={{ whiteSpace: "nowrap" }}>{item.label}</span>}
              {item.href === "/pacientes" && overdueCount > 0 && (
                <span className="ml-auto flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {overdueCount > 9 ? "9+" : overdueCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom controls */}
      <div
        style={{
          padding: "8px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <LogoutButton mode={collapsed ? "icon" : "full"} />
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expandir" : "Contraer"}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            gap: 8,
            padding: collapsed ? "9px" : "9px 12px",
            borderRadius: "9px",
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--ink-faint)",
            fontSize: ".8rem",
            fontFamily: "var(--font-ui)",
            cursor: "pointer",
            transition: "all .18s",
            width: "100%",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "var(--bg-soft)";
            (e.currentTarget as HTMLElement).style.color = "var(--ink-soft)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "var(--ink-faint)";
          }}
        >
          {collapsed
            ? <PanelLeftOpen className="h-4 w-4" />
            : <><PanelLeftClose className="h-4 w-4" /><span>Contraer</span></>
          }
        </button>
      </div>
    </aside>
  );
}

/* ── Mobile Header ──────────────────────────────────────────── */
export function MobileHeader() {
  return (
    <header
      style={{
        height: 56,
        borderBottom: "1px solid var(--border)",
        background: "var(--card)",
        padding: "0 16px",
      }}
      className="flex shrink-0 items-center justify-between lg:hidden"
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <GlyphMark size={30} />
        <div>
          <p style={{ fontFamily: "var(--font-display)", fontSize: ".95rem", fontWeight: 700, color: "var(--ink)", letterSpacing: "-.03em", lineHeight: 1.2 }}>
            Glyph
          </p>
          <p style={{ fontSize: ".65rem", color: "var(--ink-faint)", fontFamily: "var(--font-ui)", letterSpacing: ".06em", textTransform: "uppercase" }}>
            Motor clínico
          </p>
        </div>
      </div>
      <LogoutButton mode="icon" />
    </header>
  );
}

/* ── Bottom Nav (mobile) ────────────────────────────────────── */
export function BottomNav() {
  const pathname = usePathname();
  const overdueCount = useOverdueCount();

  return (
    <nav
      style={{
        position: "fixed",
        insetInline: 0,
        bottom: 0,
        zIndex: 50,
        alignItems: "stretch",
        borderTop: "1px solid var(--border)",
        background: "color-mix(in srgb, var(--card) 95%, transparent)",
        backdropFilter: "blur(12px)",
      }}
      className="hidden max-lg:flex"
      aria-label="Navegación principal móvil"
    >
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              padding: "8px 4px",
              fontSize: ".68rem",
              fontWeight: 500,
              color: isActive ? "var(--accent)" : "var(--ink-faint)",
              textDecoration: "none",
              position: "relative",
              fontFamily: "'Outfit', system-ui, sans-serif",
              transition: "color .15s",
            }}
          >
            {isActive && (
              <span
                style={{
                  position: "absolute",
                  top: 0, left: "15%", right: "15%",
                  height: "2px",
                  borderRadius: "0 0 3px 3px",
                  background: "var(--accent)",
                }}
              />
            )}
            <span
              style={{
                transform: isActive ? "scale(1.1)" : "scale(1)",
                transition: "transform .15s",
                display: "flex",
                position: "relative",
              }}
            >
              {item.icon}
              {item.href === "/pacientes" && overdueCount > 0 && (
                <span className="absolute -right-2 -top-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full border border-card bg-red-500 px-0.5 text-[8px] font-bold text-white">
                  {overdueCount > 9 ? "9+" : overdueCount}
                </span>
              )}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

