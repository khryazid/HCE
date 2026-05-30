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

import "./treatments.css";

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
  
  // UI State
  const [isSlideoverOpen, setIsSlideoverOpen] = useState(false);
  const [historyTemplate, setHistoryTemplate] = useState<TreatmentTemplate | null>(null);

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { router.replace("/login"); return; }
        const profile = await loadTenantProfile(session.user.id);
        if (!profile) throw new Error("No se encontro tenant activo.");
        
        await migrateLegacyLocalStorageTemplates(profile.doctor_id, profile.clinic_id);
        
        if (active) setTenant(profile);
      } catch (loadError) {
        if (active) setBootstrapError(loadError instanceof Error ? loadError.message : "Error al cargar.");
      } finally {
        if (active) setBootstrapping(false);
      }
    };
    void bootstrap();
    return () => { active = false; };
  }, [router]);

  const { data: templates = [], isLoading: templatesLoading } = useTemplates(tenant);
  useTemplatesRealtime(tenant);
  
  const editing = editingId ? (templates.find((t) => t.id === editingId) ?? null) : null;

  // ── Helpers ───────────────────────────────────────────────────────────────
  function invalidate() {
    if (tenant) void queryClient.invalidateQueries({ queryKey: templateKeys.tenant(tenant.clinic_id) });
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
    setIsSlideoverOpen(true);
  }

  function startNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setIsSlideoverOpen(true);
  }

  function closeSlideover() {
    setIsSlideoverOpen(false);
    // Slight delay to allow animation to finish before resetting state
    setTimeout(() => {
      setEditingId(null);
      setForm(EMPTY_FORM);
      setFormError(null);
    }, 300);
  }

  function handleRestoreVersion(notes: string) {
    setForm((current) => ({ ...current, treatment: notes }));
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tenant) return;
    if (!form.trigger.trim() || !form.title.trim() || !form.treatment.trim()) {
      setFormError("Completa trigger, título y tratamiento.");
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
        setFormError("Error al guardar la plantilla.");
        return;
      }
      closeSlideover();
      invalidate();
    } catch {
      setFormError("Error inesperado al guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(template: TreatmentTemplate) {
    if (!tenant) return;
    if (!confirm(`¿Eliminar la plantilla "${template.title}"?`)) return;
    
    try {
      await deleteTreatmentTemplate(tenant.doctor_id, tenant.clinic_id, template.id);
      if (editingId === template.id) closeSlideover();
      invalidate();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al eliminar.");
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (bootstrapping || templatesLoading) {
    return <p className="text-sm text-ink-soft">Cargando tratamientos...</p>;
  }

  if (bootstrapError) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{bootstrapError}</div>;
  }

  return (
    <div className="w-full">
      {/* Page header */}
      <div className="gx-th-header gx-s gx-s1">
        <div>
          <h1 className="gx-th-title">Plantillas de Tratamiento</h1>
          <p className="gx-th-sub">Tus recetas prediseñadas para reutilizar rápidamente en consultas.</p>
        </div>
        <button className="gx-btn gx-btn-p" onClick={startNew}>
          + Nueva plantilla
        </button>
      </div>

      {/* Table */}
      <div className="gx-table-wrap gx-s gx-s2">
        <table className="gx-table">
          <thead>
            <tr>
              <th>Título y Versión</th>
              <th>Trigger (Síntoma/Dx)</th>
              <th>Resumen del tratamiento</th>
              <th>Actualizado</th>
              <th style={{ width: 1 }}></th>
            </tr>
          </thead>
          <tbody>
            {templates.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-ink-soft">
                  No hay plantillas creadas. Usa &quot;+ Nueva plantilla&quot; para empezar.
                </td>
              </tr>
            ) : (
              templates.map((t) => (
                <tr key={t.id} onClick={() => startEdit(t)}>
                  <td>
                    <span className="gx-t-title">{t.title}</span>
                    <span className="gx-t-version">v{t.current_version}</span>
                  </td>
                  <td>
                    <span className="gx-t-trigger">{t.trigger}</span>
                  </td>
                  <td>
                    <div className="gx-t-summary">{t.treatment}</div>
                  </td>
                  <td>
                    <span className="gx-date">
                      {new Date(t.updated_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  </td>
                  <td>
                    <div className="gx-row-actions">
                      {t.versions.length > 1 && (
                        <button
                          className="gx-row-act"
                          onClick={(e) => { e.stopPropagation(); setHistoryTemplate(t); }}
                        >
                          Historial ({t.versions.length})
                        </button>
                      )}
                      <button className="gx-row-act" onClick={(e) => { e.stopPropagation(); startEdit(t); }}>
                        Editar
                      </button>
                      <button className="gx-row-act gx-row-act-danger" onClick={(e) => { e.stopPropagation(); void handleDelete(t); }}>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── MODAL FORMULARIO ── */}
      {isSlideoverOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={closeSlideover}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl flex flex-col animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="border-b border-border p-5 flex items-center justify-between bg-bg-soft">
              <h2 className="font-display font-bold text-lg text-ink">{editing ? "Editar Plantilla" : "Nueva Plantilla"}</h2>
              <button className="text-ink-soft hover:text-ink transition-colors p-1 rounded-full hover:bg-border/50" onClick={closeSlideover}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            
            <div className="overflow-y-auto p-6 flex-1">
              <form id="template-form" onSubmit={(e) => void handleSave(e)}>
                {formError && (
                  <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {formError}
                  </div>
                )}
                
                {editing && (
                  <div className="mb-6 flex items-center gap-2 rounded-lg bg-accent/10 border border-accent/20 px-3 py-2">
                    <span className="text-xs font-semibold text-accent">Editando v{editing.current_version}</span>
                    <span className="text-xs text-ink-soft">— Guardar creará la versión {editing.current_version + 1}</span>
                  </div>
                )}

                <div className="gx-field">
                  <label className="gx-label">Enfermedad o síntoma (Trigger)</label>
                  <input
                    className="gx-input"
                    placeholder="Ej. Faringitis aguda"
                    value={form.trigger}
                    onChange={(e) => setForm((c) => ({ ...c, trigger: e.target.value }))}
                    required
                  />
                </div>
                
                <div className="gx-field">
                  <label className="gx-label">Título de la plantilla</label>
                  <input
                    className="gx-input"
                    placeholder="Ej. Plan estándar Faringitis Adultos"
                    value={form.title}
                    onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
                    required
                  />
                </div>
                
                <div className="gx-field">
                  <label className="gx-label">Tratamiento Médico (Receta)</label>
                  <textarea
                    className="gx-textarea"
                    placeholder="1. Amoxicilina 500mg...&#10;2. Ibuprofeno 400mg..."
                    value={form.treatment}
                    onChange={(e) => setForm((c) => ({ ...c, treatment: e.target.value }))}
                    required
                  />
                </div>

                <h3 className="gx-section-divider">Plan Integral Opcional</h3>

                <div className="gx-field">
                  <label className="gx-label">Tipo de Dieta</label>
                  <select
                    className="gx-select"
                    value={form.extra_sections.diet_type || ""}
                    onChange={(e) => setForm((c) => ({ ...c, extra_sections: { ...c.extra_sections, diet_type: e.target.value } }))}
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
                </div>

                <div className="gx-field">
                  <label className="gx-label">Medidas Generales / Cuidados</label>
                  <textarea
                    className="gx-textarea"
                    style={{ minHeight: '80px' }}
                    placeholder="Ej: Reposo relativo, hidratación abundante..."
                    value={form.extra_sections.general_measures || ""}
                    onChange={(e) => setForm((c) => ({ ...c, extra_sections: { ...c.extra_sections, general_measures: e.target.value } }))}
                  />
                </div>

                <div className="gx-field">
                  <label className="gx-label">Recomendaciones Generales</label>
                  <textarea
                    className="gx-textarea"
                    style={{ minHeight: '80px' }}
                    placeholder="Recomendaciones para el hogar..."
                    value={form.extra_sections.recommendations || ""}
                    onChange={(e) => setForm((c) => ({ ...c, extra_sections: { ...c.extra_sections, recommendations: e.target.value } }))}
                  />
                </div>

                <div className="gx-field">
                  <label className="gx-label">Signos de Alarma</label>
                  <textarea
                    className="gx-textarea"
                    style={{ minHeight: '80px' }}
                    placeholder="Acudir a urgencias si presenta..."
                    value={form.extra_sections.warningSigns || ""}
                    onChange={(e) => setForm((c) => ({ ...c, extra_sections: { ...c.extra_sections, warningSigns: e.target.value } }))}
                  />
                </div>
              </form>
            </div>
            <div className="border-t border-border p-5 bg-bg-soft flex justify-end gap-3">
              <button className="gx-btn gx-btn-s" onClick={closeSlideover} type="button" disabled={saving}>
                Cancelar
              </button>
              <button className="gx-btn gx-btn-p" type="submit" form="template-form" disabled={saving}>
                {saving ? "Guardando..." : "Guardar plantilla"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DE HISTORIAL DE VERSIONES ── */}
      {historyTemplate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setHistoryTemplate(null)}>
          <div className="w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="border-b border-border p-4 flex items-center justify-between bg-bg-soft">
              <div>
                <h3 className="font-display font-bold text-ink">Historial de Versiones</h3>
                <p className="text-xs text-ink-soft">{historyTemplate.title}</p>
              </div>
              <button className="text-ink-soft hover:text-ink" onClick={() => setHistoryTemplate(null)}>✕</button>
            </div>
            <div className="overflow-y-auto p-4 space-y-4">
              {[...historyTemplate.versions].sort((a, b) => b.version - a.version).map(v => (
                <div key={v.version} className="border border-border rounded-xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-sm">Versión {v.version} {v.version === historyTemplate.current_version && <span className="text-xs text-accent bg-accent/10 px-2 py-0.5 rounded-full ml-2">Actual</span>}</span>
                    <span className="text-xs text-ink-soft">{new Date(v.updated_at).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-ink-soft whitespace-pre-wrap">{v.notes}</p>
                  {v.version !== historyTemplate.current_version && (
                    <button 
                      className="mt-3 text-xs font-semibold text-accent hover:underline"
                      onClick={() => {
                        startEdit(historyTemplate);
                        handleRestoreVersion(v.notes);
                        setHistoryTemplate(null);
                      }}
                    >
                      ↩ Cargar esta versión en el editor
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
