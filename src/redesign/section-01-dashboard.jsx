/**
 * ═══════════════════════════════════════════════════════════════
 *  GLYPHIX — Sección 1: Dashboard / Inicio
 *  Ferric Meridian v3.0 — Redesign Prototype
 *
 *  Dirección estética: Panel de instrumentos clínico
 *  Elemento memorable: Indicador temporal NOW + métricas monoespaciadas
 *  Referencia de craft: Linear · Things 3 · Stripe Dashboard
 *  Tipografía: Satoshi (display) · Outfit (UI) · JetBrains Mono (datos)
 *  Paleta: Restrained — neutrales cálidas + cobre oxidado #C4602A
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo } from "react";

/* ─── Design Tokens (CSS) ──────────────────────────────────── */

const STYLES = `
@import url('https://api.fontshare.com/v2/css?f[]=satoshi@400,500,600,700,900&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');

/* ── Tokens ─────────────────────────────────────────── */
.gx-dashboard {
  --bg:             #FAFAF8;
  --bg-elevated:    #FFFFFF;
  --bg-soft:        #F0F0EC;
  --bg-hover:       #E8E8E3;
  --ink:            #1A1A18;
  --ink-soft:       #6B6B63;
  --ink-faint:      #A3A39B;
  --border:         #E2E2DC;
  --border-subtle:  #ECECEA;
  --accent:         #C4602A;
  --accent-hover:   #A84F22;
  --accent-dim:     rgba(196, 96, 42, 0.08);
  --accent-glow:    rgba(196, 96, 42, 0.18);
  --state-ok:       #16803C;
  --state-ok-bg:    rgba(22, 128, 60, 0.08);
  --state-warn:     #B45309;
  --state-warn-bg:  rgba(180, 83, 9, 0.08);
  --state-alert:    #B91C1C;
  --state-alert-bg: rgba(185, 28, 28, 0.07);
  --shadow-sm:      0 1px 3px rgba(26, 26, 24, 0.04);
  --shadow:         0 4px 16px rgba(26, 26, 24, 0.06), 0 1px 3px rgba(26, 26, 24, 0.04);
  --shadow-lg:      0 20px 48px rgba(26, 26, 24, 0.08), 0 4px 12px rgba(26, 26, 24, 0.04);
  --radius-xs:      4px;
  --radius-sm:      6px;
  --radius:         10px;
  --radius-lg:      14px;
  --radius-xl:      20px;
  --font-display:   'Satoshi', system-ui, sans-serif;
  --font-ui:        'Outfit', system-ui, sans-serif;
  --font-mono:      'JetBrains Mono', 'Consolas', monospace;
  --ease-out:       cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out:    cubic-bezier(0.77, 0, 0.175, 1);
  --ease-micro:     cubic-bezier(0.16, 1, 0.3, 1);

  font-family: var(--font-ui);
  color: var(--ink);
  background: var(--bg);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ── Dark mode ──────────────────────────────────────── */
.gx-dashboard[data-theme="dark"] {
  --bg:             #0C0C0A;
  --bg-elevated:    #151513;
  --bg-soft:        #1C1C1A;
  --bg-hover:       #252522;
  --ink:            #F5F5F0;
  --ink-soft:       #A3A39B;
  --ink-faint:      #5C5C56;
  --border:         #2A2A26;
  --border-subtle:  #222220;
  --accent:         #D4763A;
  --accent-hover:   #E08844;
  --accent-dim:     rgba(212, 118, 58, 0.12);
  --accent-glow:    rgba(212, 118, 58, 0.22);
  --state-ok-bg:    rgba(22, 128, 60, 0.12);
  --state-warn-bg:  rgba(180, 83, 9, 0.12);
  --state-alert-bg: rgba(185, 28, 28, 0.10);
  --shadow-sm:      0 1px 3px rgba(0, 0, 0, 0.35);
  --shadow:         0 4px 20px rgba(0, 0, 0, 0.45);
  --shadow-lg:      0 20px 48px rgba(0, 0, 0, 0.55);
}

/* ── Base layout ────────────────────────────────────── */
.gx-dashboard {
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px 40px 48px;
  min-height: 100dvh;
}

/* ── Stagger entrance ───────────────────────────────── */
@keyframes gx-fade-up {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.gx-stagger {
  opacity: 0;
  animation: gx-fade-up 320ms var(--ease-micro) forwards;
}

.gx-stagger-1 { animation-delay: 0ms; }
.gx-stagger-2 { animation-delay: 40ms; }
.gx-stagger-3 { animation-delay: 80ms; }
.gx-stagger-4 { animation-delay: 120ms; }
.gx-stagger-5 { animation-delay: 160ms; }
.gx-stagger-6 { animation-delay: 200ms; }

/* ══════════════════════════════════════════════════════
   HEADER
══════════════════════════════════════════════════════ */
.gx-dash-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding-bottom: 28px;
  border-bottom: 1px solid var(--border);
}

.gx-dash-kicker {
  display: inline-block;
  font-family: var(--font-ui);
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--accent);
  margin-bottom: 6px;
}

.gx-dash-greeting {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.035em;
  line-height: 1.15;
  color: var(--ink);
  margin: 0;
}

.gx-dash-greeting .gx-name {
  color: var(--accent);
}

.gx-dash-subtitle {
  font-size: 0.8125rem;
  color: var(--ink-soft);
  margin-top: 4px;
  letter-spacing: 0.005em;
}

.gx-dash-header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
  flex-shrink: 0;
}

.gx-dash-date {
  font-family: var(--font-ui);
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--ink-soft);
  text-transform: capitalize;
}

.gx-dash-actions {
  display: flex;
  gap: 8px;
}

/* ── Buttons ────────────────────────────────────────── */
.gx-btn-primary {
  font-family: var(--font-ui);
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: #FFFFFF;
  background: var(--accent);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  padding: 9px 20px;
  cursor: pointer;
  transition: background 180ms var(--ease-out),
              transform 120ms var(--ease-micro),
              box-shadow 180ms var(--ease-out);
  user-select: none;
}

.gx-btn-primary:hover {
  background: var(--accent-hover);
  box-shadow: 0 4px 16px var(--accent-glow);
  transform: translateY(-1px);
}

.gx-btn-primary:active {
  transform: scale(0.97) translateY(0);
  box-shadow: none;
}

.gx-btn-secondary {
  font-family: var(--font-ui);
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--ink);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 9px 20px;
  cursor: pointer;
  transition: background 180ms var(--ease-out),
              border-color 180ms var(--ease-out),
              color 180ms var(--ease-out),
              transform 120ms var(--ease-micro);
  user-select: none;
}

.gx-btn-secondary:hover {
  background: var(--bg-soft);
  border-color: var(--accent);
  color: var(--accent);
}

.gx-btn-secondary:active {
  transform: scale(0.97);
}

/* ══════════════════════════════════════════════════════
   METRICS STRIP
══════════════════════════════════════════════════════ */
.gx-metrics-strip {
  display: flex;
  align-items: stretch;
  gap: 0;
  margin-top: 24px;
  padding: 16px 0;
  border-bottom: 1px solid var(--border);
}

.gx-metric {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 0 24px;
  position: relative;
}

.gx-metric:first-child {
  padding-left: 0;
}

.gx-metric:not(:first-child)::before {
  content: '';
  position: absolute;
  left: 0;
  top: 2px;
  bottom: 2px;
  width: 1px;
  background: var(--border);
}

.gx-metric-value {
  font-family: var(--font-mono);
  font-size: 1.375rem;
  font-weight: 500;
  letter-spacing: -0.02em;
  color: var(--ink);
  font-feature-settings: "tnum";
}

.gx-metric-value-accent {
  color: var(--accent);
}

.gx-metric-value-alert {
  color: var(--state-alert);
}

.gx-metric-label {
  font-size: 0.75rem;
  color: var(--ink-faint);
  letter-spacing: 0.01em;
}

.gx-metric-fraction {
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  color: var(--ink-faint);
  font-feature-settings: "tnum";
}

/* ══════════════════════════════════════════════════════
   MAIN GRID
══════════════════════════════════════════════════════ */
.gx-dash-grid {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 32px;
  margin-top: 28px;
  align-items: start;
}

/* ── Section headers ────────────────────────────────── */
.gx-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.gx-section-title {
  font-family: var(--font-display);
  font-size: 0.9375rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--ink);
}

.gx-section-count {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--ink-faint);
  background: var(--bg-soft);
  border-radius: 100px;
  padding: 2px 10px;
  font-feature-settings: "tnum";
}

/* ══════════════════════════════════════════════════════
   AGENDA TIMELINE
══════════════════════════════════════════════════════ */
.gx-timeline {
  position: relative;
}

.gx-timeline-slot {
  display: grid;
  grid-template-columns: 56px 1fr;
  gap: 16px;
  align-items: start;
  padding: 12px 0;
  position: relative;
  border-radius: var(--radius);
  transition: background 150ms var(--ease-out);
  cursor: default;
}

.gx-timeline-slot:not(.gx-slot-empty):hover {
  background: var(--bg-soft);
  cursor: pointer;
}

.gx-timeline-slot:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 70px;
  bottom: 0;
  right: 16px;
  height: 1px;
  background: var(--border-subtle);
}

.gx-slot-time {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--ink-faint);
  padding-top: 2px;
  font-feature-settings: "tnum";
  text-align: right;
}

.gx-slot-content {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 36px;
}

.gx-slot-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  transition: transform 180ms var(--ease-out);
}

.gx-timeline-slot:hover .gx-slot-indicator {
  transform: scale(1.25);
}

.gx-slot-indicator-done {
  background: var(--state-ok);
}

.gx-slot-indicator-active {
  background: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-dim);
}

.gx-slot-indicator-upcoming {
  background: transparent;
  border: 1.5px solid var(--border);
}

.gx-slot-indicator-free {
  background: transparent;
  border: 1.5px dashed var(--border);
}

.gx-slot-info {
  flex: 1;
  min-width: 0;
}

.gx-slot-patient {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--ink);
  line-height: 1.3;
}

.gx-slot-patient-done {
  color: var(--ink-soft);
}

.gx-slot-reason {
  font-size: 0.75rem;
  color: var(--ink-faint);
  margin-top: 1px;
  line-height: 1.4;
}

.gx-slot-tag {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  padding: 2px 8px;
  border-radius: 100px;
  flex-shrink: 0;
}

.gx-tag-control {
  color: var(--state-ok);
  background: var(--state-ok-bg);
}

.gx-tag-first {
  color: var(--accent);
  background: var(--accent-dim);
}

.gx-tag-followup {
  color: var(--state-warn);
  background: var(--state-warn-bg);
}

/* ── NOW indicator ──────────────────────────────────── */
.gx-now-indicator {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0;
  padding: 6px 0;
  margin: 0;
}

.gx-now-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
  position: relative;
  z-index: 2;
  margin-left: 68px;
}

@keyframes gx-now-pulse {
  0%, 100% { box-shadow: 0 0 0 0px var(--accent-glow); }
  50%      { box-shadow: 0 0 0 6px transparent; }
}

.gx-now-dot {
  animation: gx-now-pulse 3s var(--ease-in-out) infinite;
}

.gx-now-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, var(--accent), transparent 85%);
}

.gx-now-label {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  font-weight: 500;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  margin-left: 10px;
  flex-shrink: 0;
  padding-right: 4px;
}

/* ── Empty slot ─────────────────────────────────────── */
.gx-slot-empty .gx-slot-patient {
  color: var(--ink-faint);
  font-weight: 400;
  font-style: italic;
  font-size: 0.8125rem;
}

/* ══════════════════════════════════════════════════════
   SIDEBAR
══════════════════════════════════════════════════════ */
.gx-dash-sidebar {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

/* ── Activity Feed ──────────────────────────────────── */
.gx-activity-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.gx-activity-item {
  display: grid;
  grid-template-columns: 52px 1fr;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-subtle);
  transition: background 150ms var(--ease-out);
}

.gx-activity-item:last-child {
  border-bottom: none;
}

.gx-activity-time {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 400;
  color: var(--ink-faint);
  padding-top: 2px;
  text-align: right;
  font-feature-settings: "tnum";
  white-space: nowrap;
}

.gx-activity-body {
  min-width: 0;
}

.gx-activity-text {
  font-size: 0.8125rem;
  color: var(--ink);
  line-height: 1.45;
}

.gx-activity-text strong {
  font-weight: 600;
}

.gx-activity-detail {
  font-size: 0.6875rem;
  color: var(--ink-faint);
  margin-top: 2px;
}

/* ── Follow-up Panel ────────────────────────────────── */
.gx-followup-tabs {
  display: flex;
  gap: 2px;
  margin-bottom: 14px;
  background: var(--bg-soft);
  border-radius: var(--radius-sm);
  padding: 2px;
}

.gx-followup-tab {
  flex: 1;
  font-family: var(--font-ui);
  font-size: 0.6875rem;
  font-weight: 600;
  text-align: center;
  padding: 6px 8px;
  border-radius: calc(var(--radius-sm) - 2px);
  border: none;
  background: transparent;
  color: var(--ink-faint);
  cursor: pointer;
  transition: background 150ms var(--ease-out),
              color 150ms var(--ease-out);
  user-select: none;
}

.gx-followup-tab:hover {
  color: var(--ink-soft);
}

.gx-followup-tab-active {
  background: var(--bg-elevated);
  color: var(--ink);
  box-shadow: var(--shadow-sm);
}

.gx-followup-tab:active {
  transform: scale(0.97);
}

.gx-followup-tab .gx-tab-count {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  margin-left: 4px;
  font-feature-settings: "tnum";
}

.gx-followup-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.gx-followup-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  transition: background 150ms var(--ease-out);
  cursor: pointer;
}

.gx-followup-item:hover {
  background: var(--bg-soft);
}

.gx-followup-item:active {
  transform: scale(0.99);
}

.gx-followup-pip {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-top: 6px;
  flex-shrink: 0;
}

.gx-pip-overdue { background: var(--state-alert); }
.gx-pip-urgent  { background: var(--state-warn); }
.gx-pip-upcoming { background: var(--state-ok); }

.gx-followup-info { flex: 1; min-width: 0; }

.gx-followup-name {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--ink);
  line-height: 1.3;
}

.gx-followup-dx {
  font-size: 0.6875rem;
  color: var(--ink-faint);
  margin-top: 1px;
}

.gx-followup-date {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  font-weight: 500;
  color: var(--ink-faint);
  flex-shrink: 0;
  padding-top: 3px;
  font-feature-settings: "tnum";
}

.gx-followup-date-overdue {
  color: var(--state-alert);
}

.gx-followup-date-urgent {
  color: var(--state-warn);
}

.gx-followup-empty {
  font-size: 0.8125rem;
  color: var(--ink-faint);
  padding: 16px 12px;
  text-align: center;
  font-style: italic;
}

/* ══════════════════════════════════════════════════════
   OVERDUE BANNER
══════════════════════════════════════════════════════ */
.gx-overdue-banner {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  background: var(--state-alert-bg);
  border: 1px solid rgba(185, 28, 28, 0.12);
  border-radius: var(--radius);
  margin-top: 24px;
}

.gx-overdue-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(185, 28, 28, 0.10);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--state-alert);
}

.gx-overdue-text {
  flex: 1;
}

.gx-overdue-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--state-alert);
}

.gx-overdue-detail {
  font-size: 0.6875rem;
  color: var(--ink-soft);
  margin-top: 2px;
}

.gx-overdue-action {
  font-family: var(--font-ui);
  font-size: 0.6875rem;
  font-weight: 600;
  color: #FFFFFF;
  background: var(--state-alert);
  border: none;
  border-radius: var(--radius-xs);
  padding: 6px 14px;
  cursor: pointer;
  transition: background 150ms var(--ease-out), transform 120ms var(--ease-micro);
  flex-shrink: 0;
}

.gx-overdue-action:hover {
  background: #9B1818;
}

.gx-overdue-action:active {
  transform: scale(0.97);
}

/* ══════════════════════════════════════════════════════
   WEEKLY CHART STRIP
══════════════════════════════════════════════════════ */
.gx-weekly-strip {
  margin-top: 28px;
  padding: 20px 0;
  border-top: 1px solid var(--border);
}

.gx-weekly-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.gx-weekly-chart {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  align-items: end;
  height: 80px;
}

.gx-weekly-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  height: 100%;
  justify-content: flex-end;
}

.gx-weekly-bar-container {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.gx-weekly-bar {
  width: 100%;
  max-width: 40px;
  border-radius: var(--radius-xs) var(--radius-xs) 0 0;
  background: var(--accent-dim);
  transition: background 180ms var(--ease-out);
  min-height: 2px;
}

.gx-weekly-bar-active {
  background: var(--accent);
}

.gx-weekly-bar-today {
  background: var(--accent);
  box-shadow: 0 -2px 8px var(--accent-glow);
}

.gx-weekly-day:hover .gx-weekly-bar {
  background: var(--accent-glow);
}

.gx-weekly-day:hover .gx-weekly-bar-active,
.gx-weekly-day:hover .gx-weekly-bar-today {
  background: var(--accent-hover);
}

.gx-weekly-day-label {
  font-family: var(--font-ui);
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--ink-faint);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.gx-weekly-day-label-today {
  color: var(--accent);
}

.gx-weekly-day-value {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  font-weight: 500;
  color: var(--ink-faint);
  font-feature-settings: "tnum";
}

.gx-weekly-total {
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--ink-soft);
  font-feature-settings: "tnum";
}

/* ══════════════════════════════════════════════════════
   THEME TOGGLE
══════════════════════════════════════════════════════ */
.gx-theme-toggle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-soft);
  transition: background 150ms var(--ease-out),
              border-color 150ms var(--ease-out),
              transform 120ms var(--ease-micro);
  flex-shrink: 0;
}

.gx-theme-toggle:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.gx-theme-toggle:active {
  transform: scale(0.93);
}

/* ══════════════════════════════════════════════════════
   RESPONSIVE
══════════════════════════════════════════════════════ */
@media (max-width: 1024px) {
  .gx-dashboard {
    padding: 24px 24px 40px;
  }

  .gx-dash-grid {
    grid-template-columns: 1fr;
    gap: 28px;
  }

  .gx-dash-sidebar {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }
}

@media (max-width: 768px) {
  .gx-dashboard {
    padding: 20px 16px 32px;
  }

  .gx-dash-header {
    flex-direction: column;
    gap: 16px;
  }

  .gx-dash-header-right {
    align-items: flex-start;
    width: 100%;
  }

  .gx-dash-actions {
    width: 100%;
  }

  .gx-btn-primary,
  .gx-btn-secondary {
    flex: 1;
    text-align: center;
    padding: 12px 16px;
  }

  .gx-metrics-strip {
    flex-wrap: wrap;
    gap: 12px;
  }

  .gx-metric {
    padding: 0;
  }

  .gx-metric:not(:first-child)::before {
    display: none;
  }

  .gx-dash-sidebar {
    grid-template-columns: 1fr;
  }

  .gx-weekly-chart {
    height: 60px;
  }
}

/* ══════════════════════════════════════════════════════
   REDUCED MOTION
══════════════════════════════════════════════════════ */
@media (prefers-reduced-motion: reduce) {
  .gx-stagger {
    animation: none !important;
    opacity: 1 !important;
  }

  .gx-now-dot {
    animation: none !important;
    box-shadow: 0 0 0 3px var(--accent-glow) !important;
  }

  .gx-btn-primary:hover,
  .gx-btn-secondary:hover {
    transform: none !important;
  }

  *,
  *::before,
  *::after {
    transition-duration: 0.01ms !important;
  }
}
`;

