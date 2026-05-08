"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import "./landing.css";

/* ─── Fonts via next/font would conflict with "use client",
       so we load them in layout.tsx — see note below ── */

export default function Home() {
  const navRef = useRef<HTMLElement>(null);
  const blobRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    /* Nav scroll effect */
    const nav = navRef.current;
    const onScroll = () => {
      if (nav) nav.classList.toggle("scrolled", window.scrollY > 40);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    /* Cursor blob */
    const blob = blobRef.current;
    const onMove = (e: MouseEvent) => {
      if (!blob) return;
      blob.style.left = e.clientX + "px";
      blob.style.top = e.clientY + "px";
    };
    document.addEventListener("mousemove", onMove);

    /* IntersectionObserver reveals */
    const reveals = document.querySelectorAll<HTMLElement>(
      ".reveal, .reveal-left, .reveal-right"
    );
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const siblings = entry.target.parentElement?.querySelectorAll<HTMLElement>(
            ".reveal, .reveal-left, .reveal-right"
          );
          let idx = 0;
          siblings?.forEach((s, j) => { if (s === entry.target) idx = j; });
          setTimeout(() => {
            (entry.target as HTMLElement).classList.add("visible");
          }, idx * 80);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    reveals.forEach((el) => observer.observe(el));

    /* Bento 3-D tilt */
    const cards = document.querySelectorAll<HTMLElement>(".l-bento-card");
    const onTiltMove = (e: MouseEvent) => {
      const card = (e.currentTarget as HTMLElement);
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `translateY(-4px) rotateX(${-y * 5}deg) rotateY(${x * 5}deg)`;
    };
    const onTiltLeave = (e: MouseEvent) => {
      (e.currentTarget as HTMLElement).style.transform = "";
    };
    cards.forEach((c) => {
      c.addEventListener("mousemove", onTiltMove);
      c.addEventListener("mouseleave", onTiltLeave);
    });

    /* Smooth scroll for anchor links */
    document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href")?.slice(1);
        const target = id ? document.getElementById(id) : null;
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: "smooth" });
        }
      });
    });

    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("mousemove", onMove);
      observer.disconnect();
      cards.forEach((c) => {
        c.removeEventListener("mousemove", onTiltMove);
        c.removeEventListener("mouseleave", onTiltLeave);
      });
    };
  }, []);

  return (
    <div className="landing-root">
      {/* Grid background */}
      <div className="l-grid-bg" aria-hidden />

      {/* Cursor blob */}
      <div className="l-cursor-blob" ref={blobRef} aria-hidden />

      {/* ── Skip link ──────────────────────────────────────────── */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:px-4 focus:py-2 focus:text-white"
        style={{ background: "var(--accent)", color: "#020d18" }}
      >
        Ir al contenido
      </a>

      {/* ── Nav ───────────────────────────────────────────────── */}
      <nav ref={navRef} className="l-nav" aria-label="Navegación principal">
        <Link href="/" className="l-nav-logo">
          <div className="l-nav-dot" />
          Glyph<span style={{ color: "var(--accent)", marginLeft: 2 }}>·</span>
        </Link>

        <div className="l-nav-links">
          <a href="#features">Funciones</a>
          <a href="#offline">Offline</a>
          <a href="#pricing">Precios</a>
        </div>

        <div className="l-nav-cta">
          <Link href="/login" className="l-btn-ghost">Iniciar sesión</Link>
          <Link href="/registro" className="l-btn-primary">Empezar gratis</Link>
        </div>
      </nav>

      {/* ── Main ──────────────────────────────────────────────── */}
      <main id="main-content">

        {/* ── HERO ────────────────────────────────────────────── */}
        <section className="l-hero" aria-label="Sección principal">
          <div className="l-hero-glow" aria-hidden />

          {/* Eyebrow badge */}
          <div className="l-hero-badge" aria-label="Software médico disponible ahora">
            <span className="l-hero-badge-dot" aria-hidden />
            Motor Clínico · Disponible ahora
          </div>

          {/* Headline */}
          <h1 className="l-hero-title">
            <span className="line"><span>El motor clínico para</span></span>
            <span className="line"><span><em>médicos modernos</em></span></span>
          </h1>

          {/* Sub */}
          <p className="l-hero-sub">
            Historia clínica multiespecialidad, sincronización offline-first y
            sugerencias CIE-10 con IA. Documentá cada consulta en menos de 3
            minutos — desde cualquier lugar.
          </p>

          {/* CTAs */}
          <div className="l-hero-actions">
            <Link href="/registro" className="l-btn-hero">
              Crear cuenta
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <a href="#features" className="l-btn-hero-ghost">Ver funciones</a>
          </div>

          {/* Trust note */}
          <p className="l-hero-note">Configuración en 2 minutos · Cancela cuando quieras</p>

          {/* Stats bar */}
          <div className="l-hero-stats" role="list" aria-label="Métricas clave">
            {[
              { num: "∞", label: "Pacientes registrados" },
              { num: "CIE-10", label: "Codificación con IA" },
              { num: "100%", label: "Funciona offline" },
              { num: "< 2s", label: "Tiempo de carga" },
            ].map((s) => (
              <div key={s.label} className="l-hero-stat" role="listitem">
                <span className="l-hero-stat-num">{s.num}</span>
                <span className="l-hero-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="l-divider" aria-hidden />

        {/* ── FEATURES ────────────────────────────────────────── */}
        <section id="features" aria-labelledby="features-heading">
          <div className="l-section">
            {/* Section glow */}
            <div
              className="l-section-glow"
              aria-hidden
              style={{ width: 600, height: 600, top: -100, right: -200 }}
            />

            <span className="l-section-label reveal">Funcionalidades</span>
            <h2 id="features-heading" className="l-section-title reveal">
              Diseñado para el<br /><em>consultorio real</em>
            </h2>
            <p className="l-section-body reveal">
              No es un formulario digital. Es un flujo clínico completo que se
              adapta a tu especialidad y trabaja contigo, no contra ti.
            </p>

            {/* Bento grid */}
            <div className="l-bento" role="list">

              {/* Wide card — Wizard */}
              <article className="l-bento-card wide reveal" role="listitem" aria-labelledby="feat-wizard">
                <div className="l-card-icon" aria-hidden>⚕️</div>
                <h3 id="feat-wizard" className="l-card-title">Wizard de consulta inteligente</h3>
                <p className="l-card-body">
                  Flujo guiado por pasos adaptado al modo <strong style={{color:"var(--lt)"}}>Consulta Completa</strong> o{" "}
                  <strong style={{color:"var(--lt)"}}>Seguimiento Clínico</strong>. Auto-scroll
                  a errores, máscara de fecha, bullets automáticos y selector
                  de estado del paciente al cerrar.
                </p>
                <div className="l-card-big-num">3min</div>
                <span className="l-card-tag">Por consulta documentada</span>
              </article>

              {/* AI */}
              <article className="l-bento-card reveal" role="listitem" aria-labelledby="feat-ai">
                <div className="l-card-icon" aria-hidden>🧠</div>
                <h3 id="feat-ai" className="l-card-title">CIE-10 asistido por IA</h3>
                <p className="l-card-body">
                  Sugerencias de diagnóstico en tiempo real con Gemini 2.0 Flash.
                  Contextualizado a tu especialidad, sin catálogo local.
                </p>
                <span className="l-card-tag">Gemini 2.0 Flash</span>
              </article>

              {/* Offline */}
              <article className="l-bento-card reveal" role="listitem" aria-labelledby="feat-offline-card">
                <div className="l-card-icon" aria-hidden>📶</div>
                <h3 id="feat-offline-card" className="l-card-title">Offline-first nativo</h3>
                <p className="l-card-body">
                  IndexedDB local con 0ms de latencia. Sincronización automática
                  con backoff exponencial al recuperar conexión.
                </p>
                <span className="l-card-tag">Sin pérdida de datos</span>
              </article>

              {/* PDF */}
              <article className="l-bento-card reveal" role="listitem" aria-labelledby="feat-pdf">
                <div className="l-card-icon" aria-hidden>📄</div>
                <h3 id="feat-pdf" className="l-card-title">PDF clínico multipágina</h3>
                <p className="l-card-body">
                  Historia completa + receta + hoja del paciente con membrete
                  profesional personalizable y firma digital.
                </p>
              </article>

              {/* Security */}
              <article className="l-bento-card reveal" role="listitem" aria-labelledby="feat-security">
                <div className="l-card-icon" aria-hidden>🔐</div>
                <h3 id="feat-security" className="l-card-title">Seguridad multi-tenant</h3>
                <p className="l-card-body">
                  RLS en todas las tablas. Datos clínicos aislados por tenant.
                  Logs de auditoría con hash criptográfico encadenado.
                </p>
              </article>

            </div>
          </div>
        </section>

        <div className="l-divider" aria-hidden />

        {/* ── OFFLINE SPLIT ────────────────────────────────────── */}
        <section id="offline" aria-labelledby="offline-heading">
          <div className="l-section">
            <div className="l-split">

              {/* Visual — Mock panel */}
              <div className="reveal-left">
                <div className="l-mock-panel">
                  <div className="l-mock-top">
                    <span className="l-mock-dot r" />
                    <span className="l-mock-dot y" />
                    <span className="l-mock-dot g" />
                    glyph — consultas offline
                  </div>
                  <div className="l-mock-body">
                    {[
                      { name: "García, Luis", status: "Sincronizado", accent: true },
                      { name: "Rodríguez, Ana", status: "En cola", accent: false },
                      { name: "Méndez, Carlos", status: "En cola", accent: false },
                      { name: "Flores, María", status: "Sincronizado", accent: true },
                    ].map((row) => (
                      <div key={row.name} className={`l-mock-row${row.accent ? " l-mock-row-accent" : ""}`}>
                        <span style={{fontSize:".9rem"}}>🫀</span>
                        <span style={{flex:1, fontSize:".82rem"}}>{row.name}</span>
                        {row.accent
                          ? <span className="l-mock-badge">✓ Sync</span>
                          : <span className="l-mock-badge-muted">⏳ Pendiente</span>
                        }
                      </div>
                    ))}
                    <div style={{marginTop:"16px", padding:"12px 14px", borderRadius:"8px", background:"var(--accent-dim)", border:"1px solid var(--line2)", fontSize:".78rem", color:"var(--lt2)"}}>
                      🔄 Sincronizando 2 consultas… backoff 3s
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="reveal-right">
                <span className="l-section-label">Arquitectura Offline-First</span>
                <h2 id="offline-heading" className="l-section-title">
                  Trabaja sin internet.<br /><em>Siempre.</em>
                </h2>
                <p style={{color:"var(--lt2)", marginTop:"16px", lineHeight:1.7, fontSize:".95rem"}}>
                  Glyph corre completamente en tu navegador usando IndexedDB.
                  Sin conexión, la app sigue funcionando a la perfección.
                  Cuando vuelve el internet, sincroniza sola.
                </p>
                <ul className="l-check-list" aria-label="Beneficios offline">
                  <li>Latencia 0ms — todo corre local</li>
                  <li>Cola de sincronización con backoff exponencial</li>
                  <li>Resolución de conflictos por dependencias</li>
                  <li>Instalable como PWA en iOS, Android y escritorio</li>
                </ul>
              </div>

            </div>
          </div>
        </section>

        <div className="l-divider" aria-hidden />

        {/* ── TESTIMONIALS ────────────────────────────────────── */}
        <section
          aria-labelledby="testi-heading"
          style={{background:"var(--lbg1)", position:"relative", zIndex:2}}
        >
          <div className="l-section">
            <div style={{textAlign:"center", maxWidth:600, margin:"0 auto"}}>
              <span className="l-section-label reveal">Testimonios</span>
              <h2 id="testi-heading" className="l-section-title reveal">
                Los médicos que ya usan <em>Glyph</em>
              </h2>
              <p className="l-section-body reveal" style={{margin:"16px auto 0", textAlign:"center"}}>
                Estamos en lanzamiento temprano. Pronto compartiremos aquí las experiencias
                de los primeros médicos que confían en Glyph cada día.
              </p>
              <div className="reveal" style={{marginTop:"48px", display:"flex", gap:"16px", justifyContent:"center", flexWrap:"wrap"}}>
                {[
                  { icon: "⚕️", label: "Médicos generales" },
                  { icon: "👶", label: "Pediatras" },
                  { icon: "🫀", label: "Cardiólogos" },
                  { icon: "🧠", label: "Neurólogos" },
                ].map((sp) => (
                  <div
                    key={sp.label}
                    style={{
                      display:"flex", alignItems:"center", gap:"8px",
                      padding:"10px 20px",
                      background:"var(--glass)", border:"1px solid var(--line)",
                      borderRadius:"100px", fontSize:".82rem", color:"var(--lt2)"
                    }}
                  >
                    <span>{sp.icon}</span> {sp.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="l-divider" aria-hidden />

        {/* ── PRICING ─────────────────────────────────────────── */}
        <section id="pricing" aria-labelledby="pricing-heading">
          <div className="l-section">
            <div style={{textAlign:"center", maxWidth:520, margin:"0 auto"}}>
              <span className="l-section-label reveal">Precios</span>
              <h2 id="pricing-heading" className="l-section-title reveal">
                Planes simples,<br /><em>sin sorpresas</em>
              </h2>
              <p className="l-section-body reveal" style={{margin:"12px auto 0", textAlign:"center"}}>
                Un plan claro. Paga solo lo que usas.
              </p>
            </div>

            <div className="l-pricing-grid">

              {/* Plan Pro */}
              <article className="l-pricing-card featured reveal" aria-labelledby="plan-pro">
                <h3 id="plan-pro" className="l-plan-name">Profesional Independiente</h3>
                <p className="l-plan-desc">Para médicos con consultorio propio.</p>
                <div className="l-plan-price">$29 <span>/mes</span></div>
                <ul className="l-plan-features" aria-label="Características del plan Pro">
                  {[
                    "Pacientes y consultas ilimitados",
                    "Seguimientos clínicos",
                    "Plantillas de tratamiento",
                    "Sugerencias CIE-10 con IA",
                    "PDF clínico profesional",
                    "Sync offline automático",
                    "Soporte por email",
                  ].map((f) => (
                    <li key={f} className="l-plan-feature">{f}</li>
                  ))}
                </ul>
                <Link
                  href="/registro?plan=pro"
                  className="l-btn-hero"
                  style={{width:"100%", marginTop:"32px", justifyContent:"center"}}
                >
                  Comenzar ahora
                </Link>
              </article>

              {/* Plan Clínica */}
              <article className="l-pricing-card reveal" aria-labelledby="plan-clinica" style={{opacity:.7}}>
                <h3 id="plan-clinica" className="l-plan-name">Clínica</h3>
                <p className="l-plan-desc">Para centros con múltiples doctores.</p>
                <div className="l-plan-price">$99 <span>/mes</span></div>
                <ul className="l-plan-features" aria-label="Características del plan Clínica">
                  {[
                    "Todo lo del plan Profesional",
                    "Múltiples doctores",
                    "Reportes consolidados",
                    "Soporte prioritario",
                  ].map((f) => (
                    <li key={f} className="l-plan-feature">{f}</li>
                  ))}
                </ul>
                <button
                  disabled
                  aria-disabled="true"
                  className="l-btn-hero-ghost"
                  style={{width:"100%", marginTop:"32px", justifyContent:"center", cursor:"not-allowed", opacity:.5}}
                >
                  Próximamente
                </button>
              </article>

            </div>
          </div>
        </section>

        <div className="l-divider" aria-hidden />

        {/* ── FINAL CTA ───────────────────────────────────────── */}
        <div className="l-cta-section">
          <div className="l-cta-box reveal">
            <h2 className="l-cta-title">
              Digitaliza tu consultorio.<br />
              Empieza <em>hoy</em>.
            </h2>
            <p className="l-cta-body">
              Únete a los médicos que ya reducen el tiempo de documentación
              y nunca pierden una consulta.
            </p>
            <div className="l-cta-actions">
              <Link href="/registro" className="l-btn-hero">
                Crear cuenta
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
              <Link href="/login" className="l-btn-hero-ghost">
                Iniciar sesión
              </Link>
            </div>
          </div>
        </div>

        {/* ── FOOTER ──────────────────────────────────────────── */}
        <footer className="l-footer">
          <div className="l-footer-logo">
            <div className="l-nav-dot" aria-hidden />
            Glyph<span style={{color:"var(--accent)", marginLeft:2}}>·</span>
          </div>
          <nav className="l-footer-links" aria-label="Links del pie de página">
            <Link href="/login">Iniciar sesión</Link>
            <Link href="/registro">Registro</Link>
            <a href="#pricing">Precios</a>
            <a href="#features">Funciones</a>
          </nav>
          <p className="l-footer-copy">
            © {new Date().getFullYear()} Glyph. Todos los derechos reservados.
          </p>
        </footer>

      </main>
    </div>
  );
}
