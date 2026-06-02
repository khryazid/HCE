import Link from "next/link";
import { APP_NAME } from "@/lib/constants/app";
import "@/app/landing.css";

export const metadata = {
  title: `Plan Profesional | ${APP_NAME}`,
  description: "Detalles del Plan Profesional Independiente para médicos con consultorio propio.",
};

function Ico({d, s=24}: {d:string, s?:number}) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d}/>
    </svg>
  );
}

export default function PlanProfesionalPage() {
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
            Suscripción Individual
          </div>
          <h1 className="gx-hero-title" style={{fontSize: "3.5rem"}}>Plan Profesional</h1>
          <p className="gx-hero-desc">La herramienta definitiva para médicos con consultorio propio que buscan independizarse del papel.</p>
        </div>

        <div style={{background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 24, padding: "48px", boxShadow: "var(--shadow-sm)"}}>
          <h3 style={{fontSize: "1.5rem", fontWeight: 700, marginBottom: 24, color: "var(--ink)"}}>¿Qué incluye este plan?</h3>
          
          <ul style={{listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 24}}>
            <li style={{display: "flex", gap: 16, alignItems: "flex-start"}}>
              <div style={{color: "var(--accent)", marginTop: 2}}><Ico d="M5 13l4 4L19 7" /></div>
              <div>
                <strong style={{display: "block", fontSize: "1.125rem", color: "var(--ink)", marginBottom: 4}}>Pacientes Ilimitados</strong>
                <p style={{color: "var(--ink-soft)", margin: 0, lineHeight: 1.5}}>No hay límite en la cantidad de pacientes que puedes registrar ni en las consultas que puedes crear. Tu base de datos es tuya para siempre.</p>
              </div>
            </li>
            
            <li style={{display: "flex", gap: 16, alignItems: "flex-start"}}>
              <div style={{color: "var(--accent)", marginTop: 2}}><Ico d="M5 13l4 4L19 7" /></div>
              <div>
                <strong style={{display: "block", fontSize: "1.125rem", color: "var(--ink)", marginBottom: 4}}>Inteligencia Artificial (CIE-11)</strong>
                <p style={{color: "var(--ink-soft)", margin: 0, lineHeight: 1.5}}>Acceso ilimitado a nuestro motor Gemini 2.0 Flash que lee tus anotaciones y te sugiere automáticamente el diagnóstico exacto bajo el estándar CIE-11.</p>
              </div>
            </li>

            <li style={{display: "flex", gap: 16, alignItems: "flex-start"}}>
              <div style={{color: "var(--accent)", marginTop: 2}}><Ico d="M5 13l4 4L19 7" /></div>
              <div>
                <strong style={{display: "block", fontSize: "1.125rem", color: "var(--ink)", marginBottom: 4}}>Sincronización Offline-First</strong>
                <p style={{color: "var(--ink-soft)", margin: 0, lineHeight: 1.5}}>Trabaja desde donde sea, incluso sin internet. Tus datos se guardan en el navegador y se sincronizan a la nube apenas recuperas la conexión.</p>
              </div>
            </li>

            <li style={{display: "flex", gap: 16, alignItems: "flex-start"}}>
              <div style={{color: "var(--accent)", marginTop: 2}}><Ico d="M5 13l4 4L19 7" /></div>
              <div>
                <strong style={{display: "block", fontSize: "1.125rem", color: "var(--ink)", marginBottom: 4}}>Plantillas Modulares</strong>
                <p style={{color: "var(--ink-soft)", margin: 0, lineHeight: 1.5}}>Guarda tus recetas, motivos de consulta frecuentes y órdenes médicas como &quot;Rompecabezas&quot; para rellenar futuras consultas con un solo clic.</p>
              </div>
            </li>
          </ul>

          <div style={{marginTop: 48, paddingTop: 32, borderTop: "1px solid var(--border)", textAlign: "center"}}>
            <Link href="/registro?plan=pro" className="gx-btn gx-btn-p" style={{padding: "16px 32px", fontSize: "1.125rem"}}>
              Probar 7 días gratis
            </Link>
            <p style={{fontSize: "0.875rem", color: "var(--ink-faint)", marginTop: 16}}>Sin tarjeta de crédito. Cancela cuando quieras.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