/* ─── Mock Data ────────────────────────────────────────────── */

const DOCTOR = {
  firstName: "Alejandro",
  fullName: "Dr. Alejandro García Mejía",
  specialty: "Medicina General",
  clinic: "Centro Médico Valle del Cauca",
};

const TODAY_APPOINTMENTS = [
  {
    id: 1,
    time: "08:00",
    patient: "María Fernanda López R.",
    reason: "Control hipertensión arterial",
    code: "I10",
    type: "control",
    status: "done",
  },
  {
    id: 2,
    time: "08:30",
    patient: "Carlos Andrés Ruiz O.",
    reason: "Seguimiento diabetes mellitus tipo 2",
    code: "E11",
    type: "followup",
    status: "done",
  },
  {
    id: 3,
    time: "09:15",
    patient: "Ana María Martínez H.",
    reason: "Primera consulta — cefalea crónica",
    code: null,
    type: "first",
    status: "active",
  },
  // NOW indicator goes here (between 09:15 and 10:00)
  {
    id: 4,
    time: "10:00",
    patient: "José Luis Pérez A.",
    reason: "Control prenatal — 28 semanas",
    code: "Z34",
    type: "control",
    status: "upcoming",
  },
  {
    id: 5,
    time: "10:45",
    patient: "Valentina Torres C.",
    reason: "Infección respiratoria aguda",
    code: "J06",
    type: "first",
    status: "upcoming",
  },
  {
    id: 6,
    time: "11:30",
    patient: null,
    reason: null,
    code: null,
    type: "free",
    status: "free",
  },
  {
    id: 7,
    time: "14:00",
    patient: "Diego Fernando Ramírez",
    reason: "Dolor lumbar crónico",
    code: "M54",
    type: "followup",
    status: "upcoming",
  },
  {
    id: 8,
    time: "14:45",
    patient: "Luisa Fernanda Ochoa",
    reason: "Revisión de laboratorios",
    code: null,
    type: "control",
    status: "upcoming",
  },
];

