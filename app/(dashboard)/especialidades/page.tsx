import { GrowthCurve } from "@/components/clinical/growth-curve";
import { Odontogram } from "@/components/clinical/odontogram";

const specialty = "odontologia";

export default function EspecialidadesPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">Especialidades</h1>
      <p className="text-sm text-slate-700">
        Render dinamico por tenant y especialidad activa.
      </p>
      {specialty === "odontologia" ? <Odontogram /> : <GrowthCurve />}
    </section>
  );
}
