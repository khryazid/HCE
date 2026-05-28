"use client";

/**
 * components/ui/profile-section-letterhead.tsx
 *
 * Sección 2: Logo, firma visual y especialidades para el membrete PDF.
 */

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildFileReadErrorMessage } from "@/lib/ui/feedback-copy";
import { MEDICAL_SPECIALTIES } from "@/lib/constants/medical-specialties";

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
  const [specialtySearch, setSpecialtySearch] = useState("");
  const [isSpecialtyDropdownOpen, setIsSpecialtyDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLFieldSetElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSpecialtyDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const watchSpecialties = specialties.split(",").map(s => s.trim()).filter(Boolean);

  const filteredSpecialties = MEDICAL_SPECIALTIES.filter((entry) =>
    entry.toLowerCase().includes(specialtySearch.trim().toLowerCase())
  );

  function toggleSpecialty(entry: string) {
    if (watchSpecialties.includes(entry)) {
      onSpecialtiesChange(watchSpecialties.filter((item) => item !== entry).join(", "));
    } else {
      onSpecialtiesChange([...watchSpecialties, entry].join(", "));
    }
  }

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
    <div className="hce-card space-y-6 sm:col-span-2">
      <h3 className="text-base font-semibold text-ink border-b border-border pb-3">
        Configuración de Documentos (PDF)
      </h3>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Especialidades */}
        <fieldset
          className="relative space-y-2 text-sm font-medium text-ink-soft sm:col-span-2"
          ref={dropdownRef}
        >
          <legend className="mb-2 block">Especialidades para membrete PDF</legend>

          <div
            className="flex min-h-11 cursor-text flex-wrap items-center gap-2 rounded-lg border border-border bg-field px-3 py-2 transition-colors focus-within:border-accent"
            onClick={() => setIsSpecialtyDropdownOpen(true)}
          >
            {watchSpecialties.map((entry) => (
              <span
                key={`selected-${entry}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent"
              >
                {entry}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSpecialty(entry);
                  }}
                  className="rounded-full p-0.5 transition-colors hover:bg-accent/20 focus:outline-none"
                  aria-label={`Quitar ${entry}`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </span>
            ))}
            <input
              type="text"
              value={specialtySearch}
              onChange={(event) => {
                setSpecialtySearch(event.target.value);
                setIsSpecialtyDropdownOpen(true);
              }}
              onFocus={() => setIsSpecialtyDropdownOpen(true)}
              placeholder={watchSpecialties.length === 0 ? "Buscar y seleccionar..." : ""}
              className="min-w-[120px] flex-1 border-none bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-ink-soft/70"
              aria-label="Buscar especialidad"
            />
          </div>

          {isSpecialtyDropdownOpen && (
            <div className="absolute left-0 top-full z-10 mt-1 w-full overflow-hidden rounded-lg border border-border bg-bg-elevated p-1 shadow-lg max-h-56 overflow-y-auto">
              {filteredSpecialties.filter((s) => !watchSpecialties.includes(s)).length > 0 ? (
                <ul role="listbox" className="flex flex-col gap-0.5">
                  {filteredSpecialties
                    .filter((s) => !watchSpecialties.includes(s))
                    .map((entry) => (
                      <li key={entry}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={false}
                          onClick={() => {
                            toggleSpecialty(entry);
                            setSpecialtySearch("");
                            setIsSpecialtyDropdownOpen(false);
                          }}
                          className="w-full rounded-md px-3 py-2 text-left text-sm text-ink hover:bg-bg-soft focus:bg-bg-soft focus:outline-none transition-colors"
                        >
                          {entry}
                        </button>
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="px-3 py-4 text-center text-sm text-ink-soft">
                  No se encontraron especialidades
                </p>
              )}
            </div>
          )}
        </fieldset>

        {/* Logo */}
        <div className="space-y-3 rounded-2xl border border-border bg-bg-soft p-4">
          <div>
            <p className="text-sm font-semibold text-ink">Logo profesional para PDF</p>
            <p className="text-xs text-ink-soft">
              Se guarda en este navegador, sin enviarse a Supabase.
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
        <div className="space-y-3 rounded-2xl border border-border bg-bg-soft p-4">
          <div>
            <p className="text-sm font-semibold text-ink">Firma profesional para PDF</p>
            <p className="text-xs text-ink-soft">
              Dibuja tu firma en papel blanco, tómale una foto y súbela aquí.
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
      </div>
    </div>
  );
}