const METRICS = {
  consultationsToday: 3,
  scheduledToday: 8,
  totalPatients: 847,
  pendingFollowUps: 6,
  overdueFollowUps: 2,
};

const ACTIVITY_FEED = [
  {
    id: 1,
    time: "35 min",
    text: "Consulta registrada",
    detail: "María F. López — Hipertensión controlada",
    type: "consultation",
  },
  {
    id: 2,
    time: "2 h",
    text: "Nuevo paciente registrado",
    detail: "José Luis Pérez Arango",
    type: "patient",
  },
  {
    id: 3,
    time: "3 h",
    text: "Consulta registrada",
    detail: "Carlos A. Ruiz — Ajuste de metformina",
    type: "consultation",
  },
  {
    id: 4,
    time: "ayer",
    text: "Diagnóstico actualizado",
    detail: "Laura P. Sánchez — E78.0 Hipercolesterolemia",
    type: "diagnosis",
  },
  {
    id: 5,
    time: "ayer",
    text: "Consulta registrada",
    detail: "Ricardo A. Díaz — Dislipidemia mixta",
    type: "consultation",
  },
];

const FOLLOW_UPS = {
  overdue: [
    {
      id: 1,
      name: "Luis Fernando Gómez",
      dx: "I10 — Hipertensión esencial",
      date: "24 may",
      daysLate: 3,
    },
    {
      id: 2,
      name: "Sandra Milena Vargas",
      dx: "E11 — Diabetes tipo 2",
      date: "22 may",
      daysLate: 5,
    },
  ],
  urgent: [
    {
      id: 3,
      name: "Patricia Elena Mejía",
      dx: "E03 — Hipotiroidismo",
      date: "28 may",
      label: "mañana",
    },
    {
      id: 4,
      name: "Jorge Iván Castillo",
      dx: "I10 — Hipertensión esencial",
      date: "29 may",
      label: "2 días",
    },
  ],
  upcoming: [
    {
      id: 5,
      name: "Ricardo Alberto Díaz",
      dx: "E78 — Dislipidemia",
      date: "2 jun",
      label: "6 días",
    },
    {
      id: 6,
      name: "Camila Andrea Herrera",
      dx: "J45 — Asma bronquial",
      date: "5 jun",
      label: "9 días",
    },
  ],
};

