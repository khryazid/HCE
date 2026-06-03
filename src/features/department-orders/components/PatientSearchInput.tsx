"use client";

import { useState, useCallback } from "react";
import { usePatientSearchByIdentification } from "../lib/use-patient-search";

interface PatientSearchResult {
  id: string;
  full_name: string;
  document_number: string;
}

interface PatientSearchInputProps {
  /** Called when a patient is found and selected */
  onPatientFound: (patient: PatientSearchResult) => void;
  /** Optional placeholder text */
  placeholder?: string;
  /** Optional className for the container */
  className?: string;
}

/**
 * Patient search input for department roles (lab, imaging, surgery).
 * Searches by identification number ONLY — never exposes clinical data.
 * Uses the secure `search_patient_by_identification` RPC function.
 */
export function PatientSearchInput({
  onPatientFound,
  placeholder = "Número de identificación del paciente",
  className = "",
}: PatientSearchInputProps) {
  const [searchValue, setSearchValue] = useState("");
  const [submitted, setSubmitted] = useState("");

  const { data: results, isLoading, error } = usePatientSearchByIdentification(submitted);

  const handleSearch = useCallback(() => {
    const trimmed = searchValue.trim();
    if (trimmed.length >= 3) {
      setSubmitted(trimmed);
    }
  }, [searchValue]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSearch();
      }
    },
    [handleSearch]
  );

  const handleSelect = useCallback(
    (patient: PatientSearchResult) => {
      onPatientFound(patient);
      setSearchValue("");
      setSubmitted("");
    },
    [onPatientFound]
  );

  return (
    <div className={`relative ${className}`}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            id="patient-search-identification"
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-sky-400"
            autoComplete="off"
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleSearch}
          disabled={searchValue.trim().length < 3 || isLoading}
          className="rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-sky-500 dark:hover:bg-sky-600"
        >
          Buscar
        </button>
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          Error al buscar: {(error as Error).message}
        </p>
      )}

      {/* Results */}
      {submitted && !isLoading && results !== undefined && (
        <div className="mt-2">
          {results.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-300 p-3 text-center text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
              No se encontró ningún paciente con esa identificación
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-600 dark:bg-gray-800">
              {results.map((patient) => (
                <li key={patient.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(patient)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {patient.full_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        ID: {patient.document_number}
                      </p>
                    </div>
                    <span className="text-xs text-sky-600 dark:text-sky-400">
                      Seleccionar →
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Help text */}
      {!submitted && searchValue.length > 0 && searchValue.length < 3 && (
        <p className="mt-1 text-xs text-gray-400">
          Ingresa al menos 3 caracteres
        </p>
      )}
    </div>
  );
}
