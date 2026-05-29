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
            { num: "CIE-11", label: "Codificación con IA" },
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

      {/* ── Funcionalidades Avanzadas (Bento Grid) ── */}
      <section style={{padding: "120px 0", background: "var(--bg)"}}>
        <div style={{textAlign: "center", marginBottom: 64}}>
          <span style={{fontSize:"0.8125rem", fontWeight:600, color:"var(--ink-faint)", textTransform:"uppercase", letterSpacing:"0.1em"}}>Potencia Clínica</span>
          <h2 className="gx-hero-title" style={{fontSize: "2.5rem", marginTop: 16}}>Todo lo que necesitas, integrado.</h2>
        </div>
        <div className="gx-bento">
          
          <div className="gx-b-card gx-b-large">
            <div className="gx-b-icon"><Ico d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /></div>
            <h3 className="gx-b-title">Sugerencias con IA (Gemini)</h3>
            <p className="gx-b-desc">El autocompletado CIE-11 está potenciado por modelos de inteligencia artificial avanzados. Encuentra el diagnóstico exacto analizando el texto libre del motivo de consulta y examen físico en tiempo real.</p>
          </div>

          <div className="gx-b-card">
            <div className="gx-b-icon" style={{background: "var(--state-ok-bg)", color: "var(--state-ok)"}}><Ico d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></div>
            <h3 className="gx-b-title">Seguridad y Privacidad</h3>
            <p className="gx-b-desc">Tus datos nunca se cruzan. Arquitectura Multi-tenant con bases de datos encriptadas y cumplimiento de HIPAA/GDPR.</p>
          </div>

          <div className="gx-b-card">
            <div className="gx-b-icon" style={{background: "var(--state-warn-bg)", color: "var(--state-warn)"}}><Ico d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></div>
            <h3 className="gx-b-title">Control de Cajas</h3>
            <p className="gx-b-desc">Turnos de caja aislados (`cash_shifts`). Controla tus ingresos, egresos, saldos iniciales y cierres diarios de forma unificada.</p>
          </div>

          <div className="gx-b-card gx-b-large">
            <div className="gx-b-icon"><Ico d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></div>
            <h3 className="gx-b-title">Notificaciones de WhatsApp y Email</h3>
            <p className="gx-b-desc">Automatiza el seguimiento. Envía recordatorios de citas y resultados de exámenes técnicos (PDFs) directamente al WhatsApp o al correo (Resend) de tus pacientes.</p>
          </div>

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
              <li style={{display:"flex", gap:8}}><span style={{color:"var(--accent)"}}>✓</span> Sugerencias CIE-11 con IA</li>
              <li style={{display:"flex", gap:8}}><span style={{color:"var(--accent)"}}>✓</span> Sync offline automático</li>
              <li style={{display:"flex", gap:8}}><span style={{color:"var(--accent)"}}>✓</span> Soporte por email</li>
            </ul>
            <div style={{display: "flex", gap: "12px", flexDirection: "column"}}>
              <Link href="/planes/profesional" prefetch={false} className="gx-btn gx-btn-s" style={{width:"100%"}}>Ver todos los detalles</Link>
              <Link href="/registro?plan=pro" prefetch={false} className="gx-btn gx-btn-p" style={{width:"100%"}}>Comenzar ahora</Link>
            </div>
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
              <div style={{display: "flex", gap: "12px", flexDirection: "column"}}>
                <Link href="/planes/clinica" prefetch={false} className="gx-btn gx-btn-s" style={{width:"100%", textAlign:"center", display:"block"}}>Ver todos los detalles</Link>
                <Link href="/registro?plan=clinica" prefetch={false} className="gx-btn gx-btn-p" style={{width:"100%", textAlign:"center", display:"block"}}>Comenzar ahora</Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Preguntas Frecuentes (FAQ) ── */}
      <section id="faq" style={{padding: "120px 40px", background: "var(--bg-soft)"}}>
        <div style={{textAlign: "center", marginBottom: 64}}>
          <h2 className="gx-hero-title" style={{fontSize: "2.5rem"}}>Preguntas Frecuentes</h2>
          <p className="gx-hero-desc">Resolvemos las dudas más comunes antes de que empieces a documentar.</p>
        </div>
        <div className="gx-faq-grid">
          <div className="gx-faq-item">
            <h4 className="gx-faq-q">¿Qué pasa si me quedo sin internet en medio de una consulta?</h4>
            <p className="gx-faq-a">Absolutamente nada. Glyphix funciona de forma 100% offline-first. Tus pacientes y consultas se guardan en el navegador. Al recuperar conexión, el sistema sincroniza todo en segundo plano sin interrumpirte.</p>
          </div>
          <div className="gx-faq-item">
            <h4 className="gx-faq-q">¿Los códigos CIE-11 son sugeridos automáticamente?</h4>
            <p className="gx-faq-a">Sí. Nuestro asistente integrado lee el motivo de consulta y síntomas, procesa la información mediante Gemini AI, y te ofrece el código CIE-11 más preciso en fracciones de segundo.</p>
          </div>
          <div className="gx-faq-item">
            <h4 className="gx-faq-q">¿Puedo migrar los datos desde mi software actual?</h4>
            <p className="gx-faq-a">Actualmente soportamos importación manual o asistida (contáctanos). Sin embargo, siempre puedes exportar TODO desde Glyphix en formato ZIP (datos brutos en JSON + PDFs de consultas) con un solo clic.</p>
          </div>
          <div className="gx-faq-item">
            <h4 className="gx-faq-q">Si tengo una clínica, ¿pueden varios doctores usarlo a la vez?</h4>
            <p className="gx-faq-a">Sí, con el Plan Clínica puedes agrupar médicos, centralizar facturación (pagas 1 sola suscripción que cubre los &quot;asientos&quot;), y delegar permisos a recepcionistas o técnicos de laboratorio.</p>
          </div>
        </div>
      </section>

      {/* ── Contacto ── */}
      <section id="contacto" style={{padding: "120px 40px"}}>
        <div className="gx-contact-box">
          <div style={{textAlign:"center", marginBottom:32}}>
            <h2 className="gx-hero-title" style={{fontSize: "2.5rem"}}>¿Necesitas hablar con nosotros?</h2>
            <p className="gx-hero-desc" style={{margin:0}}>Estamos aquí para apoyarte en tu migración digital.</p>
          </div>
          
          <div style={{display:"flex", flexDirection:"column", gap:16, width:"100%"}}>
            <div className="gx-contact-item">
              <div className="gx-contact-icon"><Ico d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></div>
              <span>soporte@glyphmed.app</span>
            </div>
            <div className="gx-contact-item">
              <div className="gx-contact-icon"><Ico d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></div>
              <span>+1 (555) 123-4567</span>
            </div>
            <div className="gx-contact-item">
              <div className="gx-contact-icon"><Ico d="M12 21s-8-4.5-8-11.8A8 8 0 0112 1.2a8 8 0 018 8C20 16.5 12 21 12 21z" /></div>
              <span>Ciudad de México, México</span>
            </div>
          </div>
          
          <div style={{marginTop: 32}}>
            <Link href="mailto:soporte@glyphmed.app" className="gx-btn gx-btn-p">Enviar correo de soporte</Link>
          </div>
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
          <Link href="/planes/profesional" prefetch={false}>Plan Pro</Link>
          <Link href="/planes/clinica" prefetch={false}>Plan Clínica</Link>
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
