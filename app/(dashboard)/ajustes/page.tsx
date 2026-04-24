"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getSupabaseClient } from "@/lib/supabase/client";
import { loadTenantProfile, type TenantProfile } from "@/lib/supabase/profile";
import {
  loadLetterheadSettings,
  saveLetterheadSettings,
  type LetterheadSettings,
} from "@/lib/local-data/letterhead";

const EMPTY_SETTINGS: LetterheadSettings = {
  doctor_name: "",
  professional_title: "",
  specialties: "",
  address: "",
  phone_primary: "",
  phone_secondary: "",
  contact_email: "",
};

export default function AjustesPage() {
  const router = useRouter();
  const [tenant, setTenant] = useState<TenantProfile | null>(null);
  const [settings, setSettings] = useState<LetterheadSettings>(EMPTY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  async function handleLogoSelected(file: File | null) {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage("El logo debe ser una imagen valida (PNG, JPG o WEBP).");
      return;
    }

    if (file.size > 700_000) {
      setMessage("El logo es muy pesado. Usa una imagen menor a 700KB.");
      return;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
      reader.readAsDataURL(file);
    });

    setSettings((current) => ({ ...current, logo_data_url: dataUrl }));
    setMessage("Logo cargado localmente. Se incluira en los siguientes PDFs.");
  }

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
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
        router.replace("/dashboard");
        return;
      }

      if (active) {
        setTenant(profile);
        setSettings(
          loadLetterheadSettings(profile.doctor_id, profile.clinic_id),
        );
        setLoading(false);
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, [router]);

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!tenant) {
      return;
    }

    saveLetterheadSettings(tenant.doctor_id, tenant.clinic_id, settings);
    setMessage("Ajustes guardados. Se aplicaran en los PDFs generados.");
  }

  if (loading) {
    return <p className="text-sm text-slate-600">Cargando ajustes...</p>;
  }

  return (
    <section className="mx-auto w-full max-w-3xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Ajustes de membrete profesional</h1>
        <p className="text-sm text-slate-700">
          Configura nombre, especialidades, direccion y contactos para documentos de consulta.
        </p>
      </header>

      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}

      <form onSubmit={handleSave} className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 sm:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
          <div>
            <p className="text-sm font-semibold text-slate-900">Logo profesional para PDF</p>
            <p className="text-xs text-slate-600">Se guarda en este navegador (localStorage), sin enviarse a Supabase.</p>
          </div>

          <input
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              void handleLogoSelected(file);
            }}
          />

          {settings.logo_data_url ? (
            <div className="flex items-center gap-4">
              <Image
                src={settings.logo_data_url}
                alt="Logo profesional"
                width={64}
                height={64}
                unoptimized
                className="h-16 w-16 rounded-xl border border-slate-200 bg-white object-contain p-1"
              />
              <button
                type="button"
                onClick={() => setSettings((current) => ({ ...current, logo_data_url: "" }))}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
              >
                Quitar logo
              </button>
            </div>
          ) : null}
        </div>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Nombre profesional</span>
          <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={settings.doctor_name} onChange={(event) => setSettings((current) => ({ ...current, doctor_name: event.target.value }))} required />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Titulo profesional</span>
          <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={settings.professional_title} onChange={(event) => setSettings((current) => ({ ...current, professional_title: event.target.value }))} required />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
          <span>Especialidades (texto libre)</span>
          <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={settings.specialties} onChange={(event) => setSettings((current) => ({ ...current, specialties: event.target.value }))} required />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
          <span>Direccion profesional</span>
          <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={settings.address} onChange={(event) => setSettings((current) => ({ ...current, address: event.target.value }))} required />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Telefono 1</span>
          <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={settings.phone_primary} onChange={(event) => setSettings((current) => ({ ...current, phone_primary: event.target.value }))} required />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Telefono 2 (opcional)</span>
          <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={settings.phone_secondary || ""} onChange={(event) => setSettings((current) => ({ ...current, phone_secondary: event.target.value }))} />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
          <span>Email de contacto (opcional)</span>
          <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" type="email" value={settings.contact_email || ""} onChange={(event) => setSettings((current) => ({ ...current, contact_email: event.target.value }))} />
        </label>

        <button className="sm:col-span-2 rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white" type="submit">
          Guardar ajustes
        </button>
      </form>
    </section>
  );
}
