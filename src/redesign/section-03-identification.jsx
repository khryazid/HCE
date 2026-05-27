/**
 * ═══════════════════════════════════════════════════════════════
 *  GLYPHIX — Sección 3: Formulario de Identificación
 *  Ferric Meridian v3.0
 *
 *  Dirección estética: "Registro clínico" — inputs precisos,
 *  padding asimétrico, focus states notorios, labels siempre
 *  visibles (nunca floating). Grid asimétrico.
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState } from "react";
import { FONT_IMPORTS, TOKENS_CSS, DARK_TOKENS_CSS } from "./design-tokens";

const STYLES = `
${FONT_IMPORTS}

.gx-form {
  ${TOKENS_CSS}
  font-family: var(--font-ui);
  color: var(--ink);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
  min-height: 100dvh;
}
.gx-form[data-theme="dark"] { ${DARK_TOKENS_CSS} }

@keyframes gx-up {
  from { opacity:0; transform:translateY(8px); }
  to   { opacity:1; transform:translateY(0); }
}
.gx-s { opacity:0; animation: gx-up 320ms var(--ease-micro) forwards; }
.gx-s1{animation-delay:0ms}.gx-s2{animation-delay:40ms}.gx-s3{animation-delay:80ms}
.gx-s4{animation-delay:120ms}.gx-s5{animation-delay:160ms}

.gx-form-inner {
  max-width: 900px;
  margin: 0 auto;
  padding: 32px 40px 64px;
}

/* ── Progress & Header ────────────────────────────── */
.gx-progress {
  display: flex;
  gap: 4px;
  margin-bottom: 32px;
}
.gx-step {
  flex: 1;
  height: 4px;
  background: var(--border-subtle);
  border-radius: 2px;
}
.gx-step-on { background: var(--accent); }
.gx-step-done { background: var(--accent-dim); }

.gx-fh { margin-bottom: 32px; }
.gx-f-kicker {
  font-family: var(--font-ui); font-size: 0.6875rem; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.16em;
  color: var(--accent); margin-bottom: 6px; display: inline-block;
}
.gx-f-title {
  font-family: var(--font-display); font-size: 1.5rem; font-weight: 700;
  letter-spacing: -0.03em; color: var(--ink); margin: 0;
}
.gx-f-sub {
  font-size: 0.8125rem; color: var(--ink-soft); margin-top: 4px;
}

/* ── Section Blocks ───────────────────────────────── */
.gx-block {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 32px;
  margin-bottom: 24px;
}
.gx-block-title {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
  color: var(--ink);
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-subtle);
}

/* ── Grid Layouts ─────────────────────────────────── */
.gx-g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px 24px; }
.gx-g3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px 24px; }
.gx-g-doc { display: grid; grid-template-columns: 120px 1fr; gap: 24px; }

/* ── Inputs ───────────────────────────────────────── */
.gx-field { display: flex; flex-direction: column; gap: 6px; }
.gx-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--ink);
}
.gx-label-opt {
  color: var(--ink-faint);
  font-weight: 400;
  margin-left: 4px;
}
.gx-input, .gx-select {
  font-family: var(--font-ui);
  font-size: 0.8125rem;
  color: var(--ink);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  outline: none;
  transition: all 150ms var(--ease-out);
}
.gx-input::placeholder { color: var(--ink-faint); }
.gx-input:hover, .gx-select:hover { border-color: var(--ink-faint); }
.gx-input:focus, .gx-select:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-dim);
  background: var(--bg-elevated);
}
.gx-input-mono { font-family: var(--font-mono); font-feature-settings: "tnum"; letter-spacing:0.02em; }

/* ── Select chevron ───────────────────────────────── */
.gx-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/200.svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23A3A39B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
}

/* ── Radio / Check ────────────────────────────────── */
.gx-radio-group { display: flex; gap: 16px; }
.gx-radio-lbl {
  display: flex; align-items: center; gap: 8px;
  font-size: 0.8125rem; color: var(--ink); cursor: pointer;
}
.gx-radio {
  appearance: none; width: 16px; height: 16px;
  border: 1px solid var(--border); border-radius: 50%;
  background: var(--bg); transition: all 150ms var(--ease-out);
  position: relative; margin: 0;
}
.gx-radio:hover { border-color: var(--accent); }
.gx-radio:checked { border-color: var(--accent); background: var(--accent); }
.gx-radio:checked::after {
  content: ''; position: absolute; top: 4px; left: 4px; width: 6px; height: 6px;
  background: #FFF; border-radius: 50%;
}
.gx-radio:focus-visible { box-shadow: 0 0 0 3px var(--accent-dim); }

