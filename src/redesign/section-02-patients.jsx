/**
 * ═══════════════════════════════════════════════════════════════
 *  GLYPHIX — Sección 2: Lista de Pacientes
 *  Ferric Meridian v3.0
 *
 *  Dirección estética: "Terminal de control" — tabla densa con
 *  jerarquía tipográfica clara. Cada fila = snapshot del paciente.
 *  Elemento memorable: Búsqueda instantánea con filter pills,
 *  status dots, hover reveal de acciones rápidas.
 *  Referencia: Linear (issue list), Raycast (search), Notion (density)
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo } from "react";
import { FONT_IMPORTS, TOKENS_CSS, DARK_TOKENS_CSS } from "./design-tokens";

const STYLES = `
${FONT_IMPORTS}

.gx-pl {
  ${TOKENS_CSS}
  font-family: var(--font-ui);
  color: var(--ink);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
  min-height: 100dvh;
}
.gx-pl[data-theme="dark"] { ${DARK_TOKENS_CSS} }

@keyframes gx-up {
  from { opacity:0; transform:translateY(8px); }
  to   { opacity:1; transform:translateY(0); }
}
.gx-s { opacity:0; animation: gx-up 320ms var(--ease-micro) forwards; }
.gx-s1{animation-delay:0ms}.gx-s2{animation-delay:40ms}.gx-s3{animation-delay:80ms}
.gx-s4{animation-delay:120ms}

.gx-pl-inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px 40px 48px;
}

/* ── Page header ──────────────────────────────────── */
.gx-ph {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}
.gx-ph-left {}
.gx-pk {
  font-family: var(--font-ui);
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--accent);
  margin-bottom: 4px;
}
.gx-pt {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--ink);
  margin: 0;
}
.gx-ps {
  font-size: 0.8125rem;
  color: var(--ink-soft);
  margin-top: 4px;
}

/* ── Buttons ──────────────────────────────────────── */
.gx-btn {
  font-family: var(--font-ui); font-size:0.75rem; font-weight:600;
  border-radius: var(--radius-sm); padding:8px 18px; cursor:pointer;
  transition: all 180ms var(--ease-out); user-select:none;
  border: 1px solid transparent;
}
.gx-btn:active { transform:scale(0.97); }
.gx-btn-p { color:#FFF; background:var(--accent); }
.gx-btn-p:hover { background:var(--accent-hover); box-shadow:0 4px 16px var(--accent-glow); transform:translateY(-1px); }
.gx-btn-s { color:var(--ink); background:var(--bg-elevated); border-color:var(--border); }
.gx-btn-s:hover { border-color:var(--accent); color:var(--accent); }

/* ══════════════════════════════════════════════════════
   SEARCH + FILTERS
══════════════════════════════════════════════════════ */
.gx-search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}
.gx-search {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--bg-soft);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius);
  padding: 9px 14px;
  transition: border-color 180ms var(--ease-out), box-shadow 180ms var(--ease-out);
}
.gx-search:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-dim);
}
.gx-search-ico { color:var(--ink-faint); flex-shrink:0; }
.gx-search input {
  flex:1; border:none; background:transparent;
  font-family:var(--font-ui); font-size:0.8125rem; color:var(--ink); outline:none;
}
.gx-search input::placeholder { color:var(--ink-faint); }
.gx-search-key {
  font-family:var(--font-mono); font-size:0.5625rem;
  color:var(--ink-faint); background:var(--bg-elevated);
  border:1px solid var(--border); border-radius:var(--radius-xs);
  padding:2px 6px; flex-shrink:0;
}
.gx-search-count {
  font-family:var(--font-mono); font-size:0.6875rem;
  color:var(--ink-faint); white-space:nowrap;
  font-feature-settings:"tnum";
}

/* ── Filter pills ─────────────────────────────────── */
.gx-filters {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
}
.gx-filter {
  font-family: var(--font-ui);
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 5px 14px;
  border-radius: 100px;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  color: var(--ink-soft);
  cursor: pointer;
  transition: all 150ms var(--ease-out);
}
.gx-filter:hover { border-color: var(--accent); color: var(--accent); }
.gx-filter:active { transform: scale(0.96); }
.gx-filter-on {
  background: var(--accent-dim);
  border-color: var(--accent);
  color: var(--accent);
}
.gx-filter .gx-fc {
  font-family: var(--font-mono);
  font-size: 0.5625rem;
  margin-left: 4px;
  opacity: 0.7;
}

/* ══════════════════════════════════════════════════════
   TABLE
══════════════════════════════════════════════════════ */
.gx-table-wrap {
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--bg-elevated);
}
.gx-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
}

