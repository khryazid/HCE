"use client";

import { useEffect, useRef, useState } from "react";
import SearchInput from "@/components/ui/search-input";
import { useRouter } from "next/navigation";
import { useTenant } from "@/lib/supabase/tenant-context";
import { useClinicalContext } from "@/features/consultations/context/clinical-context";
import { listTreatmentTemplates } from "@/features/consultations/lib/treatments";
import type { TreatmentTemplate } from "@/features/consultations/lib/treatments";

// ─── Types ────────────────────────────────────────────────────────────────────

type SearchItemKind = "patient" | "consultation" | "treatment";

type SearchItem = {
  id: string;
  kind: SearchItemKind;
  title: string;
  subtitle: string;
  href: string;
  patientId?: string;
  updatedAt: string;
};

type FtsResult = {
  kind: string;
  id: string;
  title: string;
  subtitle: string;
  patient_id: string | null;
  updated_at: string;
  rank: number;
};

function itemKindLabel(kind: SearchItemKind) {
  switch (kind) {
    case "patient":      return "Paciente";
    case "consultation": return "Consulta";
    case "treatment":    return "Tratamiento";
    default:             return "Registro";
  }
}

// ─── Debounce hook ────────────────────────────────────────────────────────────

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── GlobalSearch component ───────────────────────────────────────────────────

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

  // Treatments loaded once when the panel opens (IndexedDB/Supabase, no FTS yet)
  const [templates, setTemplates] = useState<TreatmentTemplate[]>([]);
  const templatesLoaded = useRef(false);

  const debouncedQuery = useDebounced(query.trim(), 280);

  // ── Ctrl/Cmd+K to open ──────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((c) => !c);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // ── Escape to close ──────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [open]);

  // ── Load templates once on open ──────────────────────────────
  useEffect(() => {
    if (!open || !tenant || templatesLoaded.current) return;
    listTreatmentTemplates(tenant.doctor_id, tenant.clinic_id).then((t) => {
      setTemplates(t);
      templatesLoaded.current = true;
    });
  }, [open, tenant]);

  // ── FTS search via API on debounced query ────────────────────
  useEffect(() => {
    if (!open || !tenant) return;

    // Empty query → clear FTS results (templates still show via local filter)
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json())
      .then((json: { results?: FtsResult[]; error?: string }) => {
        if (!active) return;

        if (json.error) {
          setError("Error en la búsqueda. Intenta de nuevo.");
          setItems([]);
          return;
        }

        const ftsItems: SearchItem[] = (json.results ?? []).map((r) => ({
          id:        `${r.kind}-${r.id}`,
          kind:      r.kind as SearchItemKind,
          title:     r.title,
          subtitle:  r.subtitle,
          href:      r.kind === "patient"
            ? "/pacientes"
            : `/consultas?mode=seguimiento&patientId=${r.patient_id}&recordId=${r.id}`,
          patientId: r.patient_id ?? undefined,
          updatedAt: r.updated_at,
        }));

        setItems(ftsItems);
      })
      .catch(() => {
        if (!active) return;
        setError("No se pudo conectar con la búsqueda.");
        setItems([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [debouncedQuery, open, tenant]);

  // ── Combine FTS results with local template filter ───────────
  const filteredItems = (() => {
    const q = debouncedQuery.toLowerCase();

    // Template local filter (title + trigger + treatment text)
    const templateItems: SearchItem[] = q.length < 2
      ? templates.slice(0, 5).map((t) => ({
          id:        `treatment-${t.id}`,
          kind:      "treatment" as SearchItemKind,
          title:     t.title,
          subtitle:  `${t.trigger} · v${t.current_version}`,
          href:      "/tratamientos",
          updatedAt: t.updated_at,
        }))
      : templates
          .filter((t) =>
            `${t.title} ${t.trigger} ${t.treatment}`.toLowerCase().includes(q),
          )
          .slice(0, 5)
          .map((t) => ({
            id:        `treatment-${t.id}`,
            kind:      "treatment" as SearchItemKind,
            title:     t.title,
            subtitle:  `${t.trigger} · v${t.current_version}`,
            href:      "/tratamientos",
            updatedAt: t.updated_at,
          }));

    // When no query: show recent templates only
    if (!q || q.length < 2) {
      return templateItems;
    }

    // With query: FTS results (patients + consultations) + local template filter
    return [...items, ...templateItems];
  })();

  // ── Reset active index on query/open change ──────────────────
  useEffect(() => { setActiveIndex(0); }, [query, open]);

  // ── Arrow key navigation ─────────────────────────────────────
  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (filteredItems.length === 0) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((c) => (c + 1) % filteredItems.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((c) => (c === 0 ? filteredItems.length - 1 : c - 1));
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const item = filteredItems[activeIndex];
        if (item) selectItem(item);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, filteredItems, open]);

  function selectItem(item: SearchItem) {
    if (item.patientId) clinical.setSelectedPatientId(item.patientId);
    setOpen(false);
    setQuery("");
    router.push(item.href);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-2.5 text-left shadow-sm transition hover:border-teal-300 hover:bg-[color:var(--bg-soft)]"
      >
        <span className="text-sm text-[color:var(--ink-soft)]">
          Buscar pacientes, consultas o tratamientos...
        </span>
        <span className="rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-soft)] px-2 py-1 text-[11px] font-semibold text-[color:var(--ink-soft)]">
          Ctrl/Cmd + K
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-start justify-center bg-slate-900/45 p-4 pt-16 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <section
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-border p-3">
              <SearchInput
                value={query}
                onChange={(value) => setQuery(value)}
                placeholder="Escribe nombre, documento, diagnóstico o tratamiento"
                open={open}
              />
              <p className="mt-2 text-xs text-ink-soft">
                Usa flechas para navegar y Enter para abrir.
                {query.length > 0 && query.length < 2 && (
                  <span className="ml-2 text-ink-soft/70">Escribe al menos 2 caracteres…</span>
                )}
              </p>
            </div>

            <div className="max-h-[60vh] overflow-auto p-2">
              {loading ? (
                <div className="flex items-center gap-2 rounded-xl bg-bg-soft p-3 text-sm text-ink-soft">
                  <span className="inline-block w-3 h-3 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                  Buscando…
                </div>
              ) : error ? (
                <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </p>
              ) : filteredItems.length === 0 ? (
                <p className="rounded-xl bg-bg-soft p-3 text-sm text-ink-soft">
                  {debouncedQuery.length >= 2
                    ? "No hay resultados para tu búsqueda."
                    : "Empieza a escribir para buscar…"}
                </p>
              ) : (
                filteredItems.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectItem(item)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`mb-1 w-full rounded-xl border px-3 py-2 text-left transition ${
                      index === activeIndex
                        ? "border-teal-500/50 bg-teal-500/10"
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
      )}
    </>
  );
}
