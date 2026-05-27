/**
 * ═══════════════════════════════════════════════════════════════
 *  GLYPHIX — Sección 1 V2: Dashboard / Inicio (Evolved)
 *  Ferric Meridian v3.0
 *
 *  V2 changes from V1:
 *  - Command bar with ⌘K shortcut hint
 *  - More compact header (single-line greeting + inline actions)
 *  - Patient initials avatars in timeline
 *  - Enhanced "next up" highlight on active appointment
 *  - Trial banner
 *  - Refined density and spacing
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo } from "react";
import { FONT_IMPORTS, TOKENS_CSS, DARK_TOKENS_CSS } from "./design-tokens";

const STYLES = `
${FONT_IMPORTS}

.gx-dash {
  ${TOKENS_CSS}
  font-family: var(--font-ui);
  color: var(--ink);
  background: var(--bg);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  min-height: 100dvh;
}
.gx-dash[data-theme="dark"] {
  ${DARK_TOKENS_CSS}
}

/* ── Stagger ──────────────────────────────────────── */
@keyframes gx-up {
  from { opacity:0; transform:translateY(8px); }
  to   { opacity:1; transform:translateY(0); }
}
.gx-s { opacity:0; animation: gx-up 320ms var(--ease-micro) forwards; }
.gx-s1 { animation-delay:0ms }
.gx-s2 { animation-delay:40ms }
.gx-s3 { animation-delay:80ms }
.gx-s4 { animation-delay:120ms }
.gx-s5 { animation-delay:160ms }
.gx-s6 { animation-delay:200ms }

/* ── Layout ───────────────────────────────────────── */
.gx-dash-inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px 40px 48px;
}

/* ══════════════════════════════════════════════════════
   COMMAND BAR
══════════════════════════════════════════════════════ */
.gx-cmd {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--bg-soft);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius);
  padding: 8px 14px;
  cursor: text;
  transition: border-color 180ms var(--ease-out), box-shadow 180ms var(--ease-out);
  margin-bottom: 24px;
}
.gx-cmd:hover { border-color: var(--border); }
.gx-cmd:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-dim);
}
.gx-cmd-icon { color: var(--ink-faint); flex-shrink:0; }
.gx-cmd input {
  flex: 1;
  border: none;
  background: transparent;
  font-family: var(--font-ui);
  font-size: 0.8125rem;
  color: var(--ink);
  outline: none;
}
.gx-cmd input::placeholder { color: var(--ink-faint); }
.gx-cmd-shortcut {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  color: var(--ink-faint);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-xs);
  padding: 2px 6px;
  letter-spacing: 0.04em;
  flex-shrink: 0;
}

/* ══════════════════════════════════════════════════════
   HEADER V2 — single-line compact
══════════════════════════════════════════════════════ */
.gx-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border);
}
.gx-header-left { display:flex; align-items:baseline; gap:12px; }
.gx-greeting {
  font-family: var(--font-display);
  font-size: 1.375rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--ink);
  margin: 0;
  white-space: nowrap;
}
.gx-greeting .gx-name { color: var(--accent); }
.gx-header-sep {
  width: 1px;
  height: 18px;
  background: var(--border);
}
.gx-header-meta {
  font-size: 0.75rem;
  color: var(--ink-faint);
}
.gx-header-right { display:flex; align-items:center; gap:8px; }

/* ── Buttons ──────────────────────────────────────── */
.gx-btn {
  font-family: var(--font-ui);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  border-radius: var(--radius-sm);
  padding: 7px 16px;
  cursor: pointer;
  transition: background 180ms var(--ease-out), transform 120ms var(--ease-micro),
              box-shadow 180ms var(--ease-out), border-color 180ms var(--ease-out),
              color 180ms var(--ease-out);
  user-select: none;
  border: 1px solid transparent;
}
.gx-btn:active { transform: scale(0.97); }
.gx-btn-p {
  color: #FFF;
  background: var(--accent);
}
.gx-btn-p:hover {
  background: var(--accent-hover);
  box-shadow: 0 4px 16px var(--accent-glow);
  transform: translateY(-1px);
}
.gx-btn-s {
  color: var(--ink);
  background: var(--bg-elevated);
  border-color: var(--border);
}
.gx-btn-s:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--bg-soft);
}
.gx-btn-icon {
  width: 32px; height: 32px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: var(--ink-soft);
  padding: 0;
  transition: border-color 150ms var(--ease-out), color 150ms var(--ease-out), transform 120ms var(--ease-micro);
}
.gx-btn-icon:hover { border-color: var(--accent); color: var(--accent); }
.gx-btn-icon:active { transform: scale(0.9); }

