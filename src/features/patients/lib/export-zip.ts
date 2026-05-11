/**
 * lib/patients/export-zip.ts
 *
 * Generates a portable ZIP archive of a patient's full clinical history.
 *
 * Structure inside the ZIP:
 *   {patient_name}/
 *     00_paciente.json          ← datos demográficos del paciente
 *     01_consulta_{date}.pdf    ← un PDF por cada consulta (formato visual)
 *     index.json                ← índice de todas las consultas (para QA / auditoría)
 *
 * Design decisions:
 * - Runs 100% in the browser (no server round-trip) so no patient data
 *   leaves the client unencrypted through an intermediate endpoint.
 * - Uses JSZip for ZIP generation and the existing generateConsultationPdfBlob()
 *   for PDF rendering — both are dynamically imported to keep bundle size down.
 * - Each PDF is the lightweight plain-text variant from buildPdfLines(), not the
 *   full visual renderer, to keep generation fast for large histories.
 */

import type { PatientRecord } from "@/features/patients/types";
import type { ClinicalRecordRecord } from "@/features/consultations/types";
import type { LetterheadSettings } from "@/features/dashboard/lib/letterhead";
import { generateConsultationPdfBlob, type ConsultationPdfData } from "@/features/consultations/lib/pdf";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExportProgress = {
  current: number;
  total: number;
  label: string;
};

export type ExportZipOptions = {
  patient: PatientRecord;
  records: ClinicalRecordRecord[];
  letterhead: LetterheadSettings;
  onProgress?: (p: ExportProgress) => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeFilename(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // strip diacritics
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 60);
}

function getTextField(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function buildPdfDataFromRecord(
  record: ClinicalRecordRecord,
  patient: PatientRecord,
): ConsultationPdfData {
  const sd = (record.specialty_data ?? {}) as Record<string, unknown>;
  const ps = ((sd.patient_snapshot ?? {}) as Record<string, string>);
  const vs = (sd.vital_signs ?? {}) as Record<string, string>;

  return {
    patientName:    patient.full_name,
    patientDocument: patient.document_number,
    birthDate:      patient.birth_date ?? undefined,
    consultationDate: new Date(record.created_at).toLocaleDateString("es-EC", {
      year: "numeric", month: "long", day: "numeric",
    }),
    gender:      getTextField(ps.gender),
    occupation:  getTextField(ps.occupation),
    insurance:   getTextField(ps.insurance),
    chiefComplaint:  getTextField(sd.chief_complaint as string, record.chief_complaint ?? ""),
    anamnesis:       getTextField(sd.anamnesis as string, "Sin anamnesis"),
    medicalHistory:  getTextField(sd.medical_history as string),
    backgrounds:     sd.backgrounds as ConsultationPdfData["backgrounds"],
    vitalSigns: {
      bloodPressure:    getTextField(vs.bloodPressure),
      heartRate:        getTextField(vs.heartRate),
      respiratoryRate:  getTextField(vs.respiratoryRate),
      temperature:      getTextField(vs.temperature),
      oxygenSaturation: getTextField(vs.oxygenSaturation),
      weight:           getTextField(vs.weight),
      height:           getTextField(vs.height),
    },
    physicalExam:   getTextField(sd.physical_exam as string),
    physicalExamStructured: sd.physical_exam_structured as ConsultationPdfData["physicalExamStructured"],
    diagnosis:      getTextField(sd.diagnosis as string, "Sin diagnóstico"),
    cieCodes:       record.cie_codes ?? [],
    clinicalAnalysis:       getTextField(sd.clinical_analysis as string),
    treatmentPlan:          getTextField(sd.treatment_plan as string, "Sin tratamiento"),
    medicationInstructions: getTextField(sd.medication_instructions as string),
    recommendations:        getTextField(sd.recommendations as string),
    warningSigns:           getTextField(sd.warning_signs as string),
    labOrders:     (sd.lab_orders as string[] | undefined) ?? [],
    imagingOrders: (sd.imaging_orders as string[] | undefined) ?? [],
    specialtyKind:   record.specialty_kind ?? "general",
    evolutionStatus: getTextField(sd.evolution_status as string),
    followUpDate:    getTextField(sd.next_follow_up_date as string) || undefined,
  };
}

// ─── Main export function ─────────────────────────────────────────────────────

/**
 * Generates a ZIP blob containing the patient's full clinical history.
 * Returns a Blob that can be downloaded via a URL.
 */
export async function exportPatientZip({
  patient,
  records,
  letterhead,
  onProgress,
}: ExportZipOptions): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  const folderName = safeFilename(patient.full_name);
  const folder = zip.folder(folderName)!;

  const total = records.length + 2; // +2 for json files
  let current = 0;

  const report = (label: string) => {
    onProgress?.({ current: ++current, total, label });
  };

  // 1. Patient demographics JSON
  report("Exportando datos del paciente…");
  const patientJson = {
    id:              patient.id,
    full_name:       patient.full_name,
    document_number: patient.document_number,
    birth_date:      patient.birth_date,
    status:          patient.status,
    created_at:      patient.created_at,
    exported_at:     new Date().toISOString(),
    total_consultations: records.length,
  };
  folder.file("00_paciente.json", JSON.stringify(patientJson, null, 2));

  // 2. Index of all consultations
  report("Generando índice de consultas…");
  const index = records.map((r, i) => ({
    numero:     i + 1,
    id:         r.id,
    fecha:      r.created_at,
    especialidad: r.specialty_kind,
    motivo:     r.chief_complaint,
    codigos_cie: r.cie_codes,
    archivo_pdf: `${String(i + 1).padStart(2, "0")}_consulta_${safeFilename(r.created_at.split("T")[0])}.pdf`,
  }));
  folder.file("index.json", JSON.stringify(index, null, 2));

  // 3. One PDF per consultation
  const sorted = [...records].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  for (let i = 0; i < sorted.length; i++) {
    const record = sorted[i];
    const dateSlug = safeFilename(record.created_at.split("T")[0]);
    const filename = `${String(i + 1).padStart(2, "0")}_consulta_${dateSlug}.pdf`;

    report(`Generando PDF ${i + 1} de ${sorted.length}…`);

    const pdfData = buildPdfDataFromRecord(record, patient);
    const pdfBytes = await generateConsultationPdfBlob(letterhead, pdfData);
    folder.file(filename, pdfBytes, { binary: true });
  }

  // 4. Generate ZIP blob
  const zipBlob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return zipBlob;
}

/**
 * Triggers a browser download for the given ZIP blob.
 */
export function downloadZipBlob(blob: Blob, patientName: string): void {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href    = url;
  a.download = `${safeFilename(patientName)}_historia_clinica.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
