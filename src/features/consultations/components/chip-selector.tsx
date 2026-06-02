"use client";

import { useState, useMemo } from "react";
import { Search, Plus, X } from "lucide-react";

type Props = {
  catalog: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
};

export function ChipSelector({ catalog, selected, onChange, placeholder = "Buscar o agregar examen..." }: Props) {
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

  // Filtrado de catálogo basado en la búsqueda
  const filteredCatalog = useMemo(() => {
    if (!customInput.trim()) return [];
    const query = customInput.toLowerCase();
    return catalog.filter(item => item.toLowerCase().includes(query) && !selected.includes(item));
  }, [customInput, catalog, selected]);

  // Simulamos los 3 más comunes con los 3 primeros del catálogo que no estén seleccionados
  const topSuggestions = useMemo(() => {
    return catalog.filter(item => !selected.includes(item)).slice(0, 3);
  }, [catalog, selected]);

  const showSuggestions = customInput.trim().length === 0;

  return (
    <div className="space-y-4">
      
      {/* Input Buscador */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-ink-faint group-focus-within:text-accent transition-colors" />
        </div>
        <input
          className="w-full bg-bg-soft border border-border rounded-xl pl-9 pr-24 py-2.5 text-base text-ink placeholder:text-ink-faint/50 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all shadow-sm"
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
        <div className="absolute inset-y-0 right-1.5 flex items-center">
          <button
            type="button"
            onClick={addCustom}
            disabled={!customInput.trim()}
            className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider bg-card border border-border px-3 py-2 min-h-[44px] rounded-lg text-ink hover:text-accent hover:border-accent disabled:opacity-50 disabled:hover:border-border disabled:hover:text-ink transition-colors shadow-sm"
          >
            <Plus className="h-3 w-3" /> Agregar
          </button>
        </div>
      </div>

      {/* Resultados / Sugerencias */}
      <div>
        {showSuggestions ? (
          topSuggestions.length > 0 && (
            <div className="animate-in fade-in duration-300">
              <p className="text-sm uppercase tracking-widest font-bold text-ink-soft mb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500/50"></span> Sugerencias Frecuentes
              </p>
              <div className="flex flex-wrap gap-2">
                {topSuggestions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggle(item)}
                    className="rounded-full border border-border bg-card px-4 py-2 min-h-[44px] flex items-center justify-center text-sm font-semibold text-ink-soft hover:border-teal-400 hover:text-teal-600 transition-colors shadow-sm"
                  >
                    + {item}
                  </button>
                ))}
              </div>
            </div>
          )
        ) : (
          <div className="animate-in fade-in duration-200">
            <p className="text-sm uppercase tracking-widest font-bold text-ink-soft mb-2">
              Resultados de Búsqueda
            </p>
            <div className="flex flex-wrap gap-2">
              {filteredCatalog.length > 0 ? (
                filteredCatalog.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      toggle(item);
                      setCustomInput("");
                    }}
                    className="rounded-full border border-teal-500/30 bg-teal-500/5 px-4 py-2 min-h-[44px] flex items-center justify-center text-sm font-semibold text-teal-700 dark:text-teal-400 hover:bg-teal-500/20 transition-colors"
                  >
                    + {item}
                  </button>
                ))
              ) : (
                <p className="text-xs text-ink-faint italic py-1">No hay coincidencias en el catálogo. Presiona &quot;Agregar&quot; para ingresarlo manualmente.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tags seleccionados */}
      {selected.length > 0 && (
        <div className="pt-2 border-t border-border">
          <p className="text-sm uppercase tracking-widest font-bold text-ink-soft mb-2">
            Seleccionados ({selected.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {selected.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-1.5 rounded-md border border-teal-600/20 bg-teal-600/10 pl-3 pr-1 py-1 min-h-[44px] text-sm font-semibold text-teal-800 dark:text-teal-300 shadow-sm animate-in zoom-in-95 duration-200"
              >
                {item}
                <button
                  type="button"
                  aria-label={`Quitar ${item}`}
                  className="rounded-sm hover:bg-teal-600/20 text-teal-600/70 hover:text-teal-800 dark:hover:text-teal-200 min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors"
                  onClick={() => remove(item)}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
