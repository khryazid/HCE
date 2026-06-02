"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { useOverdueCount } from "@/features/dashboard/hooks/use-overdue-count";
import { useTenant } from "@/lib/supabase/tenant-context";
import {
  Home,
  ClipboardList,
  CalendarDays,
  Users,
  Pill,
  Settings,
  HelpCircle,
  Search,
  Building2,
  Stethoscope,
  FlaskConical,
  ScanLine,
  Scissors,
  Receipt,
} from "lucide-react";
import { SYNC_STARTED_EVENT, SYNC_FINISHED_EVENT } from "@/lib/sync/sync-worker";
import { APP_NAME } from "@/lib/constants/app";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

function getNavItems(role?: string, plan?: string): NavItem[] {
  // ── clinic_admin OR owner of Clinic Plan: administration-focused view ──
  if (role === "clinic_admin" || (role === "owner" && plan === "clinic")) {
    return [
      { href: "/administracion", label: "Administración", icon: <Building2 className="w-[16px] h-[16px]" /> },
    ];
  }

  // ── receptionist (Plan Clínica): agenda management ──
  if (role === "receptionist") {
    return [
      { href: "/recepcion",      label: "Recepción",      icon: <Stethoscope className="w-[16px] h-[16px]" /> },
      { href: "/docs",           label: "Manual",         icon: <HelpCircle className="w-[16px] h-[16px]" /> },
    ];
  }

  // ── lab (Plan Clínica): lab orders ──
  if (role === "lab") {
    return [
      { href: "/laboratorio",    label: "Laboratorio",    icon: <FlaskConical className="w-[16px] h-[16px]" /> },
      { href: "/caja",           label: "Caja",           icon: <Receipt className="w-[16px] h-[16px]" /> },
      { href: "/docs",           label: "Manual",         icon: <HelpCircle className="w-[16px] h-[16px]" /> },
    ];
  }

  // ── imaging (Plan Clínica): imaging orders ──
  if (role === "imaging") {
    return [
      { href: "/imagen",         label: "Imagenología",   icon: <ScanLine className="w-[16px] h-[16px]" /> },
      { href: "/caja",           label: "Caja",           icon: <Receipt className="w-[16px] h-[16px]" /> },
      { href: "/docs",           label: "Manual",         icon: <HelpCircle className="w-[16px] h-[16px]" /> },
    ];
  }

  // ── surgery (Plan Clínica): surgery budgets ──
  if (role === "surgery") {
    return [
      { href: "/cirugia",        label: "Cirugía",        icon: <Scissors className="w-[16px] h-[16px]" /> },
      { href: "/caja",           label: "Caja",           icon: <Receipt className="w-[16px] h-[16px]" /> },
      { href: "/docs",           label: "Manual",         icon: <HelpCircle className="w-[16px] h-[16px]" /> },
    ];
  }

  // ── assistant: agenda + caja, optionally patients ──
  if (role === "assistant") {
    return [
      { href: "/agenda",         label: "Agenda",         icon: <CalendarDays className="w-[16px] h-[16px]" /> },
      { href: "/pacientes",      label: "Pacientes",      icon: <Users className="w-[16px] h-[16px]" /> },
      { href: "/caja",           label: "Caja",           icon: <Receipt className="w-[16px] h-[16px]" /> },
      { href: "/docs",           label: "Manual",         icon: <HelpCircle className="w-[16px] h-[16px]" /> },
    ];
  }

  // ── owner / doctor: full clinical features ──
  const baseItems: NavItem[] = [
    { href: "/dashboard",    label: "Inicio",       icon: <Home className="w-[16px] h-[16px]" /> },
    { href: "/agenda",       label: "Agenda",       icon: <CalendarDays className="w-[16px] h-[16px]" /> },
    { href: "/pacientes",    label: "Pacientes",    icon: <Users className="w-[16px] h-[16px]" /> },
    { href: "/consultas",    label: "Consultas",    icon: <ClipboardList className="w-[16px] h-[16px]" /> },
    { href: "/tratamientos", label: "Tratamientos", icon: <Pill className="w-[16px] h-[16px]" /> },
  ];

  // Clinic plan features
  if (plan === "clinic") {
    baseItems.push(
      { href: "/laboratorio",  label: "Laboratorio",  icon: <FlaskConical className="w-[16px] h-[16px]" /> },
      { href: "/cirugia",      label: "Cirugía",      icon: <Scissors className="w-[16px] h-[16px]" /> },
      { href: "/referencias",  label: "Referencias",  icon: <Search className="w-[16px] h-[16px]" /> },
    );
  }

  baseItems.push(
    { href: "/caja",         label: "Caja",         icon: <Receipt className="w-[16px] h-[16px]" /> },
    { href: "/ajustes",      label: "Ajustes",      icon: <Settings className="w-[16px] h-[16px]" /> },
    { href: "/docs",         label: "Manual",       icon: <HelpCircle className="w-[16px] h-[16px]" /> },
  );

  return baseItems;
}

/* ── Logo mark — sello de cobre ─────────────────────────────── */
function GlyphMark({ size = 32 }: { size?: number }) {
  return (
    <img 
      src="/icons/icon-96.webp" 
      alt="Glyphix Logo" 
      style={{ 
        width: size, 
        height: size, 
        objectFit: "contain",
        flexShrink: 0
      }} 
    />
  );
}

