/**
 * ═══════════════════════════════════════════════════════════════
 *  GLYPHIX — Sección 8: Ajustes (Settings)
 *  Ferric Meridian v3.0
 *
 *  Dirección estética: Un layout de configuración clásico "Vercel-style".
 *  Menú lateral izquierdo, contenido en la derecha dividido en
 *  cards limpias. Botones destructivos claros, toggles estilo iOS.
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState } from "react";
import { FONT_IMPORTS, TOKENS_CSS, DARK_TOKENS_CSS } from "./design-tokens";

const STYLES = `
${FONT_IMPORTS}

.gx-stg {
  ${TOKENS_CSS}
  font-family: var(--font-ui);
  color: var(--ink);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
  min-height: 100dvh;
}
.gx-stg[data-theme="dark"] { ${DARK_TOKENS_CSS} }

@keyframes gx-up {
  from { opacity:0; transform:translateY(8px); }
  to   { opacity:1; transform:translateY(0); }
}
.gx-s { opacity:0; animation: gx-up 320ms var(--ease-micro) forwards; }
.gx-s1{animation-delay:0ms}.gx-s2{animation-delay:40ms}.gx-s3{animation-delay:80ms}

/* ── Page header ──────────────────────────────────── */
.gx-stg-hdr {
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border);
  padding: 32px 40px;
}
.gx-stg-title {
  font-family: var(--font-display); font-size: 1.5rem; font-weight: 700;
  letter-spacing: -0.03em; color: var(--ink); margin: 0;
}
.gx-stg-sub {
  font-size: 0.8125rem; color: var(--ink-soft); margin-top: 4px;
}

/* ── Layout ───────────────────────────────────────── */
.gx-stg-main {
  max-width: 1000px;
  margin: 0 auto;
  padding: 40px;
  display: flex;
  gap: 64px;
}

/* ── Sidebar ──────────────────────────────────────── */
.gx-stg-nav {
  width: 200px; flex-shrink: 0;
  display: flex; flex-direction: column; gap: 4px;
}
.gx-stg-link {
  font-family: var(--font-ui); font-size: 0.8125rem; font-weight: 500;
  color: var(--ink-soft); padding: 8px 12px; border-radius: var(--radius-sm);
  cursor: pointer; transition: all 150ms var(--ease-out); border: none; background: transparent;
  text-align: left;
}
.gx-stg-link:hover { color: var(--ink); background: var(--bg-soft); }
.gx-stg-link-active { color: var(--ink); background: var(--bg-elevated); font-weight: 600; box-shadow: var(--shadow-sm); }

/* ── Content Area ─────────────────────────────────── */
.gx-stg-content {
  flex: 1;
  min-width: 0;
}

/* ── Cards ────────────────────────────────────────── */
.gx-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  margin-bottom: 32px;
  overflow: hidden;
}
.gx-card-hdr {
  padding: 24px;
  border-bottom: 1px solid var(--border-subtle);
}
.gx-card-title {
  font-size: 1rem; font-weight: 600; color: var(--ink); margin-bottom: 4px;
}
.gx-card-desc {
  font-size: 0.8125rem; color: var(--ink-faint);
}
.gx-card-body {
  padding: 24px;
}
.gx-card-ftr {
  padding: 16px 24px;
  background: var(--bg-soft);
  border-top: 1px solid var(--border-subtle);
  display: flex; justify-content: space-between; align-items: center;
}
.gx-card-ftr-desc {
  font-size: 0.8125rem; color: var(--ink-soft);
}

/* ── Form Elements ────────────────────────────────── */
.gx-field { margin-bottom: 16px; }
.gx-field:last-child { margin-bottom: 0; }
.gx-label { display: block; font-size: 0.75rem; font-weight: 600; color: var(--ink); margin-bottom: 8px; }
.gx-input {
  width: 100%; max-width: 400px;
  font-family: var(--font-ui); font-size: 0.8125rem; color: var(--ink);
  background: var(--bg); border: 1px solid var(--border);
  border-radius: var(--radius-sm); padding: 8px 12px; outline: none;
  transition: all 150ms var(--ease-out);
}
.gx-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-dim); }