/* ══════════════════════════════════════════════════════
   TRIAL BANNER
══════════════════════════════════════════════════════ */
.gx-trial {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: var(--accent-dim);
  border: 1px solid rgba(196,96,42,0.12);
  border-radius: var(--radius);
  margin-top: 20px;
}
.gx-trial-icon {
  width: 28px; height: 28px;
  border-radius: 50%;
  background: rgba(196,96,42,0.12);
  display: flex; align-items: center; justify-content: center;
  color: var(--accent);
  flex-shrink: 0;
}
.gx-trial-body { flex:1; }
.gx-trial-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--accent);
}
.gx-trial-text {
  font-size: 0.6875rem;
  color: var(--ink-soft);
  margin-top: 1px;
}
.gx-trial .gx-btn {
  font-size: 0.6875rem;
  padding: 5px 12px;
}

/* ══════════════════════════════════════════════════════
   METRICS STRIP V2
══════════════════════════════════════════════════════ */
.gx-metrics {
  display: flex;
  gap: 0;
  margin-top: 20px;
  padding: 14px 0;
  border-bottom: 1px solid var(--border);
}
.gx-m {
  display: flex; align-items: baseline; gap: 6px;
  padding: 0 20px;
  position: relative;
}
.gx-m:first-child { padding-left: 0; }
.gx-m:not(:first-child)::before {
  content:''; position:absolute; left:0; top:2px; bottom:2px; width:1px;
  background: var(--border);
}
.gx-mv {
  font-family: var(--font-mono);
  font-size: 1.25rem;
  font-weight: 500;
  color: var(--ink);
  font-feature-settings: "tnum";
  letter-spacing: -0.02em;
}
.gx-mv-a { color: var(--accent); }
.gx-mv-r { color: var(--state-alert); }
.gx-mf {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--ink-faint);
  font-feature-settings: "tnum";
}
.gx-ml {
  font-size: 0.6875rem;
  color: var(--ink-faint);
}

/* ══════════════════════════════════════════════════════
   MAIN GRID
══════════════════════════════════════════════════════ */
.gx-grid {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 28px;
  margin-top: 24px;
  align-items: start;
}

/* ── Section titles ───────────────────────────────── */
.gx-sh {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 14px;
}
.gx-st {
  font-family: var(--font-display);
  font-size: 0.875rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--ink);
}
.gx-sc {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  font-weight: 500;
  color: var(--ink-faint);
  background: var(--bg-soft);
  border-radius: 100px;
  padding: 2px 8px;
  font-feature-settings: "tnum";
}

/* ══════════════════════════════════════════════════════
   TIMELINE V2
══════════════════════════════════════════════════════ */
.gx-tl {}
.gx-tl-slot {
  display: grid;
  grid-template-columns: 48px 1fr;
  gap: 14px;
  padding: 10px 8px;
  border-radius: var(--radius-sm);
  transition: background 150ms var(--ease-out);
  cursor: default;
  position: relative;
}
.gx-tl-slot:not(.gx-tl-free):hover {
  background: var(--bg-soft);
  cursor: pointer;
}
.gx-tl-slot:not(:last-child) {
  border-bottom: 1px solid var(--border-subtle);
}
.gx-tl-time {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--ink-faint);
  padding-top: 4px;
  font-feature-settings: "tnum";
  text-align: right;
}
.gx-tl-body {
  display: flex; align-items: center; gap: 10px;
  min-height: 32px;
}
/* Avatar initials */
.gx-av {
  width: 30px; height: 30px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-display);
  font-size: 0.625rem;
  font-weight: 700;
  flex-shrink: 0;
  letter-spacing: 0.02em;
}
.gx-av-done { background: var(--state-ok-bg); color: var(--state-ok); }
.gx-av-active { background: var(--accent-dim); color: var(--accent); box-shadow: 0 0 0 2px var(--accent-glow); }
.gx-av-up { background: var(--bg-soft); color: var(--ink-faint); border: 1px solid var(--border); }
.gx-av-free { background: transparent; border: 1.5px dashed var(--border); color: var(--ink-faint); }

