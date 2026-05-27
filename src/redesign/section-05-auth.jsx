/**
 * ═══════════════════════════════════════════════════════════════
 *  GLYPHIX — Sección 5/6: Autenticación (Login / Registro)
 *  Ferric Meridian v3.0
 *
 *  Dirección estética: "El Portal". Un layout asimétrico dividido
 *  50/50 o 40/60. El lado del formulario es inmaculado, limpio
 *  y enfocado. El lado visual tiene una textura profunda y un
 *  mensaje inspiracional o prueba social.
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState } from "react";
import { FONT_IMPORTS, TOKENS_CSS, DARK_TOKENS_CSS } from "./design-tokens";

const STYLES = `
${FONT_IMPORTS}

.gx-auth {
  ${TOKENS_CSS}
  font-family: var(--font-ui);
  color: var(--ink);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
  min-height: 100dvh;
  display: flex;
}
.gx-auth[data-theme="dark"] { ${DARK_TOKENS_CSS} }

@keyframes gx-up {
  from { opacity:0; transform:translateY(8px); }
  to   { opacity:1; transform:translateY(0); }
}
.gx-s { opacity:0; animation: gx-up 400ms var(--ease-micro) forwards; }
.gx-s1{animation-delay:0ms}.gx-s2{animation-delay:60ms}.gx-s3{animation-delay:120ms}

/* ── Left Side (Form) ─────────────────────────────── */
.gx-auth-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 40px;
  position: relative;
  background: var(--bg);
  max-width: 540px;
}
.gx-auth-brand {
  display: flex; align-items: center; gap: 8px;
  font-family: var(--font-display); font-size: 1.25rem; font-weight: 700;
  letter-spacing: -0.02em; color: var(--ink);
}
.gx-auth-brand span {
  width: 12px; height: 12px; background: var(--accent); border-radius: 50%;
}

.gx-auth-form-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  max-width: 360px;
  width: 100%;
  margin: 0 auto;
}
.gx-af-title {
  font-family: var(--font-display); font-size: 2rem; font-weight: 700;
  letter-spacing: -0.03em; line-height: 1.1; margin-bottom: 8px;
}
.gx-af-sub {
  font-size: 0.9375rem; color: var(--ink-soft); margin-bottom: 32px;
}

/* Form Elements */
.gx-field { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
.gx-label { font-size: 0.8125rem; font-weight: 600; color: var(--ink); display: flex; justify-content: space-between; }
.gx-label-link { color: var(--accent); font-weight: 500; cursor: pointer; transition: color 150ms; }
.gx-label-link:hover { color: var(--accent-hover); }
.gx-input {
  font-family: var(--font-ui); font-size: 0.9375rem; color: var(--ink);
  background: var(--bg); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 12px 16px; outline: none;
  transition: all 150ms var(--ease-out);
}
.gx-input::placeholder { color: var(--ink-faint); }
.gx-input:hover { border-color: var(--ink-faint); }
.gx-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-dim); background: var(--bg-elevated); }

.gx-btn-submit {
  width: 100%; font-family: var(--font-ui); font-size: 0.9375rem; font-weight: 600;
  padding: 12px 24px; border-radius: var(--radius); background: var(--accent); color: #FFF;
  border: none; cursor: pointer; transition: all 180ms var(--ease-out);
  margin-top: 12px;
}
.gx-btn-submit:hover { background: var(--accent-hover); box-shadow: 0 4px 16px var(--accent-glow); transform: translateY(-1px); }
.gx-btn-submit:active { transform: scale(0.98); }

.gx-auth-footer {
  text-align: center; font-size: 0.8125rem; color: var(--ink-soft); margin-top: 32px;
}

/* ── Right Side (Visual) ──────────────────────────── */
.gx-auth-right {
  flex: 1.2;
  background: #000;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 64px;
}
/* Abstract texture / gradient */
.gx-ar-bg {
  position: absolute; inset: 0;
  background: radial-gradient(circle at 80% 20%, rgba(196,96,42,0.15) 0%, transparent 40%),
              radial-gradient(circle at 20% 80%, rgba(255,255,255,0.05) 0%, transparent 40%);
  z-index: 1;
}
.gx-ar-noise {
  position: absolute; inset: 0; z-index: 2; opacity: 0.4;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
}
.gx-ar-content {
  position: relative; z-index: 10; max-width: 480px;
}
.gx-ar-quote {
  font-family: var(--font-display); font-size: 1.75rem; font-weight: 500;
  letter-spacing: -0.02em; color: #FFF; line-height: 1.3; margin-bottom: 24px;
}
.gx-ar-author {
  font-size: 0.9375rem; font-weight: 600; color: #FFF;
}
.gx-ar-role {
  font-size: 0.8125rem; color: rgba(255,255,255,0.6);
}

