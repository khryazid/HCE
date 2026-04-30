"use client";

import type { WizardForm } from "@/features/consultations/lib/use-consultation-wizard";
import { ChipSelector } from "@/features/consultations/components/chip-selector";

const PHYSICAL_EXAM_SYSTEMS = [
  "Cabeza y Cuello",
  "Ojos, Oídos, Nariz, Boca",
  "Tórax y Pulmones",
  "Cardiovascular",
  "Abdomen",
  "Genitourinario",
  "Extremidades",
  "Neurológico",
  "Piel y Faneras",
  "Osteoarticular",
  "General",
];

type Props = {
  form: WizardForm;
  setForm: React.Dispatch<React.SetStateAction<WizardForm>>;
  validationErrors: Record<string, string>;
  triggerMagicCieFill: () => void;
};

export function WizardStepDiagnosis({
  form,
  setForm,
  validationErrors,
  triggerMagicCieFill,
}: Props) {
  const updateBackground = (field: keyof WizardForm["backgrounds"], value: string) => {
    setForm(c => {
      const currentBg = c.backgrounds || {
        pathological: "",
        surgical: "",
        allergic: "",
        pharmacological: "",
        family: "",
        toxic: "",
        gynecoObstetric: "",
      };
      return {
        ...c,
        backgrounds: {
          ...currentBg,
          [field]: value,
        }
      };
    });
  };

  /** Al presionar Enter en un campo de antecedentes, inserta "\n• " en la posición del cursor. */
  function handleBulletKeyDown(
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    field: keyof WizardForm["backgrounds"],
  ) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const ta = e.currentTarget;
    const { selectionStart, selectionEnd, value } = ta;
    const insert = "\n\u2022 ";
    const next = value.slice(0, selectionStart) + insert + value.slice(selectionEnd);
    updateBackground(field, next);
    // Mueve el cursor después del bullet en el próximo frame de render
    const pos = selectionStart + insert.length;
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = pos;
    });
  }

  /** Al enfocar un campo vacío, agrega el primer bullet automáticamente. */
  function handleBulletFocus(
    e: React.FocusEvent<HTMLTextAreaElement>,
    field: keyof WizardForm["backgrounds"],
  ) {
    if (e.target.value.trim()) return;
    updateBackground(field, "\u2022 ");
    requestAnimationFrame(() => {
      e.target.selectionStart = e.target.selectionEnd = 2;
    });
  }

  return (
    <div className="space-y-8">
      {form.entryMode === "seguimiento" ? (
        <div className="hce-alert-info">
          Modo seguimiento activo. Puedes omitir algunos campos e ir directo a evolución y diagnóstico actual.
        </div>
      ) : null}

      {/* REGISTRO CLÍNICO */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-teal-900 border-b border-teal-100 pb-2">A. Registro Clínico</h4>
        
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink">Motivo de consulta <span className="text-red-500">*</span></label>
          <input
            id="field-chiefComplaint"
            className="hce-input"
            placeholder="¿Por qué viene hoy? Ej: Dolor abdominal intenso"
            value={form.chiefComplaint}
            onChange={(e) => setForm(c => ({ ...c, chiefComplaint: e.target.value }))}
          />
          {validationErrors.chiefComplaint ? (
            <p className="text-sm font-medium text-red-600">{validationErrors.chiefComplaint}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink">Enfermedad actual / Anamnesis</label>
          <textarea
            className="hce-input min-h-24"
            placeholder="Relato cronológico del padecimiento..."
            value={form.anamnesis}
            onChange={(e) => setForm(c => ({ ...c, anamnesis: e.target.value }))}
          />
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
          <h5 className="text-sm font-semibold text-teal-900 border-b border-teal-100 pb-2">Antecedentes Clínicos</h5>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-red-600">Alérgicos</label>
              <textarea
                className="hce-input min-h-16 border-red-200 bg-red-50/30 focus:border-red-400 focus:ring-red-400"
                placeholder="Alergias a medicamentos, alimentos, ambientales..."
                value={form.backgrounds?.allergic ?? ""}
                onFocus={(e) => handleBulletFocus(e, "allergic")}
                onKeyDown={(e) => handleBulletKeyDown(e, "allergic")}
                onChange={(e) => updateBackground("allergic", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-ink-soft">Patológicos (Médicos)</label>
              <textarea
                className="hce-input min-h-16"
                placeholder="HTA, Diabetes, Asma..."
                value={form.backgrounds?.pathological ?? ""}
                onFocus={(e) => handleBulletFocus(e, "pathological")}
                onKeyDown={(e) => handleBulletKeyDown(e, "pathological")}
                onChange={(e) => updateBackground("pathological", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-ink-soft">Quirúrgicos</label>
              <textarea
                className="hce-input min-h-16"
                placeholder="Cirugías previas..."
                value={form.backgrounds?.surgical ?? ""}
                onFocus={(e) => handleBulletFocus(e, "surgical")}
                onKeyDown={(e) => handleBulletKeyDown(e, "surgical")}
                onChange={(e) => updateBackground("surgical", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-ink-soft">Farmacológicos</label>
              <textarea
                className="hce-input min-h-16"
                placeholder="Medicamentos actuales..."
                value={form.backgrounds?.pharmacological ?? ""}
                onFocus={(e) => handleBulletFocus(e, "pharmacological")}
                onKeyDown={(e) => handleBulletKeyDown(e, "pharmacological")}
                onChange={(e) => updateBackground("pharmacological", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-ink-soft">Familiares</label>
              <textarea
                className="hce-input min-h-16"
                placeholder="Padres, abuelos..."
                value={form.backgrounds?.family ?? ""}
                onFocus={(e) => handleBulletFocus(e, "family")}
                onKeyDown={(e) => handleBulletKeyDown(e, "family")}
                onChange={(e) => updateBackground("family", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-ink-soft">Hábitos / Tóxicos</label>
              <textarea
                className="hce-input min-h-16"
                placeholder="Tabaco, alcohol, drogas, sedentarismo..."
                value={form.backgrounds?.toxic ?? ""}
                onFocus={(e) => handleBulletFocus(e, "toxic")}
                onKeyDown={(e) => handleBulletKeyDown(e, "toxic")}
                onChange={(e) => updateBackground("toxic", e.target.value)}
              />
            </div>
            
            {form.gender === "Femenino" && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-ink-soft">Gineco-obstétricos</label>
                <textarea
                  className="hce-input min-h-16"
                  placeholder="FUR, Gestas, Partos, Cesáreas, Abortos..."
                  value={form.backgrounds?.gynecoObstetric ?? ""}
                  onFocus={(e) => handleBulletFocus(e, "gynecoObstetric")}
                  onKeyDown={(e) => handleBulletKeyDown(e, "gynecoObstetric")}
                  onChange={(e) => updateBackground("gynecoObstetric", e.target.value)}
                />
              </div>
            )}
          </div>
          
          <details className="mt-4 text-sm text-ink-soft group">
            <summary className="cursor-pointer font-medium hover:text-ink">Mostrar otros antecedentes (Histórico)</summary>
            <div className="mt-3">
              <textarea
                className="hce-input min-h-16"
                placeholder="Registro histórico sin categorizar..."
                value={form.medicalHistory}
                onChange={(e) => setForm(c => ({ ...c, medicalHistory: e.target.value }))}
              />
            </div>
          </details>
        </div>
      </div>

      {/* EXAMEN FÍSICO */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-teal-900 border-b border-teal-100 pb-2">B. Examen Físico</h4>
        
        <div className="rounded-2xl border border-border bg-bg-soft p-4">
          <p className="text-xs font-semibold text-ink mb-3">Signos Vitales</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-ink-soft uppercase">T.A. (mmHg)</label>
              <input
                className="hce-input text-sm text-center px-2"
                placeholder="120/80"
                value={form.vitalSigns.bloodPressure}
                onChange={(e) => {
                  let val = e.target.value;

                  // Espacio → slash
                  val = val.replace(/ /g, "/");

                  // Solo permitir dígitos y un slash
                  val = val.replace(/[^\d/]/g, "");

                  // Evitar doble slash
                  const slashCount = (val.match(/\//g) || []).length;
                  if (slashCount > 1) return;

                  // Auto-insertar slash después de 3 dígitos sin slash
                  if (!val.includes("/") && val.length === 3) {
                    val = val + "/";
                  }

                  // Limitar: máx 3 dígitos antes y 3 después del slash
                  if (val.includes("/")) {
                    const [sys, dia] = val.split("/");
                    if ((sys?.length ?? 0) > 3 || (dia?.length ?? 0) > 3) return;
                  }

                  setForm(c => ({ ...c, vitalSigns: { ...c.vitalSigns, bloodPressure: val } }));
                }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-ink-soft uppercase">F.C. (lpm)</label>
              <input
                className="hce-input text-sm text-center px-2"
                placeholder="80"
                value={form.vitalSigns.heartRate}
                onChange={(e) => setForm(c => ({ ...c, vitalSigns: { ...c.vitalSigns, heartRate: e.target.value } }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-ink-soft uppercase">F.R. (rpm)</label>
              <input
                className="hce-input text-sm text-center px-2"
                placeholder="16"
                value={form.vitalSigns.respiratoryRate}
                onChange={(e) => setForm(c => ({ ...c, vitalSigns: { ...c.vitalSigns, respiratoryRate: e.target.value } }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-ink-soft uppercase">Temp. (°C)</label>
              <input
                className="hce-input text-sm text-center px-2"
                placeholder="36.5"
                value={form.vitalSigns.temperature}
                onChange={(e) => setForm(c => ({ ...c, vitalSigns: { ...c.vitalSigns, temperature: e.target.value } }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-ink-soft uppercase">SatO2 (%)</label>
              <input
                className="hce-input text-sm text-center px-2"
                placeholder="98"
                value={form.vitalSigns.oxygenSaturation}
                onChange={(e) => setForm(c => ({ ...c, vitalSigns: { ...c.vitalSigns, oxygenSaturation: e.target.value } }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-ink-soft uppercase">Peso (kg)</label>
              <input
                className="hce-input text-sm text-center px-2"
                placeholder="70.5"
                value={form.vitalSigns.weight}
                onChange={(e) => setForm(c => ({ ...c, vitalSigns: { ...c.vitalSigns, weight: e.target.value } }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-ink-soft uppercase">Talla (m)</label>
              <input
                className="hce-input text-sm text-center px-2"
                placeholder="1.75"
                value={form.vitalSigns.height ?? ""}
                onChange={(e) => setForm(c => ({ ...c, vitalSigns: { ...c.vitalSigns, height: e.target.value } }))}
              />
            </div>
          </div>
          
          {/* IMC Calculation */}
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
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs font-semibold text-ink-soft">IMC:</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${color}`}>
                    {bmi.toFixed(1)} - {label}
                  </span>
                </div>
              );
            }
            return null;
          })()}
          
          {/* Alertas de signos vitales */}
          {(() => {
            const alerts = [];
            
            // Validar T.A. (ej. 180/120)
            const bpMatch = form.vitalSigns.bloodPressure.match(/(\d+)\s*\/\s*(\d+)/);
            if (bpMatch) {
              const sys = parseInt(bpMatch[1], 10);
              const dia = parseInt(bpMatch[2], 10);
              if (sys >= 180 || dia >= 120) alerts.push(`Crisis Hipertensiva detectada (${sys}/${dia})`);
              if (sys <= 80 || dia <= 50) alerts.push(`Hipotensión severa detectada (${sys}/${dia})`);
            }
            
            // Validar F.C.
            const hr = parseInt(form.vitalSigns.heartRate, 10);
            if (hr >= 120) alerts.push(`Taquicardia severa (${hr} lpm)`);
            if (hr > 0 && hr <= 45) alerts.push(`Bradicardia severa (${hr} lpm)`);

            // Validar F.R.
            const rr = parseInt(form.vitalSigns.respiratoryRate, 10);
            if (rr >= 25) alerts.push(`Taquipnea (${rr} rpm)`);
            
            // Validar SatO2
            const sat = parseInt(form.vitalSigns.oxygenSaturation, 10);
            if (sat > 0 && sat <= 90) alerts.push(`Hipoxemia / Desaturación (${sat}%)`);

            if (alerts.length === 0) return null;

            return (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
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

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-ink block mb-1">Examen Físico Segmentario</label>
            <p className="text-[11px] text-ink-soft mb-2">Selecciona las regiones evaluadas para agregarlas al reporte. Si no seleccionas ninguna, esta sección se omitirá en el PDF.</p>
            <ChipSelector
              catalog={PHYSICAL_EXAM_SYSTEMS}
              selected={form.physicalExam.map(ex => ex.system)}
              onChange={(items) => {
                setForm(c => {
                  const next = c.physicalExam.filter(ex => items.includes(ex.system));
                  for (const item of items) {
                    if (!next.find(ex => ex.system === item)) {
                      next.push({ system: item, content: "" });
                    }
                  }
                  const sortedNext = items.map(item => next.find(ex => ex.system === item)!).filter(Boolean);
                  return { ...c, physicalExam: sortedNext };
                });
              }}
            />
          </div>

          {form.physicalExam.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 mt-2">
              {form.physicalExam.map((ex, idx) => (
                <div key={ex.system} className="space-y-1.5">
                  <label className="text-xs font-semibold text-ink">{ex.system}</label>
                  <textarea
                    className="hce-input min-h-[80px] text-sm"
                    placeholder={`Hallazgos en ${ex.system.toLowerCase()}...`}
                    value={ex.content}
                    onChange={(e) => {
                      const text = e.target.value;
                      setForm(c => {
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
        </div>
      </div>

      {/* DIAGNÓSTICO */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-teal-900 border-b border-teal-100 pb-2">C. Diagnóstico</h4>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink">Análisis Clínico</label>
          <textarea
            className="hce-input min-h-20"
            placeholder="Justificación o razonamiento clínico..."
            value={form.clinicalAnalysis}
            onChange={(e) => setForm(c => ({ ...c, clinicalAnalysis: e.target.value }))}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink">Impresión Diagnóstica <span className="text-red-500">*</span></label>
            <textarea
              id="field-diagnosis"
              className="hce-input min-h-20"
              placeholder="Ej: Apendicitis aguda"
              value={form.diagnosis}
              onChange={(e) => setForm(c => ({ ...c, diagnosis: e.target.value }))}
              onBlur={triggerMagicCieFill}
            />
            {validationErrors.diagnosis ? (
              <p className="text-sm font-medium text-red-600">{validationErrors.diagnosis}</p>
            ) : null}
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink">Códigos CIE-10 / CIE-11</label>
            <textarea
              className="hce-input min-h-20"
              placeholder="Codificación formal."
              value={form.cieCodes}
              onChange={(e) => setForm(c => ({ ...c, cieCodes: e.target.value }))}
            />
          </div>
        </div>
      </div>

    </div>
  );
}
