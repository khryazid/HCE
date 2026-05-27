"use client";

import React, { useState } from "react";
import DashboardV1 from "@/redesign/section-01-dashboard";
import DashboardV2 from "@/redesign/section-01-dashboard-v2";
import PatientList from "@/redesign/section-02-patients";
import IdentificationForm from "@/redesign/section-03-identification";
import AgendaView from "@/redesign/section-04-agenda";
import AuthView from "@/redesign/section-05-auth";
import LandingView from "@/redesign/section-06-landing";
import SettingsView from "@/redesign/section-07-settings";

const SHELL_STYLES = `
.gx-shell {
  display: flex;
  min-height: 100dvh;
  background: #000;
  font-family: system-ui, -apple-system, sans-serif;
}
.gx-shell-nav {
  width: 260px;
  background: #111;
  border-right: 1px solid #222;
  display: flex;
  flex-direction: column;
  padding: 24px 16px;
  flex-shrink: 0;
  overflow-y: auto;
}
.gx-shell-header {
  color: #FFF;
  font-size: 0.8125rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 24px;
  padding: 0 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.gx-shell-header span {
  width: 6px; height: 6px;
  background: #C4602A;
  border-radius: 50%;
}
.gx-shell-links {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.gx-shell-btn {
  text-align: left;
  background: transparent;
  border: none;
  color: #888;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms ease;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.gx-shell-btn:hover {
  background: #222;
  color: #CCC;
}
.gx-shell-btn-active {
  background: #2A2A2A;
  color: #FFF;
}
.gx-shell-tag {
  font-family: monospace;
  font-size: 0.625rem;
  background: rgba(196,96,42,0.2);
  color: #C4602A;
  padding: 2px 6px;
  border-radius: 100px;
}
.gx-shell-divider {
  height: 1px;
  background: #222;
  margin: 12px 0;
}
.gx-shell-main {
  flex: 1;
  min-width: 0;
  height: 100dvh;
  overflow-y: auto;
  background: #FAFAF8;
}
`;

export default function RedesignPreviewPage() {
  const [view, setView] = useState("landing");

  const views = {
    "landing": <LandingView />,
    "auth": <AuthView />,
    "dash-v1": <DashboardV1 />,
    "dash-v2": <DashboardV2 />,
    "agenda": <AgendaView />,
    "patients": <PatientList />,
    "form-id": <IdentificationForm />,
    "settings": <SettingsView />,
  };

  return (
    <>
      <style>{SHELL_STYLES}</style>
      <div className="gx-shell">
        <nav className="gx-shell-nav">
          <div className="gx-shell-header">
            <span /> Ferric Meridian v3.0
          </div>
          <div className="gx-shell-links">
            
            <button 
              className={`gx-shell-btn ${view === "landing" ? "gx-shell-btn-active" : ""}`}
              onClick={() => setView("landing")}
            >
              Landing Page <span className="gx-shell-tag">New</span>
            </button>
            <button 
              className={`gx-shell-btn ${view === "auth" ? "gx-shell-btn-active" : ""}`}
              onClick={() => setView("auth")}
            >
              Autenticación <span className="gx-shell-tag">New</span>
            </button>

            <div className="gx-shell-divider" />

            <button 
              className={`gx-shell-btn ${view === "dash-v2" ? "gx-shell-btn-active" : ""}`}
              onClick={() => setView("dash-v2")}
            >
              Dashboard <span className="gx-shell-tag">V2</span>
            </button>
            <button 
              className={`gx-shell-btn ${view === "agenda" ? "gx-shell-btn-active" : ""}`}
              onClick={() => setView("agenda")}
            >
              Agenda / Citas
            </button>
            <button 
              className={`gx-shell-btn ${view === "patients" ? "gx-shell-btn-active" : ""}`}
              onClick={() => setView("patients")}
            >
              Lista de Pacientes
            </button>
            <button 
              className={`gx-shell-btn ${view === "form-id" ? "gx-shell-btn-active" : ""}`}
              onClick={() => setView("form-id")}
            >
              Formulario ID
            </button>

            <div className="gx-shell-divider" />

            <button 
              className={`gx-shell-btn ${view === "settings" ? "gx-shell-btn-active" : ""}`}
              onClick={() => setView("settings")}
            >
              Ajustes <span className="gx-shell-tag">New</span>
            </button>
            <button 
              className={`gx-shell-btn ${view === "dash-v1" ? "gx-shell-btn-active" : ""}`}
              onClick={() => setView("dash-v1")}
            >
              Dashboard (V1)
            </button>

          </div>
        </nav>
        <main className="gx-shell-main">
          {views[view as keyof typeof views]}
        </main>
      </div>
    </>
  );
}