/* Avatar row */
.gx-avatar-row { display: flex; align-items: center; gap: 16px; }
.gx-av { width: 64px; height: 64px; border-radius: 50%; background: var(--accent-dim); color: var(--accent); display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-size: 1.5rem; font-weight: 700; border: 1px solid var(--border); }

/* Toggle */
.gx-toggle-row { display: flex; justify-content: space-between; align-items: center; padding: 16px 0; border-bottom: 1px solid var(--border-subtle); }
.gx-toggle-row:last-child { border-bottom: none; padding-bottom: 0; }
.gx-toggle-row:first-child { padding-top: 0; }
.gx-t-lbl { font-size: 0.875rem; font-weight: 500; color: var(--ink); }
.gx-t-desc { font-size: 0.8125rem; color: var(--ink-faint); margin-top: 2px; }
.gx-toggle {
  appearance: none; width: 36px; height: 20px; border-radius: 20px;
  background: var(--border); position: relative; cursor: pointer;
  transition: background 150ms; outline: none;
}
.gx-toggle::after {
  content:''; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px;
  border-radius: 50%; background: #FFF; box-shadow: 0 1px 2px rgba(0,0,0,0.2);
  transition: transform 150ms;
}
.gx-toggle:checked { background: var(--accent); }
.gx-toggle:checked::after { transform: translateX(16px); }
.gx-toggle:focus-visible { box-shadow: 0 0 0 2px var(--bg), 0 0 0 4px var(--accent); }

