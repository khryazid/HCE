"use client";

import { memo } from "react";

import type { WizardForm } from "@/features/consultations/lib/use-consultation-wizard";
import { Activity, Heart, Wind, Thermometer, Droplet, Weight, Ruler } from "lucide-react";

// ─── Tarea 4: Textos estándar de normalidad por sistema ────────────────────
const NORMAL_TEXT: Record<string, string> = {
  "🧍 General":
    "Paciente en buenas condiciones generales, consciente, alerta, orientado en tres esferas. Afebril, hidratado, eupneico.",
  "🗣️ Cabeza y Cuello":
    "Cráneo normocéfalo, sin lesiones. Cuello sin adenomegalias, tiroides sin alteraciones palpables.",
  "👁️ Ojos, Oídos, Nariz, Boca":
    "Ojos simétricos, pupilas isocóricas normorreactivas. Oídos y nariz sin secreciones. Orofaringe sin eritema.",
  "🫁 Tórax y Pulmones":
    "Murmullo vesicular conservado en ambos campos pulmonares, sin ruidos agregados. Ausencia de tiraje.",
  "❤️ Cardiovascular":
    "Tórax simétrico. Ruidos cardíacos rítmicos, normofonéticos, sin soplos. Pulsos presentes y simétricos.",
  "🩺 Abdomen":
    "Plano, simétrico. Ruidos hidroaéreos normoactivos. Blando, depresible, indoloro a la palpación. Sin organomegalias.",
  "💧 Genitourinario":
    "Sin masas ni hernias. Genitales externos sin lesiones evidentes. Sin globo vesical.",
  "🦴 Osteoarticular":
    "Sin deformidades articulares visibles. Sin artritis ni artralgia a la movilización activa o pasiva.",
  "🦵 Extremidades":
    "Simétricas, sin edema, sin várices. Pulsos distales presentes y simétricos. Rangos de movimiento conservados.",
  "🧠 Neurológico":
    "Vigil, orientado. Pupilas isocóricas y normorreactivas. Fuerza muscular 5/5 global. Sin déficit motor ni sensitivo aparente.",
  "🖐️ Piel y Faneras":
    "Piel normocolor, normohidratada, íntegra. Sin lesiones activas. Faneras sin alteraciones.",
};

const PHYSICAL_EXAM_SYSTEMS = [
  "🧍 General",
  "🗣️ Cabeza y Cuello",
  "👁️ Ojos, Oídos, Nariz, Boca",
  "🫁 Tórax y Pulmones",
  "❤️ Cardiovascular",
  "🩺 Abdomen",
  "💧 Genitourinario",
  "🦴 Osteoarticular",
  "🦵 Extremidades",
  "🧠 Neurológico",
  "🖐️ Piel y Faneras",
];

// ─── Tarea 3: Fórmula PAM ──────────────────────────────────────────────────
function calcPAM(bloodPressure: string): string {
  const match = bloodPressure.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!match) return "";
  const sys = parseInt(match[1], 10);
  const dia = parseInt(match[2], 10);
  if (isNaN(sys) || isNaN(dia)) return "";
  const pam = (sys + 2 * dia) / 3;
  return pam.toFixed(0);
}

type Props = {
  form: WizardForm;
  setForm: React.Dispatch<React.SetStateAction<WizardForm>>;
  tenantSpecialties?: string[];
  uiPreferences?: Record<string, boolean>;
};

