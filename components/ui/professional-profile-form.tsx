"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
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
import {
  exportEncryptionKeyBackup,
  importEncryptionKeyBackup,
} from "@/lib/db/crypto";
import {
  buildFileReadErrorMessage,
  buildRetryableErrorMessage,
} from "@/lib/ui/feedback-copy";

type ProfessionalProfileFormState = {
  professionalTitle: string;
  licenseNumber: string;
  yearsExperience: string;
  primaryPhone: string;
  secondaryPhone: string;
  professionalAddress: string;
  publicContactEmail: string;
  signatureName: string;
};

type ProfessionalProfileFormProps = {
  kicker: string;
  title: string;
  lead: string;
  submitLabel?: string;
};

const INITIAL_STATE: ProfessionalProfileFormState = {
  professionalTitle: "",
  licenseNumber: "",
  yearsExperience: "0",
  primaryPhone: "",
  secondaryPhone: "",
  professionalAddress: "",
  publicContactEmail: "",
  signatureName: "",
};

const EMPTY_LETTERHEAD_STATE: Pick<LetterheadSettings, "specialties" | "logo_data_url" | "signature_data_url"> = {
  specialties: "",
  logo_data_url: "",
  signature_data_url: "",
};

function toProfile(state: ProfessionalProfileFormState): DoctorOnboardingProfile {
  return {
    professional_title: state.professionalTitle,
    license_number: state.licenseNumber,
    years_experience: Number(state.yearsExperience) || 0,
    primary_phone: state.primaryPhone,
    secondary_phone: state.secondaryPhone || undefined,
    professional_address: state.professionalAddress,
    public_contact_email: state.publicContactEmail || undefined,
    signature_name: state.signatureName,
  };
}

