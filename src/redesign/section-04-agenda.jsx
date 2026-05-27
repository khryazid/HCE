/**
 * ═══════════════════════════════════════════════════════════════
 *  GLYPHIX — Sección 4: Agenda / Citas
 *  Ferric Meridian v3.0
 *
 *  Dirección estética: Calendario clínico de alta densidad.
 *  Elemento memorable: Grid temporal con líneas de hora precisas
 *  (monospace), bloques de cita con borde izquierdo de acento
 *  según el estado, y un "mini-calendario" lateral integrado.
 *  Referencia: Cron (ahora Notion Calendar), Apple Calendar UI.
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState } from "react";
import { FONT_IMPORTS, TOKENS_CSS, DARK_TOKENS_CSS } from "./design-tokens";

const STYLES = `
${FONT_IMPORTS}

.gx-agenda {
  ${TOKENS_CSS}
  font-family: var(--font-ui);
  color: var(--ink);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}
.gx-agenda[data-theme="dark"] { ${DARK_TOKENS_CSS} }

@keyframes gx-up {
  from { opacity:0; transform:translateY(8px); }
  to   { opacity:1; transform:translateY(0); }
}
.gx-s { opacity:0; animation: gx-up 320ms var(--ease-micro) forwards; }
.gx-s1{animation-delay:0ms}.gx-s2{animation-delay:40ms}.gx-s3{animation-delay:80ms}

/* ── Top Bar ──────────────────────────────────────── */
.gx-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border);
  z-index: 10;
}
.gx-tb-left { display: flex; align-items: center; gap: 16px; }
.gx-tb-title {
  font-family: var(--font-display); font-size: 1.125rem; font-weight: 700;
  letter-spacing: -0.02em; color: var(--ink); margin: 0;
}
.gx-tb-date {
  font-family: var(--font-mono); font-size: 0.8125rem; font-weight: 500;
  color: var(--ink-soft);
}
.gx-tb-nav {
  display: flex; align-items: center; gap: 4px;
  background: var(--bg-soft); padding: 4px; border-radius: var(--radius-sm);
}
.gx-tb-btn {
  font-family: var(--font-ui); font-size: 0.6875rem; font-weight: 600;
  background: transparent; border: none; padding: 4px 10px; border-radius: 4px;
  cursor: pointer; color: var(--ink-soft); transition: all 150ms var(--ease-out);
}
.gx-tb-btn:hover { background: var(--bg-elevated); color: var(--ink); box-shadow: var(--shadow-sm); }
.gx-tb-btn-active { background: var(--bg-elevated); color: var(--ink); box-shadow: var(--shadow-sm); }
.gx-tb-iconbtn {
  display: flex; align-items: center; justify-content: center;
  width: 24px; height: 24px; border: none; background: transparent;
  color: var(--ink-soft); cursor: pointer; border-radius: 4px;
  transition: all 150ms var(--ease-out);
}
.gx-tb-iconbtn:hover { background: var(--bg-elevated); color: var(--ink); box-shadow: var(--shadow-sm); }