const WizardStepPhysicalExam = memo(function WizardStepPhysicalExam({ form, setForm, tenantSpecialties = [], uiPreferences }: Props) {
  const isPediatric = tenantSpecialties.some(
    (s) => s.toLowerCase().includes("pediatr") || s.toLowerCase().includes("neonat"),
  );

  /** Recalcula y persiste la PAM cuando el campo de TA pierde el foco o cambia. */
  function recalcPAM(bloodPressure: string) {
    const pam = calcPAM(bloodPressure);
    setForm((c) => ({
      ...c,
      vitalSigns: { ...c.vitalSigns, mean_arterial_pressure: pam },
    }));
  }

  /** Tarea 4: Inyecta el texto de normalidad en el textarea del sistema indicado. */
  function fillNormal(systemName: string) {
    const normalText = NORMAL_TEXT[systemName] ?? "";
    if (!normalText) return;
    setForm((c) => {
      const newArr = [...c.physicalExam];
      const idx = newArr.findIndex((ex) => ex.system === systemName);
      if (idx === -1) return c;
      const current = newArr[idx].content ?? "";
      newArr[idx] = {
        ...newArr[idx],
        content: current.trim() ? `${current}\n${normalText}` : normalText,
      };
      return { ...c, physicalExam: newArr };
    });
  }

  return (
    <div className="space-y-8">
      {/* ── A. Estado General ─────────────────────────────────────────── */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-ink border-b border-border pb-2">
          A. Estado General del Paciente
        </h4>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <label htmlFor="field-general-condition" className="text-xs font-semibold text-ink flex-1">Descripción del estado general</label>
            {NORMAL_TEXT["🧍 General"] && (
              <button
                type="button"
                title="Rellenar como normal"
                onClick={() => {
                  const normalText = NORMAL_TEXT["🧍 General"];
                  setForm((c) => ({
                    ...c,
                    generalCondition: c.generalCondition.trim()
                      ? `${c.generalCondition}\n${normalText}`
                      : normalText,
                  }));
                }}
                className="flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-100 transition dark:border-teal-700/40 dark:bg-teal-900/20 dark:text-teal-300"
              >
                🪄 Normal
              </button>
            )}
          </div>
          <textarea
            id="field-general-condition"
            className="hce-input min-h-16"
            placeholder="Paciente consciente, orientado en tiempo, lugar y persona, en regulares/buenas condiciones generales..."
            value={form.generalCondition}
            onChange={(e) => setForm((c) => ({ ...c, generalCondition: e.target.value }))}
          />
        </div>
      </div>

      {/* ── B. Signos Vitales + PAM (Tarea 3) ────────────────────────── */}
      {uiPreferences?.hide_vital_signs !== true && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-ink border-b border-border pb-2">
            B. Signos Vitales y Antropometría
          </h4>
        <div className="space-y-6">
          
          {/* Fila 1: Signos Vitales */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-widest text-ink-soft flex items-center gap-2">
              <Activity className="h-3.5 w-3.5" /> Signos Vitales
            </h5>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {/* T.A. */}
              <div className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent overflow-hidden col-span-2 sm:col-span-1">
                <label htmlFor="field-blood-pressure" className="absolute left-3 top-2 flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-ink-soft transition-colors group-focus-within:text-accent">
                  T.A.
                </label>
                <div className="flex items-baseline px-3 pb-3 pt-7">
                  <input
                    id="field-blood-pressure"
                    inputMode="decimal"
                    pattern="[0-9.,]*"
                    className="w-full bg-transparent text-lg font-medium text-ink placeholder:text-ink-faint/30 !outline-none !ring-0 !shadow-none !border-0 focus:!ring-0 focus:!shadow-none focus:!outline-none focus-visible:!ring-0 focus-visible:!outline-none"
                    placeholder="120/80"
                    value={form.vitalSigns.bloodPressure}
                    onChange={(e) => {
                      let val = e.target.value;
                      val = val.replace(/ /g, "/");
                      val = val.replace(/[^\d/]/g, "");
                      const slashCount = (val.match(/\//g) || []).length;
                      if (slashCount > 1) return;
                      if (!val.includes("/") && val.length === 3) { val = val + "/"; }
                      if (val.includes("/")) {
                        const [sys, dia] = val.split("/");
                        if ((sys?.length ?? 0) > 3 || (dia?.length ?? 0) > 3) return;
                      }
                      setForm((c) => ({
                        ...c,
                        vitalSigns: {
                          ...c.vitalSigns,
                          bloodPressure: val,
                          mean_arterial_pressure: calcPAM(val),
                        },
                      }));
                    }}
                    onBlur={(e) => recalcPAM(e.target.value)}
                  />
                  <span className="text-xs font-semibold text-ink-soft ml-1">mmHg</span>
                </div>
                {/* PAM Overlay */}
                {form.vitalSigns.mean_arterial_pressure ? (
                  <div className="absolute right-2 top-1.5">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                      parseInt(form.vitalSigns.mean_arterial_pressure) < 65 ? "bg-red-500/10 text-red-600 border border-red-500/20" :
                      parseInt(form.vitalSigns.mean_arterial_pressure) > 110 ? "bg-amber-500/10 text-amber-600 border border-amber-500/20" : 
                      "bg-teal-500/10 text-teal-600 border border-teal-500/20"
                    }`}>
                      PAM {form.vitalSigns.mean_arterial_pressure}
                    </span>
                  </div>
                ) : null}
              </div>

              {/* F.C. */}
              <div className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent overflow-hidden">
                <label htmlFor="field-heart-rate" className="absolute left-3 top-2 flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-ink-soft transition-colors group-focus-within:text-accent">
                  <Heart className="h-3 w-3" /> F.C.
                </label>
                <div className="flex items-baseline px-3 pb-3 pt-7">
                  <input id="field-heart-rate" inputMode="decimal" pattern="[0-9.,]*" className="w-full bg-transparent text-lg font-medium text-ink placeholder:text-ink-faint/30 !outline-none !ring-0 !shadow-none !border-0 focus:!ring-0 focus:!shadow-none focus:!outline-none focus-visible:!ring-0 focus-visible:!outline-none" placeholder="80"
                    value={form.vitalSigns.heartRate}
                    onChange={(e) => setForm((c) => ({ ...c, vitalSigns: { ...c.vitalSigns, heartRate: e.target.value } }))}
                  />
                  <span className="text-xs font-semibold text-ink-soft ml-1">lpm</span>
                </div>
              </div>

              {/* F.R. */}
              <div className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent overflow-hidden">
                <label htmlFor="field-respiratory-rate" className="absolute left-3 top-2 flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-ink-soft transition-colors group-focus-within:text-accent">
                  <Wind className="h-3 w-3" /> F.R.
                </label>
                <div className="flex items-baseline px-3 pb-3 pt-7">
                  <input id="field-respiratory-rate" inputMode="decimal" pattern="[0-9.,]*" className="w-full bg-transparent text-lg font-medium text-ink placeholder:text-ink-faint/30 !outline-none !ring-0 !shadow-none !border-0 focus:!ring-0 focus:!shadow-none focus:!outline-none focus-visible:!ring-0 focus-visible:!outline-none" placeholder="16"
                    value={form.vitalSigns.respiratoryRate}
                    onChange={(e) => setForm((c) => ({ ...c, vitalSigns: { ...c.vitalSigns, respiratoryRate: e.target.value } }))}
                  />
                  <span className="text-xs font-semibold text-ink-soft ml-1">rpm</span>
                </div>
              </div>

              {/* Temp */}
              <div className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent overflow-hidden">
                <label htmlFor="field-temperature" className="absolute left-3 top-2 flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-ink-soft transition-colors group-focus-within:text-accent">
                  <Thermometer className="h-3 w-3" /> Temp.
                </label>
                <div className="flex items-baseline px-3 pb-3 pt-7">
                  <input id="field-temperature" inputMode="decimal" pattern="[0-9.,]*" className="w-full bg-transparent text-lg font-medium text-ink placeholder:text-ink-faint/30 !outline-none !ring-0 !shadow-none !border-0 focus:!ring-0 focus:!shadow-none focus:!outline-none focus-visible:!ring-0 focus-visible:!outline-none" placeholder="36.5"
                    value={form.vitalSigns.temperature}
                    onChange={(e) => setForm((c) => ({ ...c, vitalSigns: { ...c.vitalSigns, temperature: e.target.value } }))}
                  />
                  <span className="text-xs font-semibold text-ink-soft ml-1">°C</span>
                </div>
              </div>

              {/* SatO2 */}
              <div className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent overflow-hidden">
                <label htmlFor="field-oxygen-saturation" className="absolute left-3 top-2 flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-ink-soft transition-colors group-focus-within:text-accent">
                  <Droplet className="h-3 w-3" /> SatO2
                </label>
                <div className="flex items-baseline px-3 pb-3 pt-7">
                  <input id="field-oxygen-saturation" inputMode="decimal" pattern="[0-9.,]*" className="w-full bg-transparent text-lg font-medium text-ink placeholder:text-ink-faint/30 !outline-none !ring-0 !shadow-none !border-0 focus:!ring-0 focus:!shadow-none focus:!outline-none focus-visible:!ring-0 focus-visible:!outline-none" placeholder="98"
                    value={form.vitalSigns.oxygenSaturation}
                    onChange={(e) => setForm((c) => ({ ...c, vitalSigns: { ...c.vitalSigns, oxygenSaturation: e.target.value } }))}
                  />
                  <span className="text-xs font-semibold text-ink-soft ml-1">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Fila 2: Antropometría */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold uppercase tracking-widest text-ink-soft flex items-center gap-2">
                <Weight className="h-3.5 w-3.5" /> Antropometría
              </h5>
              {/* IMC Cálculo automático */}
              {(() => {
                const w = parseFloat(form.vitalSigns.weight?.replace(",", "."));
                const h = parseFloat(form.vitalSigns.height?.replace(",", "."));
                if (!isNaN(w) && !isNaN(h) && h > 0.5 && h < 3) {
                  const bmi = w / (h * h);
                  let label = "Normal";
                  let badgeClass = "bg-teal-500/10 text-teal-600 border-teal-500/20";
                  if (bmi < 18.5) { label = "Bajo peso"; badgeClass = "bg-amber-500/10 text-amber-600 border-amber-500/20"; }
                  else if (bmi >= 25 && bmi < 30) { label = "Sobrepeso"; badgeClass = "bg-amber-500/10 text-amber-600 border-amber-500/20"; }
                  else if (bmi >= 30) { label = "Obesidad"; badgeClass = "bg-red-500/10 text-red-600 border-red-500/20"; }
                  return (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-bold uppercase tracking-wider ${badgeClass}`}>
                      IMC {bmi.toFixed(1)} — {label}
                    </span>
                  );
                }
                return null;
              })()}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Peso */}
              <div className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent overflow-hidden">
                <label htmlFor="field-weight" className="absolute left-3 top-2 flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-ink-soft transition-colors group-focus-within:text-accent">
                  <Weight className="h-3 w-3" /> Peso
                </label>
                <div className="flex items-baseline px-3 pb-3 pt-7">
                  <input id="field-weight" inputMode="decimal" pattern="[0-9.,]*" className="w-full bg-transparent text-lg font-medium text-ink placeholder:text-ink-faint/30 !outline-none !ring-0 !shadow-none !border-0 focus:!ring-0 focus:!shadow-none focus:!outline-none focus-visible:!ring-0 focus-visible:!outline-none" placeholder="70.5"
                    value={form.vitalSigns.weight}
                    onChange={(e) => setForm((c) => ({ ...c, vitalSigns: { ...c.vitalSigns, weight: e.target.value } }))}
                  />
                  <span className="text-xs font-semibold text-ink-soft ml-1">kg</span>
                </div>
              </div>
              {/* Talla */}
              <div className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent overflow-hidden">
                <label htmlFor="field-height" className="absolute left-3 top-2 flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-ink-soft transition-colors group-focus-within:text-accent">
                  <Ruler className="h-3 w-3" /> Talla
                </label>
                <div className="flex items-baseline px-3 pb-3 pt-7">
                  <input id="field-height" inputMode="decimal" pattern="[0-9.,]*" className="w-full bg-transparent text-lg font-medium text-ink placeholder:text-ink-faint/30 !outline-none !ring-0 !shadow-none !border-0 focus:!ring-0 focus:!shadow-none focus:!outline-none focus-visible:!ring-0 focus-visible:!outline-none" placeholder="1.75"
                    value={form.vitalSigns.height ?? ""}
                    onChange={(e) => setForm((c) => ({ ...c, vitalSigns: { ...c.vitalSigns, height: e.target.value } }))}
                  />
                  <span className="text-xs font-semibold text-ink-soft ml-1">m</span>
                </div>
              </div>
            </div>
          </div>

          {/* EVA Pain Scale */}
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-end mb-1">
              <label className="text-xs font-bold uppercase tracking-widest text-ink-soft" aria-label="Escala de dolor del 0 al 10">
                Escala de Dolor (EVA)
              </label>
              <div className="flex items-center gap-3">
                {form.painScale !== null && (
                  <button
                    type="button"
                    onClick={() => setForm((c) => ({ ...c, painScale: null }))}
                    className="text-sm uppercase tracking-wider font-bold text-ink-soft hover:text-ink transition-colors"
                  >
                    Borrar
                  </button>
                )}
                <span className={`text-lg font-bold tabular-nums ${
                  form.painScale === null ? "text-ink-faint" :
                  form.painScale >= 7 ? "text-red-500" :
                  form.painScale >= 4 ? "text-amber-500" : "text-teal-500"
                }`}>
                  {form.painScale !== null ? `${form.painScale}/10` : "--/10"}
                </span>
              </div>
            </div>
            <div className="relative pt-2 pb-6">
              <input
                type="range" min={0} max={10} step={1}
                value={form.painScale ?? 0}
                aria-label="Escala de dolor del 0 al 10"
                onChange={(e) => setForm((c) => ({ ...c, painScale: Number(e.target.value) }))}
                className="w-full appearance-none h-2.5 rounded-full outline-none focus:ring-2 focus:ring-accent transition-all cursor-pointer"
                style={{
                  background: "linear-gradient(to right, #14b8a6, #f59e0b, #ef4444)",
                  opacity: form.painScale === null ? 0.3 : 1
                }}
              />
              <style>{`
                input[type=range]::-webkit-slider-thumb {
                  appearance: none;
                  width: 20px;
                  height: 20px;
                  border-radius: 50%;
                  background: var(--bg);
                  border: 3px solid ${form.painScale === null ? 'gray' : form.painScale >= 7 ? '#ef4444' : form.painScale >= 4 ? '#f59e0b' : '#14b8a6'};
                  cursor: pointer;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                  transition: border-color 0.2s;
                }
              `}</style>
              <div className="absolute w-full flex justify-between text-xs font-semibold text-ink-soft mt-2 px-1">
                <span className={form.painScale !== null && form.painScale <= 3 ? "text-teal-500" : ""}>0 Leve</span>
                <span className={form.painScale !== null && form.painScale >= 4 && form.painScale <= 6 ? "text-amber-500" : ""}>5 Moderado</span>
                <span className={form.painScale !== null && form.painScale >= 7 ? "text-red-500" : ""}>10 Severo</span>
              </div>
            </div>
          </div>



          {/* Alertas de signos vitales */}
          {(() => {
            const alerts: string[] = [];
            const bpMatch = form.vitalSigns.bloodPressure.match(/(\d+)\s*\/\s*(\d+)/);
            if (bpMatch) {
              const sys = parseInt(bpMatch[1], 10);
              const dia = parseInt(bpMatch[2], 10);
              if (sys >= 180 || dia >= 120) alerts.push(`Crisis Hipertensiva detectada (${sys}/${dia})`);
              if (sys <= 80 || dia <= 50) alerts.push(`Hipotensión severa detectada (${sys}/${dia})`);
            }
            const hr = parseInt(form.vitalSigns.heartRate, 10);
            if (hr >= 120) alerts.push(`Taquicardia severa (${hr} lpm)`);
            if (hr > 0 && hr <= 45) alerts.push(`Bradicardia severa (${hr} lpm)`);
            const rr = parseInt(form.vitalSigns.respiratoryRate, 10);
            if (rr >= 25) alerts.push(`Taquipnea (${rr} rpm)`);
            const sat = parseInt(form.vitalSigns.oxygenSaturation, 10);
            if (sat > 0 && sat <= 90) alerts.push(`Hipoxemia / Desaturación (${sat}%)`);
            const pam = parseInt(form.vitalSigns.mean_arterial_pressure, 10);
            if (pam > 0 && pam < 65) alerts.push(`PAM crítica — posible hipoperfusión (${pam} mmHg)`);

            if (alerts.length === 0) return null;
            return (
              <div className="mt-2 hce-alert-error">
                <p className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                    <path d="M12 9v4" />
                    <path d="M12 17h.01" />
                  </svg>
                  Alerta Médica: Valores Críticos
                </p>
                <ul className="list-disc pl-5 text-sm space-y-0.5">
                  {alerts.map((alert, i) => <li key={i}>{alert}</li>)}
                </ul>
              </div>
            );
          })()}
        </div>
      </div>
      )}

      {/* ── C. Examen Físico Segmentario (Tarea 4) ───────────────────── */}
      {uiPreferences?.hide_physical_exam !== true && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-ink border-b border-border pb-2">
            C. Examen Físico Segmentario
          </h4>

        <div>
          <p className="text-base text-ink-soft mb-2">
            Activa las regiones evaluadas. Las no seleccionadas se omitirán en el PDF.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 animate-in fade-in slide-in-from-top-2 duration-300 mt-2">
            {PHYSICAL_EXAM_SYSTEMS.map((systemName) => {
              const present = form.physicalExam.some((ex) => ex.system === systemName);
              const content = present ? form.physicalExam.find((ex) => ex.system === systemName)?.content ?? "" : "";

              const handleToggle = () => {
                setForm((c) => {
                  const next = [...c.physicalExam];
                  if (present) {
                    return { ...c, physicalExam: next.filter((ex) => ex.system !== systemName) };
                  } else {
                    next.push({ system: systemName, content: "" });
                    // sort to keep original order
                    const sortedNext = PHYSICAL_EXAM_SYSTEMS
                      .map((item) => next.find((ex) => ex.system === item)!)
                      .filter(Boolean);
                    return { ...c, physicalExam: sortedNext };
                  }
                });
              };

              const handleNotesChange = (val: string) => {
                setForm((c) => {
                  const newArr = [...c.physicalExam];
                  const idx = newArr.findIndex((ex) => ex.system === systemName);
                  if (idx >= 0) {
                    newArr[idx] = { ...newArr[idx], content: val };
                  }
                  return { ...c, physicalExam: newArr };
                });
              };

              return (
                <div key={systemName} className="rounded-xl border border-border bg-bg-soft overflow-hidden transition-colors">
                  <button
                    type="button"
                    aria-pressed={present}
                    onClick={handleToggle}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
                      present ? "border-accent/30 bg-accent/10" : "hover:bg-card"
                    }`}
                  >
                    <span className={`text-sm font-medium ${present ? "text-accent" : "text-ink"}`}>
                      {systemName}
                    </span>
                    <span
                      className={`flex-shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                        present ? "bg-accent/20 border border-accent/40 text-accent" : "bg-bg-soft border border-border text-ink-soft"
                      }`}
                    >
                      {present ? "!" : "—"}
                    </span>
                  </button>

                  {present && (
                    <div className="px-4 pb-3 pt-3 bg-bg-soft border-t border-border">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-ink-soft">Hallazgos</label>
                        {NORMAL_TEXT[systemName] && (
                          <button
                            type="button"
                            title={`Rellenar como normal`}
                            onClick={() => fillNormal(systemName)}
                            className="flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700 hover:bg-teal-100 transition dark:border-teal-700/40 dark:bg-teal-900/20 dark:text-teal-300"
                          >
                            🪄 Normal
                          </button>
                        )}
                      </div>
                      <textarea
                        className="hce-input min-h-16 text-sm"
                        placeholder={`Describa hallazgos en ${systemName.replace(/^[^\s]+\s/, "").toLowerCase()}...`}
                        value={content}
                        onChange={(e) => handleNotesChange(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Datos pediátricos condicionales */}
        {isPediatric && (
          <div className="rounded-2xl border border-sky-200 bg-sky-50/40 dark:bg-sky-900/10 dark:border-sky-700/30 p-4 space-y-3">
            <h5 className="text-xs font-bold text-sky-800 dark:text-sky-300 uppercase tracking-wider">
              Datos Pediátricos
            </h5>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <label htmlFor="field-head-circumference" className="text-xs font-medium text-ink-soft uppercase">Perímetro Cefálico (cm)</label>
                <input id="field-head-circumference" className="hce-input text-sm" placeholder="34.5"
                  value={form.pediatricData.headCircumference}
                  onChange={(e) => setForm((c) => ({ ...c, pediatricData: { ...c.pediatricData, headCircumference: e.target.value } }))}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="field-development-stage" className="text-xs font-medium text-ink-soft uppercase">Estadio de Desarrollo</label>
                <input id="field-development-stage" className="hce-input text-sm" placeholder="Acorde a edad / Tanner II..."
                  value={form.pediatricData.developmentStage}
                  onChange={(e) => setForm((c) => ({ ...c, pediatricData: { ...c.pediatricData, developmentStage: e.target.value } }))}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="field-vaccine-status" className="text-xs font-medium text-ink-soft uppercase">Estado Vacunal</label>
                <input id="field-vaccine-status" className="hce-input text-sm" placeholder="Completo / Incompleto / Sin datos"
                  value={form.pediatricData.vaccineStatus}
                  onChange={(e) => setForm((c) => ({ ...c, pediatricData: { ...c.pediatricData, vaccineStatus: e.target.value } }))}
                />
              </div>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
});
export default WizardStepPhysicalExam;
