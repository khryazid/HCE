import type { LetterheadSettings } from "@/features/dashboard/lib/letterhead";

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
  birthDate?: string;
  consultationDate: string;
  gender: string;
  occupation: string;
  insurance: string;
  chiefComplaint: string;
  anamnesis: string;
  medicalHistory: string;
  backgrounds?: {
    pathological: string;
    surgical: string;
    allergic: string;
    pharmacological: string;
    family: string;
    toxic: string;
    gynecoObstetric: string;
  };
  vitalSigns: {
    bloodPressure: string;
    heartRate: string;
    respiratoryRate: string;
    temperature: string;
    oxygenSaturation: string;
    weight: string;
    height: string;
  };
  physicalExam: string;
  physicalExamStructured?: { system: string; content: string }[];
  diagnosis: string;
  cieCodes: string[];
  clinicalAnalysis: string;
  treatmentPlan: string;
  medicationInstructions?: string;
  recommendations: string;
  warningSigns: string;
  labOrders?: string[];
  imagingOrders?: string[];
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
    "HISTORIA CLINICA - RESUMEN DE CONSULTA",
    `Fecha: ${data.consultationDate}`,
    `Paciente: ${data.patientName} (${data.patientDocument})`,
    `Especialidad: ${data.specialtyKind}`,
    data.birthDate ? `Fecha Nac.: ${data.birthDate}` : "",
    data.gender ? `Género: ${data.gender}` : "",
    "",
    "--- 1. MOTIVO DE CONSULTA Y ANTECEDENTES ---",
    `Motivo: ${data.chiefComplaint}`,
    `Anamnesis: ${data.anamnesis}`,
    data.medicalHistory ? `Historial: ${data.medicalHistory}` : "",
    "",
    "--- 2. SIGNOS VITALES Y EXAMEN FISICO ---",
    data.vitalSigns?.bloodPressure ? `Presión arterial: ${data.vitalSigns.bloodPressure}` : "",
    data.vitalSigns?.heartRate ? `Frecuencia cardíaca: ${data.vitalSigns.heartRate}` : "",
    data.vitalSigns?.weight ? `Peso: ${data.vitalSigns.weight}` : "",
    data.physicalExam ? `Examen físico: ${data.physicalExam}` : "",
    "",
    "--- 3. DIAGNOSTICO Y PLAN ---",
    `Diagnostico: ${data.diagnosis}`,
    `Codigos CIE: ${data.cieCodes.join(", ") || "Sin codigos"}`,
    data.clinicalAnalysis ? `Análisis Clínico: ${data.clinicalAnalysis}` : "",
    `Tratamiento / Receta: ${data.treatmentPlan}`,
    data.medicationInstructions ? `Instrucciones al Paciente: ${data.medicationInstructions}` : "",
    data.recommendations ? `Recomendaciones: ${data.recommendations}` : "",
    data.warningSigns ? `Signos de alarma: ${data.warningSigns}` : "",
    "",
    data.evolutionStatus ? `--- 4. EVOLUCION ---\nEvolucion: ${data.evolutionStatus}` : "",
    data.followUpDate ? `Proximo control: ${data.followUpDate}` : "",
  ].filter(Boolean);
}

