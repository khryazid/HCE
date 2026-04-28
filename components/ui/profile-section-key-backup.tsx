"use client";

/**
 * components/ui/profile-section-key-backup.tsx
 *
 * Sección 3: Exportar e importar backup de clave de cifrado PHI.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { exportEncryptionKeyBackup, importEncryptionKeyBackup } from "@/lib/db/crypto";
import { buildRetryableErrorMessage } from "@/lib/ui/feedback-copy";

type Props = {
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
};

export function ProfileSectionKeyBackup({ onSuccess, onError }: Props) {
  const [restoringKey, setRestoringKey] = useState(false);

  async function handleExportKeyBackup() {
    try {
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
      onSuccess("Backup de clave descargado. Guardalo en un lugar seguro.");
    } catch (err) {
      onError(
        err instanceof Error
          ? err.message
          : buildRetryableErrorMessage("exportar la clave de cifrado"),
      );
    }
  }

  async function handleImportKeyBackup(file: File | null) {
    if (!file) return;
    setRestoringKey(true);
    try {
      const content = await file.text();
      const parsed = JSON.parse(content) as unknown;
      await importEncryptionKeyBackup(parsed);
      onSuccess("Clave restaurada correctamente. Ya puedes leer datos cifrados de este backup.");
    } catch (err) {
      onError(
        err instanceof Error
          ? err.message
          : buildRetryableErrorMessage("importar el backup de clave"),
      );
    } finally {
      setRestoringKey(false);
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 sm:col-span-2">
      <div>
        <p className="text-sm font-semibold text-amber-900">Backup de clave de cifrado</p>
        <p className="text-xs text-amber-800">
          Exporta esta clave antes de limpiar el navegador o cambiar de dispositivo. Sin ella, los
          datos PHI cifrados no se podran descifrar.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => void handleExportKeyBackup()}
          variant="secondary"
          className="px-4 py-2 text-sm font-semibold text-amber-900"
        >
          Descargar backup de clave
        </Button>
        <label className="inline-flex cursor-pointer items-center rounded-xl border border-amber-300 bg-card px-4 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100">
          {restoringKey ? "Restaurando..." : "Importar backup de clave"}
          <input
            type="file"
            accept="application/json"
            className="hidden"
            disabled={restoringKey}
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              void handleImportKeyBackup(file);
              e.currentTarget.value = "";
            }}
          />
        </label>
      </div>
    </div>
  );
}
