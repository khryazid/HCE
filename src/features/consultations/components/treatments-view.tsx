"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase/client";
import { loadTenantProfile, type TenantProfile } from "@/lib/supabase/profile";
import {
  deleteTreatmentTemplate,
  migrateLegacyLocalStorageTemplates,
  saveTreatmentTemplate,
  type TreatmentTemplate,
  type TreatmentTemplateExtraSections,
} from "@/features/consultations/lib/treatments";
import { useTemplates, templateKeys } from "@/features/consultations/lib/use-consultation-queries";
import { useTemplatesRealtime } from "@/features/consultations/lib/use-templates-realtime";

type TemplateForm = {
  trigger: string;
  title: string;
  treatment: string;
  extra_sections: TreatmentTemplateExtraSections;
};

const EMPTY_FORM: TemplateForm = {
  trigger: "",
  title: "",
  treatment: "",
  extra_sections: {},
};

// ─── VERSION HISTORY MODAL ────────────────────────────────────────────────────

type VersionHistoryModalProps = {
  template: TreatmentTemplate;
  onRestore: (notes: string) => void;
  onClose: () => void;
};

function VersionHistoryModal({ template, onRestore, onClose }: VersionHistoryModalProps) {
  // Show newest first
  const sorted = [...template.versions].sort((a, b) => b.version - a.version);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-bold text-ink">Historial de versiones</h2>
            <p className="text-xs text-ink-soft mt-0.5">
              <span className="font-semibold text-ink">{template.title}</span>
              {" — "}
              {sorted.length} versión{sorted.length !== 1 ? "es" : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-bg-soft text-ink-soft hover:text-ink transition-colors"
            aria-label="Cerrar"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Version list */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
          {sorted.map((v) => {
            const isCurrent = v.version === template.current_version;
            return (
              <div
                key={v.version}
                className={`rounded-xl border p-4 space-y-2 transition-colors ${
                  isCurrent
                    ? "border-accent/40 bg-accent/5"
                    : "border-border hover:border-border/80"
                }`}
              >
                {/* Version header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      isCurrent
                        ? "bg-accent/15 text-accent"
                        : "bg-bg-soft text-ink-soft"
                    }`}>
                      v{v.version}
                    </span>
                    {isCurrent && (
                      <span className="text-xs text-accent font-medium">Versión actual</span>
                    )}
                  </div>
                  <span className="text-xs text-ink-soft">
                    {new Date(v.updated_at).toLocaleString("es-ES", {
                      day: "2-digit", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>

                {/* Content preview */}
                <p className="text-sm text-ink-soft whitespace-pre-wrap leading-relaxed line-clamp-4">
                  {v.notes}
                </p>

                {/* Restore button (only for older versions) */}
                {!isCurrent && (
                  <button
                    onClick={() => {
                      onRestore(v.notes);
                      onClose();
                    }}
                    className="mt-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-accent/30 text-accent hover:bg-accent/10 transition-colors"
                  >
                    ↩ Restaurar esta versión
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="px-6 py-4 border-t border-border">
          <p className="text-xs text-ink-soft">
            Restaurar carga el contenido en el formulario para revisarlo antes de guardar.
            La plantilla actual no se modifica hasta que presiones <strong>Actualizar</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function TreatmentsView() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [tenant, setTenant] = useState<TenantProfile | null>(null);
  const [form, setForm] = useState<TemplateForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [historyTemplate, setHistoryTemplate] = useState<TreatmentTemplate | null>(null);

  // ── Bootstrap: auth → profile → migrate legacy localStorage data ──────────
  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        const supabase = getSupabaseClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.replace("/login");
          return;
        }

        const profile = await loadTenantProfile(session.user.id);
        if (!profile) {
          throw new Error("No se encontro tenant activo.");
        }

        // One-time migration from localStorage → Supabase (no-op if already done)
        await migrateLegacyLocalStorageTemplates(profile.doctor_id, profile.clinic_id);

        if (active) {
          setTenant(profile);
        }
      } catch (loadError) {
        if (active) {
          setBootstrapError(
            loadError instanceof Error ? loadError.message : "No se pudieron cargar plantillas.",
          );
        }
      } finally {
        if (active) {
          setBootstrapping(false);
        }
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, [router]);

  // ── Data: Supabase via React Query ────────────────────────────────────────
  const { data: templates = [], isLoading: templatesLoading } = useTemplates(tenant);

  // ── Realtime: actualiza plantillas cuando otro dispositivo hace cambios ────
  useTemplatesRealtime(tenant);
  const editing = editingId ? (templates.find((t) => t.id === editingId) ?? null) : null;

  // ── Helpers ───────────────────────────────────────────────────────────────

  function invalidate() {
    if (tenant) {
      void queryClient.invalidateQueries({
        queryKey: templateKeys.tenant(tenant.clinic_id),
      });
    }
  }

  function startEdit(template: TreatmentTemplate) {
    setEditingId(template.id);
    setForm({
      trigger: template.trigger,
      title: template.title,
      treatment: template.treatment,
      extra_sections: template.extra_sections || {},
    });
    setFormError(null);
    // Scroll form into view on mobile
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  }

  // Restore a version: loads the content into the form for review before saving
  function handleRestoreVersion(notes: string) {
    setForm((current) => ({ ...current, treatment: notes }));
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!tenant) return;

    if (!form.trigger.trim() || !form.title.trim() || !form.treatment.trim()) {
      setFormError("Completa trigger, titulo y tratamiento.");
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const result = await saveTreatmentTemplate(
        {
          doctor_id: tenant.doctor_id,
          clinic_id: tenant.clinic_id,
          trigger: form.trigger,
          title: form.title,
          treatment: form.treatment,
          extra_sections: form.extra_sections,
        },
        editing ?? undefined,
      );

      if (!result) {
        setFormError("No se pudo guardar la plantilla. Verifica tu conexion.");
        return;
      }

      reset();
      invalidate();
    } catch {
      setFormError("Error inesperado al guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(template: TreatmentTemplate) {
    if (!tenant) return;

    try {
      await deleteTreatmentTemplate(tenant.doctor_id, tenant.clinic_id, template.id);
      if (editingId === template.id) {
        reset();
      }
      invalidate();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "No se pudo eliminar la plantilla.");
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (bootstrapping || templatesLoading) {
    return <p className="text-sm text-ink-soft">Cargando tratamientos...</p>;
  }

  if (bootstrapError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {bootstrapError}
      </div>
    );
  }

  return (
    <section className="hce-page">
      <header className="hce-page-header">
        <h1 className="hce-page-title">Tratamientos predeterminados</h1>
        <p className="hce-page-lead">
          Plantillas por medico con versionado automatico para reutilizar en consultas.
        </p>
      </header>

      {formError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {formError}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[400px_minmax(0,1fr)]">
        {/* ── FORM ── */}
        <form onSubmit={(e) => void handleSave(e)} className="hce-surface space-y-4">
          <h2 className="hce-section-title">{editing ? "Editar plantilla" : "Nueva plantilla"}</h2>

          {editing && (
            <div className="flex items-center gap-2 rounded-lg bg-accent/10 border border-accent/20 px-3 py-2">
              <span className="text-xs font-semibold text-accent">Editando v{editing.current_version}</span>
              <span className="text-xs text-ink-soft">— Guardar creará la versión {editing.current_version + 1}</span>
            </div>
          )}

          <label className="block space-y-2 text-sm font-medium text-ink-soft">
            <span>Enfermedad / sintoma trigger</span>
            <input
              className="w-full rounded-xl border border-border px-3 py-2 text-sm"
              value={form.trigger}
              onChange={(event) => setForm((current) => ({ ...current, trigger: event.target.value }))}
              required
            />
          </label>
          <label className="block space-y-2 text-sm font-medium text-ink-soft">
            <span>Titulo plantilla</span>
            <input
              className="w-full rounded-xl border border-border px-3 py-2 text-sm"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              required
            />
          </label>
          <label className="block space-y-2 text-sm font-medium text-ink-soft">
            <span>Tratamiento Médico (Receta)</span>
            <textarea
              className="min-h-32 w-full rounded-xl border border-border px-3 py-2 text-sm"
              value={form.treatment}
              onChange={(event) => setForm((current) => ({ ...current, treatment: event.target.value }))}
              required
            />
          </label>
          
          <div className="pt-4 border-t border-border/50">
            <p className="text-xs font-semibold text-ink uppercase tracking-wider mb-3">Extras (Plan Integral Opcional)</p>
            
            <div className="space-y-4">
              <label className="block space-y-2 text-sm font-medium text-ink-soft">
                <span>Dieta</span>
                <select
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm bg-card"
                  value={form.extra_sections.diet_type || ""}
                  onChange={(e) => setForm(c => ({ ...c, extra_sections: { ...c.extra_sections, diet_type: e.target.value } }))}
                >
                  <option value="">No especificada</option>
                  <option value="absoluta">Absoluta (NPO)</option>
                  <option value="liquida">Líquida clara</option>
                  <option value="blanda">Blanda / Papilla</option>
                  <option value="completa">Completa</option>
                  <option value="hiposodica">Hipósodica</option>
                  <option value="diabetica">Diabética</option>
                  <option value="hipocalorica">Hipocalórica</option>
                  <option value="renal">Renal</option>
                </select>
              </label>

              <label className="block space-y-2 text-sm font-medium text-ink-soft">
                <span>Medidas Generales / Cuidados</span>
                <textarea
                  className="min-h-20 w-full rounded-xl border border-border px-3 py-2 text-sm"
                  placeholder="Ej: Reposo en cama, cabecera a 30°..."
                  value={form.extra_sections.general_measures || ""}
                  onChange={(e) => setForm(c => ({ ...c, extra_sections: { ...c.extra_sections, general_measures: e.target.value } }))}
                />
              </label>

              <label className="block space-y-2 text-sm font-medium text-ink-soft">
                <span>Recomendaciones Generales</span>
                <textarea
                  className="min-h-20 w-full rounded-xl border border-border px-3 py-2 text-sm"
                  placeholder="Recomendaciones para la casa..."
                  value={form.extra_sections.recommendations || ""}
                  onChange={(e) => setForm(c => ({ ...c, extra_sections: { ...c.extra_sections, recommendations: e.target.value } }))}
                />
              </label>
              
              <label className="block space-y-2 text-sm font-medium text-ink-soft">
                <span>Signos de Alarma</span>
                <textarea
                  className="min-h-20 w-full rounded-xl border border-border px-3 py-2 text-sm"
                  placeholder="Acudir a urgencias si..."
                  value={form.extra_sections.warningSigns || ""}
                  onChange={(e) => setForm(c => ({ ...c, extra_sections: { ...c.extra_sections, warningSigns: e.target.value } }))}
                />
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              type="submit"
              disabled={saving}
            >
              {saving ? "Guardando..." : editing ? "Actualizar" : "Guardar"}
            </button>
            <button
              className="rounded-xl border border-border px-4 py-2 text-sm font-semibold"
              type="button"
              onClick={reset}
              disabled={saving}
            >
              Limpiar
            </button>
          </div>
        </form>

        {/* ── TEMPLATE LIST ── */}
        <div className="hce-surface">
          <h2 className="hce-section-title">Listado de plantillas</h2>
          <div className="mt-4 space-y-3">
            {templates.length === 0 ? (
              <p className="text-sm text-ink-soft">Aun no hay plantillas creadas.</p>
            ) : (
              templates.map((template) => (
                <article key={template.id} className="rounded-2xl border border-border p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-ink">{template.title}</h3>
                    <span className="text-xs font-semibold text-ink-soft bg-bg-soft px-2 py-0.5 rounded-full">
                      v{template.current_version}
                    </span>
                  </div>
                  <p className="text-xs uppercase tracking-[0.15em] text-ink-soft">{template.trigger}</p>
                  <p className="text-sm text-ink-soft whitespace-pre-wrap line-clamp-3">{template.treatment}</p>

                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => startEdit(template)}
                      className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold hover:bg-bg-soft transition-colors"
                    >
                      Editar
                    </button>

                    {/* Version history button — only shown when there are multiple versions */}
                    {template.versions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setHistoryTemplate(template)}
                        className="rounded-xl border border-accent/30 text-accent px-3 py-1.5 text-xs font-semibold hover:bg-accent/10 transition-colors flex items-center gap-1.5"
                      >
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
                          <path d="M8 1v7l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                        </svg>
                        Historial ({template.versions.length})
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => void handleDelete(template)}
                      className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── VERSION HISTORY MODAL ── */}
      {historyTemplate && (
        <VersionHistoryModal
          template={historyTemplate}
          onRestore={(notes) => {
            // Load into form and start editing
            startEdit(historyTemplate);
            handleRestoreVersion(notes);
          }}
          onClose={() => setHistoryTemplate(null)}
        />
      )}
    </section>
  );
}