.gx-tl-info { flex:1; min-width:0; }
.gx-tl-name {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--ink);
  line-height: 1.3;
}
.gx-tl-name-done { color: var(--ink-soft); }
.gx-tl-reason {
  font-size: 0.6875rem;
  color: var(--ink-faint);
  margin-top: 1px;
}
.gx-tl-tag {
  font-family: var(--font-mono);
  font-size: 0.5625rem;
  font-weight: 500;
  letter-spacing: 0.03em;
  padding: 2px 7px;
  border-radius: 100px;
  flex-shrink: 0;
  text-transform: uppercase;
}
.gx-tag-ctrl { color: var(--state-ok); background: var(--state-ok-bg); }
.gx-tag-1st { color: var(--accent); background: var(--accent-dim); }
.gx-tag-fu { color: var(--state-warn); background: var(--state-warn-bg); }

/* ── Active slot highlight ────────────────────────── */
.gx-tl-active {
  background: var(--accent-dim);
  border-left: 2px solid var(--accent);
  margin-left: -2px;
}

/* ── NOW indicator ────────────────────────────────── */
.gx-now {
  display: flex; align-items: center;
  padding: 4px 0;
}
.gx-now-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
  margin-left: 58px;
}
@keyframes gx-pulse {
  0%,100% { box-shadow: 0 0 0 0 var(--accent-glow); }
  50% { box-shadow: 0 0 0 5px transparent; }
}
.gx-now-dot { animation: gx-pulse 3s var(--ease-in-out) infinite; }
.gx-now-line {
  flex:1; height:1px;
  background: linear-gradient(to right, var(--accent), transparent 80%);
}
.gx-now-lbl {
  font-family: var(--font-mono);
  font-size: 0.5625rem;
  font-weight: 500;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  margin-left: 8px;
  flex-shrink: 0;
}

/* ── Free slot ────────────────────────────────────── */
.gx-tl-free .gx-tl-name {
  color: var(--ink-faint);
  font-weight: 400;
  font-style: italic;
  font-size: 0.75rem;
}

/* ══════════════════════════════════════════════════════
   SIDEBAR
══════════════════════════════════════════════════════ */
.gx-side { display: flex; flex-direction: column; gap: 24px; }

/* ── Activity ─────────────────────────────────────── */
.gx-act-item {
  display: grid;
  grid-template-columns: 44px 1fr;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-subtle);
}
.gx-act-item:last-child { border-bottom: none; }
.gx-act-time {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  color: var(--ink-faint);
  padding-top: 2px;
  text-align: right;
  font-feature-settings: "tnum";
  white-space: nowrap;
}
.gx-act-text {
  font-size: 0.75rem;
  color: var(--ink);
  line-height: 1.4;
}
.gx-act-text strong { font-weight: 600; }
.gx-act-sub {
  font-size: 0.625rem;
  color: var(--ink-faint);
  margin-top: 1px;
}