const WEEKLY_DATA = [
  { day: "Lun", value: 6, isToday: false },
  { day: "Mar", value: 3, isToday: true },
  { day: "Mié", value: 0, isToday: false },
  { day: "Jue", value: 0, isToday: false },
  { day: "Vie", value: 0, isToday: false },
  { day: "Sáb", value: 0, isToday: false },
  { day: "Dom", value: 0, isToday: false },
];

/* ─── Helpers ──────────────────────────────────────────────── */

function getTagClass(type) {
  switch (type) {
    case "control":  return "gx-tag-control";
    case "first":    return "gx-tag-first";
    case "followup": return "gx-tag-followup";
    default:         return "";
  }
}

function getTagLabel(type) {
  switch (type) {
    case "control":  return "Control";
    case "first":    return "Primera vez";
    case "followup": return "Seguimiento";
    default:         return "";
  }
}

function getIndicatorClass(status) {
  switch (status) {
    case "done":     return "gx-slot-indicator-done";
    case "active":   return "gx-slot-indicator-active";
    case "upcoming": return "gx-slot-indicator-upcoming";
    case "free":     return "gx-slot-indicator-free";
    default:         return "gx-slot-indicator-upcoming";
  }
}

/* ─── SVG Icons (inline, minimal) ──────────────────────────── */

