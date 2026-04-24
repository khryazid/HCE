"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  readOnboardingProfile,
  saveOnboardingProfile,
  type DoctorOnboardingProfile,
} from "@/lib/supabase/onboarding";

type OnboardingFormState = {
  professionalTitle: string;
  licenseNumber: string;
  yearsExperience: string;
  primaryPhone: string;
  secondaryPhone: string;
  professionalAddress: string;
  publicContactEmail: string;
  signatureName: string;
};

const INITIAL_STATE: OnboardingFormState = {
  professionalTitle: "",
  licenseNumber: "",
  yearsExperience: "0",
  primaryPhone: "",
  secondaryPhone: "",
  professionalAddress: "",
  publicContactEmail: "",
  signatureName: "",
};

function toProfile(state: OnboardingFormState): DoctorOnboardingProfile {
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

function fromMetadata(profile: DoctorOnboardingProfile): OnboardingFormState {
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

export default function OnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState<OnboardingFormState>(INITIAL_STATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await saveOnboardingProfile(toProfile(form));
      router.replace("/dashboard");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo guardar el onboarding.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-600">Cargando onboarding...</p>;
  }

  return (
    <section className="mx-auto w-full max-w-3xl space-y-6">
      <header className="rounded-3xl border border-cyan-100 bg-cyan-50/70 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-800">
          Perfil Profesional Inicial
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          Completa tus datos obligatorios de medico
        </h1>
        <p className="mt-2 text-sm text-slate-700">
          Este paso se solicita una sola vez para habilitar dashboard, consultas y documentos clinicos.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Titulo profesional</span>
          <input
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-600 focus:ring-2"
            value={form.professionalTitle}
            onChange={(event) =>
              setForm((current) => ({ ...current, professionalTitle: event.target.value }))
            }
            placeholder="Dr. / Dra."
            required
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Numero de licencia profesional</span>
          <input
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-600 focus:ring-2"
            value={form.licenseNumber}
            onChange={(event) =>
              setForm((current) => ({ ...current, licenseNumber: event.target.value }))
            }
            required
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Anos de experiencia</span>
          <input
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-600 focus:ring-2"
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

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Telefono principal</span>
          <input
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-600 focus:ring-2"
            value={form.primaryPhone}
            onChange={(event) =>
              setForm((current) => ({ ...current, primaryPhone: event.target.value }))
            }
            required
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Telefono secundario (opcional)</span>
          <input
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-600 focus:ring-2"
            value={form.secondaryPhone}
            onChange={(event) =>
              setForm((current) => ({ ...current, secondaryPhone: event.target.value }))
            }
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Correo publico de contacto (opcional)</span>
          <input
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-600 focus:ring-2"
            value={form.publicContactEmail}
            onChange={(event) =>
              setForm((current) => ({ ...current, publicContactEmail: event.target.value }))
            }
            type="email"
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
          <span>Direccion profesional</span>
          <input
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-600 focus:ring-2"
            value={form.professionalAddress}
            onChange={(event) =>
              setForm((current) => ({ ...current, professionalAddress: event.target.value }))
            }
            required
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
          <span>Nombre para firma y membrete</span>
          <input
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-600 focus:ring-2"
            value={form.signatureName}
            onChange={(event) =>
              setForm((current) => ({ ...current, signatureName: event.target.value }))
            }
            required
          />
        </label>

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          className="sm:col-span-2 inline-flex items-center justify-center rounded-xl bg-cyan-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Guardar y continuar"}
        </button>
      </form>
    </section>
  );
}
