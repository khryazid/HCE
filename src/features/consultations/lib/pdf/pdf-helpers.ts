import type { jsPDF } from "jspdf";
import type { PdfContext, ConsultationPdfData } from "./pdf-types";
import type { LetterheadSettings } from "@/features/dashboard/lib/letterhead";
import { PDF_COLORS } from "./pdf-constants";

export function resolveImageFormat(dataUrl: string) {
  if (dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg")) {
    return "JPEG";
  }

  if (dataUrl.startsWith("data:image/webp")) {
    return "WEBP";
  }

  return "PNG";
}

export function calculateAge(birthDate: string): string {
  if (!birthDate) return "N/A";
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return "N/A";
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  if (age < 0 || age > 130) return "N/A";
  return `${age} años`;
}

export function setColor(doc: jsPDF, hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  doc.setTextColor(r, g, b);
}

export function setFill(doc: jsPDF, hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  doc.setFillColor(r, g, b);
}

export function checkPageBreak(ctx: PdfContext, neededHeight: number) {
  if (ctx.y + neededHeight > ctx.pageHeight - ctx.margin) {
    ctx.doc.addPage();
    ctx.y = ctx.margin;
    return true;
  }
  return false;
}

export function drawSectionHeader(ctx: PdfContext, title: string) {
  const { doc, contentWidth, margin } = ctx;
  const yPos = ctx.y;

  setFill(doc, PDF_COLORS.GRAY_BG);
  doc.rect(margin, yPos, contentWidth, 22, "F");
  setFill(doc, PDF_COLORS.LIGHT_BLUE);
  doc.rect(margin, yPos, 4, 22, "F");
  
  // Borders
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, margin + contentWidth, yPos);
  doc.line(margin, yPos + 22, margin + contentWidth, yPos + 22);

  doc.setFont("SpaceGrotesk", "bold");
  doc.setFontSize(10);
  setColor(doc, PDF_COLORS.DARK_BLUE);
  doc.text(title.toUpperCase(), margin + 14, yPos + 15);
  
  ctx.y = yPos + 32;
}

export function drawBlock(ctx: PdfContext, label: string, text: string) {
  if (!text || !text.trim()) return;
  checkPageBreak(ctx, 30);
  const { doc, margin, contentWidth } = ctx;

  const hasBullets = text.includes("\n") || text.includes("•") || text.length > 80;
  if (hasBullets) {
    doc.setFont("SpaceGrotesk", "bold");
    doc.setFontSize(9);
    setColor(doc, PDF_COLORS.DARK_BLUE);
    doc.text(label.toUpperCase(), margin, ctx.y);
    ctx.y += 13;
    doc.setFont("SpaceGrotesk", "normal");
    doc.setFontSize(10);
    setColor(doc, PDF_COLORS.TEXT);
    const lines = doc.splitTextToSize(text, contentWidth - 10);
    for (const line of lines) {
      checkPageBreak(ctx, 14);
      doc.text(line, margin + 8, ctx.y);
      ctx.y += 13;
    }
    ctx.y += 8;
  } else {
    doc.setFont("SpaceGrotesk", "bold");
    doc.setFontSize(10);
    setColor(doc, PDF_COLORS.TEXT);
    doc.text(label + ":", margin, ctx.y);
    doc.setFont("SpaceGrotesk", "normal");
    const lw = doc.getTextWidth(label + ":");
    const lines = doc.splitTextToSize(text, contentWidth - lw - 6);
    for (let i = 0; i < lines.length; i++) {
      if (i > 0) {
        if (checkPageBreak(ctx, 14)) {
          doc.text(lines[i], margin + 8, ctx.y);
          ctx.y += 13;
          continue;
        }
      }
      doc.text(lines[i], i === 0 ? margin + lw + 6 : margin + 8, ctx.y);
      ctx.y += 13;
    }
    ctx.y += 8;
  }
}

