import { ClinicalRecordRecord } from "@/features/consultations/types";
import { MedInstruction, assembleInstructionText } from "@/features/consultations/components/medication-instructions-builder";

export function formatMedicalReport(
  record: ClinicalRecordRecord,
  patientName: string,
  doctorName: string
): string {
  const data = record.specialty_data as Record<string, unknown>;
  
  let text = `*INFORME MÉDICO*\n`;
  text += `*Doctor:* ${doctorName}\n`;
  text += `*Paciente:* ${patientName}\n`;
  text += `*Fecha:* ${new Date(record.created_at).toLocaleDateString("es-EC")}\n\n`;

  if (record.chief_complaint) {
    text += `*Motivo de Consulta:*\n${record.chief_complaint}\n\n`;
  }
  
  if (data.diagnosis) {
    text += `*Diagnóstico:*\n${data.diagnosis}\n\n`;
  }

  if (data.treatment_plan) {
    text += `*Plan de Tratamiento:*\n${data.treatment_plan}\n\n`;
  }
  
  if (data.recommendations) {
    text += `*Recomendaciones:*\n${data.recommendations}\n`;
  }

  return text;
}

export function formatPrescription(
  record: ClinicalRecordRecord,
  patientName: string,
  doctorName: string
): string {
  const data = record.specialty_data as Record<string, unknown>;
  
  let text = `*RECETA MÉDICA*\n`;
  text += `*Doctor:* ${doctorName}\n`;
  text += `*Paciente:* ${patientName}\n`;
  text += `*Fecha:* ${new Date(record.created_at).toLocaleDateString("es-EC")}\n\n`;

  if (data.medication_instructions_structured) {
    const meds = data.medication_instructions_structured as MedInstruction[];
    if (meds.length > 0) {
      text += `*Medicamentos:*\n`;
      text += assembleInstructionText(meds) + `\n\n`;
    }
  } else if (data.medication_instructions) {
    text += `*Medicamentos:*\n${data.medication_instructions}\n\n`;
  }
  
  if (data.recommendations) {
    text += `*Recomendaciones:*\n${data.recommendations}\n`;
  }

  return text;
}

export function getWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = phone.replace(/\D/g, "");
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
