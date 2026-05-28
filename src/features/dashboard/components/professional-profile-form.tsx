"use client";

/**
 * components/ui/professional-profile-form.tsx
 *
 * Container del formulario de perfil profesional.
 * Carga datos de sesión y lettterhead local, orquesta las 3 secciones
 * y guarda el perfil en Supabase + localStorage.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useTenant } from "@/lib/supabase/tenant-context";
import {
  readOnboardingProfile,
  saveOnboardingProfile,
  type DoctorOnboardingProfile,
} from "@/lib/supabase/onboarding";
import {
  loadLetterheadSettings,
  saveLetterheadSettings,
  type LetterheadSettings,
} from "@/features/dashboard/lib/letterhead";
import { buildRetryableErrorMessage } from "@/lib/ui/feedback-copy";
import { ProfileSectionPersonal } from "@/features/dashboard/components/profile-section-personal";
import { ProfileSectionLetterhead } from "@/features/dashboard/components/profile-section-letterhead";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProfileFormState = {
  professionalTitle: string;
  licenseNumber: string;
  yearsExperience: string;
  primaryPhone: string;
  secondaryPhone: string;
  professionalAddress: string;
  publicContactEmail: string;
  signatureName: string;
};

type LetterheadState = Pick<
  LetterheadSettings,
  "specialties" | "logo_data_url" | "signature_data_url"
>;

type ProfessionalProfileFormProps = {
  kicker: string;
  title: string;
  lead: string;
  submitLabel?: string;
  onSuccess?: () => void;
};

// ─── Pure helpers ─────────────────────────────────────────────────────────────

const INITIAL_FORM: ProfileFormState = {
  professionalTitle: "",
  licenseNumber: "",
  yearsExperience: "0",
  primaryPhone: "",
  secondaryPhone: "",
  professionalAddress: "",
  publicContactEmail: "",
  signatureName: "",
};

const EMPTY_LETTERHEAD: LetterheadState = {
  specialties: "",
  logo_data_url: "",
  signature_data_url: "",
};

function toProfile(form: ProfileFormState): DoctorOnboardingProfile {
  return {
    professional_title: form.professionalTitle,
    license_number: form.licenseNumber,
    years_experience: Number(form.yearsExperience) || 0,
    primary_phone: form.primaryPhone,
    secondary_phone: form.secondaryPhone || undefined,
    professional_address: form.professionalAddress,
    public_contact_email: form.publicContactEmail || undefined,
    signature_name: form.signatureName,
  };
}

function fromMetadata(profile: DoctorOnboardingProfile): ProfileFormState {
  return {
    professionalTitle: profile.professional_title,
    licenseNumber: profile.license_number,
    yearsExperience: String(profile.years_experience),
    primaryPhone: profile.primary_phone,
    secondaryPhone: profile.secondary_phone ?? "",
    professionalAddress: profile.professional_address,
    publicContactEmail: profile.public_contact_email ?? "",
    signatureName: profile.signature_name,
  };
}

// ─── Container ────────────────────────────────────────────────────────────────

export function ProfessionalProfileForm({
  kicker,
  title,
  lead,
  submitLabel = "Guardar cambios",
}: ProfessionalProfileFormProps) {
  const router = useRouter();
  const { tenant } = useTenant();
  const [form, setForm] = useState<ProfileFormState>(INITIAL_FORM);
  const [letterhead, setLetterhead] = useState<LetterheadState>(EMPTY_LETTERHEAD);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load Supabase session → form
  useEffect(() => {
    let active = true;
    const loadSession = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { router.replace("/login"); return; }
        const existing = readOnboardingProfile(session.user.user_metadata);
        if (existing && active) setForm(fromMetadata(existing));
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadSession();
    return () => { active = false; };
  }, [router]);

  // Load letterhead from localStorage and ensure tenant specialties are used as fallback
  useEffect(() => {
    if (!tenant) return;
    const local = loadLetterheadSettings(tenant.doctor_id, tenant.clinic_id);
    
    setLetterhead((current) => {
      // Si current.specialties esta vacio, forzamos usar local o las del tenant.
      // Esto arregla el bug donde no se pre-llenaban las especialidades del registro.
      const resolvedSpecialties = current.specialties
        ? current.specialties
        : (local.specialties && local.specialties.trim().length > 0 
             ? local.specialties 
             : tenant.specialties.join(", "));

      return {
        specialties: resolvedSpecialties,
        logo_data_url: local.logo_data_url || current.logo_data_url,
        signature_data_url: local.signature_data_url || current.signature_data_url,
      };
    });
  }, [tenant]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await saveOnboardingProfile(toProfile(form));

      if (tenant) {
        await saveLetterheadSettings(tenant.doctor_id, tenant.clinic_id, {
          doctor_name: form.signatureName,
          professional_title: form.professionalTitle,
          specialties: letterhead.specialties || tenant.specialties.join(", "),
          address: form.professionalAddress,
          phone_primary: form.primaryPhone,
          phone_secondary: form.secondaryPhone ?? "",
          contact_email: form.publicContactEmail ?? "",
          logo_data_url: letterhead.logo_data_url,
          signature_data_url: letterhead.signature_data_url,
        });
      } else {
        // Healing: Si el perfil no existía en la base de datos (por un error previo o cuenta vieja),
        // lo creamos ahora y le otorgamos su trial, usando el Server Action que tiene service_role.
        const { createTenantProfileWithTrial } = await import("@/lib/supabase/actions");
        const { createClinicId } = await import("@/lib/supabase/profile");
        const supabase = await import("@/lib/supabase/client").then(m => m.getSupabaseClient());
        
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { createClinicId } = await import("@/lib/supabase/profile");
          const metadata = session.user.user_metadata;
          const clinicId = metadata.clinic_id || createClinicId();
          const fullName = metadata.full_name || form.signatureName || "Doctor";
          
          const specialtiesRaw = metadata.specialties;
          const specialties = Array.isArray(specialtiesRaw) && specialtiesRaw.length > 0 
            ? specialtiesRaw 
            : letterhead.specialties ? letterhead.specialties.split(",").map(s => s.trim()) : ["Medicina General"];
          
          await createTenantProfileWithTrial({
            clinicId,
            fullName,
            specialties,
            plan: metadata.plan || "basic",
          });
        }
      }

      setSuccessMessage(
        "Perfil actualizado correctamente. Puedes seguir editando cuando lo necesites.",
      );

      if (props.onSuccess) {
        props.onSuccess();
      } else {
        // Redireccionar al dashboard después de guardar forzando recarga de contexto
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1200);
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : buildRetryableErrorMessage("guardar el perfil profesional"),
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-ink-soft">Cargando perfil profesional...</p>;
  }

  return (
    <section className="w-full">
      <header className="mb-8">
        <h2 className="text-xl font-bold text-ink mb-2">{title}</h2>
        <p className="text-sm text-ink-soft">{lead}</p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="space-y-8"
      >
        {/* Sección 1 — Datos profesionales */}
        <ProfileSectionPersonal
          {...form}
          onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
        />

        {/* Sección 2 — Membrete y firma */}
        <ProfileSectionLetterhead
          specialties={letterhead.specialties}
          logoDataUrl={letterhead.logo_data_url ?? ""}
          signatureDataUrl={letterhead.signature_data_url ?? ""}
          onSpecialtiesChange={(value) =>
            setLetterhead((current) => ({ ...current, specialties: value }))
          }
          onLogoChange={(dataUrl) =>
            setLetterhead((current) => ({ ...current, logo_data_url: dataUrl }))
          }
          onSignatureChange={(dataUrl) =>
            setLetterhead((current) => ({ ...current, signature_data_url: dataUrl }))
          }
          onError={setError}
        />


        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 w-full">
            {error}
          </p>
        ) : null}

        {successMessage ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 w-full">
            {successMessage}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={saving}
          className="w-full min-h-12 justify-center"
        >
          {saving ? "Guardando..." : submitLabel}
        </Button>
      </form>
    </section>
  );
}