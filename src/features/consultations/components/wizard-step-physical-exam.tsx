"use client";

import type { WizardForm } from "@/features/consultations/lib/use-consultation-wizard";
import { ChipSelector } from "@/features/consultations/components/chip-selector";

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
};

export function WizardStepPhysicalExam({ form, setForm, tenantSpecialties = [] }: Props) {
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
  function fillNormal(idx: number, systemName: string) {
    const normalText = NORMAL_TEXT[systemName] ?? "";
    if (!normalText) return;
    setForm((c) => {
      const newArr = [...c.physicalExam];
      const current = newArr[idx]?.content ?? "";
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
        <h4 className="text-sm font-semibold text-teal-900 dark:text-teal-400 border-b border-teal-100 dark:border-teal-500/30 pb-2">
          A. Estado General del Paciente
        </h4>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-ink flex-1">Descripción del estado general</label>
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
                className="flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-2 py-1 text-[10px] font-semibold text-teal-700 hover:bg-teal-100 transition dark:border-teal-700/40 dark:bg-teal-900/20 dark:text-teal-300"
              >
                🪄 Normal
              </button>
            )}
          </div>
          <textarea
            className="hce-input min-h-16"
            placeholder="Paciente consciente, orientado en tiempo, lugar y persona, en regulares/buenas condiciones generales..."
            value={form.generalCondition}
            onChange={(e) => setForm((c) => ({ ...c, generalCondition: e.target.value }))}
          />
        </div>
      </div>

      {/* ── B. Signos Vitales + PAM (Tarea 3) ────────────────────────── */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-teal-900 dark:text-teal-400 border-b border-teal-100 dark:border-teal-500/30 pb-2">
          B. Signos Vitales y Antropometría
        </h4>
        <div className="rounded-2xl border border-border bg-bg-soft p-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
            {/* T.A. con PAM */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[10px] font-medium text-ink-soft uppercase">T.A. (mmHg)</label>
              <input
                inputMode="decimal"
                pattern="[0-9.,]*"
                className="hce-input text-sm text-center px-2"
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
              {/* PAM (solo lectura) */}
              {form.vitalSigns.mean_arterial_pressure ? (
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[10px] font-semibold text-ink-soft">PAM:</span>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    parseInt(form.vitalSigns.mean_arterial_pressure) < 65
                      ? "bg-red-100 text-red-700"
                      : parseInt(form.vitalSigns.mean_arterial_pressure) > 110
                      ? "bg-amber-100 text-amber-700"
                      : "bg-emerald-100 text-emerald-800"
                  }`}>
                    {form.vitalSigns.mean_arterial_pressure} mmHg
                  </span>
                </div>
              ) : null}
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-medium text-ink-soft uppercase">F.C. (lpm)</label>
              <input inputMode="decimal" pattern="[0-9.,]*" className="hce-input text-sm text-center px-2" placeholder="80"
                value={form.vitalSigns.heartRate}
                onChange={(e) => setForm((c) => ({ ...c, vitalSigns: { ...c.vitalSigns, heartRate: e.target.value } }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-ink-soft uppercase">F.R. (rpm)</label>
              <input inputMode="decimal" pattern="[0-9.,]*" className="hce-input text-sm text-center px-2" placeholder="16"
                value={form.vitalSigns.respiratoryRate}
                onChange={(e) => setForm((c) => ({ ...c, vitalSigns: { ...c.vitalSigns, respiratoryRate: e.target.value } }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-ink-soft uppercase">Temp. (°C)</label>
              <input inputMode="decimal" pattern="[0-9.,]*" className="hce-input text-sm text-center px-2" placeholder="36.5"
                value={form.vitalSigns.temperature}
                onChange={(e) => setForm((c) => ({ ...c, vitalSigns: { ...c.vitalSigns, temperature: e.target.value } }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-ink-soft uppercase">SatO2 (%)</label>
              <input inputMode="decimal" pattern="[0-9.,]*" className="hce-input text-sm text-center px-2" placeholder="98"
                value={form.vitalSigns.oxygenSaturation}
                onChange={(e) => setForm((c) => ({ ...c, vitalSigns: { ...c.vitalSigns, oxygenSaturation: e.target.value } }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-ink-soft uppercase">Peso (kg)</label>
              <input inputMode="decimal" pattern="[0-9.,]*" className="hce-input text-sm text-center px-2" placeholder="70.5"
                value={form.vitalSigns.weight}
                onChange={(e) => setForm((c) => ({ ...c, vitalSigns: { ...c.vitalSigns, weight: e.target.value } }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-ink-soft uppercase">Talla (m)</label>
              <input
                inputMode="decimal"
                pattern="[0-9.,]*"
                className="hce-input text-sm text-center px-2"
                placeholder="1.75"
                value={form.vitalSigns.height ?? ""}
                onChange={(e) => setForm((c) => ({ ...c, vitalSigns: { ...c.vitalSigns, height: e.target.value } }))}
              />
            </div>
          </div>

          {/* EVA Pain Scale */}
          <div className="space-y-2 border-t border-border pt-3">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-medium text-ink-soft uppercase" aria-label="Escala de dolor del 0 al 10">
                Escala de Dolor EVA
              </label>
              <span className={`text-sm font-bold ${
                (form.painScale ?? 0) >= 7 ? "text-red-600" :
                (form.painScale ?? 0) >= 4 ? "text-amber-600" : "text-emerald-600"
              }`}>
                {form.painScale !== null ? `${form.painScale}/10` : "Sin evaluar"}
              </span>
            </div>
            <input
              type="range" min={0} max={10} step={1}
              value={form.painScale ?? 0}
              aria-label="Escala de dolor del 0 al 10"
              onChange={(e) => setForm((c) => ({ ...c, painScale: Number(e.target.value) }))}
              className="w-full accent-teal-600"
            />
            <div className="flex justify-between text-[9px] text-ink-soft">
              <span>0 Sin dolor</span>
              <span>5 Moderado</span>
              <span>10 Insoportable</span>
            </div>
            {form.painScale !== null && (
              <button
                type="button"
                onClick={() => setForm((c) => ({ ...c, painScale: null }))}
                className="text-[10px] text-ink-soft hover:text-ink transition-colors"
              >
                No evaluar dolor
              </button>
            )}
          </div>

          {/* IMC Cálculo automático */}
          {(() => {
            const w = parseFloat(form.vitalSigns.weight?.replace(",", "."));
            const h = parseFloat(form.vitalSigns.height?.replace(",", "."));
            if (!isNaN(w) && !isNaN(h) && h > 0.5 && h < 3) {
              const bmi = w / (h * h);
              let label = "Normal";
              let color = "bg-emerald-100 text-emerald-800";
              if (bmi < 18.5) { label = "Bajo peso"; color = "bg-amber-100 text-amber-800"; }
              else if (bmi >= 25 && bmi < 30) { label = "Sobrepeso"; color = "bg-amber-100 text-amber-800"; }
              else if (bmi >= 30) { label = "Obesidad"; color = "bg-red-100 text-red-800"; }
              return (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-ink-soft">IMC:</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${color}`}>
                    {bmi.toFixed(1)} — {label}
                  </span>
                </div>
              );
            }
            return null;
          })()}

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
              <div className="mt-2 rounded-xl border border-red-200 bg-red-50 p-3">
                <p className="text-xs font-bold uppercase tracking-wider text-red-800 flex items-center gap-1.5 mb-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                    <path d="M12 9v4" />
                    <path d="M12 17h.01" />
                  </svg>
                  Alerta Médica: Valores Críticos
                </p>
                <ul className="list-disc pl-5 text-sm text-red-700 space-y-0.5">
                  {alerts.map((alert, i) => <li key={i}>{alert}</li>)}
                </ul>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── C. Examen Físico Segmentario (Tarea 4) ───────────────────── */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-teal-900 dark:text-teal-400 border-b border-teal-100 dark:border-teal-500/30 pb-2">
          C. Examen Físico Segmentario
        </h4>

        <div>
          <p className="text-[11px] text-ink-soft mb-2">
            Selecciona las regiones evaluadas. Las no seleccionadas se omitirán en el PDF.
            Usa el botón <span className="font-semibold">🪄 Normal</span> para insertar hallazgos estándar.
          </p>
          <ChipSelector
            catalog={PHYSICAL_EXAM_SYSTEMS}
            selected={form.physicalExam.map((ex) => ex.system)}
            onChange={(items) => {
              setForm((c) => {
                const next = c.physicalExam.filter((ex) => items.includes(ex.system));
                for (const item of items) {
                  if (!next.find((ex) => ex.system === item)) {
                    next.push({ system: item, content: "" });
                  }
                }
                const sortedNext = items
                  .map((item) => next.find((ex) => ex.system === item)!)
                  .filter(Boolean);
                return { ...c, physicalExam: sortedNext };
              });
            }}
          />
        </div>

        {form.physicalExam.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 mt-2">
            {form.physicalExam.map((ex, idx) => (
              <div key={ex.system} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-ink flex-1">{ex.system}</label>
                  {NORMAL_TEXT[ex.system] && (
                    <button
                      type="button"
                      title={`Rellenar "${ex.system}" como normal`}
                      onClick={() => fillNormal(idx, ex.system)}
                      className="flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700 hover:bg-teal-100 transition dark:border-teal-700/40 dark:bg-teal-900/20 dark:text-teal-300"
                    >
                      🪄 Normal
                    </button>
                  )}
                </div>
                <textarea
                  className="hce-input min-h-[80px] text-sm"
                  placeholder={`Hallazgos en ${ex.system.toLowerCase()}...`}
                  value={ex.content}
                  onChange={(e) => {
                    const text = e.target.value;
                    setForm((c) => {
                      const newArr = [...c.physicalExam];
                      newArr[idx] = { ...newArr[idx], content: text };
                      return { ...c, physicalExam: newArr };
                    });
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Datos pediátricos condicionales */}
        {isPediatric && (
          <div className="rounded-2xl border border-sky-200 bg-sky-50/40 dark:bg-sky-900/10 dark:border-sky-700/30 p-4 space-y-3">
            <h5 className="text-xs font-bold text-sky-800 dark:text-sky-300 uppercase tracking-wider">
              Datos Pediátricos
            </h5>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-ink-soft uppercase">Perímetro Cefálico (cm)</label>
                <input className="hce-input text-sm" placeholder="34.5"
                  value={form.pediatricData.headCircumference}
                  onChange={(e) => setForm((c) => ({ ...c, pediatricData: { ...c.pediatricData, headCircumference: e.target.value } }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-ink-soft uppercase">Estadio de Desarrollo</label>
                <input className="hce-input text-sm" placeholder="Acorde a edad / Tanner II..."
                  value={form.pediatricData.developmentStage}
                  onChange={(e) => setForm((c) => ({ ...c, pediatricData: { ...c.pediatricData, developmentStage: e.target.value } }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-ink-soft uppercase">Estado Vacunal</label>
                <input className="hce-input text-sm" placeholder="Completo / Incompleto / Sin datos"
                  value={form.pediatricData.vaccineStatus}
                  onChange={(e) => setForm((c) => ({ ...c, pediatricData: { ...c.pediatricData, vaccineStatus: e.target.value } }))}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
