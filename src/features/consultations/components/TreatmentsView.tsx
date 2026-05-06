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
} from "@/features/consultations/lib/treatments";
import { useTemplates, templateKeys } from "@/features/consultations/lib/use-consultation-queries";

type TemplateForm = {
  trigger: string;
  title: string;
  treatment: string;
};

const EMPTY_FORM: TemplateForm = {
  trigger: "",
  title: "",
  treatment: "",
};

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

  // ── Data: Supabase via React Query (updates automatically) ────────────────
  const { data: templates = [], isLoading: templatesLoading } = useTemplates(tenant);

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
    });
  }

  function reset() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
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
        <form onSubmit={(e) => void handleSave(e)} className="hce-surface space-y-4">
          <h2 className="hce-section-title">{editing ? "Editar plantilla" : "Nueva plantilla"}</h2>
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
            <span>Tratamiento recomendado</span>
            <textarea
              className="min-h-32 w-full rounded-xl border border-border px-3 py-2 text-sm"
              value={form.treatment}
              onChange={(event) => setForm((current) => ({ ...current, treatment: event.target.value }))}
              required
            />
          </label>
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
                    <span className="text-xs font-semibold text-ink-soft">v{template.current_version}</span>
                  </div>
                  <p className="text-xs uppercase tracking-[0.15em] text-ink-soft">{template.trigger}</p>
                  <p className="text-sm text-ink-soft whitespace-pre-wrap">{template.treatment}</p>
                  <p className="text-xs text-ink-soft">Historial: {template.versions.length} versiones</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(template)}
                      className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(template)}
                      className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700"
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
    </section>
  );
}
