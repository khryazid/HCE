"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogoutButton } from "@/features/auth/components/logout-button";
import {
  Home,
  ClipboardList,
  CalendarDays,
  Users,
  Pill,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

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
            <p
              style={{
                fontSize: ".68rem",
                color: "var(--ink-faint)",
                fontFamily: "'Outfit', system-ui, sans-serif",
                letterSpacing: ".06em",
                textTransform: "uppercase",
                lineHeight: 1,
                marginTop: 2,
              }}
            >
              Motor clínico
            </p>
          </div>
        )}
      </div>

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
              <span style={{ flexShrink: 0, display: "flex" }}>{item.icon}</span>
              {!collapsed && <span style={{ whiteSpace: "nowrap" }}>{item.label}</span>}
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
              }}
            >
              {item.icon}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

