"use client";

/**
 * components/ui/profile-section-personal.tsx
 *
 * Sección 1 del formulario de perfil profesional:
 * título, licencia, años de experiencia, teléfonos, dirección, nombre de firma.
 */

import { Input } from "@/components/ui/input";

type Props = {
  professionalTitle: string;
  licenseNumber: string;
  yearsExperience: string;
  primaryPhone: string;
  secondaryPhone: string;
  professionalAddress: string;
  publicContactEmail: string;
  signatureName: string;
  onChange: (patch: Partial<{
    professionalTitle: string;
    licenseNumber: string;
    yearsExperience: string;
    primaryPhone: string;
    secondaryPhone: string;
    professionalAddress: string;
    publicContactEmail: string;
    signatureName: string;
  }>) => void;
};

export function ProfileSectionPersonal({
  professionalTitle,
  licenseNumber,
  yearsExperience,
  primaryPhone,
  secondaryPhone,
  professionalAddress,
  publicContactEmail,
  signatureName,
  onChange,
}: Props) {
  return (
    <>
      <label className="space-y-2 text-sm font-medium text-ink-soft">
        <span>Titulo profesional</span>
        <Input
          value={professionalTitle}
          onChange={(e) => onChange({ professionalTitle: e.target.value })}
          placeholder="Dr. / Dra."
          required
        />
      </label>

      <label className="space-y-2 text-sm font-medium text-ink-soft">
        <span>Numero de licencia profesional</span>
        <Input
          value={licenseNumber}
          onChange={(e) => onChange({ licenseNumber: e.target.value })}
          required
        />
      </label>

      <label className="space-y-2 text-sm font-medium text-ink-soft">
        <span>Anos de experiencia</span>
        <Input
          type="number"
          min={0}
          max={80}
          value={yearsExperience}
          onChange={(e) => onChange({ yearsExperience: e.target.value })}
          required
        />
      </label>

      <label className="space-y-2 text-sm font-medium text-ink-soft">
        <span>Telefono principal</span>
        <Input
          value={primaryPhone}
          onChange={(e) => onChange({ primaryPhone: e.target.value })}
          required
        />
      </label>

      <label className="space-y-2 text-sm font-medium text-ink-soft">
        <span>Telefono secundario (opcional)</span>
        <Input
          value={secondaryPhone}
          onChange={(e) => onChange({ secondaryPhone: e.target.value })}
        />
      </label>

      <label className="space-y-2 text-sm font-medium text-ink-soft">
        <span>Correo publico de contacto (opcional)</span>
        <Input
          type="email"
          value={publicContactEmail}
          onChange={(e) => onChange({ publicContactEmail: e.target.value })}
        />
      </label>

      <label className="space-y-2 text-sm font-medium text-ink-soft sm:col-span-2">
        <span>Direccion profesional</span>
        <Input
          value={professionalAddress}
          onChange={(e) => onChange({ professionalAddress: e.target.value })}
          required
        />
      </label>

      <label className="space-y-2 text-sm font-medium text-ink-soft sm:col-span-2">
        <span>Nombre para firma y membrete</span>
        <Input
          value={signatureName}
          onChange={(e) => onChange({ signatureName: e.target.value })}
          required
        />
      </label>
    </>
  );
}