/* ── Follow-ups ───────────────────────────────────── */
.gx-fu-tabs {
  display: flex; gap: 2px;
  background: var(--bg-soft);
  border-radius: var(--radius-sm);
  padding: 2px;
  margin-bottom: 12px;
}
.gx-fu-tab {
  flex:1;
  font-family: var(--font-ui);
  font-size: 0.625rem;
  font-weight: 600;
  text-align: center;
  padding: 5px 6px;
  border-radius: calc(var(--radius-sm) - 2px);
  border: none;
  background: transparent;
  color: var(--ink-faint);
  cursor: pointer;
  transition: background 150ms var(--ease-out), color 150ms var(--ease-out);
}
.gx-fu-tab:hover { color: var(--ink-soft); }
.gx-fu-tab-on {
  background: var(--bg-elevated);
  color: var(--ink);
  box-shadow: var(--shadow-sm);
}
.gx-fu-tab:active { transform: scale(0.97); }
.gx-fu-tab .gx-tc {
  font-family: var(--font-mono);
  font-size: 0.5625rem;
  margin-left: 3px;
}
.gx-fu-item {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 8px 10px;
  border-radius: var(--radius-xs);
  transition: background 150ms var(--ease-out);
  cursor: pointer;
}
.gx-fu-item:hover { background: var(--bg-soft); }
.gx-fu-item:active { transform: scale(0.99); }
.gx-fu-pip {
  width: 5px; height: 5px;
  border-radius: 50%;
  margin-top: 6px;
  flex-shrink: 0;
}
.gx-pip-r { background: var(--state-alert); }
.gx-pip-w { background: var(--state-warn); }
.gx-pip-g { background: var(--state-ok); }
.gx-fu-info { flex:1; min-width:0; }
.gx-fu-name { font-size: 0.75rem; font-weight: 500; color: var(--ink); }
.gx-fu-dx { font-size: 0.625rem; color: var(--ink-faint); margin-top:1px; }
.gx-fu-date {
  font-family: var(--font-mono);
  font-size: 0.5625rem; font-weight: 500;
  color: var(--ink-faint);
  flex-shrink: 0; padding-top: 3px;
  font-feature-settings: "tnum";
}
.gx-fu-date-r { color: var(--state-alert); }
.gx-fu-date-w { color: var(--state-warn); }