function calculateAge(birthDate: string): string {
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

export async function generateConsultationPdf(
  letterhead: LetterheadSettings,
  data: ConsultationPdfData,
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  
  let y = margin;

  // Helpers
  const setColor = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    doc.setTextColor(r, g, b);
  };
  const setFill = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    doc.setFillColor(r, g, b);
  };
  
  const COLOR_DARK_BLUE = "#2B4C6F";
  const COLOR_LIGHT_BLUE = "#4880B6";
  const COLOR_GRAY_BG = "#F1F5F9";
  const COLOR_TEXT = "#334155";
  const COLOR_RED = "#DC2626";
  const COLOR_LIGHT_TEXT = "#64748b";

  // --- Header ---
  if (letterhead.logo_data_url) {
    try {
      doc.addImage(letterhead.logo_data_url, resolveImageFormat(letterhead.logo_data_url), margin, y, 70, 70);
    } catch {
      // ignore
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  setColor(COLOR_DARK_BLUE);
  const nameWidth = doc.getTextWidth(letterhead.doctor_name || "Dr.");
  doc.text(letterhead.doctor_name || "Dr.", pageWidth - margin - nameWidth, y + 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  setColor(COLOR_LIGHT_TEXT);
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

  y = Math.max(headerY, y + 80) + 20;

  // --- Title Banner ---
  setFill(COLOR_DARK_BLUE);
  doc.rect(margin, y, contentWidth, 24, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  setColor("#FFFFFF");
  const titleText = "HISTORIA CLÍNICA Y PLAN DE MANEJO";
  const titleWidth = doc.getTextWidth(titleText);
  doc.text(titleText, pageWidth / 2 - titleWidth / 2, y + 16);
  y += 40;

  // --- Section Header Helper ---
  const drawSectionHeader = (title: string, yPos: number) => {
    setFill(COLOR_GRAY_BG);
    doc.rect(margin, yPos, contentWidth, 22, "F");
    setFill(COLOR_LIGHT_BLUE);
    doc.rect(margin, yPos, 4, 22, "F");
    // Draw top/bottom borders instead of a full bounding box to prevent overlapping issues
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, margin + contentWidth, yPos);
    doc.line(margin, yPos + 22, margin + contentWidth, yPos + 22);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    setColor(COLOR_DARK_BLUE);
    doc.text(title.toUpperCase(), margin + 14, yPos + 15);
    return yPos + 32; // 10px de padding entre el header y el primer elemento
  };

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
      return true;
    }
    return false;
  };

  // --- 1. IDENTIFICACIÓN DEL PACIENTE ---
  y = drawSectionHeader("IDENTIFICACIÓN DEL PACIENTE", y);
  
  doc.setFontSize(10);
  const drawPatientGrid = () => {
    const col1 = margin;
    const col2 = margin + 110;
    const col3 = margin + 280;
    const col4 = margin + 360;

    setColor(COLOR_DARK_BLUE);
    doc.setFont("helvetica", "bold");
    doc.text("Nombre Completo:", col1, y);
    doc.text("Edad:", col1, y + 20);
    doc.text("Ocupación:", col1, y + 40);

    doc.text("Documento:", col3, y);
    doc.text("Género:", col3, y + 20);
    doc.text("Fecha/Hora:", col3, y + 40);

    setColor(COLOR_TEXT);
    doc.setFont("helvetica", "normal");
    doc.text(data.patientName, col2, y);
    doc.text(data.birthDate ? calculateAge(data.birthDate) : "N/A", col2, y + 20);
    doc.text(data.occupation ? data.occupation.charAt(0).toUpperCase() + data.occupation.slice(1).toLowerCase() : "No esp.", col2, y + 40);

    doc.text(data.patientDocument, col4, y);
    doc.text(data.gender ? data.gender.charAt(0).toUpperCase() + data.gender.slice(1).toLowerCase() : "No esp.", col4, y + 20);
    doc.text(data.consultationDate, col4, y + 40);
    
    y += 70;
  };
  drawPatientGrid();

  // --- 2. MOTIVO DE CONSULTA Y ANAMNESIS ---
  checkPageBreak(100);
  y = drawSectionHeader("MOTIVO DE CONSULTA Y ANAMNESIS", y);

  /**
   * Renders a labeled block.
   * - If text is short/single-line: label bold inline, value after.
   * - If text has newlines or bullets: label on its own line as bold header, content below indented.
   */
  const drawBlock = (label: string, text: string) => {
    if (!text || !text.trim()) return;
    checkPageBreak(30);
    const hasBullets = text.includes("\n") || text.includes("•") || text.length > 80;
    if (hasBullets) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      setColor(COLOR_DARK_BLUE);
      doc.text(label.toUpperCase(), margin, y);
      y += 13;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      setColor(COLOR_TEXT);
      const lines = doc.splitTextToSize(text, contentWidth - 10);
      for (const line of lines) {
        checkPageBreak(14);
        doc.text(line, margin + 8, y);
        y += 13;
      }
      y += 8;
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      setColor(COLOR_TEXT);
      doc.text(label + ":", margin, y);
      doc.setFont("helvetica", "normal");
      const lw = doc.getTextWidth(label + ":");
      const lines = doc.splitTextToSize(text, contentWidth - lw - 6);
      for (let i = 0; i < lines.length; i++) {
        if (i > 0) {
          if (checkPageBreak(14)) {
            // Text wrapped to new page, reset margin
            doc.text(lines[i], margin + 8, y);
            y += 13;
            continue;
          }
        }
        doc.text(lines[i], i === 0 ? margin + lw + 6 : margin + 8, y);
        y += 13;
      }
      y += 8;
    }
  };

  drawBlock("Motivo", data.chiefComplaint);
  drawBlock("Enfermedad Actual", data.anamnesis);
  
  if (data.backgrounds && Object.values(data.backgrounds).some(val => val.trim() !== "")) {
    if (data.backgrounds.pathological) drawBlock("Ant. Patológicos", data.backgrounds.pathological);
    if (data.backgrounds.surgical) drawBlock("Ant. Quirúrgicos", data.backgrounds.surgical);
    if (data.backgrounds.allergic) drawBlock("Ant. Alérgicos", data.backgrounds.allergic);
    if (data.backgrounds.pharmacological) drawBlock("Ant. Farmacológicos", data.backgrounds.pharmacological);
    if (data.backgrounds.family) drawBlock("Ant. Familiares", data.backgrounds.family);
    if (data.backgrounds.toxic) drawBlock("Ant. Hábitos / Tóxicos", data.backgrounds.toxic);
    if (data.gender === "Femenino" && data.backgrounds.gynecoObstetric) {
      drawBlock("Ant. Gineco-obstétricos", data.backgrounds.gynecoObstetric);
    }
  } else if (data.medicalHistory) {
    drawBlock("Antecedentes", data.medicalHistory);
  }

  y += 16;

  // --- 3. EXAMEN FÍSICO Y SIGNOS VITALES ---
  checkPageBreak(140);
  y = drawSectionHeader("EXAMEN FÍSICO Y SIGNOS VITALES", y);

  const drawVitals = () => {
    // Calculate BMI
    let bmiText = "";
    if (data.vitalSigns.weight && data.vitalSigns.height) {
      const w = parseFloat(data.vitalSigns.weight.replace(",", "."));
      const h = parseFloat(data.vitalSigns.height.replace(",", "."));
      if (!isNaN(w) && !isNaN(h) && h > 0.5) {
        const bmi = w / (h * h);
        let lbl = "Normal";
        if (bmi < 18.5) lbl = "Bajo peso";
        else if (bmi >= 25 && bmi < 30) lbl = "Sobrepeso";
        else if (bmi >= 30) lbl = "Obesidad";
        bmiText = `${bmi.toFixed(1)} (${lbl})`;
      }
    }

    // Determine alert colors
    let taRed = false, fcRed = false, frRed = false, satRed = false;
    if (data.vitalSigns.bloodPressure) {
      const bpMatch = data.vitalSigns.bloodPressure.match(/(\d+)\s*\/\s*(\d+)/);
      if (bpMatch && (parseInt(bpMatch[1]) >= 140 || parseInt(bpMatch[2]) >= 90)) taRed = true;
    }
    if (data.vitalSigns.heartRate) { const hr = parseInt(data.vitalSigns.heartRate); if (hr >= 100 || hr < 50) fcRed = true; }
    if (data.vitalSigns.respiratoryRate && parseInt(data.vitalSigns.respiratoryRate) >= 22) frRed = true;
    if (data.vitalSigns.oxygenSaturation && parseInt(data.vitalSigns.oxygenSaturation) <= 90) satRed = true;

    // Vitals to display as cards
    const vitals = [
      { label: "Tensión Arterial",  unit: "mmHg",  val: data.vitalSigns.bloodPressure,     isRed: taRed  },
      { label: "Frec. Cardíaca",    unit: "lpm",   val: data.vitalSigns.heartRate,          isRed: fcRed  },
      { label: "Frec. Resp.",       unit: "rpm",   val: data.vitalSigns.respiratoryRate,    isRed: frRed  },
      { label: "Saturación O\u2082",     unit: "%",     val: data.vitalSigns.oxygenSaturation,   isRed: satRed },
      { label: "Temperatura",       unit: "°C",    val: data.vitalSigns.temperature,        isRed: false  },
      { label: "Peso",              unit: "kg",    val: data.vitalSigns.weight,             isRed: false  },
      { label: "Talla",             unit: "m",     val: data.vitalSigns.height,             isRed: false  },
      { label: "IMC",               unit: "",      val: bmiText,                            isRed: false  },
    ].filter(v => v.val && v.val.trim() !== "");

    if (vitals.length === 0) return;

    const cols = Math.min(vitals.length, 4);
    const cardW = contentWidth / cols;
    const cardH = 54;
    const cardPad = 3;

    // Draw cards in rows of `cols`
    for (let i = 0; i < vitals.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      if (col === 0 && i > 0) {
        // New row — increment y after first row completes
      }
      const cx = margin + col * cardW;
      const cy = y + row * (cardH + 4);

      // Card border
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.4);
      doc.roundedRect(cx + cardPad, cy, cardW - cardPad * 2, cardH, 3, 3, "FD");

      // Label
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      setColor(COLOR_LIGHT_TEXT);
      const lbl = vitals[i].label;
      const lblW = doc.getTextWidth(lbl);
      doc.text(lbl, cx + cardW / 2 - lblW / 2, cy + 18);

      // Value
      const displayVal = vitals[i].unit ? `${vitals[i].val} ${vitals[i].unit}` : vitals[i].val;
      if (vitals[i].isRed) setColor(COLOR_RED);
      else setColor(COLOR_TEXT);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11); // Slightly smaller to prevent bleed
      const valW = doc.getTextWidth(displayVal);
      doc.text(displayVal, cx + cardW / 2 - valW / 2, cy + 40);
    }

    const rows = Math.ceil(vitals.length / cols);
    y += rows * (cardH + 4) + 8;
  };
  drawVitals();

  if (data.physicalExamStructured && data.physicalExamStructured.length > 0) {
    for (const ex of data.physicalExamStructured) {
      drawBlock(ex.system.toUpperCase(), ex.content);
    }
  } else if (data.physicalExam) {
    drawBlock("Hallazgos", data.physicalExam);
  }
  y += 16;

  // --- 4. IMPRESIÓN DIAGNÓSTICA ---
  checkPageBreak(100);
  y = drawSectionHeader("IMPRESIÓN DIAGNÓSTICA", y);

  doc.setDrawColor(209, 213, 219);
  doc.setLineDashPattern([3, 3], 0);
  
  doc.setFontSize(10);
  const diagLines = doc.splitTextToSize(`${data.cieCodes.join(", ") || "No espec."} - ${data.diagnosis}`, contentWidth - 50);
  const analLines = data.clinicalAnalysis ? doc.splitTextToSize(data.clinicalAnalysis, contentWidth - 65) : [];
  
  const boxHeight = (diagLines.length + analLines.length) * 14 + (data.clinicalAnalysis ? 30 : 20);
  checkPageBreak(boxHeight + 20);

  doc.rect(margin, y, contentWidth, boxHeight);
  doc.setLineDashPattern([], 0);
  
  y += 15;
  doc.setFont("helvetica", "bold");
  setColor(COLOR_TEXT);
  doc.text("CIE:", margin + 10, y);
  doc.setFont("helvetica", "normal");
  // Check if CIE text overlaps with the border, which is at contentWidth
  const maxCieWidth = contentWidth - 45;
  const safeDiagLines = doc.splitTextToSize(`${data.cieCodes.join(", ") || "No espec."} - ${data.diagnosis}`, maxCieWidth);
  doc.text(safeDiagLines, margin + 40, y);
  y += safeDiagLines.length * 14 + 5;

  if (data.clinicalAnalysis) {
    doc.setFont("helvetica", "bold");
    doc.text("Análisis:", margin + 10, y);
    doc.setFont("helvetica", "normal");
    doc.text(analLines, margin + 55, y);
    y += analLines.length * 14;
  }
  y += 25;

  // ==========================================
  // PAGE 2: RECETA (TRATAMIENTO Y SUGERENCIAS)
  // ==========================================
  doc.addPage();
  y = margin;

  if (letterhead.logo_data_url) {
    try {
      doc.addImage(letterhead.logo_data_url, resolveImageFormat(letterhead.logo_data_url), margin, y, 70, 70);
    } catch {}
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  setColor(COLOR_DARK_BLUE);
  doc.text(letterhead.doctor_name || "Dr.", pageWidth - margin - doc.getTextWidth(letterhead.doctor_name || "Dr."), y + 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  setColor(COLOR_LIGHT_TEXT);
  headerY = y + 32;
  for (const line of infoLines) {
    if (line.trim()) {
      doc.text(line, pageWidth - margin - doc.getTextWidth(line), headerY);
      headerY += 14;
    }
  }
  y = Math.max(headerY, y + 80) + 20;

  // Patient mini-header for page 2
  setColor(COLOR_DARK_BLUE);
  doc.setFont("helvetica", "bold");
  doc.text(`Paciente: ${data.patientName}`, margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(`Fecha: ${data.consultationDate.split(",")[0]}`, pageWidth - margin - doc.getTextWidth(`Fecha: ${data.consultationDate.split(",")[0]}`), y);
  y += 20;

  y = drawSectionHeader("PRESCRIPCIÓN MÉDICA", y);

  doc.setFont("helvetica", "normal");
  setColor(COLOR_TEXT);
  const tpLines = doc.splitTextToSize(data.treatmentPlan, contentWidth - 10);
  for (const line of tpLines) {
    checkPageBreak(15);
    const printLine = line.trim().startsWith("-") || line.trim().startsWith("•") ? line : `• ${line}`;
    doc.text(printLine, margin + 5, y);
    y += 14;
  }
  y += 20;

  // Nota al pie
  const footerY = pageHeight - margin - 80; // Allow more space for signature block
  if (y < footerY) y = footerY;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(margin, y - 10, pageWidth - margin, y - 10);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  setColor(COLOR_LIGHT_TEXT);
  doc.text("Válido solo con firma y sello del médico. Documento confidencial — uso exclusivo para dispensación farmacéutica.", margin, y);
  y += 20;

  // Firma del médico — siempre en la misma página que la receta
  const sigX = margin + 30; // Center it a bit
  if (letterhead.signature_data_url) {
    try {
      doc.addImage(
        letterhead.signature_data_url,
        resolveImageFormat(letterhead.signature_data_url),
        sigX,
        y,
        100, // Reduced width slightly to fit better
        40,
      );
    } catch {}
  }
  const sigLineY = y + 45;
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.5);
  doc.line(sigX - 10, sigLineY, sigX + 110, sigLineY); // line length 120
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Firma del Profesional Médico", sigX + 50 - doc.getTextWidth("Firma del Profesional Médico") / 2, sigLineY + 12);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  const docName = `Dr. ${letterhead.doctor_name || ""}`;
  doc.text(docName, sigX + 50 - doc.getTextWidth(docName) / 2, sigLineY + 24);

  // ==========================================
  // PAGE 3: HOJA DEL PACIENTE
  // (medicación, recomendaciones, alarma)
  // ==========================================
  if (data.medicationInstructions || data.recommendations || data.warningSigns) {
    doc.addPage();
    y = margin;

    // Header
    if (letterhead.logo_data_url) {
      try { doc.addImage(letterhead.logo_data_url, resolveImageFormat(letterhead.logo_data_url), margin, y, 55, 55); } catch {}
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    setColor(COLOR_DARK_BLUE);
    doc.text(letterhead.doctor_name || "Dr.", pageWidth - margin - doc.getTextWidth(letterhead.doctor_name || "Dr."), y + 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setColor(COLOR_LIGHT_TEXT);
    let ph3Y = y + 28;
    for (const line of infoLines) {
      if (line.trim()) {
        doc.text(line, pageWidth - margin - doc.getTextWidth(line), ph3Y);
        ph3Y += 12;
      }
    }
    y = Math.max(ph3Y, y + 60) + 10;

    // Title banner verde
    doc.setFillColor(22, 101, 52);
    doc.rect(margin, y, contentWidth, 26, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    setColor("#FFFFFF");
    const p3Title = "HOJA DE INSTRUCCIONES PARA EL PACIENTE";
    doc.text(p3Title, pageWidth / 2 - doc.getTextWidth(p3Title) / 2, y + 17);
    y += 36;

    // Paciente + fecha
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    setColor(COLOR_DARK_BLUE);
    doc.text(`Paciente: ${data.patientName}`, margin, y);
    doc.setFont("helvetica", "normal");
    setColor(COLOR_LIGHT_TEXT);
    const fechaStr = `Fecha: ${data.consultationDate.split(",")[0]}`;
    doc.text(fechaStr, pageWidth - margin - doc.getTextWidth(fechaStr), y);
    y += 34; // Added extra padding here to prevent overlapping section headers

    const drawPatientSection = (title: string, content: string, iconColor: string) => {
      checkPageBreak(60);
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, 22, "F");
      const [ir, ig, ib] = iconColor.split(",").map(Number);
      doc.setFillColor(ir, ig, ib);
      doc.rect(margin, y, 4, 22, "F");
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.line(margin, y, margin + contentWidth, y);
      doc.line(margin, y + 22, margin + contentWidth, y + 22);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      setColor(COLOR_DARK_BLUE);
      doc.text(title, margin + 14, y + 15);
      y += 30;
      const lines = doc.splitTextToSize(content, contentWidth - 18);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      setColor(COLOR_TEXT);
      for (const line of lines) {
        checkPageBreak(16);
        const printLine = line.trim().startsWith("•") || line.trim().startsWith("-") ? line : `• ${line}`;
        doc.text(printLine, margin + 12, y);
        y += 14;
      }
      y += 14;
    };

    if (data.medicationInstructions) {
      drawPatientSection("CÓMO TOMAR SU MEDICACIÓN", data.medicationInstructions, "37,99,235");
    }

    if (data.recommendations) {
      drawPatientSection("RECOMENDACIONES GENERALES", data.recommendations, "5,150,105");
    }

    if (data.warningSigns) {
      checkPageBreak(70);
      const wLines = doc.splitTextToSize(data.warningSigns, contentWidth - 20);
      const wBox = wLines.length * 14 + 44;
      doc.setFillColor(254, 242, 242);
      doc.rect(margin, y, contentWidth, wBox, "F");
      doc.setFillColor(220, 38, 38);
      doc.rect(margin, y, 4, wBox, "F");
      doc.setDrawColor(220, 38, 38);
      doc.setLineWidth(1);
      doc.line(margin, y, margin + contentWidth, y);
      doc.line(margin, y + wBox, margin + contentWidth, y + wBox);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      setColor(COLOR_RED);
      doc.text("⚠ SIGNOS DE ALARMA — ACUDA A URGENCIAS SI PRESENTA:", margin + 14, y + 18);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(127, 29, 19);
      let wy = y + 34;
      for (const line of wLines) {
        const printLine = line.trim().startsWith("•") || line.trim().startsWith("-") ? line : `• ${line}`;
        doc.text(printLine, margin + 14, wy);
        wy += 14;
      }
      y += wBox + 16;
    }

    if (data.followUpDate) {
      checkPageBreak(50);
      doc.setFillColor(240, 253, 244);
      doc.rect(margin, y, contentWidth, 40, "F");
      doc.setDrawColor(22, 163, 74);
      doc.setLineWidth(1);
      doc.line(margin, y, margin + contentWidth, y);
      doc.line(margin, y + 40, margin + contentWidth, y + 40);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(20, 83, 45);
      doc.text("📅  PRÓXIMA CITA MÉDICA:", margin + 14, y + 16);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(13);
      doc.text(data.followUpDate, margin + 14, y + 32);
      y += 54;
    }

    // Footer
    y = Math.max(y + 20, pageHeight - 50);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    setColor(COLOR_LIGHT_TEXT);
    const footerTxt = `Emitido el ${data.consultationDate.split(",")[0]} · Dr. ${letterhead.doctor_name}`;
    doc.text(footerTxt, pageWidth / 2 - doc.getTextWidth(footerTxt) / 2, y + 16);
  }

  // ==========================================
  // PAGE 4: ORDENES PARACLÍNICAS
  // (laboratorio e imagen — minimalista)
  // ==========================================
  const hasParaclinicos = (data.labOrders?.length ?? 0) > 0 || (data.imagingOrders?.length ?? 0) > 0;
  if (hasParaclinicos) {
    doc.addPage();
    y = margin;

    // Header mínimo: solo doctor y fecha
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    setColor(COLOR_DARK_BLUE);
    doc.text(letterhead.doctor_name || "", margin, y + 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setColor(COLOR_LIGHT_TEXT);
    let phY = y + 26;
    for (const line of infoLines) {
      if (line.trim()) { doc.text(line, margin, phY); phY += 12; }
    }
    const orderDate = data.consultationDate.split(",")[0];
    doc.setFontSize(9);
    const dateStr = `Fecha: ${orderDate}`;
    doc.text(dateStr, pageWidth - margin - doc.getTextWidth(dateStr), y + 14);
    y = Math.max(phY, y + 60) + 8;

    // Banner naranja
    doc.setFillColor(154, 52, 18);
    doc.rect(margin, y, contentWidth, 26, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    setColor("#FFFFFF");
    const p4Title = "ORDEN DE ESTUDIOS PARACLÍNICOS";
    doc.text(p4Title, pageWidth / 2 - doc.getTextWidth(p4Title) / 2, y + 17);
    y += 36;

    // Solo nombre del paciente — sin datos adicionales
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    setColor(COLOR_DARK_BLUE);
    doc.text(`Paciente: ${data.patientName}`, margin, y);
    doc.setFont("helvetica", "normal");
    setColor(COLOR_LIGHT_TEXT);
    doc.text(dateStr, pageWidth - margin - doc.getTextWidth(dateStr), y);
    y += 34; // Added extra padding to prevent overlapping

    const drawOrderSection = (title: string, items: string[], accentRgb: string) => {
      checkPageBreak(60);
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, 22, "F");
      const [or, og, ob] = accentRgb.split(",").map(Number);
      doc.setFillColor(or, og, ob);
      doc.rect(margin, y, 4, 22, "F");
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.line(margin, y, margin + contentWidth, y);
      doc.line(margin, y + 22, margin + contentWidth, y + 22);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      setColor(COLOR_DARK_BLUE);
      doc.text(title, margin + 14, y + 15);
      y += 30;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      setColor(COLOR_TEXT);
      for (const item of items) {
        checkPageBreak(16);
        doc.text(`•  ${item}`, margin + 14, y);
        y += 16;
      }
      y += 12;
    };

    if (data.labOrders && data.labOrders.length > 0) {
      drawOrderSection("LABORATORIO", data.labOrders, "234,88,12");
    }

    if (data.imagingOrders && data.imagingOrders.length > 0) {
      drawOrderSection("IMAGENOLOGÍA / DIAGNÓSTICO POR IMAGEN", data.imagingOrders, "79,70,229");
    }

    // Firma en la orden paraclínica
    const sigY = Math.max(y + 60, pageHeight - 90);
    const sigX2 = margin + 30;
    if (letterhead.signature_data_url) {
      try {
        doc.addImage(
          letterhead.signature_data_url,
          resolveImageFormat(letterhead.signature_data_url),
          sigX2,
          sigY - 40,
          100,
          40,
        );
      } catch {}
    }
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.5);
    doc.line(sigX2 - 10, sigY, sigX2 + 110, sigY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setColor(COLOR_TEXT);
    doc.text("Firma del Profesional Médico", sigX2 + 50 - doc.getTextWidth("Firma del Profesional Médico") / 2, sigY + 12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const docName2 = `Dr. ${letterhead.doctor_name || ""}`;
    doc.text(docName2, sigX2 + 50 - doc.getTextWidth(docName2) / 2, sigY + 24);

    // Nota confidencialidad
    y = sigY + 44;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    setColor(COLOR_LIGHT_TEXT);
    const p4Footer = `Orden emitida el ${orderDate} · Dr. ${letterhead.doctor_name} — Válida solo con firma y sello.`;
    doc.text(p4Footer, pageWidth / 2 - doc.getTextWidth(p4Footer) / 2, y + 16);
  }

  // Sanitizar el nombre del paciente para nombre de archivo seguro
  const safeName = data.patientName.replace(/[^a-zA-Z0-9]/g, "-").replace(/-+/g, "-");
  doc.save(`${safeName}-${data.patientDocument}.pdf`);
}

/**
 * Generates a consultation PDF and returns it as a Uint8Array blob
 * instead of triggering a browser download.
 * Used by the ZIP exporter to pack multiple PDFs without individual saves.
 */
export async function generateConsultationPdfBlob(
  letterhead: LetterheadSettings,
  data: ConsultationPdfData,
): Promise<Uint8Array> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  // Re-use the full rendering pipeline by temporarily monkey-patching save.
  // We call the private output() method instead.
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  // Delegate to the same rendering logic by calling the internal draw function.
  // Since generateConsultationPdf calls doc.save() at the end, we recreate
  // a fresh doc and replay all draw calls using jsPDF's output() instead.

  // Create a second doc with the same content:
  const blob = await (async () => {
    // We import the same jsPDF and let it render, then extract via output()
    const renderDoc = new jsPDF({ unit: "pt", format: "a4" });

    const setColor = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      renderDoc.setTextColor(r, g, b);
    };
    const setFill = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      renderDoc.setFillColor(r, g, b);
    };

    // Build text lines using the shared helper and render them as plain text
    const lines = buildPdfLines(letterhead, data);

    renderDoc.setFont("helvetica", "normal");
    renderDoc.setFontSize(10);
    setColor("#334155");
    setFill("#ffffff");

    let y = margin;
    // Header
    renderDoc.setFont("helvetica", "bold");
    renderDoc.setFontSize(16);
    setColor("#2B4C6F");
    renderDoc.text(letterhead.doctor_name || "Dr.", margin, y + 14);
    y += 30;

    renderDoc.setFont("helvetica", "normal");
    renderDoc.setFontSize(9);
    setColor("#64748b");
    renderDoc.text(letterhead.specialties || "", margin, y);
    y += 20;

    // Separator line
    renderDoc.setDrawColor(203, 213, 225);
    renderDoc.setLineWidth(0.5);
    renderDoc.line(margin, y, pageWidth - margin, y);
    y += 14;

    // Content lines
    renderDoc.setFont("helvetica", "normal");
    renderDoc.setFontSize(10);
    setColor("#334155");

    for (const line of lines) {
      if (y > pageHeight - margin) {
        renderDoc.addPage();
        y = margin;
      }
      if (line.startsWith("---") || line.startsWith("HISTORIA")) {
        renderDoc.setFont("helvetica", "bold");
        setColor("#2B4C6F");
        renderDoc.text(line, margin, y);
        renderDoc.setFont("helvetica", "normal");
        setColor("#334155");
      } else {
        const wrapped = renderDoc.splitTextToSize(line, contentWidth);
        for (const w of wrapped) {
          if (y > pageHeight - margin) {
            renderDoc.addPage();
            y = margin;
          }
          renderDoc.text(w, margin, y);
          y += 13;
        }
        continue;
      }
      y += 16;
    }

    return renderDoc.output("arraybuffer");
  })();

  return new Uint8Array(blob);
}

export type { ConsultationPdfData };
