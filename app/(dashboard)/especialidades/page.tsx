"use client";

import { useState } from "react";
import { GrowthCurve } from "@/components/clinical/growth-curve";
import { Odontogram } from "@/components/clinical/odontogram";

type SpecialtyView = "odontologia" | "pediatria";

export default function EspecialidadesPage() {
  const [view, setView] = useState<SpecialtyView>("odontologia");

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <p className="hce-kicker text-ink-soft">Especialidades</p>
        <h1 className="hce-page-title">Componentes clinicos reales</h1>
        <p className="hce-page-lead">
          Alterna entre odontograma y curva pediatrica para revisar cada flujo
          especializado.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setView("odontologia")}
          className={`hce-chip ${
            view === "odontologia"
              ? "border-teal-300 bg-teal-50 text-teal-800"
              : "border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--ink)]"
          }`}
        >
          Odontologia
        </button>
        <button
          type="button"
          onClick={() => setView("pediatria")}
          className={`hce-chip ${
            view === "pediatria"
              ? "border-sky-300 bg-sky-50 text-sky-800"
              : "border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--ink)]"
          }`}
        >
          Pediatria
        </button>
      </div>

      {view === "odontologia" ? <Odontogram /> : <GrowthCurve />}
    </section>
  );
}