/* ── Status Indicator ──────────────────────────────────── */
function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasPending, setHasPending] = useState(false);
  const [hasErrors, setHasErrors] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Check initial online status
    setIsOnline(navigator.onLine);

    // Import dynamically or ensure getSyncQueueStats is available
    const checkQueue = async () => {
      try {
        const { getSyncQueueStats } = await import("@/lib/db/indexeddb");
        const stats = await getSyncQueueStats();
        setHasErrors(stats.failed > 0 || stats.conflicted > 0);
        setHasPending(stats.pending > 0);
      } catch {
        // Ignore IDB errors initially
      }
    };

    void checkQueue();

    const on  = () => { setIsOnline(true); void checkQueue(); };
    const off = () => setIsOnline(false);
    const onSyncStart = () => setIsSyncing(true);
    const onSyncFinish = () => { setIsSyncing(false); void checkQueue(); };
    
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

  // Determinar color y texto
  let dotColor = "bg-emerald-500";
  let textColor = "text-ink-soft";
  let label = "Sincronizado";

  if (!isOnline) {
    dotColor = "bg-red-500";
    label = "Offline";
  } else if (hasErrors) {
    dotColor = "bg-red-500";
    textColor = "text-red-500";
    label = "Error de Sync";
  } else if (isSyncing) {
    dotColor = "bg-blue-500";
    label = "Sincronizando";
  } else if (hasPending) {
    dotColor = "bg-amber-500";
    label = "Pendiente";
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-soft border border-border" title={label}>
      <span className="relative flex h-2 w-2 shrink-0">
        {isSyncing ? (
          <>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
            <span className={`relative inline-flex h-2 w-2 rounded-full ${dotColor}`}></span>
          </>
        ) : (
          <span className={`relative inline-flex h-2 w-2 rounded-full ${dotColor}`}></span>
        )}
      </span>
      <span className={`text-xs uppercase font-semibold tracking-wider hidden xl:inline-block ${textColor}`}>
        {label}
      </span>
    </div>
  );
}


/* ── Topnav (desktop lg+) ──────────────────────────────────── */
export function Topnav() {
  const pathname = usePathname();
  const overdueCount = useOverdueCount();
  const { tenant } = useTenant();
  const navItems = getNavItems(tenant?.role, tenant?.plan);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/80 backdrop-blur-md hidden lg:block">
      <div className="flex h-16 items-center px-6">
        
        {/* Brand */}
        <Link href="/dashboard" className="flex items-center gap-3 mr-8 shrink-0">
          <GlyphMark size={28} />
          <span className="font-display text-lg font-bold tracking-tight text-ink">
            {APP_NAME}
          </span>
        </Link>

        {/* Center Nav */}
        <nav className="flex items-center gap-1 flex-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-base transition-colors ${
                  isActive 
                    ? "bg-accent/10 text-accent font-semibold" 
                    : "text-ink-soft font-medium hover:bg-bg-soft hover:text-ink"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.href === "/pacientes" && overdueCount > 0 && (
                  <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white ml-1">
                    {overdueCount > 9 ? "9+" : overdueCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-4 shrink-0">
          
          <ConnectionStatus />
          
          <div className="h-6 w-px bg-border mx-1"></div>

          <LogoutButton mode="icon" />
        </div>
      </div>
    </header>
  );
}

/* ── Mobile Header ──────────────────────────────────────────── */
export function MobileHeader() {
  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b border-border bg-card/90 backdrop-blur-md px-4 lg:hidden">
      <div className="flex items-center gap-3">
        <GlyphMark size={28} />
        <div>
          <p className="font-display text-base font-bold tracking-tight text-ink leading-tight">
            {APP_NAME}
          </p>
          <p className="text-xs text-ink-faint uppercase tracking-wider font-semibold">
            Motor Clínico
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <ConnectionStatus />
        <LogoutButton mode="icon" />
      </div>
    </header>
  );
}

/* ── Bottom Nav (mobile) ────────────────────────────────────── */
export function BottomNav() {
  const pathname = usePathname();
  const overdueCount = useOverdueCount();
  const { tenant } = useTenant();
  const navItems = getNavItems(tenant?.role, tenant?.plan);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex items-stretch border-t border-border bg-card/95 backdrop-blur-xl pb-safe lg:hidden">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors ${
              isActive ? "text-accent" : "text-ink-faint hover:text-ink-soft"
            }`}
          >
            {isActive && (
              <span className="absolute top-0 left-[20%] right-[20%] h-0.5 rounded-b-sm bg-accent" />
            )}
            <div className={`relative flex transition-transform ${isActive ? "scale-110" : "scale-100"}`}>
              {item.icon}
              {item.href === "/pacientes" && overdueCount > 0 && (
                <span className="absolute -right-2 -top-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full border border-card bg-red-500 px-0.5 text-[10px] font-bold text-white">
                  {overdueCount > 9 ? "9+" : overdueCount}
                </span>
              )}
            </div>
            <span className="truncate w-full text-center px-1">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
