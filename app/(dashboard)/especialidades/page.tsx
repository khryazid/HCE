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
        <p className="hce-kicker text-ink-soft">Sandbox clínico</p>
        <h1 className="hce-page-title">Componentes clínicos de validación</h1>
        <p className="hce-page-lead">
          Esta pantalla existe para probar componentes reales de especialidad y
          no forma parte del flujo operativo principal.
        </p>
      </header>

      <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
        Úsala como referencia visual y funcional para odontología y pediatría;
        el acceso principal del producto vive en consultas, pacientes y ajustes.
      </div>

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

      <div className="rounded-2xl border border-border bg-card p-4 text-sm text-ink-soft">
        {view === "odontologia"
          ? "Odontograma interactivo para validar piezas dentales, estados y selección clínica."
          : "Curva pediátrica para validar seguimiento, mediciones y ajuste de datos por edad."}
      </div>

      {view === "odontologia" ? <Odontogram /> : <GrowthCurve />}
    </section>
  );
}
