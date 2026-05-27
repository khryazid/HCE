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
  // Default to dark mode for a premium feel, but we'll stick to light for now since it matches the approved prototype.
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    // Add scroll listener for any scroll-based logic in the future
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
          <a href="#pricing" className="gx-nav-link">Precios</a>
          <span className="gx-nav-link" onClick={() => setTheme(t => t === "light" ? "dark" : "light")} style={{userSelect:"none"}}>Tema: {theme}</span>
          <Link href="/login" className="gx-btn gx-btn-s" style={{padding:"8px 16px", fontSize:"0.8125rem"}}>Iniciar Sesión</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <header className="gx-hero">
        <div className="gx-hero-badge gx-s gx-s1">
          <div style={{width:6,height:6,background:"var(--accent)",borderRadius:"50%",boxShadow:"0 0 8px var(--accent)"}}/>
          {APP_NAME} v3.0 ya disponible
        </div>
        <h1 className="gx-hero-title gx-s gx-s2">
          La historia clínica que<br/>respeta tu tiempo.
        </h1>
        <p className="gx-hero-desc gx-s gx-s3">
          Diseñado para médicos que buscan rapidez y precisión. Una herramienta clínica que no se siente como un software de contabilidad de los años 90.
        </p>
        <div className="gx-hero-actions gx-s gx-s4">
          <Link href="/registro" className="gx-btn gx-btn-p">Comenzar prueba gratis</Link>
          <a href="#features" className="gx-btn gx-btn-s">Ver funciones</a>
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
             {/* Abstract representation of the app inside the mockup frame */}
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
          <h3 className="gx-b-title">Velocidad sin compromisos</h3>
          <p className="gx-b-desc">La interfaz está optimizada para reducir el número de clics al mínimo. Atajos de teclado en cada rincón (⌘K) y un diseño que prioriza la densidad de información sin sacrificar la estética.</p>
        </div>
        <div className="gx-b-card">
          <div className="gx-b-icon"><Ico d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></div>
          <h3 className="gx-b-title">Offline-First</h3>
          <p className="gx-b-desc">Funciona incluso si el WiFi de tu consultorio falla. Todo se guarda localmente en IndexedDB y se sincroniza cuando vuelve la conexión.</p>
        </div>
        <div className="gx-b-card">
          <div className="gx-b-icon"><Ico d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></div>
          <h3 className="gx-b-title">Cumplimiento Legal</h3>
          <p className="gx-b-desc">Listos para el Ministerio de Salud. RIPS automáticos, firmas digitales y cifrado en reposo para cumplir con las normativas locales e internacionales de salud.</p>
        </div>
        <div className="gx-b-card gx-b-large">
          <div className="gx-b-icon"><Ico d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /></div>
          <h3 className="gx-b-title">Sugerencias con IA (Gemini)</h3>
          <p className="gx-b-desc">El autocompletado CIE-10 está potenciado por modelos de inteligencia artificial avanzados. Encuentra el diagnóstico exacto analizando el texto libre del motivo de consulta.</p>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="gx-hero" style={{paddingTop: 60, paddingBottom: 120}}>
        <h2 className="gx-hero-title" style={{fontSize: "3rem", marginBottom: 16}}>Planes simples</h2>
        <p className="gx-hero-desc" style={{marginBottom: 48}}>Un solo plan integral para profesionales independientes. Transparente y sin sorpresas.</p>
        
        <div style={{display:"flex", gap:24, justifyContent:"center", flexWrap:"wrap"}}>
          <div className="gx-b-card" style={{maxWidth: 400, width:"100%", textAlign:"left", border:"1px solid var(--accent)", boxShadow:"0 0 0 1px var(--accent)"}}>
            <h3 className="gx-b-title">Profesional Independiente</h3>
            <div style={{fontFamily:"var(--font-mono)", fontSize:"2.5rem", fontWeight:700, margin:"16px 0", color:"var(--ink)"}}>
              ${proPrice} <span style={{fontSize:"1rem", color:"var(--ink-faint)", fontWeight:500}}>/mes</span>
            </div>
            <ul style={{listStyle:"none", padding:0, margin:"0 0 32px", fontSize:"0.9375rem", color:"var(--ink-soft)", lineHeight:1.8}}>
              <li>✓ Consultas y pacientes ilimitados</li>
              <li>✓ Sugerencias IA (Gemini)</li>
              <li>✓ Trabajo Offline Nativo</li>
              <li>✓ PDF profesional</li>
            </ul>
            <Link href="/registro?plan=pro" className="gx-btn gx-btn-p" style={{width:"100%"}}>Prueba gratis por 7 días</Link>
          </div>
          
          {clinicPrice > 0 && (
            <div className="gx-b-card" style={{maxWidth: 400, width:"100%", textAlign:"left"}}>
              <h3 className="gx-b-title">Clínica</h3>
              <div style={{fontFamily:"var(--font-mono)", fontSize:"2.5rem", fontWeight:700, margin:"16px 0", color:"var(--ink)"}}>
                ${clinicPrice} <span style={{fontSize:"1rem", color:"var(--ink-faint)", fontWeight:500}}>/mes</span>
              </div>
              <ul style={{listStyle:"none", padding:0, margin:"0 0 32px", fontSize:"0.9375rem", color:"var(--ink-soft)", lineHeight:1.8}}>
                <li>✓ Todo lo del plan Profesional</li>
                <li>✓ Doctores y roles múltiples</li>
                <li>✓ Reportes de gerencia</li>
                <li>✓ Soporte prioritario</li>
              </ul>
              <Link href="/registro?plan=clinica" className="gx-btn gx-btn-s" style={{width:"100%", textAlign:"center"}}>Contactar ventas</Link>
            </div>
          )}
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
          <button 
            onClick={() => {
              fetch('/api/locale', { method: 'POST', body: JSON.stringify({ locale: 'es' }) }).then(() => window.location.reload());
            }}
          >
            🇪🇸 Español
          </button>
          <button 
            onClick={() => {
              fetch('/api/locale', { method: 'POST', body: JSON.stringify({ locale: 'en' }) }).then(() => window.location.reload());
            }}
          >
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