/* ── Header ───────────────────────────────────────── */
.gx-table thead th {
  font-family: var(--font-ui);
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ink-faint);
  text-align: left;
  padding: 10px 16px;
  background: var(--bg-soft);
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 2;
}

/* ── Rows ─────────────────────────────────────────── */
.gx-table tbody tr {
  border-bottom: 1px solid var(--border-subtle);
  transition: background 120ms var(--ease-out);
  cursor: pointer;
}
.gx-table tbody tr:last-child { border-bottom: none; }
.gx-table tbody tr:hover {
  background: var(--bg-soft);
}
.gx-table td {
  padding: 12px 16px;
  vertical-align: middle;
}

/* ── Patient cell ─────────────────────────────────── */
.gx-pcell {
  display: flex;
  align-items: center;
  gap: 10px;
}
.gx-pav {
  width: 32px; height: 32px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-display);
  font-size: 0.625rem;
  font-weight: 700;
  flex-shrink: 0;
  background: var(--bg-soft);
  color: var(--ink-soft);
  border: 1px solid var(--border);
  letter-spacing: 0.02em;
}
.gx-pname {
  font-weight: 500;
  color: var(--ink);
  line-height: 1.3;
}
.gx-pname-sub {
  font-size: 0.6875rem;
  color: var(--ink-faint);
  margin-top: 1px;
}

/* ── Document ─────────────────────────────────────── */
.gx-doc {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--ink-soft);
  font-feature-settings: "tnum";
  letter-spacing: 0.02em;
}
.gx-doc-type {
  font-size: 0.5625rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--ink-faint);
  margin-right: 4px;
}

/* ── Status badge ─────────────────────────────────── */
.gx-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.6875rem;
  font-weight: 500;
  padding: 3px 10px;
  border-radius: 100px;
}
.gx-status-dot {
  width: 5px; height: 5px;
  border-radius: 50%;
}
.gx-st-active { color: var(--state-ok); background: var(--state-ok-bg); }
.gx-st-active .gx-status-dot { background: var(--state-ok); }
.gx-st-new { color: var(--accent); background: var(--accent-dim); }
.gx-st-new .gx-status-dot { background: var(--accent); }
.gx-st-inactive { color: var(--ink-faint); background: var(--bg-soft); }
.gx-st-inactive .gx-status-dot { background: var(--ink-faint); }

/* ── Date cell ────────────────────────────────────── */
.gx-date {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  color: var(--ink-faint);
  font-feature-settings: "tnum";
}
.gx-date-rel {
  font-size: 0.5625rem;
  color: var(--ink-faint);
  margin-top: 1px;
}

