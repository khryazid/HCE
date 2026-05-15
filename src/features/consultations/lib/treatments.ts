/**
 * Treatment Templates — Storage Layer
 *
 * Migrated from localStorage to Supabase (multi-device, persistent, RLS-protected).
 *
 * Architecture:
 *   - All reads: Supabase (online) with graceful offline fallback
 *   - All writes: Supabase directly (React Query handles optimistic state)
 *   - Offline fallback: read-only (writes fail loudly so the user knows to reconnect)
 *
 * Public API is unchanged from the localStorage version so callers don't need updates.
 */

import { getSupabaseClient } from "@/lib/supabase/client";

function getTable() {
  return getSupabaseClient().from("treatment_templates");
}


// ─── Types ────────────────────────────────────────────────────────────────────

type TreatmentTemplateVersion = {
  version: number;
  notes: string;
  updated_at: string;
};

export type TreatmentTemplateExtraSections = {
  diet_type?: string;
  general_measures?: string;
  nursing_cares?: string;
  recommendations?: string;
  warningSigns?: string;
  labOrders?: string[];
  imagingOrders?: string[];
};

export type TreatmentTemplate = {
  id: string;
  doctor_id: string;
  clinic_id: string;
  trigger: string;
  title: string;
  treatment: string;
  extra_sections?: TreatmentTemplateExtraSections;
  current_version: number;
  versions: TreatmentTemplateVersion[];
  created_at: string;
  updated_at: string;
};

type TreatmentTemplateInput = {
  doctor_id: string;
  clinic_id: string;
  trigger: string;
  title: string;
  treatment: string;
  extra_sections?: TreatmentTemplateExtraSections;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nowIso() {
  return new Date().toISOString();
}

/**
 * Builds the next version of a template (create or update).
 * Pure function — no side effects. Used by both Supabase and test utilities.
 */
export function buildNextTemplate(
  template: TreatmentTemplateInput,
  existing?: TreatmentTemplate,
  timestamp = nowIso(),
): TreatmentTemplate {
  return existing
    ? {
        ...existing,
        trigger: template.trigger.trim(),
        title: template.title.trim(),
        treatment: template.treatment.trim(),
        extra_sections: template.extra_sections,
        current_version: existing.current_version + 1,
        versions: [
          ...existing.versions,
          {
            version: existing.current_version + 1,
            notes: template.treatment.trim(),
            updated_at: timestamp,
          },
        ],
        updated_at: timestamp,
      }
    : {
        id: crypto.randomUUID(),
        doctor_id: template.doctor_id,
        clinic_id: template.clinic_id,
        trigger: template.trigger.trim(),
        title: template.title.trim(),
        treatment: template.treatment.trim(),
        extra_sections: template.extra_sections,
        current_version: 1,
        versions: [
          {
            version: 1,
            notes: template.treatment.trim(),
            updated_at: timestamp,
          },
        ],
        created_at: timestamp,
        updated_at: timestamp,
      };
}

// ─── Supabase CRUD ────────────────────────────────────────────────────────────

/**
 * Fetches all treatment templates for a doctor from Supabase.
 * Returns an empty array on network failure (offline-tolerant).
 */
export async function listTreatmentTemplates(
  _doctorId: string,
  clinicId: string,
): Promise<TreatmentTemplate[]> {
  try {
    const { data, error } = await getTable()
      .select("*")
      .eq("clinic_id", clinicId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.warn("[treatments] Failed to fetch from Supabase:", error.message);
      return [];
    }

    return (data ?? []) as TreatmentTemplate[];
  } catch {
    // Network offline — return empty so the UI degrades gracefully
    return [];
  }
}

/**
 * Creates a new template or updates an existing one in Supabase.
 * Returns the saved template, or null on failure.
 */
export async function saveTreatmentTemplate(
  input: TreatmentTemplateInput,
  existing?: TreatmentTemplate,
): Promise<TreatmentTemplate | null> {
  const timestamp = nowIso();
  const next = buildNextTemplate(input, existing, timestamp);

  if (existing) {
    // UPDATE
    const { data, error } = await getTable()
      .update({
        trigger: next.trigger,
        title: next.title,
        treatment: next.treatment,
        extra_sections: next.extra_sections,
        current_version: next.current_version,
        versions: next.versions,
        updated_at: next.updated_at,
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      console.error("[treatments] Failed to update template:", error.message);
      return null;
    }
    return data as TreatmentTemplate;
  }

  // INSERT
  const { data, error } = await getTable()
    .insert({
      id: next.id,
      doctor_id: next.doctor_id,
      clinic_id: next.clinic_id,
      trigger: next.trigger,
      title: next.title,
      treatment: next.treatment,
      extra_sections: next.extra_sections,
      current_version: next.current_version,
      versions: next.versions,
      created_at: next.created_at,
      updated_at: next.updated_at,
    })
    .select()
    .single();

  if (error) {
    console.error("[treatments] Failed to insert template:", error.message);
    return null;
  }
  return data as TreatmentTemplate;
}

/**
 * Deletes a treatment template by ID from Supabase.
 */
export async function deleteTreatmentTemplate(
  _doctorId: string,
  _clinicId: string,
  id: string,
): Promise<void> {
  const { error } = await getTable().delete().eq("id", id);

  if (error) {
    console.error("[treatments] Failed to delete template:", error.message);
    throw new Error("No se pudo eliminar la plantilla. Intenta de nuevo.");
  }
}

// ─── localStorage Migration ───────────────────────────────────────────────────

/**
 * One-time migration: reads templates from the old localStorage key and
 * upserts them into Supabase. Safe to call multiple times — Supabase upserts
 * by `id` so duplicates are handled gracefully.
 *
 * Call this once in the app bootstrap (e.g. TreatmentsView mount).
 * After migration, removes the localStorage key so it doesn't run again.
 */
export async function migrateLegacyLocalStorageTemplates(
  doctorId: string,
  clinicId: string,
): Promise<void> {
  if (typeof window === "undefined") return;

  const lsKey = `hce:treatment_templates:${doctorId}:${clinicId}`;
  const raw = window.localStorage.getItem(lsKey);
  if (!raw) return;

  let legacy: TreatmentTemplate[] = [];
  try {
    const parsed = JSON.parse(raw);
    legacy = Array.isArray(parsed) ? parsed : [];
  } catch {
    // Corrupt localStorage data — just clean it up
    window.localStorage.removeItem(lsKey);
    return;
  }

  if (legacy.length === 0) {
    window.localStorage.removeItem(lsKey);
    return;
  }

  console.info(`[treatments] Migrating ${legacy.length} template(s) from localStorage to Supabase…`);

  const { error } = await getTable().upsert(legacy, { onConflict: "id" });

  if (error) {
    console.error("[treatments] Migration failed — localStorage preserved:", error.message);
    return;
  }

  // Migration successful — remove the old key
  window.localStorage.removeItem(lsKey);
  console.info("[treatments] Migration complete. localStorage key removed.");
}
