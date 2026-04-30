"use client";

/**
 * components/ui/profile-section-letterhead.tsx
 *
 * Sección 2: Logo, firma visual y especialidades para el membrete PDF.
 */

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildFileReadErrorMessage } from "@/lib/ui/feedback-copy";

type Props = {
  specialties: string;
  logoDataUrl: string;
  signatureDataUrl: string;
  onSpecialtiesChange: (value: string) => void;
  onLogoChange: (dataUrl: string) => void;
  onSignatureChange: (dataUrl: string) => void;
  onError: (message: string) => void;
};

async function readImageFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("El archivo debe ser una imagen valida (PNG, JPG o WEBP).");
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round(height * (MAX_WIDTH / width));
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round(width * (MAX_HEIGHT / height));
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Error de entorno grafico."));
          return;
        }

        // Fondo blanco para jpegs transparentes (ej. PNG)
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Error al procesar la imagen."));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error(buildFileReadErrorMessage("el archivo seleccionado")));
    reader.readAsDataURL(file);
  });
}

export function ProfileSectionLetterhead({
  specialties,
  logoDataUrl,
  signatureDataUrl,
  onSpecialtiesChange,
  onLogoChange,
  onSignatureChange,
  onError,
}: Props) {
  async function handleLogoSelected(file: File | null) {
    if (!file) return;
    try {
      const dataUrl = await readImageFile(file);
      onLogoChange(dataUrl);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Error al leer el logo.");
    }
  }

  async function handleSignatureSelected(file: File | null) {
    if (!file) return;
    try {
      const dataUrl = await readImageFile(file);
      onSignatureChange(dataUrl);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Error al leer la firma.");
    }
  }

  return (
    <>
      {/* Logo */}
      <div className="space-y-3 rounded-2xl border border-border bg-bg-soft p-4 sm:col-span-2">
        <div>
          <p className="text-sm font-semibold text-ink">Logo profesional para PDF</p>
          <p className="text-xs text-ink-soft">
            Se guarda en este navegador (localStorage), sin enviarse a Supabase.
          </p>
        </div>
        <Input
          aria-label="Subir logo profesional"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => { void handleLogoSelected(e.target.files?.[0] ?? null); }}
        />
        {logoDataUrl ? (
          <div className="flex items-center gap-4">
            <Image
              src={logoDataUrl}
              alt="Logo profesional"
              width={64}
              height={64}
              unoptimized
              className="h-16 w-16 rounded-xl border border-border bg-card object-contain p-1"
            />
            <Button
              type="button"
              aria-label="Quitar logo profesional"
              onClick={() => onLogoChange("")}
              variant="secondary"
              className="px-3 py-2 text-xs font-semibold text-ink-soft"
            >
              Quitar logo
            </Button>
          </div>
        ) : null}
      </div>

      {/* Firma */}
      <div className="space-y-3 rounded-2xl border border-border bg-bg-soft p-4 sm:col-span-2">
        <div>
          <p className="text-sm font-semibold text-ink">Firma profesional para PDF</p>
          <p className="text-xs text-ink-soft">
            Dibuja tu firma en papel blanco, tomale una foto y subela aqui. Se imprimira al final
            de la receta.
          </p>
        </div>
        <Input
          aria-label="Subir firma profesional"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => { void handleSignatureSelected(e.target.files?.[0] ?? null); }}
        />
        {signatureDataUrl ? (
          <div className="flex items-center gap-4">
            <Image
              src={signatureDataUrl}
              alt="Firma profesional"
              width={120}
              height={45}
              unoptimized
              className="h-[45px] w-[120px] rounded-xl border border-border bg-card object-contain p-1"
            />
            <Button
              type="button"
              aria-label="Quitar firma profesional"
              onClick={() => onSignatureChange("")}
              variant="secondary"
              className="px-3 py-2 text-xs font-semibold text-ink-soft"
            >
              Quitar firma
            </Button>
          </div>
        ) : null}
      </div>

      {/* Especialidades */}
      <label className="space-y-2 text-sm font-medium text-ink-soft sm:col-span-2">
        <span>Especialidades para membrete PDF</span>
        <Input
          value={specialties}
          onChange={(e) => onSpecialtiesChange(e.target.value)}
          placeholder="Ej: Pediatria, Medicina general"
          required
        />
      </label>
    </>
  );
}
