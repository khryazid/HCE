import type { PdfContext } from "../pdf-types";
import { resolveImageFormat, setColor } from "../pdf-helpers";
import { PDF_COLORS } from "../pdf-constants";

export function drawPageHeader(ctx: PdfContext) {
  const { doc, letterhead, margin, pageWidth } = ctx;
  const { y } = ctx;

  if (letterhead.logo_data_url) {
    try {
      doc.addImage(letterhead.logo_data_url, resolveImageFormat(letterhead.logo_data_url), margin, y, 70, 70);
    } catch {
      // ignore
    }
  }

  doc.setFont("SpaceGrotesk", "bold");
  doc.setFontSize(20);
  setColor(doc, PDF_COLORS.DARK_BLUE);
  const nameWidth = doc.getTextWidth(letterhead.doctor_name || "Dr.");
  doc.text(letterhead.doctor_name || "Dr.", pageWidth - margin - nameWidth, y + 16);

  doc.setFont("SpaceGrotesk", "normal");
  doc.setFontSize(10);
  setColor(doc, PDF_COLORS.LIGHT_TEXT);
  const infoLines = [
    `${letterhead.specialties || "Medicina General"} ${letterhead.professional_title ? `| Reg. Médico: ${letterhead.professional_title}` : ""}`,
    letterhead.address || "",
    `Tel: ${letterhead.phone_primary} ${letterhead.contact_email ? `| ${letterhead.contact_email}` : ""}`
  ];
  
  let headerY = y + 32;
  for (const line of infoLines) {
    if (line.trim()) {
      const lineWidth = doc.getTextWidth(line);
      doc.text(line, pageWidth - margin - lineWidth, headerY);
      headerY += 14;
    }
  }

  ctx.y = Math.max(headerY, y + 80) + 20;
}

export function drawPageFooter(ctx: PdfContext, text: string) {
  const { doc, margin, pageWidth, pageHeight } = ctx;
  const y = pageHeight - margin - 40;
  
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  
  doc.setFont("SpaceGrotesk", "italic");
  doc.setFontSize(8);
  setColor(doc, PDF_COLORS.LIGHT_TEXT);
  doc.text(text, pageWidth / 2 - doc.getTextWidth(text) / 2, y + 16);
}

export function drawSignatureLine(ctx: PdfContext, fixedY?: number) {
  const { doc, letterhead, margin, pageHeight } = ctx;
  
  // Si no pasamos fixedY, usamos un valor fijo al fondo
  const sigY = fixedY ?? Math.max(ctx.y + 60, pageHeight - 90);
  const sigX = margin + 30;

  if (letterhead.signature_data_url) {
    try {
      doc.addImage(
        letterhead.signature_data_url,
        resolveImageFormat(letterhead.signature_data_url),
        sigX,
        sigY - 40,
        100,
        40,
      );
    } catch {}
  }

  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.5);
  doc.line(sigX - 10, sigY, sigX + 110, sigY);
  
  doc.setFont("SpaceGrotesk", "normal");
  doc.setFontSize(8);
  setColor(doc, PDF_COLORS.TEXT);
  doc.text("Firma del Profesional Médico", sigX + 50 - doc.getTextWidth("Firma del Profesional Médico") / 2, sigY + 12);
  
  doc.setFont("SpaceGrotesk", "bold");
  doc.setFontSize(10);
  const docName = `Dr. ${letterhead.doctor_name || ""}`;
  doc.text(docName, sigX + 50 - doc.getTextWidth(docName) / 2, sigY + 24);
  
  ctx.y = sigY + 44;
}
