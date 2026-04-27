"use client";

import type { WizardForm } from "@/lib/consultations/use-consultation-wizard";

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
                onChange={(e) => updateBackground("allergic", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-ink-soft">Patológicos (Médicos)</label>
              <textarea
                className="hce-input min-h-16"
                placeholder="HTA, Diabetes, Asma..."
                value={form.backgrounds?.pathological ?? ""}
                onChange={(e) => updateBackground("pathological", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-ink-soft">Quirúrgicos</label>
              <textarea
                className="hce-input min-h-16"
                placeholder="Cirugías previas..."
                value={form.backgrounds?.surgical ?? ""}
                onChange={(e) => updateBackground("surgical", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-ink-soft">Farmacológicos</label>
              <textarea
                className="hce-input min-h-16"
                placeholder="Medicamentos actuales..."
                value={form.backgrounds?.pharmacological ?? ""}
                onChange={(e) => updateBackground("pharmacological", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-ink-soft">Familiares</label>
              <textarea
                className="hce-input min-h-16"
                placeholder="Padres, abuelos..."
                value={form.backgrounds?.family ?? ""}
                onChange={(e) => updateBackground("family", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-ink-soft">Hábitos / Tóxicos</label>
              <textarea
                className="hce-input min-h-16"
                placeholder="Tabaco, alcohol, drogas, sedentarismo..."
                value={form.backgrounds?.toxic ?? ""}
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
                  const val = e.target.value;
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

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink">Hallazgos Físicos</label>
          <textarea
            className="hce-input min-h-20"
            placeholder="Descripción detallada del examen físico segmentario..."
            value={form.physicalExam}
            onChange={(e) => setForm(c => ({ ...c, physicalExam: e.target.value }))}
          />
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
