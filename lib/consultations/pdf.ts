import { jsPDF } from "jspdf";
import type { LetterheadSettings } from "@/lib/local-data/letterhead";

function resolveImageFormat(dataUrl: string) {
  if (dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg")) {
    return "JPEG";
  }

  if (dataUrl.startsWith("data:image/webp")) {
    return "WEBP";
  }

  return "PNG";
}

type ConsultationPdfData = {
  patientName: string;
  patientDocument: string;
  consultationDate: string;
  anamnesis: string;
  symptoms: string;
  diagnosis: string;
  cieCodes: string[];
  treatmentPlan: string;
  specialtyKind: string;
  evolutionStatus?: string;
  followUpDate?: string;
};

export function buildPdfLines(letterhead: LetterheadSettings, data: ConsultationPdfData) {
  return [
    `${letterhead.professional_title} ${letterhead.doctor_name}`.trim(),
    letterhead.specialties,
    `Direccion: ${letterhead.address}`,
    `Contacto: ${letterhead.phone_primary}${letterhead.phone_secondary ? ` / ${letterhead.phone_secondary}` : ""}`,
    letterhead.contact_email ? `Email: ${letterhead.contact_email}` : "",
    "",
    "Resumen de consulta",
    `Fecha: ${data.consultationDate}`,
    `Paciente: ${data.patientName} (${data.patientDocument})`,
    `Especialidad: ${data.specialtyKind}`,
    "",
    `Anamnesis: ${data.anamnesis}`,
    `Sintomas: ${data.symptoms}`,
    `Diagnostico: ${data.diagnosis}`,
    `Codigos CIE: ${data.cieCodes.join(", ") || "Sin codigos"}`,
    `Tratamiento: ${data.treatmentPlan}`,
    data.evolutionStatus ? `Evolucion: ${data.evolutionStatus}` : "",
    data.followUpDate ? `Proximo control: ${data.followUpDate}` : "",
  ].filter(Boolean);
}

export function generateConsultationPdf(
  letterhead: LetterheadSettings,
  data: ConsultationPdfData,
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFillColor(23, 37, 84);
  doc.rect(0, 0, 56, pageHeight, "F");

  doc.setFillColor(56, 189, 248);
  doc.circle(pageWidth - 80, 38, 45, "F");

  doc.setFillColor(186, 230, 253);
  doc.circle(pageWidth - 150, 28, 32, "F");

  if (letterhead.logo_data_url) {
    try {
      doc.addImage(
        letterhead.logo_data_url,
        resolveImageFormat(letterhead.logo_data_url),
        86,
        62,
        52,
        52,
      );
    } catch {
      // Si el logo no es compatible con jsPDF, se omite sin romper la exportacion.
    }
  }

  doc.setTextColor(56, 189, 248);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(30);
  doc.text(letterhead.doctor_name || "Profesional de salud", 86, 165);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.text(letterhead.professional_title || "Especialista", 86, 188);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.text(`Tel: ${letterhead.phone_primary || "No configurado"}`, 350, 88);
  doc.text(`Direccion: ${letterhead.address || "No configurada"}`, 350, 108);
  doc.text(`Web/Email: ${letterhead.contact_email || "No configurado"}`, 350, 128);

  doc.setFont("helvetica", "bold");
  doc.text(data.consultationDate, pageWidth - 170, 210);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text("Sr./Sra.", 86, 250);
  doc.setFont("helvetica", "bold");
  doc.text(data.patientName, 86, 270);
  doc.setFont("helvetica", "normal");
  doc.text(`Documento: ${data.patientDocument}`, 86, 290);

  let y = 330;
  const contentWidth = pageWidth - 172;

  const sections: Array<[string, string]> = [
    ["Especialidad", data.specialtyKind],
    ["Anamnesis", data.anamnesis],
    ["Sintomas", data.symptoms],
    ["Diagnostico", data.diagnosis],
    ["Codigos CIE", data.cieCodes.join(", ") || "Sin codigos"],
    ["Tratamiento", data.treatmentPlan],
  ];

  if (data.evolutionStatus) {
    sections.push(["Evolucion", data.evolutionStatus]);
  }

  if (data.followUpDate) {
    sections.push(["Proximo control", data.followUpDate]);
  }

  for (const [title, value] of sections) {
    const titleLines = doc.splitTextToSize(`${title}:`, contentWidth);
    const valueLines = doc.splitTextToSize(value || "-", contentWidth);
    const requiredHeight = (titleLines.length + valueLines.length) * 15 + 10;

    if (y + requiredHeight > 735) {
      doc.addPage();
      y = 58;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(titleLines, 86, y);
    y += titleLines.length * 15;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(valueLines, 86, y);
    y += valueLines.length * 15 + 10;
  }

  const signatureY = Math.min(Math.max(y + 16, 680), 770);
  doc.setDrawColor(15, 23, 42);
  doc.line(pageWidth - 210, signatureY, pageWidth - 90, signatureY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Firma profesional", pageWidth - 200, signatureY + 16);
  doc.setFont("helvetica", "bold");
  doc.text(letterhead.doctor_name || "", pageWidth - 200, signatureY + 32);

  doc.save(`consulta-${data.patientDocument}-${Date.now()}.pdf`);
}
