"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTenant } from "@/lib/supabase/tenant-context";
import { useClinicalContext } from "@/lib/context/clinical-context";
import {
  listClinicalRecordsByTenant,
  listPatientsByTenant,
} from "@/lib/db/indexeddb";
import { listTreatmentTemplates } from "@/lib/local-data/treatments";
import type { ClinicalRecordRecord } from "@/types/consultation";
import type { PatientRecord } from "@/types/patient";

type SearchItemKind = "patient" | "consultation" | "treatment";

type SearchItem = {
  id: string;
  kind: SearchItemKind;
  title: string;
  subtitle: string;
  href: string;
  patientId?: string;
  updatedAt: string;
  searchableText: string;
};

function itemKindLabel(kind: SearchItemKind) {
  switch (kind) {
    case "patient":
      return "Paciente";
    case "consultation":
      return "Consulta";
    case "treatment":
      return "Tratamiento";
    default:
      return "Registro";
  }
}

function getDiagnosis(record: ClinicalRecordRecord) {
  const data = record.specialty_data as Record<string, unknown>;
  const diagnosis =
    typeof data.diagnosis === "string" && data.diagnosis.trim().length > 0
      ? data.diagnosis.trim()
      : record.chief_complaint;

  return diagnosis;
}

export function GlobalSearch() {
  const router = useRouter();
  const { tenant } = useTenant();
  const clinical = useClinicalContext();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [items, setItems] = useState<SearchItem[]>([]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const shortcutPressed = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";

      if (!shortcutPressed) {
        return;
      }

      event.preventDefault();
      setOpen((current) => !current);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    if (!open) {
      return;
    }

    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [open]);

  useEffect(() => {
    if (!open || !tenant) {
      return;
    }

    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [patients, records] = await Promise.all([
          listPatientsByTenant(tenant.clinic_id),
          listClinicalRecordsByTenant(tenant.doctor_id, tenant.clinic_id),
        ]);
        const templates = listTreatmentTemplates(tenant.doctor_id, tenant.clinic_id);

        if (!active) {
          return;
        }

        const patientById = new Map<string, PatientRecord>(
          patients.map((patient) => [patient.id, patient]),
        );

        const patientItems: SearchItem[] = patients.map((patient) => ({
          id: `patient-${patient.id}`,
          kind: "patient",
          title: patient.full_name,
          subtitle: `Doc: ${patient.document_number}`,
          href: "/pacientes",
          patientId: patient.id,
          updatedAt: patient.updated_at,
          searchableText: `${patient.full_name} ${patient.document_number}`.toLowerCase(),
        }));

        const consultationItems: SearchItem[] = records.map((record) => {
          const patient = patientById.get(record.patient_id);
          const diagnosis = getDiagnosis(record);

          return {
            id: `consultation-${record.id}`,
            kind: "consultation",
            title: diagnosis,
            subtitle: `${patient?.full_name ?? "Paciente"} · ${record.specialty_kind}`,
            href: `/consultas?mode=seguimiento&patientId=${record.patient_id}&recordId=${record.id}`,
            patientId: record.patient_id,
            updatedAt: record.updated_at,
            searchableText: `${diagnosis} ${record.specialty_kind} ${patient?.full_name ?? ""}`.toLowerCase(),
          };
        });

        const treatmentItems: SearchItem[] = templates.map((template) => ({
          id: `treatment-${template.id}`,
          kind: "treatment",
          title: template.title,
          subtitle: `${template.trigger} · v${template.current_version}`,
          href: "/tratamientos",
          updatedAt: template.updated_at,
          searchableText: `${template.title} ${template.trigger} ${template.treatment}`.toLowerCase(),
        }));

        const merged = [...patientItems, ...consultationItems, ...treatmentItems].sort((a, b) =>
          b.updatedAt.localeCompare(a.updatedAt),
        );

        setItems(merged);
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudo cargar la busqueda global.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [open, tenant]);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return items.slice(0, 12);
    }

    return items
      .filter((item) => item.searchableText.includes(normalized))
      .slice(0, 18);
  }, [items, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onNavigationKey = (event: KeyboardEvent) => {
      if (filteredItems.length === 0) {
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((current) => (current + 1) % filteredItems.length);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((current) =>
          current === 0 ? filteredItems.length - 1 : current - 1,
        );
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        const item = filteredItems[activeIndex];
        if (item) {
          if (item.patientId) {
            clinical.setSelectedPatientId(item.patientId);
          }
          setOpen(false);
          setQuery("");
          router.push(item.href);
        }
      }
    };

    window.addEventListener("keydown", onNavigationKey);
    return () => window.removeEventListener("keydown", onNavigationKey);
  }, [activeIndex, clinical, filteredItems, open, router]);

  function selectItem(item: SearchItem) {
    if (item.patientId) {
      clinical.setSelectedPatientId(item.patientId);
    }

    setOpen(false);
    setQuery("");
    router.push(item.href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
         className="flex w-full items-center justify-between rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-2.5 text-left shadow-sm transition hover:border-teal-300 hover:bg-[color:var(--bg-soft)]"
      >
         <span className="text-sm text-[color:var(--ink-soft)]">Buscar pacientes, consultas o tratamientos...</span>
         <span className="rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-soft)] px-2 py-1 text-[11px] font-semibold text-[color:var(--ink-soft)]">
          Ctrl/Cmd + K
        </span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[70] flex items-start justify-center bg-slate-900/45 p-4 pt-16 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <section
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-border p-3">
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Escribe nombre, documento, diagnostico o tratamiento"
                className="hce-input"
              />
              <p className="mt-2 text-xs text-ink-soft">
                Usa flechas para navegar y Enter para abrir.
              </p>
            </div>

            <div className="max-h-[60vh] overflow-auto p-2">
              {loading ? (
                <p className="rounded-xl bg-bg-soft p-3 text-sm text-ink-soft">Cargando resultados...</p>
              ) : error ? (
                <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
              ) : filteredItems.length === 0 ? (
                <p className="rounded-xl bg-bg-soft p-3 text-sm text-ink-soft">No hay resultados para tu busqueda.</p>
              ) : (
                filteredItems.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectItem(item)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`mb-1 w-full rounded-xl border px-3 py-2 text-left transition ${
                      index === activeIndex
                        ? "border-teal-300 bg-teal-50"
                        : "border-transparent bg-card hover:border-border hover:bg-bg-soft"
                    }`}
                  >
                    <p className="text-sm font-semibold text-ink">{item.title}</p>
                    <p className="mt-0.5 text-xs text-ink-soft">{item.subtitle}</p>
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-soft">
                      {itemKindLabel(item.kind)}
                    </p>
                  </button>
                ))
              )}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
