import Link from "next/link";
import { APP_NAME } from "@/lib/constants/app";
import "@/app/landing.css";

export const metadata = {
  title: `Plan Clínica | ${APP_NAME}`,
  description: "Detalles del Plan Clínica Multi-Tenant para centros médicos con múltiples doctores.",
};

function Ico({d, s=24}: {d:string, s?:number}) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d}/>
    </svg>
  );
}

export default function PlanClinicaPage() {
  return (
    <div className="gx-landing" style={{background: "var(--bg)"}}>
      <nav className="gx-nav" style={{position: "relative", background: "transparent", borderBottom: "none"}}>
        <Link href="/" style={{textDecoration:"none"}} className="gx-nav-brand">
          <img src="/icons/icon-96.webp" alt="Glyphix" style={{width: 24, height: 24, objectFit: "contain"}} /> {APP_NAME}
        </Link>
        <div className="gx-nav-links">
          <Link href="/#pricing" className="gx-nav-link">Volver a Precios</Link>
        </div>
      </nav>

      <main style={{maxWidth: 800, margin: "0 auto", padding: "80px 40px"}}>
        <div style={{textAlign: "center", marginBottom: 64}}>
          <div style={{display: "inline-flex", padding: "8px 16px", borderRadius: 100, background: "var(--accent-dim)", color: "var(--accent)", fontWeight: 600, fontSize: "0.875rem", marginBottom: 24}}>
            Suscripción Multi-Tenant
          </div>
          <h1 className="gx-hero-title" style={{fontSize: "3.5rem"}}>Plan Clínica</h1>
          <p className="gx-hero-desc">Para centros médicos que buscan unificar su equipo, facturación y operaciones bajo una sola plataforma.</p>
        </div>

        <div style={{background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 24, padding: "48px", boxShadow: "var(--shadow-sm)"}}>
          <h3 style={{fontSize: "1.5rem", fontWeight: 700, marginBottom: 24, color: "var(--ink)"}}>Todo lo del Plan Pro, y además:</h3>
          
          <ul style={{listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 24}}>
            <li style={{display: "flex", gap: 16, alignItems: "flex-start"}}>
              <div style={{color: "var(--ink)", marginTop: 2}}><Ico d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></div>
              <div>
                <strong style={{display: "block", fontSize: "1.125rem", color: "var(--ink)", marginBottom: 4}}>Gestión de Equipo Multi-Rol (RBAC)</strong>
                <p style={{color: "var(--ink-soft)", margin: 0, lineHeight: 1.5}}>Añade doctores, recepcionistas y técnicos. Cada rol tiene permisos específicos. El médico solo ve sus consultas, el recepcionista solo agenda y cajas, y tú (el Dueño) ves todo.</p>
              </div>
            </li>
            
            <li style={{display: "flex", gap: 16, alignItems: "flex-start"}}>
              <div style={{color: "var(--ink)", marginTop: 2}}><Ico d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></div>
              <div>
                <strong style={{display: "block", fontSize: "1.125rem", color: "var(--ink)", marginBottom: 4}}>Panel Gerencial y Cajas</strong>
                <p style={{color: "var(--ink-soft)", margin: 0, lineHeight: 1.5}}>Accede a un Dashboard exclusivo para dueños (`/administracion`) donde puedes auditar el flujo de efectivo (`cash_shifts`), ingresos por médico y estadísticas generales.</p>
              </div>
            </li>

            <li style={{display: "flex", gap: 16, alignItems: "flex-start"}}>
              <div style={{color: "var(--ink)", marginTop: 2}}><Ico d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></div>
              <div>
                <strong style={{display: "block", fontSize: "1.125rem", color: "var(--ink)", marginBottom: 4}}>Facturación Centralizada</strong>
                <p style={{color: "var(--ink-soft)", margin: 0, lineHeight: 1.5}}>Olvídate de cobrarle a cada médico por separado. Paga una sola factura mensual en Stripe calculada automáticamente en base a la cantidad de asientos (doctores) activos.</p>
              </div>
            </li>

            <li style={{display: "flex", gap: 16, alignItems: "flex-start"}}>
              <div style={{color: "var(--ink)", marginTop: 2}}><Ico d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></div>
              <div>
                <strong style={{display: "block", fontSize: "1.125rem", color: "var(--ink)", marginBottom: 4}}>Módulo de Laboratorio Unificado</strong>
                <p style={{color: "var(--ink-soft)", margin: 0, lineHeight: 1.5}}>Sube resultados PDF y notifica automáticamente al WhatsApp del paciente cuando estén listos. Ideal para laboratorios anexos a tu clínica.</p>
              </div>
            </li>
          </ul>

          <div style={{marginTop: 48, paddingTop: 32, borderTop: "1px solid var(--border)", textAlign: "center"}}>
            <Link href="/registro?plan=clinica" className="gx-btn gx-btn-p" style={{padding: "16px 32px", fontSize: "1.125rem"}}>
              Configurar Clínica Ahora
            </Link>
            <p style={{fontSize: "0.875rem", color: "var(--ink-faint)", marginTop: 16}}>Incluye 7 días gratis. Cancela en cualquier momento desde el Customer Portal.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