/* Buttons */
.gx-btn {
  font-family: var(--font-ui); font-size: 0.75rem; font-weight: 600;
  padding: 8px 16px; border-radius: var(--radius-sm); cursor: pointer;
  transition: all 150ms var(--ease-out); border: 1px solid transparent;
}
.gx-btn:active { transform: scale(0.97); }
.gx-btn-p { background: var(--ink); color: var(--bg); }
.gx-btn-p:hover { background: var(--ink-soft); }
.gx-btn-s { background: var(--bg); border-color: var(--border); color: var(--ink); }
.gx-btn-s:hover { border-color: var(--ink-faint); }
.gx-btn-danger { background: var(--bg-hover); color: var(--state-warn); border-color: var(--border); }
.gx-btn-danger:hover { background: var(--state-warn); color: #FFF; border-color: var(--state-warn); }

/* Destructive card */
.gx-card-danger { border-color: var(--state-warn-bg); }
.gx-card-danger .gx-card-hdr { border-bottom-color: var(--state-warn-bg); }
.gx-card-danger .gx-card-ftr { background: var(--state-warn-bg); border-top-color: var(--state-warn-bg); }

@media (max-width: 768px) {
  .gx-stg-main { flex-direction: column; gap: 32px; padding: 24px; }
  .gx-stg-nav { width: 100%; flex-direction: row; overflow-x: auto; }
  .gx-stg-link { white-space: nowrap; }
}
`;

export default function SettingsView() {
  const [theme, setTheme] = useState("light");
  const [tab, setTab] = useState("profile");

  return (
    <>
      <style>{STYLES}</style>
      <div className="gx-stg" data-theme={theme}>
        
        <div className="gx-stg-hdr gx-s gx-s1">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <h1 className="gx-stg-title">Ajustes</h1>
              <p className="gx-stg-sub">Gestiona la configuración de tu cuenta y consultorio</p>
            </div>
            <button className="gx-btn gx-btn-s" onClick={()=>setTheme(t=>t==="light"?"dark":"light")}>
              {theme==="light"?"Dark Mode":"Light Mode"}
            </button>
          </div>
        </div>

        <div className="gx-stg-main">
          <nav className="gx-stg-nav gx-s gx-s2">
            {[
              { id: "profile", label: "Perfil" },
              { id: "clinic", label: "Consultorio" },
              { id: "notifications", label: "Notificaciones" },
              { id: "billing", label: "Facturación" },
              { id: "security", label: "Seguridad" },
            ].map(t => (
              <button 
                key={t.id} 
                className={`gx-stg-link ${tab === t.id ? "gx-stg-link-active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <main className="gx-stg-content gx-s gx-s3">
            {tab === "profile" && (
              <>
                <div className="gx-card">
                  <div className="gx-card-hdr">
                    <h2 className="gx-card-title">Tu Avatar</h2>
                    <p className="gx-card-desc">Esta es tu foto de perfil visible en la plataforma y en las fórmulas médicas.</p>
                  </div>
                  <div className="gx-card-body">
                    <div className="gx-avatar-row">
                      <div className="gx-av">AM</div>
                      <div style={{display:"flex",gap:8}}>
                        <button className="gx-btn gx-btn-s">Subir foto</button>
                        <button className="gx-btn gx-btn-s" style={{color:"var(--ink-faint)"}}>Eliminar</button>
                      </div>
                    </div>
                  </div>
                  <div className="gx-card-ftr">
                    <span className="gx-card-ftr-desc">Se recomiendan imágenes JPG o PNG de al menos 400x400px.</span>
                  </div>
                </div>

                <div className="gx-card">
                  <div className="gx-card-hdr">
                    <h2 className="gx-card-title">Información Personal</h2>
                    <p className="gx-card-desc">Actualiza tu nombre y tu especialidad.</p>
                  </div>
                  <div className="gx-card-body">
                    <div className="gx-field">
                      <label className="gx-label">Nombre para mostrar</label>
                      <input type="text" className="gx-input" defaultValue="Dr. Andrés Mejía" />
                    </div>
                    <div className="gx-field">
                      <label className="gx-label">Especialidad (Principal)</label>
                      <input type="text" className="gx-input" defaultValue="Cardiología" />
                    </div>
                  </div>
                  <div className="gx-card-ftr">
                    <span className="gx-card-ftr-desc">Usa tu nombre real, esto afectará el membrete de PDF.</span>
                    <button className="gx-btn gx-btn-p">Guardar</button>
                  </div>
                </div>
              </>
            )}

            {tab === "notifications" && (
              <div className="gx-card">
                <div className="gx-card-hdr">
                  <h2 className="gx-card-title">Preferencias de Notificación</h2>
                  <p className="gx-card-desc">Elige cómo y cuándo quieres recibir alertas.</p>
                </div>
                <div className="gx-card-body">
                  <div className="gx-toggle-row">
                    <div>
                      <div className="gx-t-lbl">Notificaciones Push</div>
                      <div className="gx-t-desc">Recibe alertas en tu navegador para nuevas citas.</div>
                    </div>
                    <input type="checkbox" className="gx-toggle" defaultChecked />
                  </div>
                  <div className="gx-toggle-row">
                    <div>
                      <div className="gx-t-lbl">Resumen Semanal</div>
                      <div className="gx-t-desc">Un email con el resumen de pacientes atendidos.</div>
                    </div>
                    <input type="checkbox" className="gx-toggle" defaultChecked />
                  </div>
                  <div className="gx-toggle-row">
                    <div>
                      <div className="gx-t-lbl">Alertas de Sincronización</div>
                      <div className="gx-t-desc">Avisar cuando haya problemas con el modo offline.</div>
                    </div>
                    <input type="checkbox" className="gx-toggle" />
                  </div>
                </div>
                <div className="gx-card-ftr">
                  <span className="gx-card-ftr-desc">Los cambios se guardan automáticamente.</span>
                </div>
              </div>
            )}

            {tab === "security" && (
              <div className="gx-card gx-card-danger">
                <div className="gx-card-hdr">
                  <h2 className="gx-card-title" style={{color:"var(--state-warn)"}}>Eliminar Cuenta</h2>
                  <p className="gx-card-desc">Esta acción es destructiva y permanente.</p>
                </div>
                <div className="gx-card-body">
                  <p style={{fontSize:"0.875rem", color:"var(--ink-soft)", margin:0, lineHeight:1.5}}>
                    Una vez que elimines tu cuenta, no hay vuelta atrás. Por favor asegúrate. Todos los datos de tus pacientes también serán eliminados de nuestros servidores conforme a la ley de protección de datos (Habeas Data).
                  </p>
                </div>
                <div className="gx-card-ftr">
                  <span className="gx-card-ftr-desc" style={{color:"var(--state-warn)"}}>Se requerirá tu contraseña.</span>
                  <button className="gx-btn gx-btn-danger">Eliminar cuenta</button>
                </div>
              </div>
            )}
          </main>
        </div>

      </div>
    </>
  );
}
