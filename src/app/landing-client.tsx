"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
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
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    // Nav Scroll
    const onScroll = () => {
      const nav = document.querySelector(".gx-nav");
      if (nav) {
        if (window.scrollY > 40) nav.classList.add("scrolled");
        else nav.classList.remove("scrolled");
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // IntersectionObserver for Sticky Showcase
    const items = document.querySelectorAll(".gx-showcase-item");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const index = Number(entry.target.getAttribute("data-index"));
          setActiveStep(index);
          // Highlight active item text
          items.forEach(i => i.classList.remove("active"));
          entry.target.classList.add("active");
        }
      });
    }, { rootMargin: "-40% 0px -40% 0px", threshold: 0 });

    items.forEach(item => observer.observe(item));

    return () => {
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="gx-landing" data-theme={theme}>
      
      {/* ── Navigation ── */}
      <nav className="gx-nav">
        <Link href="/" style={{textDecoration:"none"}} className="gx-nav-brand">
          <img src="/icons/icon-96.webp" alt="Glyphix" style={{width: 24, height: 24, objectFit: "contain"}} /> {APP_NAME}
        </Link>
        <div className="gx-nav-links">
          <a href="#features" className="gx-nav-link">Características</a>
          <a href="#offline" className="gx-nav-link">Offline</a>
          <a href="#pricing" className="gx-nav-link">Precios</a>
          <span className="gx-nav-link" onClick={() => setTheme(t => t === "light" ? "dark" : "light")} style={{userSelect:"none"}}>Tema: {theme}</span>
          <Link href="/login" prefetch={false} className="gx-btn gx-btn-s" style={{padding:"8px 16px", fontSize:"0.8125rem"}}>Iniciar Sesión</Link>
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
          <Link href="/registro" prefetch={false} className="gx-btn gx-btn-p">Comenzar prueba gratis</Link>
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

      {/* ── Showcase (Sticky Scroll) ── */}
      <section id="features" className="gx-showcase">
        <div className="gx-showcase-left">
          
          <div className="gx-showcase-item active" data-index="0">
            <div className="gx-showcase-icon"><Ico d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></div>
            <h3 className="gx-showcase-title">Panel de Control Inteligente</h3>
            <p className="gx-showcase-desc">Un Dashboard que te da el panorama completo de tu día. Métricas clave, flujo de pacientes y acceso rápido a consultas recientes, optimizado con atajos de teclado (⌘K) para máxima velocidad.</p>
          </div>

          <div className="gx-showcase-item" data-index="1">
            <div className="gx-showcase-icon"><Ico d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></div>
            <h3 className="gx-showcase-title">Agenda Dinámica</h3>
            <p className="gx-showcase-desc">Bloques de tiempo claros y una vista semanal fluida. Control total sobre tus citas y disponibilidad con una interfaz diseñada para reducir el estrés visual.</p>
          </div>

          <div className="gx-showcase-item" data-index="2">
            <div className="gx-showcase-icon"><Ico d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></div>
            <h3 className="gx-showcase-title">Base de Pacientes</h3>
            <p className="gx-showcase-desc">Busca, filtra y gestiona a todos tus pacientes en milisegundos. Integración directa con el historial clínico y generación automática de reportes PDF profesionales.</p>
          </div>

        </div>

        <div className="gx-showcase-right">
          <div className="gx-showcase-image-container">
            <img 
              src="/screenshots/dashboard.png" 
              alt="Dashboard de la clínica" 
              className={`gx-showcase-image ${activeStep === 0 ? "active" : ""}`} 
            />
            <img 
              src="/screenshots/agenda.png" 
              alt="Calendario y Agenda" 
              className={`gx-showcase-image ${activeStep === 1 ? "active" : ""}`} 
            />
            <img 
              src="/screenshots/patients.png" 
              alt="Lista de Pacientes" 
              className={`gx-showcase-image ${activeStep === 2 ? "active" : ""}`} 
            />
          </div>
        </div>
      </section>
      {/* ── Offline Split ── */}
      <section id="offline" style={{padding: "120px 40px", background: "var(--bg-soft)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)"}}>
        <div style={{maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center"}}>
          
          <div style={{background: "var(--bg-elevated)", padding: "32px 40px", borderRadius: 16, border: "1px solid var(--border-subtle)", boxShadow: "0 24px 64px rgba(0,0,0,0.06)"}}>
             <div style={{display:"flex", gap:8, marginBottom:32}}>
               <div style={{width:12,height:12,borderRadius:"50%",background:"#FF5F56"}}/>
               <div style={{width:12,height:12,borderRadius:"50%",background:"#FFBD2E"}}/>
               <div style={{width:12,height:12,borderRadius:"50%",background:"#27C93F"}}/>
             </div>
             <div style={{display:"flex", flexDirection:"column", gap:16}}>
                {[
                  { name: "García, Luis", status: "Sincronizado", color: "var(--state-ok)" },
                  { name: "Rodríguez, Ana", status: "En cola", color: "var(--state-warn)" },
                  { name: "Méndez, Carlos", status: "En cola", color: "var(--state-warn)" },
                  { name: "Flores, María", status: "Sincronizado", color: "var(--state-ok)" },
                ].map((row) => (
                  <div key={row.name} style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 20px", background:"var(--bg-elevated)", border:"1px solid var(--border)", borderRadius:8}}>
                    <span style={{fontSize:"1rem", fontWeight:600, fontFamily:"var(--font-display)", color:"var(--ink)"}}>{row.name}</span>
                    <span style={{fontSize:"0.875rem", fontWeight:600, color: row.color}}>{row.status}</span>
                  </div>
                ))}
             </div>
             <div style={{marginTop: 32, padding: "16px 20px", background: "var(--accent-dim)", borderRadius: 8, border: "1px solid rgba(196,96,42,0.2)", display: "flex", alignItems: "center", gap: 8}}>
               <div style={{background: "#4A90E2", width: 20, height: 20, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center"}}>
                 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                   <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                 </svg>
               </div>
               <span style={{fontSize: "0.9375rem", color: "var(--accent)", fontWeight: 600, fontFamily: "var(--font-display)"}}>
                 Sincronizando 2 consultas... backoff 3s
               </span>
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
      <section id="pricing" style={{maxWidth: 1000, margin: "0 auto", paddingTop: 120, paddingBottom: 120, textAlign: "center", paddingLeft: 24, paddingRight: 24}}>
        <h2 className="gx-hero-title" style={{fontSize: "3rem", marginBottom: 16}}>Planes simples,<br/><em>sin sorpresas</em></h2>
        <p className="gx-hero-desc" style={{marginBottom: 48}}>Un plan claro. Paga solo lo que usas. <br/><span style={{color:"var(--accent)", fontWeight:600}}>Todos incluyen 7 días de prueba gratis. Sin tarjeta.</span></p>
        
        <div style={{display:"flex", gap:24, justifyContent:"center", flexWrap:"wrap", maxWidth: 850, margin: "0 auto"}}>
          <div className="gx-b-card gx-price-card" style={{flex: "1 1 320px", maxWidth: 400, textAlign:"left", border:"2px solid var(--accent)"}}>
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
            <Link href="/registro?plan=pro" prefetch={false} className="gx-btn gx-btn-p" style={{width:"100%"}}>Comenzar ahora</Link>
          </div>
          
          {clinicPrice > 0 && (
            <div className="gx-b-card gx-price-card" style={{flex: "1 1 320px", maxWidth: 400, textAlign:"left"}}>
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
              <Link href="/registro?plan=clinica" prefetch={false} className="gx-btn gx-btn-s" style={{width:"100%", textAlign:"center", display:"block"}}>Comenzar ahora</Link>
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
            <Link href="/registro" prefetch={false} className="gx-btn gx-btn-p">Prueba gratis por 7 días</Link>
            <Link href="/login" prefetch={false} className="gx-btn gx-btn-s">Iniciar sesión</Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="gx-footer">
        <div className="gx-nav-brand">
          <img src="/icons/icon-96.webp" alt="Glyphix" style={{width: 24, height: 24, objectFit: "contain"}} /> {APP_NAME}
        </div>
        <nav className="gx-footer-links" aria-label="Links del pie de página">
          <Link href="/login" prefetch={false}>Iniciar sesión</Link>
          <Link href="/registro" prefetch={false}>Registro</Link>
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
