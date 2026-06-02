"use client";

/**
 * components/patients/PatientList.tsx
 * Lista principal de pacientes (Terminal de control).
 */

import { useMemo, useState } from "react";
import { parseISO, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import type { PatientRecord, PatientStatus } from "@/features/patients/types";
import type { ClinicalRecordRecord } from "@/features/consultations/types";
import { calculateAge } from "@/features/dashboard/lib/metrics";

type Props = {
  patients: PatientRecord[];
  allPatients: PatientRecord[];
  records: ClinicalRecordRecord[]; // We need records to show the last diagnosis
  selectedPatientId: string;
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (patientId: string) => void;
};

function initials(name: string | null) {
  if (!name) return "—";
  return name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

function getStatusCssClass(status: PatientStatus) {
  if (status === "activo" || status === "en-seguimiento") return "gx-st-active";
  if (status === "alta") return "gx-st-new"; // Reusing new/accent for 'alta'
  return "gx-st-inactive";
}

function getStatusLabel(status: PatientStatus) {
  if (status === "activo") return "Activo";
  if (status === "en-seguimiento") return "Seguimiento";
  if (status === "alta") return "Alta";
  return "Inactivo";
}

export function PatientList({
  patients,
  allPatients,
  records,
  selectedPatientId,
  search,
  onSearchChange,
  onSelect,
}: Props) {
  const [filter, setFilter] = useState<PatientStatus | "all">("all");

  const displayPatients = useMemo(() => {
    let list = patients;
    if (filter !== "all") {
      list = list.filter(p => p.status === filter);
    }
    return list;
  }, [patients, filter]);

  const counts = useMemo(() => ({
    all: allPatients.length,
    activo: allPatients.filter(p => p.status === "activo" || p.status === "en-seguimiento").length,
    alta: allPatients.filter(p => p.status === "alta").length,
    inactivo: allPatients.filter(p => p.status === "inactivo").length,
  }), [allPatients]);

  return (
    <div className="w-full">
      {/* Search and Filters */}
      <div className="gx-search-bar gx-s gx-s1">
        <div className="gx-search">
          <span className="gx-search-ico">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </span>
          <input
            type="text"
            placeholder="Buscar por nombre o documento..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <span className="gx-search-key">⌘K</span>
        </div>
        <span className="gx-search-count">
          {displayPatients.length} resultado{displayPatients.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="gx-filters gx-s gx-s2">
        <button
          className={`gx-filter ${filter === "all" ? "gx-filter-on" : ""}`}
          onClick={() => setFilter("all")}
        >
          Todos<span className="gx-fc">{counts.all}</span>
        </button>
        <button
          className={`gx-filter ${filter === "activo" ? "gx-filter-on" : ""}`}
          onClick={() => setFilter("activo")}
        >
          Activos<span className="gx-fc">{counts.activo}</span>
        </button>
        <button
          className={`gx-filter ${filter === "alta" ? "gx-filter-on" : ""}`}
          onClick={() => setFilter("alta")}
        >
          De Alta<span className="gx-fc">{counts.alta}</span>
        </button>
        <button
          className={`gx-filter ${filter === "inactivo" ? "gx-filter-on" : ""}`}
          onClick={() => setFilter("inactivo")}
        >
          Inactivos<span className="gx-fc">{counts.inactivo}</span>
        </button>
      </div>

      {/* Table */}
      <div className="gx-table-wrap gx-s gx-s3">
        <table className="gx-table">
          <thead>
            <tr>
              <th>Paciente</th>
              <th>Documento</th>
              <th>Último motivo/Dx</th>
              <th>Última visita</th>
              <th>Estado</th>
              <th style={{ width: 1 }}></th>
            </tr>
          </thead>
          <tbody>
            {displayPatients.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-ink-soft">
                  {search ? "No se encontraron pacientes." : "Aún no hay pacientes registrados."}
                </td>
              </tr>
            ) : (
              displayPatients.map(p => {
                const isSelected = selectedPatientId === p.id;
                
                // Get last record
                const pRecords = records.filter(r => r.patient_id === p.id).sort((a,b) => b.updated_at.localeCompare(a.updated_at));
                const lastRec = pRecords[0];

                const lastVisitStr = lastRec 
                  ? new Date(lastRec.updated_at).toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" })
                  : "—";
                
                const lastRelStr = lastRec
                  ? `hace ${formatDistanceToNow(parseISO(lastRec.updated_at), { locale: es })}`
                  : "—";

                return (
                  <tr 
                    key={p.id} 
                    className={isSelected ? "gx-row-selected" : ""}
                    onClick={() => onSelect(p.id)}
                  >
                    <td>
                      <div className="gx-pcell">
                        <div className="gx-pav">{initials(p.full_name)}</div>
                        <div>
                          <div className="gx-pname">{p.full_name}</div>
                          <div className="gx-pname-sub">
                            {p.phone || "Sin tel."} · {calculateAge(p.birth_date)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="gx-doc">
                        <span className="gx-doc-type">ID</span>
                        {p.document_number}
                      </div>
                    </td>
                    <td>
                      <div className="gx-dx">
                        {lastRec ? (
                          <>
                            {lastRec.cie_codes && lastRec.cie_codes.length > 0 && <span className="gx-dx-code">{lastRec.cie_codes[0]}</span>}
                            {lastRec.chief_complaint}
                          </>
                        ) : (
                          <span className="text-ink-faint italic">Sin consultas</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="gx-date">{lastVisitStr}</div>
                      <div className="gx-date-rel">{lastRelStr}</div>
                    </td>
                    <td>
                      <span className={`gx-status ${getStatusCssClass(p.status)}`}>
                        <span className="gx-status-dot" />
                        {getStatusLabel(p.status)}
                      </span>
                    </td>
                    <td>
                      <div className="gx-row-actions">
                        <button className="gx-row-act" onClick={(e) => { e.stopPropagation(); onSelect(p.id); }}>Ver historia</button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {displayPatients.length > 0 && (
          <div className="gx-pag">
            <span className="gx-pag-info">Mostrando {displayPatients.length} pacientes</span>
            <div className="gx-pag-btns">
              <button className="gx-pag-btn" disabled>Anterior</button>
              <button className="gx-pag-btn" disabled>Siguiente</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