function IconSun() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function IconAlert() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════ */

export default function DashboardRedesign() {
  const [theme, setTheme] = useState("light");
  const [followUpFilter, setFollowUpFilter] = useState("overdue");

  const todayLabel = useMemo(() => {
    return new Date().toLocaleDateString("es-CO", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, []);

  const weeklyMax = useMemo(
    () => Math.max(1, ...WEEKLY_DATA.map((d) => d.value)),
    []
  );

  const weeklyTotal = WEEKLY_DATA.reduce((sum, d) => sum + d.value, 0);

  const activeFollowUps =
    followUpFilter === "overdue"
      ? FOLLOW_UPS.overdue
      : followUpFilter === "urgent"
        ? FOLLOW_UPS.urgent
        : FOLLOW_UPS.upcoming;

  const toggleTheme = () =>
    setTheme((t) => (t === "light" ? "dark" : "light"));

  // Inject the NOW indicator after the active appointment (index 2)
  const NOW_POSITION = 3; // after index 2, before index 3

  return (
    <>
      <style>{STYLES}</style>

      <div className="gx-dashboard" data-theme={theme}>
        {/* ── Header ── */}
        <header className="gx-dash-header gx-stagger gx-stagger-1">
          <div>
            <span className="gx-dash-kicker">Sesión activa</span>
            <h1 className="gx-dash-greeting">
              Buenos días, <span className="gx-name">{DOCTOR.firstName}</span>
            </h1>
            <p className="gx-dash-subtitle">
              {DOCTOR.specialty} · {DOCTOR.clinic}
            </p>
          </div>
          <div className="gx-dash-header-right">
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <time className="gx-dash-date">{todayLabel}</time>
              <button
                className="gx-theme-toggle"
                onClick={toggleTheme}
                aria-label={
                  theme === "light"
                    ? "Cambiar a modo oscuro"
                    : "Cambiar a modo claro"
                }
              >
                {theme === "light" ? <IconMoon /> : <IconSun />}
              </button>
            </div>
            <div className="gx-dash-actions">
              <button className="gx-btn-primary">Nueva consulta</button>
              <button className="gx-btn-secondary">Mi Agenda</button>
              <button className="gx-btn-secondary">Ver pacientes</button>
            </div>
          </div>
        </header>

        {/* ── Metrics Strip ── */}
        <div className="gx-metrics-strip gx-stagger gx-stagger-2">
          <div className="gx-metric">
            <span className="gx-metric-value gx-metric-value-accent">
              {METRICS.consultationsToday}
            </span>
            <span className="gx-metric-fraction">
              /{METRICS.scheduledToday}
            </span>
            <span className="gx-metric-label">consultas hoy</span>
          </div>
          <div className="gx-metric">
            <span className="gx-metric-value">{METRICS.totalPatients}</span>
            <span className="gx-metric-label">pacientes</span>
          </div>
          <div className="gx-metric">
            <span className="gx-metric-value">{METRICS.pendingFollowUps}</span>
            <span className="gx-metric-label">seguimientos pendientes</span>
          </div>
          <div className="gx-metric">
            <span className="gx-metric-value gx-metric-value-alert">
              {METRICS.overdueFollowUps}
            </span>
            <span className="gx-metric-label">vencidos</span>
          </div>
        </div>

        {/* ── Overdue Banner ── */}
        {METRICS.overdueFollowUps > 0 && (
          <div className="gx-overdue-banner gx-stagger gx-stagger-3">
            <div className="gx-overdue-icon">
              <IconAlert />
            </div>
            <div className="gx-overdue-text">
              <div className="gx-overdue-title">
                {METRICS.overdueFollowUps} seguimiento
                {METRICS.overdueFollowUps !== 1 ? "s" : ""} vencido
                {METRICS.overdueFollowUps !== 1 ? "s" : ""}
              </div>
              <div className="gx-overdue-detail">
                {FOLLOW_UPS.overdue
                  .slice(0, 2)
                  .map((f) => f.name)
                  .join(", ")}
              </div>
            </div>
            <button className="gx-overdue-action">Ver pacientes</button>
          </div>
        )}

        {/* ── Main Grid ── */}
        <div className="gx-dash-grid gx-stagger gx-stagger-4">
          {/* ── Agenda Timeline ── */}
          <section>
            <div className="gx-section-header">
              <h2 className="gx-section-title">Agenda del día</h2>
              <span className="gx-section-count">
                {METRICS.consultationsToday} de {METRICS.scheduledToday}{" "}
                completadas
              </span>
            </div>

            <div className="gx-timeline">
              {TODAY_APPOINTMENTS.map((slot, index) => (
                <React.Fragment key={slot.id}>
                  {/* NOW indicator (injected between appointments) */}
                  {index === NOW_POSITION && (
                    <div className="gx-now-indicator">
                      <div className="gx-now-dot" />
                      <div className="gx-now-line" />
                      <span className="gx-now-label">ahora</span>
                    </div>
                  )}

                  <div
                    className={`gx-timeline-slot ${
                      slot.status === "free" ? "gx-slot-empty" : ""
                    }`}
                  >
                    <span className="gx-slot-time">{slot.time}</span>
                    <div className="gx-slot-content">
                      <div
                        className={`gx-slot-indicator ${getIndicatorClass(
                          slot.status
                        )}`}
                      />
                      <div className="gx-slot-info">
                        <div
                          className={`gx-slot-patient ${
                            slot.status === "done" ? "gx-slot-patient-done" : ""
                          }`}
                        >
                          {slot.patient || "Disponible"}
                        </div>
                        {slot.reason && (
                          <div className="gx-slot-reason">
                            {slot.reason}
                            {slot.code && (
                              <span
                                style={{
                                  fontFamily: "var(--font-mono)",
                                  marginLeft: "6px",
                                  opacity: 0.7,
                                }}
                              >
                                ({slot.code})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      {slot.type !== "free" && (
                        <span
                          className={`gx-slot-tag ${getTagClass(slot.type)}`}
                        >
                          {getTagLabel(slot.type)}
                        </span>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </section>

          {/* ── Sidebar ── */}
          <aside className="gx-dash-sidebar">
            {/* Activity Feed */}
            <section>
              <div className="gx-section-header">
                <h2 className="gx-section-title">Actividad reciente</h2>
              </div>
              <div className="gx-activity-list">
                {ACTIVITY_FEED.map((item) => (
                  <div className="gx-activity-item" key={item.id}>
                    <span className="gx-activity-time">{item.time}</span>
                    <div className="gx-activity-body">
                      <div className="gx-activity-text">
                        <strong>{item.text}</strong>
                      </div>
                      <div className="gx-activity-detail">{item.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Follow-ups */}
            <section>
              <div className="gx-section-header">
                <h2 className="gx-section-title">Seguimientos</h2>
              </div>

              <div className="gx-followup-tabs">
                <button
                  className={`gx-followup-tab ${
                    followUpFilter === "overdue" ? "gx-followup-tab-active" : ""
                  }`}
                  onClick={() => setFollowUpFilter("overdue")}
                >
                  Vencidos
                  <span className="gx-tab-count">
                    {FOLLOW_UPS.overdue.length}
                  </span>
                </button>
                <button
                  className={`gx-followup-tab ${
                    followUpFilter === "urgent" ? "gx-followup-tab-active" : ""
                  }`}
                  onClick={() => setFollowUpFilter("urgent")}
                >
                  Próximos
                  <span className="gx-tab-count">
                    {FOLLOW_UPS.urgent.length}
                  </span>
                </button>
                <button
                  className={`gx-followup-tab ${
                    followUpFilter === "upcoming"
                      ? "gx-followup-tab-active"
                      : ""
                  }`}
                  onClick={() => setFollowUpFilter("upcoming")}
                >
                  Futuros
                  <span className="gx-tab-count">
                    {FOLLOW_UPS.upcoming.length}
                  </span>
                </button>
              </div>

              <div className="gx-followup-list">
                {activeFollowUps.length === 0 ? (
                  <div className="gx-followup-empty">
                    Sin seguimientos en esta categoría
                  </div>
                ) : (
                  activeFollowUps.map((item) => (
                    <div className="gx-followup-item" key={item.id}>
                      <div
                        className={`gx-followup-pip ${
                          followUpFilter === "overdue"
                            ? "gx-pip-overdue"
                            : followUpFilter === "urgent"
                              ? "gx-pip-urgent"
                              : "gx-pip-upcoming"
                        }`}
                      />
                      <div className="gx-followup-info">
                        <div className="gx-followup-name">{item.name}</div>
                        <div className="gx-followup-dx">{item.dx}</div>
                      </div>
                      <span
                        className={`gx-followup-date ${
                          followUpFilter === "overdue"
                            ? "gx-followup-date-overdue"
                            : followUpFilter === "urgent"
                              ? "gx-followup-date-urgent"
                              : ""
                        }`}
                      >
                        {item.daysLate
                          ? `hace ${item.daysLate}d`
                          : item.label || item.date}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </aside>
        </div>

        {/* ── Weekly Chart Strip ── */}
        <div className="gx-weekly-strip gx-stagger gx-stagger-5">
          <div className="gx-weekly-header">
            <h2 className="gx-section-title">Esta semana</h2>
            <span className="gx-weekly-total">{weeklyTotal} consultas</span>
          </div>
          <div className="gx-weekly-chart">
            {WEEKLY_DATA.map((day) => {
              const heightPercent =
                day.value > 0 ? (day.value / weeklyMax) * 100 : 3;
              return (
                <div className="gx-weekly-day" key={day.day}>
                  <span className="gx-weekly-day-value">
                    {day.value > 0 ? day.value : ""}
                  </span>
                  <div className="gx-weekly-bar-container">
                    <div
                      className={`gx-weekly-bar ${
                        day.isToday
                          ? "gx-weekly-bar-today"
                          : day.value > 0
                            ? "gx-weekly-bar-active"
                            : ""
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                  <span
                    className={`gx-weekly-day-label ${
                      day.isToday ? "gx-weekly-day-label-today" : ""
                    }`}
                  >
                    {day.day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
