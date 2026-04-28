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
} from "@/lib/local-data/letterhead";
import { buildRetryableErrorMessage } from "@/lib/ui/feedback-copy";
import { ProfileSectionPersonal } from "@/components/ui/profile-section-personal";
import { ProfileSectionLetterhead } from "@/components/ui/profile-section-letterhead";
import { ProfileSectionKeyBackup } from "@/components/ui/profile-section-key-backup";

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

  // Load letterhead from localStorage
  useEffect(() => {
    if (!tenant) return;
    const local = loadLetterheadSettings(tenant.doctor_id, tenant.clinic_id);
    setLetterhead((current) => ({
      specialties: current.specialties || local.specialties || tenant.specialties.join(", "),
      logo_data_url: local.logo_data_url || current.logo_data_url,
      signature_data_url: local.signature_data_url || current.signature_data_url,
    }));
  }, [tenant]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await saveOnboardingProfile(toProfile(form));

      if (tenant) {
        saveLetterheadSettings(tenant.doctor_id, tenant.clinic_id, {
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
      }

      setSuccessMessage(
        "Perfil actualizado correctamente. Puedes seguir editando cuando lo necesites.",
      );
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
    <section className="mx-auto w-full max-w-3xl hce-page">
      <header className="hce-surface bg-[linear-gradient(180deg,var(--surface-glow),transparent)]">
        <p className="hce-kicker text-cyan-800">{kicker}</p>
        <h1 className="mt-2 hce-page-title">{title}</h1>
        <p className="mt-2 hce-page-lead">{lead}</p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="grid gap-4 rounded-3xl border border-border bg-card p-6 shadow-sm sm:grid-cols-2"
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

        {/* Sección 3 — Backup de clave */}
        <ProfileSectionKeyBackup
          onSuccess={setSuccessMessage}
          onError={setError}
        />

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">
            {error}
          </p>
        ) : null}

        {successMessage ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 sm:col-span-2">
            {successMessage}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={saving}
          className="sm:col-span-2 min-h-12 justify-center"
        >
          {saving ? "Guardando..." : submitLabel}
        </Button>
      </form>
    </section>
  );
}