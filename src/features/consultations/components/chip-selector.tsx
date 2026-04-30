"use client";

import { useState } from "react";

type Props = {
  catalog: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
};

export function ChipSelector({ catalog, selected, onChange, placeholder = "Escribir examen..." }: Props) {
  const [customInput, setCustomInput] = useState("");

  function toggle(item: string) {
    if (selected.includes(item)) {
      onChange(selected.filter((s) => s !== item));
    } else {
      onChange([...selected, item]);
    }
  }

  function addCustom() {
    const val = customInput.trim();
    if (!val || selected.includes(val)) {
      setCustomInput("");
      return;
    }
    onChange([...selected, val]);
    setCustomInput("");
  }

  function remove(item: string) {
    onChange(selected.filter((s) => s !== item));
  }

  return (
    <div className="space-y-3">
      {/* Tags seleccionados */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 rounded-full bg-teal-600 px-2.5 py-1 text-xs font-semibold text-white"
            >
              {item}
              <button
                type="button"
                aria-label={`Quitar ${item}`}
                className="ml-0.5 rounded-full hover:bg-teal-700 p-0.5"
                onClick={() => remove(item)}
              >
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M1 1l10 10M11 1L1 11" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Chips del catálogo */}
      <div className="flex flex-wrap gap-1.5">
        {catalog.map((item) => {
          const active = selected.includes(item);
          return (
            <button
              key={item}
              type="button"
              onClick={() => toggle(item)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                active
                  ? "border-teal-600 bg-teal-600 text-white"
                  : "border-border bg-bg-soft text-ink-soft hover:border-teal-400 hover:text-ink"
              }`}
            >
              {item}
            </button>
          );
        })}
      </div>

      {/* Input para examen personalizado */}
      <div className="flex gap-2">
        <input
          className="hce-input flex-1 text-sm"
          placeholder={placeholder}
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addCustom();
            }
          }}
        />
        <button
          type="button"
          onClick={addCustom}
          className="rounded-lg border border-border bg-bg-soft px-3 py-1.5 text-xs font-semibold text-ink hover:bg-teal-50 hover:border-teal-300 transition-colors"
        >
          + Agregar
        </button>
      </div>
    </div>
  );
}