/* ══════════════════════════════════════════════════════
   OVERDUE BANNER
══════════════════════════════════════════════════════ */
.gx-overdue {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px;
  background: var(--state-alert-bg);
  border: 1px solid rgba(185,28,28,0.12);
  border-radius: var(--radius);
  margin-top: 20px;
}
.gx-overdue-ico {
  width: 28px; height: 28px;
  border-radius: 50%;
  background: rgba(185,28,28,0.10);
  display:flex; align-items:center; justify-content:center;
  color: var(--state-alert);
  flex-shrink: 0;
}
.gx-overdue-body { flex:1; }
.gx-overdue-t { font-size: 0.75rem; font-weight: 600; color: var(--state-alert); }
.gx-overdue-d { font-size: 0.625rem; color: var(--ink-soft); margin-top:1px; }
.gx-overdue .gx-btn {
  font-size: 0.625rem; padding: 5px 12px;
  background: var(--state-alert); color:#FFF;
  border: none;
}
.gx-overdue .gx-btn:hover { background: #9B1818; }

/* ══════════════════════════════════════════════════════
   WEEKLY STRIP
══════════════════════════════════════════════════════ */
.gx-week {
  margin-top: 24px;
  padding: 18px 0 0;
  border-top: 1px solid var(--border);
}
.gx-week-hdr { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
.gx-week-chart {
  display: grid;
  grid-template-columns: repeat(7,1fr);
  gap: 4px;
  height: 72px;
  align-items: end;
}
.gx-week-day {
  display:flex; flex-direction:column; align-items:center; gap:4px;
  height:100%; justify-content:flex-end;
}
.gx-week-bar-wrap { flex:1; width:100%; display:flex; align-items:flex-end; justify-content:center; }
.gx-week-bar {
  width:100%; max-width:36px;
  border-radius: var(--radius-xs) var(--radius-xs) 0 0;
  background: var(--accent-dim);
  min-height:2px;
  transition: background 180ms var(--ease-out);
}
.gx-week-bar-on { background: var(--accent); }
.gx-week-bar-today { background: var(--accent); box-shadow: 0 -2px 8px var(--accent-glow); }
.gx-week-day:hover .gx-week-bar { background: var(--accent-glow); }
.gx-week-day:hover .gx-week-bar-on,
.gx-week-day:hover .gx-week-bar-today { background: var(--accent-hover); }
.gx-week-lbl {
  font-family: var(--font-ui); font-size:0.5625rem; font-weight:600;
  color: var(--ink-faint); text-transform:uppercase; letter-spacing:0.06em;
}
.gx-week-lbl-today { color: var(--accent); }
.gx-week-val {
  font-family: var(--font-mono); font-size:0.5625rem;
  color: var(--ink-faint); font-feature-settings:"tnum";
}
.gx-week-total {
  font-family: var(--font-mono); font-size:0.75rem; font-weight:500;
  color: var(--ink-soft); font-feature-settings:"tnum";
}

/* ══════════════════════════════════════════════════════
   RESPONSIVE
══════════════════════════════════════════════════════ */
@media (max-width:1024px) {
  .gx-dash-inner { padding:24px 24px 40px; }
  .gx-grid { grid-template-columns:1fr; }
  .gx-side { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
}
@media (max-width:768px) {
  .gx-dash-inner { padding:16px 16px 32px; }
  .gx-header { flex-direction:column; align-items:flex-start; gap:12px; }
  .gx-header-right { width:100%; }
  .gx-btn { flex:1; text-align:center; }
  .gx-metrics { flex-wrap:wrap; gap:10px; }
  .gx-m { padding:0; }
  .gx-m:not(:first-child)::before { display:none; }
  .gx-side { grid-template-columns:1fr; }
}

@media (prefers-reduced-motion:reduce) {
  .gx-s { animation:none!important; opacity:1!important; }
  .gx-now-dot { animation:none!important; box-shadow:0 0 0 3px var(--accent-glow)!important; }
  * { transition-duration:0.01ms!important; }
}
`;

/* ─── Data ─────────────────────────────────────────── */

const APPTS = [
  { id:1, t:"08:00", name:"María F. López R.", reason:"Control hipertensión arterial", code:"I10", type:"ctrl", s:"done" },
  { id:2, t:"08:30", name:"Carlos A. Ruiz O.", reason:"Seguimiento diabetes mellitus tipo 2", code:"E11", type:"fu", s:"done" },
  { id:3, t:"09:15", name:"Ana M. Martínez H.", reason:"Primera consulta — cefalea crónica", code:null, type:"1st", s:"active" },
  { id:4, t:"10:00", name:"José L. Pérez A.", reason:"Control prenatal — 28 semanas", code:"Z34", type:"ctrl", s:"up" },
  { id:5, t:"10:45", name:"Valentina Torres C.", reason:"Infección respiratoria aguda", code:"J06", type:"1st", s:"up" },
  { id:6, t:"11:30", name:null, reason:null, code:null, type:"free", s:"free" },
  { id:7, t:"14:00", name:"Diego F. Ramírez", reason:"Dolor lumbar crónico", code:"M54", type:"fu", s:"up" },
  { id:8, t:"14:45", name:"Luisa F. Ochoa", reason:"Revisión de laboratorios", code:null, type:"ctrl", s:"up" },
];

const ACTIVITY = [
  { id:1, t:"35m", text:"Consulta registrada", sub:"María F. López — HTA controlada" },
  { id:2, t:"2h", text:"Nuevo paciente", sub:"José L. Pérez Arango" },
  { id:3, t:"3h", text:"Consulta registrada", sub:"Carlos A. Ruiz — Ajuste metformina" },
  { id:4, t:"ayer", text:"Dx actualizado", sub:"Laura P. Sánchez — E78.0" },
  { id:5, t:"ayer", text:"Consulta registrada", sub:"Ricardo A. Díaz — Dislipidemia" },
];

const FU = {
  overdue:[
    { id:1, name:"Luis F. Gómez", dx:"I10 — Hipertensión", date:"24 may", days:3 },
    { id:2, name:"Sandra M. Vargas", dx:"E11 — Diabetes tipo 2", date:"22 may", days:5 },
  ],
  urgent:[
    { id:3, name:"Patricia E. Mejía", dx:"E03 — Hipotiroidismo", date:"28 may", lbl:"mañana" },
    { id:4, name:"Jorge I. Castillo", dx:"I10 — Hipertensión", date:"29 may", lbl:"2 días" },
  ],
  upcoming:[
    { id:5, name:"Ricardo A. Díaz", dx:"E78 — Dislipidemia", date:"2 jun", lbl:"6 días" },
    { id:6, name:"Camila A. Herrera", dx:"J45 — Asma", date:"5 jun", lbl:"9 días" },
  ],
};

const WEEK = [
  { d:"Lun", v:6, today:false },
  { d:"Mar", v:3, today:true },
  { d:"Mié", v:0, today:false },
  { d:"Jue", v:0, today:false },
  { d:"Vie", v:0, today:false },
  { d:"Sáb", v:0, today:false },
  { d:"Dom", v:0, today:false },
];

/* ─── Helpers ──────────────────────────────────────── */
function initials(name) {
  if (!name) return "—";
  return name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
}
function avClass(s) {
  return s === "done" ? "gx-av-done" : s === "active" ? "gx-av-active" : s === "free" ? "gx-av-free" : "gx-av-up";
}
function tagClass(t) { return t==="ctrl"?"gx-tag-ctrl":t==="1st"?"gx-tag-1st":t==="fu"?"gx-tag-fu":""; }
function tagLabel(t) { return t==="ctrl"?"Control":t==="1st"?"1ra vez":t==="fu"?"Seguim.":""; }

function Ico({d}) { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>; }

export default function DashboardV2() {
  const [theme, setTheme] = useState("light");
  const [fuTab, setFuTab] = useState("overdue");
  const today = useMemo(() => new Date().toLocaleDateString("es-CO",{ weekday:"long", day:"numeric", month:"long" }), []);
  const wMax = Math.max(1,...WEEK.map(d=>d.v));
  const wTotal = WEEK.reduce((s,d)=>s+d.v,0);
  const fuItems = fuTab==="overdue"?FU.overdue:fuTab==="urgent"?FU.urgent:FU.upcoming;

  return (
    <>
      <style>{STYLES}</style>
      <div className="gx-dash" data-theme={theme}>
        <div className="gx-dash-inner">

          {/* Command bar */}
          <div className="gx-cmd gx-s gx-s1">
            <span className="gx-cmd-icon"><Ico d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></span>
            <input type="text" placeholder="Buscar paciente, diagnóstico o CIE-10..." />
            <span className="gx-cmd-shortcut">⌘K</span>
          </div>

          {/* Header */}
          <header className="gx-header gx-s gx-s1">
            <div className="gx-header-left">
              <h1 className="gx-greeting">Buenos días, <span className="gx-name">Alejandro</span></h1>
              <div className="gx-header-sep" />
              <span className="gx-header-meta">Medicina General · {today}</span>
            </div>
            <div className="gx-header-right">
              <button className="gx-btn gx-btn-p">Nueva consulta</button>
              <button className="gx-btn gx-btn-s">Mi Agenda</button>
              <button className="gx-btn-icon" onClick={()=>setTheme(t=>t==="light"?"dark":"light")}
                aria-label={theme==="light"?"Modo oscuro":"Modo claro"}>
                {theme==="light"
                  ? <Ico d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
                  : <Ico d="M12 3v1m0 16v1m-7.07-2.93l.71.71M4.22 4.22l.71.71M3 12h1m16 0h1m-2.93 7.07l-.71-.71M19.78 4.22l-.71.71M12 7a5 5 0 100 10 5 5 0 000-10z"/>}
              </button>
            </div>
          </header>

          {/* Trial */}
          <div className="gx-trial gx-s gx-s2">
            <div className="gx-trial-icon"><Ico d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></div>
            <div className="gx-trial-body">
              <div className="gx-trial-title">Prueba gratuita — 12 días restantes</div>
              <div className="gx-trial-text">Motor clínico completo. Activa tu suscripción para acceso permanente.</div>
            </div>
            <button className="gx-btn gx-btn-p">Activar cuenta</button>
          </div>

          {/* Metrics */}
          <div className="gx-metrics gx-s gx-s2">
            <div className="gx-m"><span className="gx-mv gx-mv-a">3</span><span className="gx-mf">/8</span><span className="gx-ml">consultas hoy</span></div>
            <div className="gx-m"><span className="gx-mv">847</span><span className="gx-ml">pacientes</span></div>
            <div className="gx-m"><span className="gx-mv">6</span><span className="gx-ml">seguimientos</span></div>
            <div className="gx-m"><span className="gx-mv gx-mv-r">2</span><span className="gx-ml">vencidos</span></div>
          </div>

          {/* Overdue */}
          <div className="gx-overdue gx-s gx-s3">
            <div className="gx-overdue-ico"><Ico d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></div>
            <div className="gx-overdue-body">
              <div className="gx-overdue-t">2 seguimientos vencidos</div>
              <div className="gx-overdue-d">Luis F. Gómez, Sandra M. Vargas</div>
            </div>
            <button className="gx-btn">Ver pacientes</button>
          </div>

          {/* Main grid */}
          <div className="gx-grid gx-s gx-s4">
            {/* Timeline */}
            <section>
              <div className="gx-sh">
                <h2 className="gx-st">Agenda del día</h2>
                <span className="gx-sc">3 de 8 completadas</span>
              </div>
              <div className="gx-tl">
                {APPTS.map((a,i) => (
                  <React.Fragment key={a.id}>
                    {i===3 && (
                      <div className="gx-now">
                        <div className="gx-now-dot"/><div className="gx-now-line"/>
                        <span className="gx-now-lbl">ahora · 9:42</span>
                      </div>
                    )}
                    <div className={`gx-tl-slot${a.s==="free"?" gx-tl-free":""}${a.s==="active"?" gx-tl-active":""}`}>
                      <span className="gx-tl-time">{a.t}</span>
                      <div className="gx-tl-body">
                        <div className={`gx-av ${avClass(a.s)}`}>{initials(a.name)}</div>
                        <div className="gx-tl-info">
                          <div className={`gx-tl-name${a.s==="done"?" gx-tl-name-done":""}`}>{a.name||"Disponible"}</div>
                          {a.reason && <div className="gx-tl-reason">{a.reason}{a.code && <span style={{fontFamily:"var(--font-mono)",marginLeft:5,opacity:.7}}>({a.code})</span>}</div>}
                        </div>
                        {a.type!=="free" && <span className={`gx-tl-tag ${tagClass(a.type)}`}>{tagLabel(a.type)}</span>}
                      </div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </section>

            {/* Sidebar */}
            <aside className="gx-side">
              <section>
                <div className="gx-sh"><h2 className="gx-st">Actividad reciente</h2></div>
                {ACTIVITY.map(a=>(
                  <div className="gx-act-item" key={a.id}>
                    <span className="gx-act-time">{a.t}</span>
                    <div><div className="gx-act-text"><strong>{a.text}</strong></div><div className="gx-act-sub">{a.sub}</div></div>
                  </div>
                ))}
              </section>
              <section>
                <div className="gx-sh"><h2 className="gx-st">Seguimientos</h2></div>
                <div className="gx-fu-tabs">
                  {["overdue","urgent","upcoming"].map(k=>(
                    <button key={k} className={`gx-fu-tab${fuTab===k?" gx-fu-tab-on":""}`} onClick={()=>setFuTab(k)}>
                      {k==="overdue"?"Vencidos":k==="urgent"?"Próximos":"Futuros"}
                      <span className="gx-tc">{FU[k].length}</span>
                    </button>
                  ))}
                </div>
                {fuItems.map(f=>(
                  <div className="gx-fu-item" key={f.id}>
                    <div className={`gx-fu-pip ${fuTab==="overdue"?"gx-pip-r":fuTab==="urgent"?"gx-pip-w":"gx-pip-g"}`}/>
                    <div className="gx-fu-info"><div className="gx-fu-name">{f.name}</div><div className="gx-fu-dx">{f.dx}</div></div>
                    <span className={`gx-fu-date ${fuTab==="overdue"?"gx-fu-date-r":fuTab==="urgent"?"gx-fu-date-w":""}`}>
                      {f.days?`hace ${f.days}d`:f.lbl||f.date}
                    </span>
                  </div>
                ))}
              </section>
            </aside>
          </div>

          {/* Weekly */}
          <div className="gx-week gx-s gx-s5">
            <div className="gx-week-hdr"><h2 className="gx-st">Esta semana</h2><span className="gx-week-total">{wTotal} consultas</span></div>
            <div className="gx-week-chart">
              {WEEK.map(d=>(
                <div className="gx-week-day" key={d.d}>
                  <span className="gx-week-val">{d.v>0?d.v:""}</span>
                  <div className="gx-week-bar-wrap">
                    <div className={`gx-week-bar${d.today?" gx-week-bar-today":d.v>0?" gx-week-bar-on":""}`}
                      style={{height:`${d.v>0?(d.v/wMax)*100:3}%`}}/>
                  </div>
                  <span className={`gx-week-lbl${d.today?" gx-week-lbl-today":""}`}>{d.d}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
