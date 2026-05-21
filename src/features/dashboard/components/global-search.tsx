"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
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

  // M-12: Ref para el contenedor del diálogo (focus trap WCAG 2.1 2.4.3)
  const dialogRef = useRef<HTMLElement>(null);

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

  // ── M-12: Focus trap — mantiene el foco dentro del diálogo ──────────────
  useEffect(() => {
    if (!open || !dialogRef.current) return;

    const dialog = dialogRef.current;
    const FOCUSABLE_SELECTORS =
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

    // Enfocar el primer elemento focusable al abrir
    const firstFocusable = dialog.querySelector<HTMLElement>(FOCUSABLE_SELECTORS);
    firstFocusable?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const focusables = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
      ).filter((el) => !el.closest('[aria-hidden="true"]'));

      if (focusables.length === 0) return;

      const first = focusables[0];
      const last  = focusables[focusables.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: si estamos en el primero, saltar al último
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab: si estamos en el último, saltar al primero
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    dialog.addEventListener("keydown", onKeyDown);
    return () => dialog.removeEventListener("keydown", onKeyDown);
  }, [open]);

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

  // Función helper para agrupar (añadir antes del return del componente)
  const groupedItems = useMemo(() => {
    const patients     = filteredItems.filter(i => i.kind === "patient");
    const consultations = filteredItems.filter(i => i.kind === "consultation");
    const treatments   = filteredItems.filter(i => i.kind === "treatment");
    return { patients, consultations, treatments };
  }, [filteredItems]);

  // Componente de grupo (añadir antes del return)
  const ResultGroup = ({
    label,
    items,
    startIndex,
  }: {
    label: string;
    items: typeof filteredItems;
    startIndex: number;
  }) => {
    if (items.length === 0) return null;
    return (
      <>
        <div className="px-3 pb-1 pt-2">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-ink-faint">
            {label}
          </h4>
        </div>
        {items.map((item, i) => {
          const globalIndex = startIndex + i;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => selectItem(item)}
              onMouseEnter={() => setActiveIndex(globalIndex)}
              className={`mb-0.5 w-full rounded-xl px-3 py-2.5 text-left transition ${
                globalIndex === activeIndex
                  ? "bg-accent/8 border border-accent/20"
                  : "hover:bg-bg-soft border border-transparent"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${
                  item.kind === "patient"      ? "bg-teal-100 text-teal-700" :
                  item.kind === "consultation" ? "bg-purple-100 text-purple-700" :
                                                 "bg-amber-100 text-amber-700"
                }`}>
                  {item.kind === "patient"      ? "P" :
                   item.kind === "consultation" ? "C" : "T"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{item.title}</p>
                  <p className="truncate text-[11px] text-ink-soft">{item.subtitle}</p>
                </div>
                {globalIndex === activeIndex && (
                  <span className="shrink-0 text-[10px] font-semibold text-accent">
                    ↵
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="global-search-dialog"
        aria-label="Abrir búsqueda global"
        className="flex w-full items-center justify-between rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-2.5 text-left shadow-sm transition hover:border-teal-300 hover:bg-[color:var(--bg-soft)]"
      >
        <span className="text-sm text-[color:var(--ink-soft)] truncate">
          <span className="hidden sm:inline">Buscar pacientes, consultas o tratamientos...</span>
          <span className="sm:hidden">Buscar...</span>
        </span>
        <span className="hidden sm:inline-block rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-soft)] px-2 py-1 text-[11px] font-semibold text-[color:var(--ink-soft)]">
          Ctrl/Cmd + K
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-start justify-center bg-slate-900/45 p-4 pt-16 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <section
            ref={dialogRef}
            id="global-search-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Búsqueda global"
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
                <>
                  <ResultGroup label="Pacientes" items={groupedItems.patients} startIndex={0} />
                  <ResultGroup label="Consultas" items={groupedItems.consultations} startIndex={groupedItems.patients.length} />
                  <ResultGroup label="Tratamientos" items={groupedItems.treatments} startIndex={groupedItems.patients.length + groupedItems.consultations.length} />
                </>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
