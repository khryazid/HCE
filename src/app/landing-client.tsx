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
          El expediente médico que nunca falla
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
            { num: "0", label: "Pacientes perdidos por caídas de red" },
            { num: "IA", label: "Asistente de codificación" },
            { num: "100%", label: "Funciona sin internet" },
            { num: "HIPAA", label: "Privacidad de grado militar" },
          ].map((s) => (
            <div key={s.label} style={{display:"flex", flexDirection:"column", gap:4}}>
              <span style={{fontFamily:"var(--font-mono)", fontSize:"1.5rem", fontWeight:700, color:"var(--ink)"}}>{s.num}</span>
              <span style={{fontSize:"0.8125rem", color:"var(--ink-soft)"}}>{s.label}</span>
            </div>
          ))}
        </div>
        
        {/* Trust Badges */}
        <div style={{marginTop: 64, borderTop: "1px solid var(--border-subtle)", paddingTop: 32, animation: "gx-up 600ms forwards", animationDelay:"600ms", opacity:0}}>
          <p style={{fontSize: "0.8125rem", color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 24}}>Confianza y Seguridad Respaldada Por</p>
          <div style={{display: "flex", justifyContent: "center", gap: 48, flexWrap: "wrap", alignItems: "center", opacity: 0.6}}>
            <span style={{fontWeight: 700, fontSize: "1.2rem", fontFamily: "var(--font-display)", display: "flex", alignItems: "center", gap: 8}}><Ico d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" s={24}/> HIPAA COMPLIANT</span>
            <span style={{fontWeight: 700, fontSize: "1.2rem", fontFamily: "var(--font-display)", display: "flex", alignItems: "center", gap: 8}}><Ico d="M20.945 11a9 9 0 11-3.284-9.997l-2.655 3.982A5.002 5.002 0 1017 12h3.945z" s={24}/> 256-bit AES</span>
            <span style={{fontWeight: 700, fontSize: "1.2rem", fontFamily: "var(--font-display)", display: "flex", alignItems: "center", gap: 8}}><Ico d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" s={24}/> STRIPE VERIFIED</span>
          </div>
        </div>
      </header>

      {/* ── Showcase (Sticky Scroll) ── */}
      <section id="features" className="gx-showcase">
        <div className="gx-showcase-left">
          
          <div className="gx-showcase-item active" data-index="0">
            <div className="gx-showcase-icon"><Ico d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></div>
            <h3 className="gx-showcase-title">Panel de Control Inteligente</h3>
            <p className="gx-showcase-desc">Un Dashboard que te da el panorama completo de tu día. Métricas clave, flujo de pacientes y acceso rápido a consultas recientes, optimizado con atajos de teclado (⌘K) para máxima velocidad.</p>
            <img src="/screenshots/dashboard.png" className="gx-showcase-img-mobile" alt="Dashboard" />
          </div>

          <div className="gx-showcase-item" data-index="1">
            <div className="gx-showcase-icon"><Ico d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></div>
            <h3 className="gx-showcase-title">Agenda Dinámica</h3>
            <p className="gx-showcase-desc">Bloques de tiempo claros y una vista semanal fluida. Control total sobre tus citas y disponibilidad con una interfaz diseñada para reducir el estrés visual.</p>
            <img src="/screenshots/agenda.png" className="gx-showcase-img-mobile" alt="Agenda" />
          </div>

          <div className="gx-showcase-item" data-index="2">
            <div className="gx-showcase-icon"><Ico d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></div>
            <h3 className="gx-showcase-title">Base de Pacientes</h3>
            <p className="gx-showcase-desc">Busca, filtra y gestiona a todos tus pacientes en milisegundos. Integración directa con el historial clínico y generación automática de reportes PDF profesionales.</p>
            <img src="/screenshots/patients.png" className="gx-showcase-img-mobile" alt="Pacientes" />
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
      {/* ── Problema & Solución (Offline) ── */}
      <section id="offline" style={{padding: "120px 40px", background: "var(--bg-soft)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)"}}>
        <div className="gx-split" style={{maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center"}}>
          
          <div style={{background: "var(--bg-elevated)", padding: "32px 40px", borderRadius: 16, border: "1px solid var(--border-subtle)", boxShadow: "0 24px 64px rgba(0,0,0,0.06)"}}>
             <div style={{display:"flex", gap:8, marginBottom:32}}>
               <div style={{width:12,height:12,borderRadius:"50%",background:"#FF5F56"}}/>
               <div style={{width:12,height:12,borderRadius:"50%",background:"#FFBD2E"}}/>
               <div style={{width:12,height:12,borderRadius:"50%",background:"#27C93F"}}/>
             </div>
             <div style={{display:"flex", flexDirection:"column", gap:16}}>
                {[
                  { name: "García, Luis", status: "Guardado seguro", color: "var(--state-ok)" },
                  { name: "Rodríguez, Ana", status: "Guardado sin red", color: "var(--state-warn)" },
                  { name: "Méndez, Carlos", status: "Guardado sin red", color: "var(--state-warn)" },
                  { name: "Flores, María", status: "Guardado seguro", color: "var(--state-ok)" },
                ].map((row) => (
                  <div key={row.name} style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 20px", background:"var(--bg-elevated)", border:"1px solid var(--border)", borderRadius:8}}>
                    <span style={{fontSize:"1rem", fontWeight:600, fontFamily:"var(--font-display)", color:"var(--ink)"}}>{row.name}</span>
                    <span style={{fontSize:"0.875rem", fontWeight:600, color: row.color}}>{row.status}</span>
                  </div>
                ))}
             </div>
             <div style={{marginTop: 32, padding: "16px 20px", background: "var(--accent-dim)", borderRadius: 8, border: "1px solid var(--accent-glow)", display: "flex", alignItems: "center", gap: 8}}>
               <div style={{background: "#4A90E2", width: 20, height: 20, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center"}}>
                 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                   <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                 </svg>
               </div>
               <span style={{fontSize: "0.9375rem", color: "var(--accent)", fontWeight: 600, fontFamily: "var(--font-display)"}}>
                 Sincronizando expedientes automáticamente...
               </span>
             </div>
          </div>

          <div>
            <h2 className="gx-hero-title" style={{fontSize: "3rem", textAlign: "left", marginBottom: 24}}>
              Sigue atendiendo pacientes,<br/><em>incluso sin internet.</em>
            </h2>
            <p className="gx-hero-desc" style={{textAlign: "left", marginLeft: 0, marginBottom: 32}}>
              ¿Se cayó el internet de la clínica? No te preocupes. Con Glyphix sigues atendiendo y guardando historias clínicas. El sistema asegura tus datos localmente y los respalda solos cuando vuelve la conexión.
            </p>
            <ul style={{listStyle:"none", padding:0, display:"flex", flexDirection:"column", gap:16, fontSize:"1rem", color:"var(--ink-soft)"}}>
              <li style={{display:"flex", alignItems:"center", gap:12}}><Ico d="M5 13l4 4L19 7" s={20} /> Sin pantallas de carga, todo es instantáneo</li>
              <li style={{display:"flex", alignItems:"center", gap:12}}><Ico d="M5 13l4 4L19 7" s={20} /> Respaldo automático sin que muevas un dedo</li>
              <li style={{display:"flex", alignItems:"center", gap:12}}><Ico d="M5 13l4 4L19 7" s={20} /> Tranquilidad total para tu flujo de trabajo</li>
            </ul>
          </div>
          
        </div>
      </section>

      {/* ── Funcionalidades Avanzadas (Bento Grid) ── */}
      <section style={{padding: "120px 0", background: "var(--bg)"}}>
        <div style={{textAlign: "center", marginBottom: 64}}>
          <span style={{fontSize:"0.8125rem", fontWeight:600, color:"var(--ink-faint)", textTransform:"uppercase", letterSpacing:"0.1em"}}>Potencia Clínica</span>
          <h2 className="gx-hero-title" style={{fontSize: "2.5rem", marginTop: 16}}>Todo lo que necesitas, sin complicaciones.</h2>
        </div>
        <div className="gx-bento">
          
          <div className="gx-b-card gx-b-large">
            <div className="gx-b-icon"><Ico d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /></div>
            <h3 className="gx-b-title">Diagnósticos Precisos y Rápidos</h3>
            <p className="gx-b-desc">Asistente inteligente que te sugiere el código de diagnóstico oficial (CIE-11) mientras escribes el motivo de consulta, ahorrándote horas de papeleo cada mes.</p>
          </div>

          <div className="gx-b-card">
            <div className="gx-b-icon" style={{background: "var(--state-ok-bg)", color: "var(--state-ok)"}}><Ico d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></div>
            <h3 className="gx-b-title">Privacidad Militar</h3>
            <p className="gx-b-desc">Privacidad de grado militar (HIPAA). Nadie fuera de tu clínica podrá ver tus datos. Tu información y la de tus pacientes está 100% blindada.</p>
          </div>

          <div className="gx-b-card">
            <div className="gx-b-icon" style={{background: "var(--state-warn-bg)", color: "var(--state-warn)"}}><Ico d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></div>
            <h3 className="gx-b-title">Cuentas Claras</h3>
            <p className="gx-b-desc">Lleva el control exacto de tus ingresos diarios. Cajas separadas para evitar confusiones y cerrar el día con las finanzas en perfecto orden.</p>
          </div>

          <div className="gx-b-card gx-b-large">
            <div className="gx-b-icon"><Ico d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></div>
            <h3 className="gx-b-title">Seguimiento Automático de Pacientes</h3>
            <p className="gx-b-desc">Reduce el ausentismo con recordatorios automáticos y envía resultados de exámenes o recetas directo al WhatsApp o correo de tu paciente, sin esfuerzo extra.</p>
          </div>

        </div>
      </section>

      {/* ── Social Proof ── */}
      <section style={{padding: "80px 40px", background: "var(--bg)", borderTop: "1px solid var(--border)", textAlign: "center"}}>
        <h3 style={{fontSize: "1.25rem", color: "var(--ink-soft)", marginBottom: 32, fontWeight: 500}}>La tranquilidad de miles de médicos que ya no pierden datos</h3>
        <div style={{display: "flex", justifyContent: "center", gap: 32, flexWrap: "wrap"}}>
          {[
            { quote: "Me salvó la vida cuando se cortó la luz. Seguí atendiendo desde mi laptop sin problema.", author: "Dr. Mendoza, Cardiólogo" },
            { quote: "El asistente de diagnósticos me ahorra literalmente 2 horas de papeleo a la semana.", author: "Dra. Ruiz, Pediatra" },
            { quote: "La privacidad de grado militar me dio la confianza para mudar toda mi clínica aquí.", author: "Dr. Alarcón, Director Médico" }
          ].map((testimonial, i) => (
             <div key={i} style={{background: "var(--bg-soft)", padding: 24, borderRadius: 12, border: "1px solid var(--border-subtle)", maxWidth: 300, textAlign: "left"}}>
               <div style={{display:"flex", gap:4, color:"#FFBD2E", marginBottom:12}}>
                 <Ico d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" s={16}/>
                 <Ico d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" s={16}/>
                 <Ico d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" s={16}/>
                 <Ico d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" s={16}/>
                 <Ico d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" s={16}/>
               </div>
               <p style={{fontSize: "0.9375rem", color: "var(--ink)", marginBottom: 16, fontStyle: "italic"}}>"{testimonial.quote}"</p>
               <p style={{fontSize: "0.8125rem", color: "var(--ink-soft)", fontWeight: 600}}>- {testimonial.author}</p>
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
        
        {/* Detailed Comparison Table */}
        <div style={{marginTop: 80, textAlign: "left", maxWidth: 900, margin: "80px auto 0"}}>
          <h3 style={{fontSize: "1.5rem", textAlign: "center", marginBottom: 32}}>Compara todas las características</h3>
          <div style={{overflowX: "auto"}}>
            <table className="gx-pricing-table" style={{width: "100%", borderCollapse: "collapse"}}>
              <thead>
                <tr style={{borderBottom: "2px solid var(--border)"}}>
                  <th style={{textAlign: "left", width: "40%"}}>Funcionalidad</th>
                  <th style={{textAlign: "center", width: "30%"}}>Profesional</th>
                  <th style={{textAlign: "center", width: "30%", color: "var(--accent)"}}>Clínica</th>
                </tr>
              </thead>
              <tbody>
                {/* Gestión Clínica */}
                <tr className="gx-pt-group"><td colSpan={3}>Gestión Clínica</td></tr>
                <tr><td>Pacientes e Historias Clínicas</td><td style={{textAlign: "center"}}>Ilimitados</td><td style={{textAlign: "center", fontWeight: 600}}>Ilimitados</td></tr>
                <tr><td>Asistente Diagnóstico IA (CIE-11)</td><td style={{textAlign: "center"}}>✓</td><td style={{textAlign: "center", fontWeight: 600}}>✓</td></tr>
                <tr><td>Sincronización Offline-first</td><td style={{textAlign: "center"}}>✓</td><td style={{textAlign: "center", fontWeight: 600}}>✓</td></tr>
                
                {/* Administración */}
                <tr className="gx-pt-group"><td colSpan={3}>Administración y Roles</td></tr>
                <tr><td>Cuentas para Médicos</td><td style={{textAlign: "center"}}>1 Cuenta</td><td style={{textAlign: "center", fontWeight: 600}}>Múltiples (Pago por asiento)</td></tr>
                <tr><td>Cuentas para Secretarias/Recepción</td><td style={{textAlign: "center"}}>1 Incluida</td><td style={{textAlign: "center", fontWeight: 600}}>Ilimitadas</td></tr>
                <tr><td>Control de Cajas Múltiples</td><td style={{textAlign: "center"}}>Básico</td><td style={{textAlign: "center", fontWeight: 600}}>Avanzado (Por turno/usuario)</td></tr>
                <tr><td>Reportes Gerenciales y de Recaudación</td><td style={{textAlign: "center", color: "var(--ink-faint)"}}>✗</td><td style={{textAlign: "center", fontWeight: 600}}>✓</td></tr>
                
                {/* Automatización */}
                <tr className="gx-pt-group"><td colSpan={3}>Automatización y Seguridad</td></tr>
                <tr><td>Notificaciones WhatsApp (Recordatorios)</td><td style={{textAlign: "center"}}>✓</td><td style={{textAlign: "center", fontWeight: 600}}>✓</td></tr>
                <tr><td>Aislamiento Multi-tenant (HIPAA)</td><td style={{textAlign: "center"}}>✓</td><td style={{textAlign: "center", fontWeight: 600}}>✓</td></tr>
                <tr><td>Logs de Auditoría (Quién editó qué)</td><td style={{textAlign: "center", color: "var(--ink-faint)"}}>✗</td><td style={{textAlign: "center", fontWeight: 600}}>✓</td></tr>
                <tr><td>Soporte Técnico</td><td style={{textAlign: "center"}}>Email (24-48h)</td><td style={{textAlign: "center", fontWeight: 600}}>Prioritario (Chat/Email &lt; 2h)</td></tr>
              </tbody>
            </table>
          </div>
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
            <p className="gx-faq-a">Absolutamente nada. Sigues escribiendo y guardando. El sistema protege los datos de tu paciente y, en cuanto vuelve el internet, los respalda en la nube sin interrumpir tu trabajo.</p>
          </div>
          <div className="gx-faq-item">
            <h4 className="gx-faq-q">¿Cómo me ayuda el asistente inteligente?</h4>
            <p className="gx-faq-a">Mientras describes el problema del paciente, nuestro sistema te sugiere al instante el código oficial correcto, para que no pierdas tiempo buscándolo manualmente.</p>
          </div>
          <div className="gx-faq-item">
            <h4 className="gx-faq-q">¿Están seguros los datos de mis pacientes?</h4>
            <p className="gx-faq-a">Tus datos están protegidos con los más altos estándares de seguridad y privacidad (grado militar), asegurando que solo tú y tu equipo autorizado puedan acceder a ellos.</p>
          </div>
          <div className="gx-faq-item">
            <h4 className="gx-faq-q">Si tengo una clínica, ¿pueden varios doctores usarlo a la vez?</h4>
            <p className="gx-faq-a">Sí, con el Plan Clínica puedes agrupar médicos, centralizar la administración y dar accesos específicos a tus recepcionistas, todo organizado en un solo lugar.</p>
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
        <div style={{display: "flex", gap: 16, margin: "24px 0", justifyContent: "center", color: "var(--ink-soft)"}}>
          <a href="#" aria-label="LinkedIn" style={{color: "inherit"}}><Ico d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z M2 9h4v12H2z M4 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" s={20}/></a>
          <a href="#" aria-label="Twitter/X" style={{color: "inherit"}}><Ico d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" s={20}/></a>
          <a href="#" aria-label="Instagram" style={{color: "inherit"}}><Ico d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z M17.5 6.5h.01 M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5z" s={20}/></a>
        </div>
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

      {/* ── WhatsApp Floating CTA ── */}
      <a href="https://wa.me/1234567890?text=Hola,%20quiero%20informaci%C3%B3n%20sobre%20Glyphix%20para%20mi%20consultorio" target="_blank" rel="noopener noreferrer" style={{
        position: "fixed", bottom: 24, right: 24, background: "#25D366", color: "white", padding: "12px 20px", borderRadius: 100, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 8px 24px rgba(37, 211, 102, 0.4)", textDecoration: "none", fontWeight: 600, zIndex: 50, transition: "transform 0.2s"
      }} className="gx-wa-btn">
        <Ico d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        Hablemos por WhatsApp
      </a>
      
    </div>
  );
}