/* Buttons */
.gx-btn {
  font-family: var(--font-ui); font-size: 0.75rem; font-weight: 600;
  padding: 8px 16px; border-radius: var(--radius-sm); border: 1px solid transparent;
  cursor: pointer; transition: all 150ms var(--ease-out);
}
.gx-btn:active { transform: scale(0.97); }
.gx-btn-p { background: var(--accent); color: #FFF; }
.gx-btn-p:hover { background: var(--accent-hover); box-shadow: 0 4px 16px var(--accent-glow); }

/* ── Main Layout ──────────────────────────────────── */
.gx-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* ── Sidebar (Mini-cal & Filters) ─────────────────── */
.gx-sidebar {
  width: 280px;
  border-right: 1px solid var(--border);
  background: var(--bg);
  padding: 24px;
  overflow-y: auto;
  flex-shrink: 0;
}

/* Mini Calendar */
.gx-mini-cal { margin-bottom: 32px; }
.gx-mc-header { display: flex; justify-content: space-between; margin-bottom: 12px; }
.gx-mc-month { font-family: var(--font-ui); font-size: 0.8125rem; font-weight: 600; color: var(--ink); }
.gx-mc-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.gx-mc-day-name {
  font-family: var(--font-mono); font-size: 0.5625rem; font-weight: 500;
  text-align: center; color: var(--ink-faint); margin-bottom: 4px;
}
.gx-mc-cell {
  aspect-ratio: 1; display: flex; align-items: center; justify-content: center;
  font-family: var(--font-mono); font-size: 0.6875rem; color: var(--ink);
  border-radius: 4px; cursor: pointer; transition: background 150ms var(--ease-out);
}
.gx-mc-cell:hover { background: var(--bg-soft); }
.gx-mc-faint { color: var(--ink-faint); }
.gx-mc-active { background: var(--accent-dim); color: var(--accent); font-weight: 500; }
.gx-mc-today { background: var(--accent); color: #FFF; font-weight: 500; }
.gx-mc-today:hover { background: var(--accent-hover); }

/* Filter Section */
.gx-fs { margin-bottom: 24px; }
.gx-fs-title {
  font-family: var(--font-ui); font-size: 0.6875rem; font-weight: 600;
  color: var(--ink-faint); text-transform: uppercase; letter-spacing: 0.08em;
  margin-bottom: 12px;
}
.gx-f-item {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 8px; cursor: pointer;
}
.gx-f-item:hover .gx-f-lbl { color: var(--ink); }
.gx-f-lbl {
  display: flex; align-items: center; gap: 8px;
  font-size: 0.8125rem; color: var(--ink-soft); transition: color 150ms;
}
.gx-f-box {
  appearance: none; width: 14px; height: 14px; border-radius: 3px;
  border: 1px solid var(--border); background: var(--bg); cursor: pointer;
  position: relative; transition: all 150ms;
}
.gx-f-box:checked { background: var(--accent); border-color: var(--accent); }
.gx-f-box:checked::after {
  content: ''; position: absolute; left: 4px; top: 1px; width: 4px; height: 8px;
  border: solid #FFF; border-width: 0 1.5px 1.5px 0; transform: rotate(45deg);
}
.gx-f-color {
  width: 10px; height: 10px; border-radius: 50%;
}
.gx-f-count {
  font-family: var(--font-mono); font-size: 0.625rem; color: var(--ink-faint);
}

/* ── Calendar Grid ────────────────────────────────── */
.gx-grid {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-elevated);
  overflow-y: auto;
}

/* Header (Days) */
.gx-grid-hdr {
  display: grid;
  grid-template-columns: 60px repeat(5, 1fr);
  border-bottom: 1px solid var(--border);
  background: var(--bg-elevated);
  position: sticky; top: 0; z-index: 5;
}
.gx-gh-empty { border-right: 1px solid var(--border); }
.gx-gh-day {
  padding: 12px 16px; border-right: 1px solid var(--border);
  text-align: center;
}
.gx-gh-day:last-child { border-right: none; }
.gx-gh-name {
  font-size: 0.6875rem; font-weight: 600; color: var(--ink-soft); text-transform: uppercase;
}
.gx-gh-num {
  font-family: var(--font-display); font-size: 1.5rem; font-weight: 700;
  color: var(--ink); line-height: 1.1; margin-top: 2px;
}
.gx-gh-today .gx-gh-name { color: var(--accent); }
.gx-gh-today .gx-gh-num { color: var(--accent); }

/* Body */
.gx-grid-body {
  display: grid;
  grid-template-columns: 60px repeat(5, 1fr);
  position: relative;
}
/* Time column */
.gx-gb-times {
  border-right: 1px solid var(--border);
  background: var(--bg-elevated);
  position: relative;
}
.gx-gb-time {
  height: 60px; /* 1 hour = 60px */
  position: relative;
}
.gx-gb-time-lbl {
  position: absolute; top: -8px; right: 8px;
  font-family: var(--font-mono); font-size: 0.625rem; color: var(--ink-faint);
  font-feature-settings: "tnum";
}

/* Day columns */
.gx-gb-col {
  border-right: 1px solid var(--border);
  position: relative;
  background-image: linear-gradient(to bottom, var(--border-subtle) 1px, transparent 1px);
  background-size: 100% 60px; /* matches hour height */
}
.gx-gb-col:last-child { border-right: none; }
.gx-gb-col-today { background-color: var(--bg-soft); }

/* ── Appointment Blocks ───────────────────────────── */
.gx-appt {
  position: absolute;
  left: 4px; right: 8px;
  border-radius: var(--radius-sm);
  padding: 6px 8px;
  cursor: pointer;
  overflow: hidden;
  transition: transform 120ms var(--ease-out), box-shadow 120ms;
}
.gx-appt:hover { transform: translateY(-1px); box-shadow: var(--shadow-sm); z-index: 4!important; }
.gx-appt:active { transform: scale(0.98); }

/* Types */
.gx-appt-ctrl {
  background: var(--state-ok-bg);
  border-left: 3px solid var(--state-ok);
  color: var(--state-ok);
}
.gx-appt-1st {
  background: var(--accent-dim);
  border-left: 3px solid var(--accent);
  color: var(--accent);
}
.gx-appt-fu {
  background: var(--state-warn-bg);
  border-left: 3px solid var(--state-warn);
  color: var(--state-warn);
}
.gx-appt-blocked {
  background: var(--bg-hover);
  border-left: 3px solid var(--ink-faint);
  color: var(--ink-soft);
}

.gx-at-title { font-size: 0.75rem; font-weight: 600; line-height: 1.2; margin-bottom: 2px; }
.gx-at-sub {
  font-family: var(--font-mono); font-size: 0.625rem; font-weight: 500;
  opacity: 0.8; line-height: 1.2;
}

/* ── NOW Line ─────────────────────────────────────── */
.gx-now-line {
  position: absolute;
  left: 0; right: 0;
  height: 2px;
  background: var(--accent);
  z-index: 3;
  pointer-events: none;
}
.gx-now-dot {
  position: absolute;
  left: -4px; top: -3px;
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--accent);
}