export function buildPdfLines(letterhead: LetterheadSettings, data: ConsultationPdfData) {
  const rosLines: string[] = [];
  if (data.reviewOfSystems) {
    const activeRos = Object.entries(data.reviewOfSystems).filter(([, v]) => v.present);
    if (activeRos.length > 0) {
      rosLines.push("", "--- REVISION POR SISTEMAS ---");
      for (const [key, val] of activeRos) {
        rosLines.push(`${key.toUpperCase()}: ${val.notes || "Hallazgo positivo sin descripcion"}`);
      }
    }
  }

  const soapLines: string[] = [];
  if (data.soapSubjective || data.soapObjective || data.soapAssessment || data.soapPlan) {
    soapLines.push("", "--- EVOLUCION CLINICA (SOAP) ---");
    if (data.soapSubjective) soapLines.push(`S (Subjetivo): ${data.soapSubjective}`);
    if (data.soapObjective) soapLines.push(`O (Objetivo): ${data.soapObjective}`);
    if (data.soapAssessment) soapLines.push(`A (Assessment): ${data.soapAssessment}`);
    if (data.soapPlan) soapLines.push(`P (Plan): ${data.soapPlan}`);
  }

  return [
    `${letterhead.professional_title} ${letterhead.doctor_name}`.trim(),
    letterhead.specialties,
    `Direccion: ${letterhead.address}`,
    `Contacto: ${letterhead.phone_primary}${letterhead.phone_secondary ? ` / ${letterhead.phone_secondary}` : ""}`,
    letterhead.contact_email ? `Email: ${letterhead.contact_email}` : "",
    "",
    "HISTORIA CLINICA - RESUMEN DE CONSULTA",
    `Fecha: ${data.consultationDate}`,
    `Paciente: ${data.patientName} (${data.patientDocument})`,
    `Especialidad: ${data.specialtyKind}`,
    data.birthDate ? `Fecha Nac.: ${data.birthDate}` : "",
    data.gender ? `Genero: ${data.gender}` : "",
    "",
    "--- 1. MOTIVO DE CONSULTA Y ANTECEDENTES ---",
    `Motivo: ${data.chiefComplaint}`,
    `Anamnesis: ${data.anamnesis}`,
    data.medicalHistory ? `Historial: ${data.medicalHistory}` : "",
    ...rosLines,
    "",
    "--- 2. SIGNOS VITALES Y EXAMEN FISICO ---",
    data.generalCondition ? `Estado General: ${data.generalCondition}` : "",
    data.vitalSigns?.bloodPressure ? `Presion arterial: ${data.vitalSigns.bloodPressure}` : "",
    data.vitalSigns?.heartRate ? `Frecuencia cardiaca: ${data.vitalSigns.heartRate}` : "",
    data.vitalSigns?.weight ? `Peso: ${data.vitalSigns.weight}` : "",
    data.painScale !== null && data.painScale !== undefined ? `Escala EVA: ${data.painScale}/10` : "",
    data.physicalExam ? `Examen fisico: ${data.physicalExam}` : "",
    "",
    "--- 3. DIAGNOSTICO Y PLAN ---",
    `Diagnostico: ${data.diagnosis}`,
    `Codigos CIE: ${data.cieCodes.join(", ") || "Sin codigos"}`,
    data.clinicalAnalysis ? `Analisis Clinico: ${data.clinicalAnalysis}` : "",
    `Tratamiento / Receta: ${data.treatmentPlan}`,
    data.medicationInstructions ? `Instrucciones al Paciente: ${data.medicationInstructions}` : "",
    data.recommendations ? `Recomendaciones: ${data.recommendations}` : "",
    data.warningSigns ? `Signos de alarma: ${data.warningSigns}` : "",
    "",
    ...(soapLines.length ? soapLines : data.evolutionStatus ? ["--- 4. EVOLUCION ---", `Evolucion: ${data.evolutionStatus}`] : []),
    data.followUpDate ? `Proximo control: ${data.followUpDate}` : "",
    (data.prognosisVital || data.prognosisFunctional)
      ? `PRONOSTICO - Vital: ${data.prognosisVital || "No evaluado"} / Funcional: ${data.prognosisFunctional || "No evaluado"}`
      : "",
  ].filter(Boolean);
}