@media (max-width: 1024px) {
  .gx-auth-right { display: none; }
  .gx-auth-left { max-width: 100%; }
}
`;

export default function AuthView() {
  const [view, setView] = useState("login"); // login | register
  const [theme, setTheme] = useState("light");

  return (
    <>
      <style>{STYLES}</style>
      <div className="gx-auth" data-theme={theme}>
        
        {/* LEFT */}
        <div className="gx-auth-left">
          <div className="gx-auth-brand">
            <span /> Glyphix
          </div>

          <div className="gx-auth-form-wrap">
            {view === "login" ? (
              <div className="gx-s gx-s1">
                <h1 className="gx-af-title">Bienvenido de nuevo</h1>
                <p className="gx-af-sub">Ingresa a tu consultorio digital</p>

                <div className="gx-field">
                  <label className="gx-label">Correo Electrónico</label>
                  <input type="email" className="gx-input" placeholder="dr.apellido@ejemplo.com" />
                </div>
                <div className="gx-field">
                  <label className="gx-label">Contraseña <span className="gx-label-link">¿Olvidaste tu contraseña?</span></label>
                  <input type="password" className="gx-input" placeholder="••••••••" />
                </div>
                
                <button className="gx-btn-submit">Iniciar Sesión</button>

                <div className="gx-auth-footer">
                  ¿No tienes una cuenta? <span className="gx-label-link" onClick={() => setView("register")}>Regístrate aquí</span>
                </div>
              </div>
            ) : (
              <div className="gx-s gx-s1">
                <h1 className="gx-af-title">Comienza con Glyphix</h1>
                <p className="gx-af-sub">Únete a la evolución de la historia clínica</p>

                <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:16}}>
                  <div className="gx-field" style={{marginBottom:12}}>
                    <label className="gx-label">Nombre</label>
                    <input type="text" className="gx-input" placeholder="Nombre" />
                  </div>
                  <div className="gx-field" style={{marginBottom:12}}>
                    <label className="gx-label">Apellido</label>
                    <input type="text" className="gx-input" placeholder="Apellido" />
                  </div>
                </div>
                <div className="gx-field" style={{marginBottom:12}}>
                  <label className="gx-label">Correo Electrónico</label>
                  <input type="email" className="gx-input" placeholder="dr.apellido@ejemplo.com" />
                </div>
                <div className="gx-field">
                  <label className="gx-label">Contraseña</label>
                  <input type="password" className="gx-input" placeholder="••••••••" />
                </div>

                <button className="gx-btn-submit">Crear Cuenta</button>

                <div className="gx-auth-footer">
                  ¿Ya tienes una cuenta? <span className="gx-label-link" onClick={() => setView("login")}>Inicia sesión</span>
                </div>
              </div>
            )}
          </div>
          
          <div style={{position:"absolute", bottom:24, left:40}}>
             <button style={{background:"none",border:"1px solid var(--border)",padding:"4px 8px",borderRadius:4,color:"var(--ink-soft)",cursor:"pointer",fontSize:"0.6875rem"}} onClick={()=>setTheme(t=>t==="light"?"dark":"light")}>
                {theme==="light"?"Dark Mode":"Light Mode"}
             </button>
          </div>
        </div>

        {/* RIGHT */}
        <div className="gx-auth-right">
          <div className="gx-ar-bg" />
          <div className="gx-ar-noise" />
          <div className="gx-ar-content gx-s gx-s2">
            <div className="gx-ar-quote">
              &quot;Desde que usamos Glyphix, registrar la historia clínica dejó de ser una carga para volver a ser una herramienta de diagnóstico. Ahorramos 2 horas al día.&quot;
            </div>
            <div className="gx-ar-author">Dr. Andrés Mejía</div>
            <div className="gx-ar-role">Cardiólogo · Medellín, Colombia</div>
          </div>
        </div>

      </div>
    </>
  );
}
