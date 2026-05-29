/**
 * ═══════════════════════════════════════════════════════════════
 *  GLYPHIX — Sección 9: Landing Page
 *  Ferric Meridian v3.0
 *
 *  Dirección estética: "El Manifiesto". Tipografía gigante, 
 *  espacios en blanco inmensos, micro-animaciones en botones, 
 *  y un grid tipo "bento" para las características.
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState } from "react";
import { FONT_IMPORTS, TOKENS_CSS, DARK_TOKENS_CSS } from "./design-tokens";

const STYLES = `
${FONT_IMPORTS}

.gx-landing {
  ${TOKENS_CSS}
  font-family: var(--font-ui);
  color: var(--ink);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
  min-height: 100dvh;
  overflow-x: hidden;
}
.gx-landing[data-theme="dark"] { ${DARK_TOKENS_CSS} }

@keyframes gx-up {
  from { opacity:0; transform:translateY(12px); }
  to   { opacity:1; transform:translateY(0); }
}
.gx-s { opacity:0; animation: gx-up 600ms cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.gx-s1{animation-delay:0ms}.gx-s2{animation-delay:100ms}.gx-s3{animation-delay:200ms}
.gx-s4{animation-delay:300ms}

/* ── Navigation ───────────────────────────────────── */
.gx-nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 40px;
  background: rgba(250, 250, 248, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(0,0,0,0.05);
}
.gx-landing[data-theme="dark"] .gx-nav {
  background: rgba(17, 17, 17, 0.8);
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.gx-nav-brand {
  display: flex; align-items: center; gap: 8px;
  font-family: var(--font-display); font-size: 1.125rem; font-weight: 700;
  letter-spacing: -0.02em; color: var(--ink);
}
.gx-nav-brand span { width: 10px; height: 10px; background: var(--accent); border-radius: 50%; }
.gx-nav-links { display: flex; gap: 24px; align-items: center; }
.gx-nav-link {
  font-size: 0.8125rem; font-weight: 500; color: var(--ink-soft); cursor: pointer;
  transition: color 150ms;
}
.gx-nav-link:hover { color: var(--ink); }

/* ── Hero ─────────────────────────────────────────── */
.gx-hero {
  padding: 180px 40px 120px;
  text-align: center;
  max-width: 900px;
  margin: 0 auto;
  position: relative;
}
.gx-hero-badge {
  display: inline-flex; align-items: center; gap: 8px;
  font-family: var(--font-mono); font-size: 0.6875rem; font-weight: 500;
  color: var(--accent); background: var(--accent-dim);
  padding: 6px 12px; border-radius: 100px; margin-bottom: 32px;
  border: 1px solid rgba(196,96,42,0.2);
}
.gx-hero-title {
  font-family: var(--font-display); font-size: 4.5rem; font-weight: 700;
  letter-spacing: -0.04em; line-height: 1.05; color: var(--ink); margin: 0 0 24px;
}
.gx-hero-desc {
  font-size: 1.25rem; color: var(--ink-soft); line-height: 1.5;
  max-width: 600px; margin: 0 auto 48px;
}
.gx-hero-actions {
  display: flex; align-items: center; justify-content: center; gap: 16px;
}

/* Buttons */
.gx-btn {
  font-family: var(--font-ui); font-size: 0.9375rem; font-weight: 600;
  padding: 14px 28px; border-radius: var(--radius); cursor: pointer;
  transition: all 180ms var(--ease-out); border: 1px solid transparent;
}
.gx-btn:active { transform: scale(0.97); }
.gx-btn-p { background: var(--ink); color: var(--bg); }
.gx-btn-p:hover { background: var(--ink-soft); box-shadow: 0 8px 24px rgba(0,0,0,0.1); transform: translateY(-2px); }
.gx-landing[data-theme="dark"] .gx-btn-p:hover { box-shadow: 0 8px 24px rgba(255,255,255,0.1); }
.gx-btn-s { background: transparent; border-color: var(--border); color: var(--ink); }
.gx-btn-s:hover { border-color: var(--ink-soft); background: var(--bg-elevated); }

/* ── Mockup / Visual ──────────────────────────────── */
.gx-mockup {
  max-width: 1200px; margin: 0 auto 120px;
  padding: 0 40px;
}
.gx-m-frame {
  background: var(--bg-elevated); border: 1px solid var(--border);
  border-radius: 16px; height: 600px; overflow: hidden;
  box-shadow: 0 24px 64px rgba(0,0,0,0.08);
  position: relative;
  display: flex; flex-direction: column;
}
.gx-landing[data-theme="dark"] .gx-m-frame { box-shadow: 0 24px 64px rgba(0,0,0,0.4); }

.gx-m-top {
  height: 48px; border-bottom: 1px solid var(--border); background: var(--bg);
  display: flex; align-items: center; padding: 0 16px; gap: 8px;
}
.gx-m-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--border); }
.gx-m-content {
  flex: 1; background: var(--bg-soft); position: relative;
  background-image: linear-gradient(to right, var(--border-subtle) 1px, transparent 1px),
                    linear-gradient(to bottom, var(--border-subtle) 1px, transparent 1px);
  background-size: 40px 40px;
}

