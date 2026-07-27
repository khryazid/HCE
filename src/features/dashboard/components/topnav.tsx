"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
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
  Plus,
  Menu,
  X,
} from "lucide-react";
import { useRef } from "react";
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
      { href: "/pacientes",      label: "Pacientes",      icon: <Users className="w-[16px] h-[16px]" /> },
      { href: "/caja",           label: "Caja",           icon: <Receipt className="w-[16px] h-[16px]" /> },
      { href: "/laboratorio/ajustes", label: "Ajustes Lab",   icon: <Settings className="w-[16px] h-[16px]" /> },
    ];
  }

  // ── imaging (Plan Clínica): imaging orders ──
  if (role === "imaging") {
    return [
      { href: "/imagen",         label: "Imagenología",   icon: <ScanLine className="w-[16px] h-[16px]" /> },
      { href: "/caja",           label: "Caja",           icon: <Receipt className="w-[16px] h-[16px]" /> },
      { href: "/docs",           label: "Manual",         icon: <HelpCircle className="w-[16px] h-[16px]" /> },
      { href: "/imagen/ajustes", label: "Ajustes Imagen", icon: <Settings className="w-[16px] h-[16px]" /> },
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
      { href: "/laboratorio/ajustes", label: "Ajustes Lab", icon: <FlaskConical className="w-[16px] h-[16px]" /> },
      { href: "/imagen",       label: "Imagenología", icon: <ScanLine className="w-[16px] h-[16px]" /> },
      { href: "/imagen/ajustes", label: "Ajustes Imagen", icon: <ScanLine className="w-[16px] h-[16px]" /> },
      { href: "/cirugia",      label: "Cirugía",      icon: <Scissors className="w-[16px] h-[16px]" /> },
      { href: "/referencias",  label: "Referencias",  icon: <Search className="w-[16px] h-[16px]" /> },
    );
  }

  baseItems.push(
    { href: "/caja",         label: "Caja",         icon: <Receipt className="w-[16px] h-[16px]" /> },
    { href: "/ajustes",      label: "Ajustes",      icon: <Settings className="w-[16px] h-[16px]" /> },
  );

  if (role !== "lab") {
    baseItems.push(
      { href: "/docs",       label: "Manual",       icon: <HelpCircle className="w-[16px] h-[16px]" /> },
    );
  }

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

  const handleClick = () => {
    if (!isOnline) {
      toast.error("Sin conexión a Internet", { description: "Estás trabajando en modo offline. Los cambios se guardarán en tu dispositivo." });
    } else if (hasErrors) {
      toast.error("Error de Sincronización", { description: "Hubo problemas sincronizando algunos datos. Se reintentará automáticamente." });
    } else if (isSyncing) {
      toast.info("Sincronizando...", { description: "Tus datos se están guardando en la nube de forma segura." });
    } else if (hasPending) {
      toast.warning("Sincronización pendiente", { description: "Hay datos en espera para ser enviados al servidor." });
    } else {
      toast.success("Conectado y Sincronizado", { description: "Todos tus datos están respaldados en la nube." });
    }
  };

  return (
    <button 
      onClick={handleClick}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-soft border border-border transition-colors hover:bg-bg active:scale-95 cursor-pointer" 
      title={label}
    >
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
      <span className={`text-xs uppercase font-semibold tracking-wider hidden md:inline-block ${textColor}`}>
        {label}
      </span>
    </button>
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
  const [menuPathname, setMenuPathname] = useState<string | null>(null);
  const isMenuOpen = menuPathname === pathname;

  // Show only up to 4 primary items in the bottom bar to avoid crowding
  const primaryItems = navItems.slice(0, 4);
  const hasMore = navItems.length > 4;

  const closeMenu = () => setMenuPathname(null);
  const toggleMenu = () => {
    setMenuPathname((currentPathname) => (currentPathname === pathname ? null : pathname));
  };

  return (
    <>
      {/* Drawer */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm transition-opacity" onClick={closeMenu} />
          <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display font-bold text-lg text-ink">Menú Principal</h3>
              <button onClick={closeMenu} className="p-2 bg-bg-soft rounded-full text-ink-soft hover:text-ink transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-y-6 gap-x-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMenu}
                    className={`flex flex-col items-center justify-center gap-2 p-2 rounded-2xl transition-all ${
                      isActive ? "bg-accent/10 text-accent" : "text-ink-soft hover:bg-bg-soft hover:text-ink"
                    }`}
                  >
                    <div className={isActive ? "scale-110 transition-transform" : ""}>{item.icon}</div>
                    <span className="text-[10px] font-semibold text-center leading-tight truncate w-full">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Bar */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex items-stretch border-t border-border bg-card/95 backdrop-blur-xl pb-safe lg:hidden">
        {primaryItems.map((item) => {
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

        {/* 'More' Button */}
        {hasMore && (
          <button
            onClick={toggleMenu}
            className={`relative flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors ${isMenuOpen ? "text-ink" : "text-ink-faint hover:text-ink-soft"}`}
          >
            <div className={`relative flex transition-transform ${isMenuOpen ? "scale-110" : "scale-100"}`}>
              <Menu className="w-[16px] h-[16px]" />
            </div>
            <span className="truncate w-full text-center px-1">Menú</span>
          </button>
        )}
      </nav>
    </>
  );
}

/* ── Mobile FAB ────────────────────────────────────── */
export function MobileFab() {
  const { tenant } = useTenant();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (pathname.includes("/agenda") || pathname.includes("/consultas") || pathname.includes("/administracion")) {
    return null;
  }

  const isMedicalStaff = tenant?.role === "owner" || tenant?.role === "doctor";
  if (!isMedicalStaff) {
    return null;
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 lg:hidden" ref={menuRef}>
      {isOpen && (
        <div className="absolute bottom-16 right-0 mb-2 flex flex-col gap-2 min-w-[160px] animate-in slide-in-from-bottom-2 fade-in">
          <Link 
            href="/agenda" 
            className="flex items-center gap-3 bg-card px-4 py-3 rounded-xl shadow-lg border border-border text-ink hover:bg-bg-soft transition-colors text-sm font-semibold whitespace-nowrap"
            onClick={() => setIsOpen(false)}
          >
            <div className="bg-accent/10 p-1.5 rounded-md text-accent">
              <CalendarDays className="h-4 w-4" />
            </div>
            Crear cita
          </Link>
          <Link 
            href="/consultas" 
            className="flex items-center gap-3 bg-card px-4 py-3 rounded-xl shadow-lg border border-border text-ink hover:bg-bg-soft transition-colors text-sm font-semibold whitespace-nowrap"
            onClick={() => setIsOpen(false)}
          >
            <div className="bg-accent/10 p-1.5 rounded-md text-accent">
              <ClipboardList className="h-4 w-4" />
            </div>
            Nueva consulta
          </Link>
        </div>
      )}
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Opciones rápidas"
        className={`flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg transition-transform active:scale-95 ${isOpen ? "rotate-45 bg-ink" : "hover:scale-105"}`}
      >
        <Plus className="h-6 w-6" aria-hidden="true" />
      </button>
    </div>
  );
}