function fromMetadata(profile: DoctorOnboardingProfile): ProfessionalProfileFormState {
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

export function ProfessionalProfileForm({
  kicker,
  title,
  lead,
  submitLabel = "Guardar cambios",
}: ProfessionalProfileFormProps) {
  const router = useRouter();
  const { tenant } = useTenant();
  const [form, setForm] = useState<ProfessionalProfileFormState>(INITIAL_STATE);
  const [letterhead, setLetterhead] = useState(EMPTY_LETTERHEAD_STATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restoringKey, setRestoringKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadSession = async () => {
      try {
        const supabase = getSupabaseClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.replace("/login");
          return;
        }

        const existing = readOnboardingProfile(session.user.user_metadata);

        if (existing && active) {
          setForm(fromMetadata(existing));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadSession();

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (!tenant) {
      return;
    }

    const localLetterhead = loadLetterheadSettings(tenant.doctor_id, tenant.clinic_id);

    setLetterhead((current) => ({
      specialties:
        current.specialties || localLetterhead.specialties || tenant.specialties.join(", "),
      logo_data_url: localLetterhead.logo_data_url || current.logo_data_url,
      signature_data_url: localLetterhead.signature_data_url || current.signature_data_url,
    }));
  }, [tenant]);

  async function handleLogoSelected(file: File | null) {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("El logo debe ser una imagen valida (PNG, JPG o WEBP).");
      return;
    }

    if (file.size > 700_000) {
      setError("El logo es muy pesado. Usa una imagen menor a 700KB.");
      return;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error(buildFileReadErrorMessage("el archivo seleccionado")));
      reader.readAsDataURL(file);
    });

    setLetterhead((current) => ({ ...current, logo_data_url: dataUrl }));
    setError(null);
  }

  async function handleSignatureSelected(file: File | null) {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("La firma debe ser una imagen valida (PNG, JPG o WEBP).");
      return;
    }

    if (file.size > 700_000) {
      setError("La firma es muy pesada. Usa una imagen menor a 700KB.");
      return;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error(buildFileReadErrorMessage("el archivo seleccionado")));
      reader.readAsDataURL(file);
    });

    setLetterhead((current) => ({ ...current, signature_data_url: dataUrl }));
    setError(null);
  }

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
          phone_secondary: form.secondaryPhone || "",
          contact_email: form.publicContactEmail || "",
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

  async function handleExportKeyBackup() {
    try {
      setError(null);
      const backup = await exportEncryptionKeyBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const dateTag = new Date().toISOString().slice(0, 10);
      anchor.href = url;
      anchor.download = `hce-key-backup-${dateTag}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      setSuccessMessage("Backup de clave descargado. Guardalo en un lugar seguro.");
    } catch (backupError) {
      setError(
        backupError instanceof Error
          ? backupError.message
          : buildRetryableErrorMessage("exportar la clave de cifrado"),
      );
    }
  }

  async function handleImportKeyBackup(file: File | null) {
    if (!file) {
      return;
    }

    setRestoringKey(true);
    setError(null);

    try {
      const content = await file.text();
      const parsed = JSON.parse(content) as unknown;
      await importEncryptionKeyBackup(parsed);
      setSuccessMessage(
        "Clave restaurada correctamente. Ya puedes leer datos cifrados de este backup.",
      );
    } catch (importError) {
      setError(
        importError instanceof Error
          ? importError.message
          : buildRetryableErrorMessage("importar el backup de clave"),
      );
    } finally {
      setRestoringKey(false);
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

      <form onSubmit={handleSubmit} className="grid gap-4 rounded-3xl border border-border bg-card p-6 shadow-sm sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-ink-soft">
          <span>Titulo profesional</span>
          <input
            className="hce-input"
            value={form.professionalTitle}
            onChange={(event) =>
              setForm((current) => ({ ...current, professionalTitle: event.target.value }))
            }
            placeholder="Dr. / Dra."
            required
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-ink-soft">
          <span>Numero de licencia profesional</span>
          <input
            className="hce-input"
            value={form.licenseNumber}
            onChange={(event) =>
              setForm((current) => ({ ...current, licenseNumber: event.target.value }))
            }
            required
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-ink-soft">
          <span>Anos de experiencia</span>
          <input
            className="hce-input"
            value={form.yearsExperience}
            onChange={(event) =>
              setForm((current) => ({ ...current, yearsExperience: event.target.value }))
            }
            type="number"
            min={0}
            max={80}
            required
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-ink-soft">
          <span>Telefono principal</span>
          <input
            className="hce-input"
            value={form.primaryPhone}
            onChange={(event) =>
              setForm((current) => ({ ...current, primaryPhone: event.target.value }))
            }
            required
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-ink-soft">
          <span>Telefono secundario (opcional)</span>
          <input
            className="hce-input"
            value={form.secondaryPhone}
            onChange={(event) =>
              setForm((current) => ({ ...current, secondaryPhone: event.target.value }))
            }
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-ink-soft">
          <span>Correo publico de contacto (opcional)</span>
          <input
            className="hce-input"
            value={form.publicContactEmail}
            onChange={(event) =>
              setForm((current) => ({ ...current, publicContactEmail: event.target.value }))
            }
            type="email"
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-ink-soft sm:col-span-2">
          <span>Direccion profesional</span>
          <input
            className="hce-input"
            value={form.professionalAddress}
            onChange={(event) =>
              setForm((current) => ({ ...current, professionalAddress: event.target.value }))
            }
            required
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-ink-soft sm:col-span-2">
          <span>Nombre para firma y membrete</span>
          <input
            className="hce-input"
            value={form.signatureName}
            onChange={(event) =>
              setForm((current) => ({ ...current, signatureName: event.target.value }))
            }
            required
          />
        </label>

        <div className="space-y-3 rounded-2xl border border-border bg-bg-soft p-4 sm:col-span-2">
          <div>
            <p className="text-sm font-semibold text-ink">Logo profesional para PDF</p>
            <p className="text-xs text-ink-soft">Se guarda en este navegador (localStorage), sin enviarse a Supabase.</p>
          </div>

          <input
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              void handleLogoSelected(file);
            }}
          />

          {letterhead.logo_data_url ? (
            <div className="flex items-center gap-4">
              <Image
                src={letterhead.logo_data_url}
                alt="Logo profesional"
                width={64}
                height={64}
                unoptimized
                className="h-16 w-16 rounded-xl border border-border bg-card object-contain p-1"
              />
              <button
                type="button"
                onClick={() => setLetterhead((current) => ({ ...current, logo_data_url: "" }))}
                className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-ink-soft"
              >
                Quitar logo
              </button>
            </div>
          ) : null}
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-bg-soft p-4 sm:col-span-2">
          <div>
            <p className="text-sm font-semibold text-ink">Firma profesional para PDF</p>
            <p className="text-xs text-ink-soft">Dibuja tu firma en papel blanco, tómale una foto y súbela aquí. Se imprimirá al final de la receta.</p>
          </div>

          <input
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              void handleSignatureSelected(file);
            }}
          />

          {letterhead.signature_data_url ? (
            <div className="flex items-center gap-4">
              <Image
                src={letterhead.signature_data_url}
                alt="Firma profesional"
                width={120}
                height={45}
                unoptimized
                className="h-[45px] w-[120px] rounded-xl border border-border bg-card object-contain p-1"
              />
              <button
                type="button"
                onClick={() => setLetterhead((current) => ({ ...current, signature_data_url: "" }))}
                className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-ink-soft"
              >
                Quitar firma
              </button>
            </div>
          ) : null}
        </div>

        <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 sm:col-span-2">
          <div>
            <p className="text-sm font-semibold text-amber-900">Backup de clave de cifrado</p>
            <p className="text-xs text-amber-800">Exporta esta clave antes de limpiar navegador o cambiar de dispositivo. Sin ella, los datos PHI cifrados no se podran descifrar.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleExportKeyBackup()}
              className="rounded-xl border border-amber-300 bg-card px-4 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
            >
              Descargar backup de clave
            </button>

            <label className="inline-flex cursor-pointer items-center rounded-xl border border-amber-300 bg-card px-4 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100">
              {restoringKey ? "Restaurando..." : "Importar backup de clave"}
              <input
                type="file"
                accept="application/json"
                className="hidden"
                disabled={restoringKey}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  void handleImportKeyBackup(file);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>
        </div>

        <label className="space-y-2 text-sm font-medium text-ink-soft sm:col-span-2">
          <span>Especialidades para membrete PDF</span>
          <input
            className="hce-input"
            value={letterhead.specialties}
            onChange={(event) =>
              setLetterhead((current) => ({ ...current, specialties: event.target.value }))
            }
            placeholder="Ej: Pediatria, Medicina general"
            required
          />
        </label>

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">{error}</p>
        ) : null}

        {successMessage ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 sm:col-span-2">{successMessage}</p>
        ) : null}

        <button type="submit" disabled={saving} className="sm:col-span-2 hce-btn-primary min-h-12">
          {saving ? "Guardando..." : submitLabel}
        </button>
      </form>
    </section>
  );
}