@media (max-width: 1024px) {
  .gx-sidebar { display: none; }
}
`;

function Ico({d,s=16}) { return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>; }

const HOURS = Array.from({length: 11}, (_, i) => i + 8); // 8 to 18 (8 AM - 6 PM)
const DAYS = [
  { n: "Lun", num: 25, today: false },
  { n: "Mar", num: 26, today: false },
  { n: "Mié", num: 27, today: true },
  { n: "Jue", num: 28, today: false },
  { n: "Vie", num: 29, today: false },
];

const MINICAL_DAYS = [
  ...Array.from({length: 4}, (_,i)=>({d:27+i, f:true})), // Prev month
  ...Array.from({length: 31}, (_,i)=>({d:i+1, f:false, t:i+1===27, a:[25,26,27,28,29].includes(i+1)})), // Current
];

/* 
  Data shape: dayIdx (0-4), startH (8.0), lenH (0.5 = 30min)
*/
const APPOINTMENTS = [
  // Lunes
  { id:1, d:0, s:8, l:0.5, t:"ctrl", name:"María F. López", sub:"08:00 - I10" },
  { id:2, d:0, s:8.5, l:0.5, t:"fu", name:"Carlos A. Ruiz", sub:"08:30 - E11" },
  { id:3, d:0, s:10, l:1, t:"1st", name:"Valentina Torres", sub:"10:00 - J06" },
  { id:4, d:0, s:14, l:0.5, t:"ctrl", name:"Diego F. Ramírez", sub:"14:00 - M54" },
  // Martes
  { id:5, d:1, s:9, l:0.75, t:"1st", name:"Ana M. Martínez", sub:"09:00 - Cefalea" },
  { id:6, d:1, s:11, l:0.5, t:"fu", name:"Luisa F. Ochoa", sub:"11:00 - Labs" },
  { id:7, d:1, s:13, l:1, t:"blocked", name:"Almuerzo", sub:"13:00" },
  { id:8, d:1, s:15, l:0.5, t:"ctrl", name:"José L. Pérez", sub:"15:00 - Z34" },
  // Miercoles (Today)
  { id:9, d:2, s:8, l:0.5, t:"ctrl", name:"María F. López", sub:"08:00" },
  { id:10, d:2, s:8.5, l:0.5, t:"fu", name:"Carlos A. Ruiz", sub:"08:30" },
  { id:11, d:2, s:9.25, l:0.75, t:"1st", name:"Ana M. Martínez", sub:"09:15" },
  { id:12, d:2, s:10, l:0.5, t:"ctrl", name:"José L. Pérez", sub:"10:00" },
  { id:13, d:2, s:14, l:0.5, t:"fu", name:"Diego F. Ramírez", sub:"14:00" },
  // Jueves
  { id:14, d:3, s:8, l:3, t:"blocked", name:"Cirugía menor", sub:"08:00 - Quirófano" },
  { id:15, d:3, s:14, l:0.5, t:"1st", name:"Luis F. Gómez", sub:"14:00" },
  { id:16, d:3, s:16, l:1.5, t:"blocked", name:"Junta Médica", sub:"16:00" },
  // Viernes
  { id:17, d:4, s:9, l:0.5, t:"ctrl", name:"Sandra M. Vargas", sub:"09:00" },
  { id:18, d:4, s:10.5, l:0.5, t:"fu", name:"Patricia E. Mejía", sub:"10:30" },
];

export default function AgendaView() {
  const [theme, setTheme] = useState("light");

  return (
    <>
      <style>{STYLES}</style>
      <div className="gx-agenda" data-theme={theme}>
        
        {/* Topbar */}
        <div className="gx-topbar gx-s gx-s1">
          <div className="gx-tb-left">
            <h1 className="gx-tb-title">Calendario</h1>
            <div className="gx-tb-nav">
              <button className="gx-tb-btn gx-tb-btn-active">Hoy</button>
              <button className="gx-tb-iconbtn"><Ico d="M15 18l-6-6 6-6"/></button>
              <button className="gx-tb-iconbtn"><Ico d="M9 18l6-6-6-6"/></button>
            </div>
            <span className="gx-tb-date">Mayo 2026</span>
          </div>
          <div style={{display:"flex", gap:12}}>
            <button className="gx-btn gx-btn-s" onClick={()=>setTheme(t=>t==="light"?"dark":"light")}>
              {theme==="light"?"Modo oscuro":"Modo claro"}
            </button>
            <button className="gx-btn gx-btn-p">+ Nueva cita</button>
          </div>
        </div>

        <div className="gx-layout">
          
          {/* Sidebar */}
          <div className="gx-sidebar gx-s gx-s2">
            <div className="gx-mini-cal">
              <div className="gx-mc-header">
                <span className="gx-mc-month">Mayo 2026</span>
                <div style={{display:"flex",gap:4}}>
                  <Ico d="M15 18l-6-6 6-6" s={14}/>
                  <Ico d="M9 18l6-6-6-6" s={14}/>
                </div>
              </div>
              <div className="gx-mc-grid">
                {["L","M","M","J","V","S","D"].map((n,i)=><div key={i} className="gx-mc-day-name">{n}</div>)}
                {MINICAL_DAYS.map((d,i) => (
                  <div key={i} className={`gx-mc-cell${d.f?" gx-mc-faint":""}${d.t?" gx-mc-today":""}${d.a&&!d.t?" gx-mc-active":""}`}>
                    {d.d}
                  </div>
                ))}
              </div>
            </div>

            <div className="gx-fs">
              <div className="gx-fs-title">Tipos de Consulta</div>
              {[
                {c:"var(--accent)", l:"Primera vez", cnt:4},
                {c:"var(--state-ok)", l:"Control", cnt:7},
                {c:"var(--state-warn)", l:"Seguimiento", cnt:5},
                {c:"var(--ink-faint)", l:"Bloqueo / Otro", cnt:3},
              ].map((f,i)=>(
                <label key={i} className="gx-f-item">
                  <div className="gx-f-lbl">
                    <input type="checkbox" className="gx-f-box" defaultChecked />
                    <span className="gx-f-color" style={{backgroundColor: f.c}} />
                    {f.l}
                  </div>
                  <span className="gx-f-count">{f.cnt}</span>
                </label>
              ))}
            </div>

            <div className="gx-fs">
              <div className="gx-fs-title">Especialistas</div>
              <label className="gx-f-item">
                <div className="gx-f-lbl">
                  <input type="checkbox" className="gx-f-box" defaultChecked />
                  <span className="gx-f-color" style={{backgroundColor: "var(--ink)"}} />
                  Dr. Alejandro García (Yo)
                </div>
              </label>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="gx-grid gx-s gx-s3">
            <div className="gx-grid-hdr">
              <div className="gx-gh-empty" />
              {DAYS.map((d,i)=>(
                <div key={i} className={`gx-gh-day${d.today?" gx-gh-today":""}`}>
                  <div className="gx-gh-name">{d.n}</div>
                  <div className="gx-gh-num">{d.num}</div>
                </div>
              ))}
            </div>
            
            <div className="gx-grid-body">
              {/* Time axis */}
              <div className="gx-gb-times">
                {HOURS.map(h => (
                  <div key={h} className="gx-gb-time">
                    <span className="gx-gb-time-lbl">{h}:00</span>
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {DAYS.map((d, colIdx) => (
                <div key={colIdx} className={`gx-gb-col${d.today?" gx-gb-col-today":""}`}>
                  
                  {/* NOW Line (only on today, let's pretend it's 9:42 -> 1.7 hours from 8AM) */}
                  {d.today && (
                    <div className="gx-now-line" style={{top: `${(9.7 - 8) * 60}px`}}>
                      <div className="gx-now-dot" />
                    </div>
                  )}

                  {/* Appointments for this day */}
                  {APPOINTMENTS.filter(a => a.d === colIdx).map(a => {
                    // Position math
                    const top = (a.s - 8) * 60; // 60px per hour
                    const height = (a.l * 60) - 2; // -2px for gap
                    const cls = a.t==="ctrl"?"gx-appt-ctrl":a.t==="1st"?"gx-appt-1st":a.t==="fu"?"gx-appt-fu":"gx-appt-blocked";
                    
                    return (
                      <div key={a.id} className={`gx-appt ${cls}`} style={{top: `${top}px`, height: `${height}px`, zIndex: 1}}>
                        <div className="gx-at-title" style={height < 30 ? {whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"} : {}}>
                          {a.name}
                        </div>
                        {height >= 45 && <div className="gx-at-sub">{a.sub}</div>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          
        </div>
      </div>
    </>
  );
}
