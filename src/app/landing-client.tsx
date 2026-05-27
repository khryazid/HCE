"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";
import "./landing.css";
import { APP_NAME } from "@/lib/constants/app";

function Ico({d,s=20}: {d:string, s?:number}) { 
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={d}/>
    </svg>
  ); 
}

export default function LandingClient({ proPrice, clinicPrice }: { proPrice: number; clinicPrice: number }) {
  const t = useTranslations("Landing");
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const onScroll = () => {
      const nav = document.querySelector(".gx-nav");
      if (nav) {
        if (window.scrollY > 40) nav.classList.add("scrolled");
        else nav.classList.remove("scrolled");
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="gx-landing" data-theme={theme}>
      
      {/* ── Navigation ── */}
      <nav className="gx-nav">
        <Link href="/" style={{textDecoration:"none"}} className="gx-nav-brand">
          <span /> {APP_NAME}
        </Link>
        <div className="gx-nav-links">
          <a href="#features" className="gx-nav-link">Características</a>
          <a href="#offline" className="gx-nav-link">Offline</a>
          <a href="#pricing" className="gx-nav-link">Precios</a>
          <span className="gx-nav-link" onClick={() => setTheme(t => t === "light" ? "dark" : "light")} style={{userSelect:"none"}}>Tema: {theme}</span>
          <Link href="/login" className="gx-btn gx-btn-s" style={{padding:"8px 16px", fontSize:"0.8125rem"}}>Iniciar Sesión</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <header className="gx-hero">
        <div className="gx-hero-badge gx-s gx-s1">
          <div style={{width:6,height:6,background:"var(--accent)",borderRadius:"50%",boxShadow:"0 0 8px var(--accent)"}}/>
          Motor Clínico · Disponible ahora
        </div>
        <h1 className="gx-hero-title gx-s gx-s2">
          {t("heroTitleLine1")}<br/>
          <span style={{color: "var(--accent)"}}>{t("heroTitleLine2")}</span>
        </h1>
        <p className="gx-hero-desc gx-s gx-s3">
          {t("heroSub")}
        </p>
        <div className="gx-hero-actions gx-s gx-s4">
          <Link href="/registro" className="gx-btn gx-btn-p">Comenzar prueba gratis</Link>
          <a href="#features" className="gx-btn gx-btn-s">Ver funciones</a>
        </div>
        <p style={{fontSize: "0.8125rem", color: "var(--ink-faint)", marginTop: 24, animation: "gx-up 600ms forwards", animationDelay:"400ms", opacity:0}}>
          7 días de prueba gratis · Sin tarjeta de crédito · Cancela cuando quieras
        </p>
        
        {/* Stats Bar */}
        <div style={{display: "flex", justifyContent: "center", gap: 40, marginTop: 64, flexWrap: "wrap", animation: "gx-up 600ms forwards", animationDelay:"500ms", opacity:0}}>
          {[
            { num: "∞", label: "Pacientes registrados" },
            { num: "CIE-10", label: "Codificación con IA" },
            { num: "100%", label: "Funciona offline" },
            { num: "< 2s", label: "Tiempo de carga" },
          ].map((s) => (
            <div key={s.label} style={{display:"flex", flexDirection:"column", gap:4}}>
              <span style={{fontFamily:"var(--font-mono)", fontSize:"1.5rem", fontWeight:700, color:"var(--ink)"}}>{s.num}</span>
              <span style={{fontSize:"0.8125rem", color:"var(--ink-soft)"}}>{s.label}</span>
            </div>
          ))}
        </div>
      </header>

      {/* ── Mockup / Visual ── */}
      <section className="gx-mockup gx-s gx-s4">
        <div className="gx-m-frame">
          <div className="gx-m-top">
            <div className="gx-m-dot" />
            <div className="gx-m-dot" />
            <div className="gx-m-dot" />
          </div>
          <div className="gx-m-content">
             <div style={{position:"absolute", top:40, left:40, right:40, height:60, background:"var(--bg)", borderRadius:8, border:"1px solid var(--border)", boxShadow:"var(--shadow-sm)"}} />
             <div style={{position:"absolute", top:120, left:40, width:240, bottom:40, background:"var(--bg)", borderRadius:8, border:"1px solid var(--border)", boxShadow:"var(--shadow-sm)"}} />
             <div style={{position:"absolute", top:120, left:300, right:40, bottom:40, background:"var(--bg)", borderRadius:8, border:"1px solid var(--border)", boxShadow:"var(--shadow-sm)"}} />
          </div>
        </div>
      </section>

      {/* ── Bento Grid (Features) ── */}
      <section id="features" className="gx-bento">
        <div className="gx-b-card gx-b-large">
          <div className="gx-b-icon"><Ico d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></div>
          <h3 className="gx-b-title">Motor Clínico Adaptativo</h3>
          <p className="gx-b-desc">Flujo de 6 pasos médico-legales que se adapta a tu especialidad. Oculta las secciones que no usas (ej. pediatría) y el sistema lo recordará automáticamente en tu próxima sesión. Atajos de teclado en cada rincón (⌘K) para máxima velocidad.</p>
        </div>
        <div className="gx-b-card">
          <div className="gx-b-icon"><Ico d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></div>
          <h3 className="gx-b-title">Posología Inteligente</h3>
          <p className="gx-b-desc">Escribe la receta médica en texto libre y el sistema generará automáticamente tarjetas estructuradas de indicaciones para la hoja del paciente.</p>
        </div>
        <div className="gx-b-card">
          <div className="gx-b-icon"><Ico d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></div>
          <h3 className="gx-b-title">Gestión Multi-Doctor</h3>
          <p className="gx-b-desc">Agrega a tus colegas y asistentes. Arquitectura multi-tenant con roles de seguridad estrictos (RLS) para clínicas y consultorios compartidos.</p>
        </div>
        <div className="gx-b-card gx-b-large">
          <div className="gx-b-icon"><Ico d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /></div>
          <h3 className="gx-b-title">Sugerencias con IA (Gemini)</h3>
          <p className="gx-b-desc">El autocompletado CIE-10 está potenciado por modelos de inteligencia artificial (Gemini 2.0 Flash). Encuentra el diagnóstico exacto analizando el texto libre del motivo de consulta en milisegundos.</p>
        </div>
      </section>

      {/* ── Offline Split ── */}
      <section id="offline" style={{padding: "120px 40px", background: "var(--bg-soft)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)"}}>
        <div style={{maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center"}}>
          
          <div style={{background: "var(--bg-elevated)", padding: 32, borderRadius: 16, border: "1px solid var(--border)", boxShadow: "var(--shadow-md)"}}>
             <div style={{display:"flex", gap:8, marginBottom:24}}>
               <div className="gx-m-dot" style={{background:"#FF5F56"}}/>
               <div className="gx-m-dot" style={{background:"#FFBD2E"}}/>
               <div className="gx-m-dot" style={{background:"#27C93F"}}/>
             </div>
             <div style={{display:"flex", flexDirection:"column", gap:12}}>
                {[
                  { name: "García, Luis", status: "Sincronizado", color: "var(--state-ok)" },
                  { name: "Rodríguez, Ana", status: "En cola", color: "var(--state-warn)" },
                  { name: "Méndez, Carlos", status: "En cola", color: "var(--state-warn)" },
                  { name: "Flores, María", status: "Sincronizado", color: "var(--state-ok)" },
                ].map((row) => (
                  <div key={row.name} style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 16px", background:"var(--bg)", border:"1px solid var(--border)", borderRadius:8}}>
                    <span style={{fontSize:"0.9375rem", fontWeight:500}}>{row.name}</span>
                    <span style={{fontSize:"0.75rem", fontWeight:600, color: row.color}}>{row.status}</span>
                  </div>
                ))}
             </div>
             <div style={{marginTop: 24, padding: "12px 16px", background: "var(--accent-dim)", borderRadius: 8, border: "1px solid rgba(196,96,42,0.2)", fontSize: "0.8125rem", color: "var(--accent)", fontWeight: 500}}>
               🔄 Sincronizando 2 consultas… backoff 3s
             </div>
          </div>

          <div>
            <h2 className="gx-hero-title" style={{fontSize: "3rem", textAlign: "left", marginBottom: 24}}>
              Trabaja sin internet.<br/><em>Siempre.</em>
            </h2>
            <p className="gx-hero-desc" style={{textAlign: "left", marginLeft: 0, marginBottom: 32}}>
              {APP_NAME} corre completamente en tu navegador usando IndexedDB. Sin conexión, la app sigue funcionando a la perfección. Cuando vuelve el internet, sincroniza sola.
            </p>
            <ul style={{listStyle:"none", padding:0, display:"flex", flexDirection:"column", gap:16, fontSize:"1rem", color:"var(--ink-soft)"}}>
              <li style={{display:"flex", alignItems:"center", gap:12}}><Ico d="M5 13l4 4L19 7" s={20} /> Latencia 0ms — todo corre local</li>
              <li style={{display:"flex", alignItems:"center", gap:12}}><Ico d="M5 13l4 4L19 7" s={20} /> Cola de sincronización con backoff</li>
              <li style={{display:"flex", alignItems:"center", gap:12}}><Ico d="M5 13l4 4L19 7" s={20} /> Instalable como PWA en iOS y Android</li>
            </ul>
          </div>
          
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section style={{padding: "120px 40px", textAlign: "center", maxWidth: 800, margin: "0 auto"}}>
        <span style={{fontSize:"0.8125rem", fontWeight:600, color:"var(--ink-faint)", textTransform:"uppercase", letterSpacing:"0.1em"}}>Testimonios</span>
        <h2 className="gx-hero-title" style={{fontSize: "2.5rem", marginTop: 16}}>Los médicos que ya usan {APP_NAME}</h2>
        <p className="gx-hero-desc">
          Estamos en lanzamiento temprano. Pronto compartiremos aquí las experiencias de los primeros médicos que confían en la plataforma cada día.
        </p>
        <div style={{display:"flex", gap:16, justifyContent:"center", flexWrap:"wrap", marginTop: 40}}>
          {[
            { icon: "⚕️", label: "Médicos generales" },
            { icon: "👶", label: "Pediatras" },
            { icon: "🫀", label: "Cardiólogos" },
            { icon: "🧠", label: "Neurólogos" },
          ].map((sp) => (
            <div key={sp.label} style={{display:"flex", alignItems:"center", gap:8, padding:"12px 24px", background:"var(--bg-elevated)", border:"1px solid var(--border)", borderRadius:"100px", fontSize:"0.9375rem", fontWeight:500}}>
              <span>{sp.icon}</span> {sp.label}
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="gx-hero" style={{paddingTop: 60, paddingBottom: 120}}>
        <h2 className="gx-hero-title" style={{fontSize: "3rem", marginBottom: 16}}>Planes simples,<br/><em>sin sorpresas</em></h2>
        <p className="gx-hero-desc" style={{marginBottom: 48}}>Un plan claro. Paga solo lo que usas. <br/><span style={{color:"var(--accent)", fontWeight:600}}>Todos incluyen 7 días de prueba gratis. Sin tarjeta.</span></p>
        
        <div style={{display:"flex", gap:24, justifyContent:"center", flexWrap:"wrap"}}>
          <div className="gx-b-card" style={{maxWidth: 400, width:"100%", textAlign:"left", border:"2px solid var(--accent)"}}>
            <h3 className="gx-b-title" style={{fontSize:"1.5rem"}}>Profesional Independiente</h3>
            <p style={{color:"var(--ink-soft)", fontSize:"0.9375rem", marginBottom:16}}>Para médicos con consultorio propio.</p>
            <div style={{fontFamily:"var(--font-mono)", fontSize:"3rem", fontWeight:700, margin:"16px 0 24px", color:"var(--ink)"}}>
              ${proPrice} <span style={{fontSize:"1rem", color:"var(--ink-faint)", fontWeight:500}}>/mes</span>
            </div>
            <ul style={{listStyle:"none", padding:0, margin:"0 0 32px", display:"flex", flexDirection:"column", gap:12, fontSize:"0.9375rem", color:"var(--ink-soft)"}}>
              <li style={{display:"flex", gap:8}}><span style={{color:"var(--accent)"}}>✓</span> Pacientes y consultas ilimitados</li>
              <li style={{display:"flex", gap:8}}><span style={{color:"var(--accent)"}}>✓</span> Seguimientos clínicos</li>
              <li style={{display:"flex", gap:8}}><span style={{color:"var(--accent)"}}>✓</span> Sugerencias CIE-10 con IA</li>
              <li style={{display:"flex", gap:8}}><span style={{color:"var(--accent)"}}>✓</span> Sync offline automático</li>
              <li style={{display:"flex", gap:8}}><span style={{color:"var(--accent)"}}>✓</span> Soporte por email</li>
            </ul>
            <Link href="/registro?plan=pro" className="gx-btn gx-btn-p" style={{width:"100%"}}>Comenzar ahora</Link>
          </div>
          
          {clinicPrice > 0 && (
            <div className="gx-b-card" style={{maxWidth: 400, width:"100%", textAlign:"left"}}>
              <h3 className="gx-b-title" style={{fontSize:"1.5rem"}}>Clínica</h3>
              <p style={{color:"var(--ink-soft)", fontSize:"0.9375rem", marginBottom:16}}>Para centros con múltiples doctores.</p>
              <div style={{fontFamily:"var(--font-mono)", fontSize:"3rem", fontWeight:700, margin:"16px 0 24px", color:"var(--ink)"}}>
                ${clinicPrice} <span style={{fontSize:"1rem", color:"var(--ink-faint)", fontWeight:500}}>/mes</span>
              </div>
              <ul style={{listStyle:"none", padding:0, margin:"0 0 32px", display:"flex", flexDirection:"column", gap:12, fontSize:"0.9375rem", color:"var(--ink-soft)"}}>
                <li style={{display:"flex", gap:8}}><span style={{color:"var(--ink)"}}>✓</span> Todo lo del plan Profesional</li>
                <li style={{display:"flex", gap:8}}><span style={{color:"var(--ink)"}}>✓</span> Múltiples doctores</li>
                <li style={{display:"flex", gap:8}}><span style={{color:"var(--ink)"}}>✓</span> Reportes de gerencia</li>
                <li style={{display:"flex", gap:8}}><span style={{color:"var(--ink)"}}>✓</span> Soporte prioritario</li>
              </ul>
              <Link href="/registro?plan=clinica" className="gx-btn gx-btn-s" style={{width:"100%", textAlign:"center", display:"block"}}>Comenzar ahora</Link>
            </div>
          )}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section style={{padding: "120px 40px"}}>
        <div style={{maxWidth: 1000, margin: "0 auto", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 24, padding: "80px 40px", textAlign: "center", boxShadow: "var(--shadow-md)"}}>
          <h2 className="gx-hero-title" style={{fontSize: "3.5rem"}}>
            Digitaliza tu consultorio.<br/>Empieza <em>hoy</em>.
          </h2>
          <p className="gx-hero-desc">
            Únete a los médicos que ya reducen el tiempo de documentación y nunca pierden una consulta.
          </p>
          <div className="gx-hero-actions">
            <Link href="/registro" className="gx-btn gx-btn-p">Prueba gratis por 7 días</Link>
            <Link href="/login" className="gx-btn gx-btn-s">Iniciar sesión</Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="gx-footer">
        <div className="gx-nav-brand">
          <span /> {APP_NAME}
        </div>
        <nav className="gx-footer-links" aria-label="Links del pie de página">
          <Link href="/login">Iniciar sesión</Link>
          <Link href="/registro">Registro</Link>
          <a href="#features">Funciones</a>
          <Link href="/privacidad">Privacidad</Link>
          <Link href="/terminos">Términos</Link>
        </nav>
        <div className="gx-footer-lang">
          <button onClick={() => { fetch('/api/locale', { method: 'POST', body: JSON.stringify({ locale: 'es' }) }).then(() => window.location.reload()); }}>
            🇪🇸 Español
          </button>
          <button onClick={() => { fetch('/api/locale', { method: 'POST', body: JSON.stringify({ locale: 'en' }) }).then(() => window.location.reload()); }}>
            🇺🇸 English
          </button>
        </div>
        <p className="gx-footer-copy">
          © {new Date().getFullYear()} {APP_NAME}. Todos los derechos reservados.
        </p>
      </footer>

    </div>
  );
}
