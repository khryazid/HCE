"use client";

import type { CieSuggestion, CieSuggestionSource } from "@/lib/ai/cie-suggestions";
import type { CieCatalogEntry } from "@/lib/constants/cie-catalog";
import type { WizardForm } from "@/lib/consultations/use-consultation-wizard";

type Props = {
  form: WizardForm;
  setForm: React.Dispatch<React.SetStateAction<WizardForm>>;
  cieSuggestions: CieSuggestion[];
  cieSuggestionSource: CieSuggestionSource;
  cieSuggestionLoading: boolean;
  cieSuggestionError: string | null;
  cieMatches: CieCatalogEntry[];
  selectedCieCodes: string[];
  validationErrors: Record<string, string>;
  onApplyCieSuggestion: (code: string) => void;
};

export function WizardStepDiagnosis({
  form,
  setForm,
  cieSuggestions,
  cieSuggestionSource,
  cieSuggestionLoading,
  cieSuggestionError,
  cieMatches,
  selectedCieCodes,
  validationErrors,
  onApplyCieSuggestion,
}: Props) {
  return (
    <div className="space-y-4">
      {form.entryMode === "seguimiento" ? (
        <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-900">
          Modo seguimiento activo. Se prioriza registrar evolucion y proximo
          control.
        </div>
      ) : null}
      <textarea
        className="min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        placeholder="Anamnesis"
        value={form.anamnesis}
        onChange={(event) =>
          setForm((current) => ({
            ...current,
            anamnesis: event.target.value,
          }))
        }
      />
      {validationErrors.anamnesis ? (
        <p className="-mt-2 text-sm font-medium text-red-600">{validationErrors.anamnesis}</p>
      ) : null}
      <textarea
        className="min-h-20 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        placeholder="Sintomas"
        value={form.symptoms}
        onChange={(event) =>
          setForm((current) => ({
            ...current,
            symptoms: event.target.value,
          }))
        }
        disabled={form.entryMode === "seguimiento"}
      />
      <textarea
        className="min-h-20 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        placeholder="Diagnostico"
        value={form.diagnosis}
        onChange={(event) =>
          setForm((current) => ({
            ...current,
            diagnosis: event.target.value,
          }))
        }
        disabled={form.entryMode === "seguimiento"}
      />
      {validationErrors.diagnosis ? (
        <p className="-mt-2 text-sm font-medium text-red-600">{validationErrors.diagnosis}</p>
      ) : null}
      <input
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        placeholder="Codigos CIE separados por coma"
        value={form.cieCodes}
        onChange={(event) =>
          setForm((current) => ({
            ...current,
            cieCodes: event.target.value,
          }))
        }
        disabled={form.entryMode === "seguimiento"}
      />

      {/* CIE Suggestions panel */}
      <div className="rounded-2xl border border-teal-100 bg-teal-50/70 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-teal-700">
              Sugerencias CIE
            </p>
            <p className="text-sm text-slate-700">
              Se actualizan mientras escribes diagnostico, sintomas y
              anamnesis.
            </p>
          </div>
          <div className="text-right text-xs text-teal-700">
            <p className="font-semibold">
              {cieSuggestionSource === "gemini"
                ? "IA validada"
                : "Catalogo local"}
            </p>
            {cieSuggestionLoading ? <p>Actualizando...</p> : null}
          </div>
        </div>
        {cieSuggestionError ? (
          <p className="text-xs text-amber-700">{cieSuggestionError}</p>
        ) : null}
        {cieSuggestions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {cieSuggestions.map((entry) => {
              const alreadyAdded = selectedCieCodes.includes(entry.code);

              return (
                <button
                  key={`${entry.source}-${entry.code}`}
                  type="button"
                  onClick={() => onApplyCieSuggestion(entry.code)}
                  disabled={alreadyAdded}
                  className="rounded-full border border-teal-200 bg-white px-3 py-2 text-left text-xs text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="block font-semibold text-slate-900">
                    {entry.code} · {entry.description}
                  </span>
                  <span className="block text-[11px] text-slate-500">
                    {entry.source === "gemini"
                      ? "IA validada"
                      : "Catalogo local"}{" "}
                    · {Math.round(entry.confidence * 100)}%
                  </span>
                  <span className="block text-[11px] text-slate-500">
                    {alreadyAdded ? "Ya agregado" : entry.rationale}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-600">
            Escribe al menos un diagnostico o sintoma para recibir
            sugerencias.
          </p>
        )}
        {cieSuggestions[0] ? (
          <button
            type="button"
            onClick={() => onApplyCieSuggestion(cieSuggestions[0].code)}
            className="rounded-xl bg-teal-700 px-3 py-2 text-sm font-semibold text-white"
          >
            Aplicar primera sugerencia
          </button>
        ) : null}
      </div>

      <select
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        value={form.specialtyKind}
        onChange={(event) =>
          setForm((current) => ({
            ...current,
            specialtyKind: event.target
              .value as WizardForm["specialtyKind"],
          }))
        }
      >
        <option value="medicina-general">Medicina general</option>
        <option value="pediatria">Pediatria</option>
        <option value="odontologia">Odontologia</option>
      </select>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
          Catalogo CIE sugerido
        </p>
        <div className="mt-2 space-y-1 text-sm text-slate-700">
          {cieMatches.slice(0, 6).map((entry) => (
            <p key={entry.code}>
              {entry.code} · {entry.description}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