/* ── Last dx ──────────────────────────────────────── */
.gx-dx {
  font-size: 0.75rem;
  color: var(--ink-soft);
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.gx-dx-code {
  font-family: var(--font-mono);
  font-size: 0.5625rem;
  color: var(--ink-faint);
  margin-right: 4px;
}

/* ── Row actions (appear on hover) ────────────────── */
.gx-row-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 150ms var(--ease-out);
}
.gx-table tbody tr:hover .gx-row-actions { opacity: 1; }
.gx-row-act {
  font-family: var(--font-ui);
  font-size: 0.625rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: var(--radius-xs);
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  color: var(--ink-soft);
  cursor: pointer;
  transition: all 120ms var(--ease-out);
  white-space: nowrap;
}
.gx-row-act:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.gx-row-act:active { transform: scale(0.95); }
.gx-row-act-p {
  background: var(--accent);
  border-color: var(--accent);
  color: #FFF;
}
.gx-row-act-p:hover { background: var(--accent-hover); color: #FFF; }

/* ══════════════════════════════════════════════════════
   PAGINATION
══════════════════════════════════════════════════════ */
.gx-pag {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  background: var(--bg-soft);
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
}
.gx-pag-info {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  color: var(--ink-faint);
  font-feature-settings: "tnum";
}
.gx-pag-btns { display:flex; gap:4px; }
.gx-pag-btn {
  font-family: var(--font-ui);
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 5px 12px;
  border-radius: var(--radius-xs);
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  color: var(--ink-soft);
  cursor: pointer;
  transition: all 120ms var(--ease-out);
}
.gx-pag-btn:hover { border-color: var(--accent); color: var(--accent); }
.gx-pag-btn:active { transform: scale(0.96); }
.gx-pag-btn:disabled { opacity:0.4; cursor:not-allowed; }

/* ══════════════════════════════════════════════════════
   STATS BAR
══════════════════════════════════════════════════════ */
.gx-stats {
  display: flex;
  gap: 0;
  margin-bottom: 20px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}
.gx-stat {
  display: flex; align-items: baseline; gap: 6px;
  padding: 0 20px;
  position: relative;
}
.gx-stat:first-child { padding-left:0; }
.gx-stat:not(:first-child)::before {
  content:''; position:absolute; left:0; top:2px; bottom:2px; width:1px;
  background:var(--border);
}
.gx-stat-v {
  font-family: var(--font-mono);
  font-size: 1.125rem; font-weight: 500;
  color: var(--ink); font-feature-settings:"tnum";
}
.gx-stat-l {
  font-size: 0.6875rem; color: var(--ink-faint);
}

/* ══════════════════════════════════════════════════════
   RESPONSIVE
══════════════════════════════════════════════════════ */
@media (max-width:1024px) {
  .gx-pl-inner { padding:24px 24px 40px; }
  .gx-table-wrap { overflow-x:auto; }
}
@media (max-width:768px) {
  .gx-pl-inner { padding:16px 16px 32px; }
  .gx-ph { flex-direction:column; }
  .gx-search-bar { flex-direction:column; }
  .gx-stats { flex-wrap:wrap; gap:10px; }
  .gx-stat { padding:0; }
  .gx-stat:not(:first-child)::before { display:none; }
  .gx-filters { flex-wrap:wrap; }
}
@media (prefers-reduced-motion:reduce) {
  .gx-s { animation:none!important; opacity:1!important; }
  * { transition-duration:0.01ms!important; }
}
`;

/* ─── Mock Data ────────────────────────────────────── */

const PATIENTS = [
  { id:1, name:"María Fernanda López Restrepo", doc:"CC", num:"1.037.892.451", age:54, sex:"F", eps:"Sura EPS", status:"active", lastVisit:"27 may 2026", lastRel:"hoy", dx:"I10 — Hipertensión esencial", dxCode:"I10" },
  { id:2, name:"Carlos Andrés Ruiz Ospina", doc:"CC", num:"79.654.321", age:62, sex:"M", eps:"Nueva EPS", status:"active", lastVisit:"27 may 2026", lastRel:"hoy", dx:"E11 — Diabetes mellitus tipo 2", dxCode:"E11" },
  { id:3, name:"Ana María Martínez Herrera", doc:"CC", num:"52.198.374", age:28, sex:"F", eps:"Sanitas", status:"new", lastVisit:"27 may 2026", lastRel:"hoy", dx:"Primera consulta", dxCode:null },
  { id:4, name:"José Luis Pérez Arango", doc:"CC", num:"1.020.445.678", age:31, sex:"M", eps:"Compensar", status:"active", lastVisit:"15 may 2026", lastRel:"12 días", dx:"Z34 — Control prenatal (acomp.)", dxCode:"Z34" },
  { id:5, name:"Valentina Torres Castillo", doc:"TI", num:"1.102.984.567", age:17, sex:"F", eps:"Coomeva", status:"new", lastVisit:"—", lastRel:"—", dx:"Sin diagnóstico previo", dxCode:null },
  { id:6, name:"Diego Fernando Ramírez Londoño", doc:"CC", num:"10.234.876", age:45, sex:"M", eps:"Sura EPS", status:"active", lastVisit:"20 may 2026", lastRel:"7 días", dx:"M54 — Dorsalgia", dxCode:"M54" },
  { id:7, name:"Luisa Fernanda Ochoa Giraldo", doc:"CC", num:"43.876.123", age:38, sex:"F", eps:"Sanitas", status:"active", lastVisit:"22 may 2026", lastRel:"5 días", dx:"E03 — Hipotiroidismo", dxCode:"E03" },
  { id:8, name:"Luis Fernando Gómez Ríos", doc:"CC", num:"8.345.678", age:71, sex:"M", eps:"Nueva EPS", status:"active", lastVisit:"10 may 2026", lastRel:"17 días", dx:"I10 — Hipertensión esencial", dxCode:"I10" },
  { id:9, name:"Sandra Milena Vargas Duque", doc:"CC", num:"32.567.890", age:58, sex:"F", eps:"Sura EPS", status:"inactive", lastVisit:"3 abr 2026", lastRel:"55 días", dx:"E11 — Diabetes mellitus tipo 2", dxCode:"E11" },
  { id:10, name:"Patricia Elena Mejía Correa", doc:"CC", num:"43.123.456", age:49, sex:"F", eps:"Compensar", status:"active", lastVisit:"18 may 2026", lastRel:"9 días", dx:"E03 — Hipotiroidismo", dxCode:"E03" },
];

function initials(n) { return n.split(" ").filter(Boolean).slice(0,2).map(w=>w[0]).join(""); }
function statusClass(s) { return s==="active"?"gx-st-active":s==="new"?"gx-st-new":"gx-st-inactive"; }
function statusLabel(s) { return s==="active"?"Activo":s==="new"?"Nuevo":"Inactivo"; }
function Ico({d,s=14}) { return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>; }

export default function PatientList() {
  const [theme, setTheme] = useState("light");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    let list = PATIENTS;
    if (filter !== "all") list = list.filter(p => p.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.num.includes(q) ||
        (p.dx && p.dx.toLowerCase().includes(q))
      );
    }
    return list;
  }, [search, filter]);

  const counts = useMemo(() => ({
    all: PATIENTS.length,
    active: PATIENTS.filter(p=>p.status==="active").length,
    new: PATIENTS.filter(p=>p.status==="new").length,
    inactive: PATIENTS.filter(p=>p.status==="inactive").length,
  }), []);

  return (
    <>
      <style>{STYLES}</style>
      <div className="gx-pl" data-theme={theme}>
        <div className="gx-pl-inner">

          {/* Page header */}
          <div className="gx-ph gx-s gx-s1">
            <div className="gx-ph-left">
              <div className="gx-pk">Directorio</div>
              <h1 className="gx-pt">Pacientes</h1>
              <p className="gx-ps">Registro completo de pacientes del consultorio</p>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
              <button className="gx-btn gx-btn-p">+ Nuevo paciente</button>
              <button className="gx-btn gx-btn-s" onClick={()=>setTheme(t=>t==="light"?"dark":"light")}>
                {theme==="light"?"☽":"☀"}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="gx-stats gx-s gx-s2">
            <div className="gx-stat"><span className="gx-stat-v">{counts.all}</span><span className="gx-stat-l">total</span></div>
            <div className="gx-stat"><span className="gx-stat-v">{counts.active}</span><span className="gx-stat-l">activos</span></div>
            <div className="gx-stat"><span className="gx-stat-v">{counts.new}</span><span className="gx-stat-l">nuevos hoy</span></div>
            <div className="gx-stat"><span className="gx-stat-v">{counts.inactive}</span><span className="gx-stat-l">inactivos</span></div>
          </div>

          {/* Search */}
          <div className="gx-search-bar gx-s gx-s2">
            <div className="gx-search">
              <span className="gx-search-ico"><Ico d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></span>
              <input
                type="text"
                placeholder="Buscar por nombre, documento o diagnóstico..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <span className="gx-search-key">⌘K</span>
            </div>
            <span className="gx-search-count">{filtered.length} resultado{filtered.length!==1?"s":""}</span>
          </div>

          {/* Filters */}
          <div className="gx-filters gx-s gx-s3">
            {[
              {k:"all",l:"Todos"},
              {k:"active",l:"Activos"},
              {k:"new",l:"Nuevos"},
              {k:"inactive",l:"Inactivos"},
            ].map(f=>(
              <button key={f.k} className={`gx-filter${filter===f.k?" gx-filter-on":""}`} onClick={()=>setFilter(f.k)}>
                {f.l}<span className="gx-fc">{counts[f.k]}</span>
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="gx-table-wrap gx-s gx-s4">
            <table className="gx-table">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Documento</th>
                  <th>Último diagnóstico</th>
                  <th>Última visita</th>
                  <th>Estado</th>
                  <th style={{width:1}}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div className="gx-pcell">
                        <div className="gx-pav">{initials(p.name)}</div>
                        <div>
                          <div className="gx-pname">{p.name}</div>
                          <div className="gx-pname-sub">{p.age} años · {p.sex} · {p.eps}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="gx-doc">
                        <span className="gx-doc-type">{p.doc}</span>
                        {p.num}
                      </div>
                    </td>
                    <td>
                      <div className="gx-dx">
                        {p.dxCode && <span className="gx-dx-code">{p.dxCode}</span>}
                        {p.dx}
                      </div>
                    </td>
                    <td>
                      <div className="gx-date">{p.lastVisit}</div>
                      <div className="gx-date-rel">{p.lastRel !== "—" ? `hace ${p.lastRel}` : "—"}</div>
                    </td>
                    <td>
                      <span className={`gx-status ${statusClass(p.status)}`}>
                        <span className="gx-status-dot" />
                        {statusLabel(p.status)}
                      </span>
                    </td>
                    <td>
                      <div className="gx-row-actions">
                        <button className="gx-row-act">Ver historia</button>
                        <button className="gx-row-act gx-row-act-p">Consulta</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="gx-pag">
              <span className="gx-pag-info">Mostrando {filtered.length} de {PATIENTS.length} pacientes</span>
              <div className="gx-pag-btns">
                <button className="gx-pag-btn" disabled>Anterior</button>
                <button className="gx-pag-btn" disabled>Siguiente</button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