/* ── Bento Grid ───────────────────────────────────── */
.gx-bento {
  max-width: 1200px; margin: 0 auto 120px;
  padding: 0 40px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;
}
.gx-b-card {
  background: var(--bg-elevated); border: 1px solid var(--border);
  border-radius: 16px; padding: 32px;
  transition: all 300ms var(--ease-out);
}
.gx-b-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.05); border-color: var(--border-hover); }
.gx-b-large { grid-column: span 2; }
.gx-b-icon {
  width: 40px; height: 40px; background: var(--accent-dim); color: var(--accent);
  border-radius: 10px; display: flex; align-items: center; justify-content: center;
  margin-bottom: 24px;
}
.gx-b-title { font-family: var(--font-display); font-size: 1.25rem; font-weight: 700; color: var(--ink); margin-bottom: 12px; }
.gx-b-desc { font-size: 0.9375rem; color: var(--ink-soft); line-height: 1.5; }

@media (max-width: 1024px) {
  .gx-hero-title { font-size: 3.5rem; }
  .gx-bento { grid-template-columns: 1fr; }
  .gx-b-large { grid-column: span 1; }
  .gx-m-frame { height: 400px; }
}
@media (max-width: 768px) {
  .gx-hero-title { font-size: 2.5rem; }
  .gx-hero { padding: 140px 24px 80px; }
  .gx-mockup, .gx-bento { padding: 0 24px; }
}
`;

function Ico({d,s=20}) { return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>; }

export default function LandingView() {
  const [theme, setTheme] = useState("light");

  return (
    <>
      <style>{STYLES}</style>
      <div className="gx-landing" data-theme={theme}>
        
        <nav className="gx-nav">
          <div className="gx-nav-brand"><span /> Glyphix</div>
          <div className="gx-nav-links">
            <span className="gx-nav-link">Características</span>
            <span className="gx-nav-link">Precios</span>
            <span className="gx-nav-link" onClick={()=>setTheme(t=>t==="light"?"dark":"light")}>Tema: {theme}</span>
            <button className="gx-btn gx-btn-s" style={{padding:"8px 16px", fontSize:"0.8125rem"}}>Iniciar Sesión</button>
          </div>
        </nav>

        <header className="gx-hero">
          <div className="gx-hero-badge gx-s gx-s1">
            <div style={{width:6,height:6,background:"var(--accent)",borderRadius:"50%",boxShadow:"0 0 8px var(--accent)"}}/>
            Glyphix v3.0 ya disponible
          </div>
          <h1 className="gx-hero-title gx-s gx-s2">
            La historia clínica que<br/>respeta tu tiempo.
          </h1>
          <p className="gx-hero-desc gx-s gx-s3">
            Diseñado para médicos que buscan rapidez y precisión. Una herramienta clínica que no se siente como un software de contabilidad de los años 90.
          </p>
          <div className="gx-hero-actions gx-s gx-s4">
            <button className="gx-btn gx-btn-p">Comenzar prueba gratis</button>
            <button className="gx-btn gx-btn-s">Agendar demo</button>
          </div>
        </header>

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

        <section className="gx-bento">
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
            <p className="gx-b-desc">El autocompletado CIE-11 está potenciado por modelos de inteligencia artificial avanzados. Encuentra el diagnóstico exacto analizando el texto libre del motivo de consulta.</p>
          </div>
        </section>

      </div>
    </>
  );
}