/* ── Actions ──────────────────────────────────────── */
.gx-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--border);
}
.gx-btn {
  font-family: var(--font-ui); font-size: 0.8125rem; font-weight: 600;
  padding: 10px 24px; border-radius: var(--radius-sm); cursor: pointer;
  border: 1px solid transparent; transition: all 180ms var(--ease-out);
}
.gx-btn:active { transform: scale(0.97); }
.gx-btn-p { background: var(--accent); color: #FFF; }
.gx-btn-p:hover { background: var(--accent-hover); box-shadow: 0 4px 16px var(--accent-glow); transform: translateY(-1px); }
.gx-btn-s { background: transparent; color: var(--ink-soft); }
.gx-btn-s:hover { color: var(--ink); }

@media (max-width: 768px) {
  .gx-form-inner { padding: 20px 16px 40px; }
  .gx-block { padding: 20px; }
  .gx-g2, .gx-g3, .gx-g-doc { grid-template-columns: 1fr; gap: 20px; }
}
@media (prefers-reduced-motion: reduce) {
  .gx-s { animation: none!important; opacity: 1!important; }
}
`;

export default function IdentificationForm() {
  const [theme, setTheme] = useState("light");

  return (
    <>
      <style>{STYLES}</style>
      <div className="gx-form" data-theme={theme}>
        <div className="gx-form-inner">

          {/* Theme toggle just for preview */}
          <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
             <button style={{background:"none",border:"1px solid var(--border)",padding:"4px 8px",borderRadius:4,color:"var(--ink-soft)",cursor:"pointer"}} onClick={()=>setTheme(t=>t==="light"?"dark":"light")}>
                {theme==="light"?"Dark":"Light"}
             </button>
          </div>

          <div className="gx-progress gx-s gx-s1">
            <div className="gx-step gx-step-on" />
            <div className="gx-step" />
            <div className="gx-step" />
            <div className="gx-step" />
            <div className="gx-step" />
          </div>

          <header className="gx-fh gx-s gx-s1">
            <span className="gx-f-kicker">Paso 1 de 5</span>
            <h1 className="gx-f-title">Identificación del Paciente</h1>
            <p className="gx-f-sub">Datos demográficos y de contacto básico</p>
          </header>

          <div className="gx-block gx-s gx-s2">
            <h2 className="gx-block-title">Datos Personales</h2>
            
            <div className="gx-g-doc" style={{marginBottom: 20}}>
              <div className="gx-field">
                <label className="gx-label">Tipo de Doc.</label>
                <select className="gx-select" defaultValue="cc">
                  <option value="cc">CC</option>
                  <option value="ti">TI</option>
                  <option value="ce">CE</option>
                  <option value="pas">PAS</option>
                  <option value="rc">RC</option>
                </select>
              </div>
              <div className="gx-field">
                <label className="gx-label">Número de Documento</label>
                <input type="text" className="gx-input gx-input-mono" placeholder="Ej. 1037892451" />
              </div>
            </div>

            <div className="gx-g2" style={{marginBottom: 20}}>
              <div className="gx-field">
                <label className="gx-label">Nombres</label>
                <input type="text" className="gx-input" placeholder="Nombres completos" />
              </div>
              <div className="gx-field">
                <label className="gx-label">Apellidos</label>
                <input type="text" className="gx-input" placeholder="Apellidos completos" />
              </div>
            </div>

            <div className="gx-g3">
              <div className="gx-field">
                <label className="gx-label">Fecha de Nacimiento</label>
                <input type="date" className="gx-input gx-input-mono" />
              </div>
              <div className="gx-field">
                <label className="gx-label">Sexo al Nacer</label>
                <div className="gx-radio-group" style={{paddingTop: 10}}>
                  <label className="gx-radio-lbl"><input type="radio" name="sex" className="gx-radio" defaultChecked /> Femenino</label>
                  <label className="gx-radio-lbl"><input type="radio" name="sex" className="gx-radio" /> Masculino</label>
                </div>
              </div>
              <div className="gx-field">
                <label className="gx-label">Identidad de Género <span className="gx-label-opt">(Opcional)</span></label>
                <select className="gx-select" defaultValue="">
                  <option value="" disabled>Seleccionar...</option>
                  <option value="f">Femenino</option>
                  <option value="m">Masculino</option>
                  <option value="nb">No Binario</option>
                  <option value="o">Otro</option>
                </select>
              </div>
            </div>
          </div>

          <div className="gx-block gx-s gx-s3">
            <h2 className="gx-block-title">Contacto y Seguridad Social</h2>
            
            <div className="gx-g2" style={{marginBottom: 20}}>
              <div className="gx-field">
                <label className="gx-label">Celular</label>
                <input type="tel" className="gx-input gx-input-mono" placeholder="Ej. 300 123 4567" />
              </div>
              <div className="gx-field">
                <label className="gx-label">Correo Electrónico</label>
                <input type="email" className="gx-input" placeholder="correo@ejemplo.com" />
              </div>
            </div>

            <div className="gx-g2">
              <div className="gx-field">
                <label className="gx-label">Entidad Administradora (EPS)</label>
                <select className="gx-select" defaultValue="particular">
                  <option value="particular">Particular (Sin EPS)</option>
                  <option value="sura">EPS Sura</option>
                  <option value="sanitas">EPS Sanitas</option>
                  <option value="compensar">Compensar EPS</option>
                  <option value="nuevaeps">Nueva EPS</option>
                </select>
              </div>
              <div className="gx-field">
                <label className="gx-label">Ocupación</label>
                <input type="text" className="gx-input" placeholder="Profesión u oficio" />
              </div>
            </div>
          </div>

          <div className="gx-actions gx-s gx-s4">
            <button className="gx-btn gx-btn-s">Cancelar</button>
            <button className="gx-btn gx-btn-p">Guardar y Continuar →</button>
          </div>

        </div>
      </div>
    </>
  );
}
