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
  diagnosis: string;
  cieCodes: string[];
  clinicalAnalysis: string;
  treatmentPlan: string;
  recommendations: string;
  warningSigns: string;
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
    `Motivo: ${data.chiefComplaint}`,
    `Anamnesis: ${data.anamnesis}`,
    `Diagnostico: ${data.diagnosis}`,
    `Codigos CIE: ${data.cieCodes.join(", ") || "Sin codigos"}`,
    `Tratamiento: ${data.treatmentPlan}`,
    data.evolutionStatus ? `Evolucion: ${data.evolutionStatus}` : "",
    data.followUpDate ? `Proximo control: ${data.followUpDate}` : "",
  ].filter(Boolean);
}

function calculateAge(birthDate: string): string {
  if (!birthDate) return "N/A";
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return `${age} años`;
}

export function generateConsultationPdf(
  letterhead: LetterheadSettings,
  data: ConsultationPdfData,
) {
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
    doc.rect(margin, yPos, contentWidth, 20, "F");
    setFill(COLOR_LIGHT_BLUE);
    doc.rect(margin, yPos, 4, 20, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    setColor(COLOR_DARK_BLUE);
    doc.text(title.toUpperCase(), margin + 12, yPos + 14);
    return yPos + 35;
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
    doc.text(data.occupation || "No esp.", col2, y + 40);

    doc.text(data.patientDocument, col4, y);
    doc.text(data.gender || "No esp.", col4, y + 20);
    doc.text(data.consultationDate, col4, y + 40);
    
    y += 70;
  };
  drawPatientGrid();

  // --- 2. MOTIVO DE CONSULTA Y ANAMNESIS ---
  checkPageBreak(100);
  y = drawSectionHeader("MOTIVO DE CONSULTA Y ANAMNESIS", y);

  const drawMixedText = (label: string, text: string) => {
    if (!text) return;
    checkPageBreak(30);
    doc.setFont("helvetica", "bold");
    setColor(COLOR_TEXT);
    doc.text(label + ":", margin, y);
    doc.setFont("helvetica", "normal");
    const labelWidth = doc.getTextWidth(label + ":");
    const lines = doc.splitTextToSize(text, contentWidth - labelWidth - 5);
    doc.text(lines, margin + labelWidth + 5, y);
    y += lines.length * 14 + 10;
  };

  drawMixedText("Motivo", data.chiefComplaint);
  drawMixedText("Enfermedad Actual", data.anamnesis);
  
  if (data.backgrounds && Object.values(data.backgrounds).some(val => val.trim() !== "")) {
    if (data.backgrounds.pathological) drawMixedText("Ant. Patológicos", data.backgrounds.pathological);
    if (data.backgrounds.surgical) drawMixedText("Ant. Quirúrgicos", data.backgrounds.surgical);
    if (data.backgrounds.allergic) drawMixedText("Ant. Alérgicos", data.backgrounds.allergic);
    if (data.backgrounds.pharmacological) drawMixedText("Ant. Farmacológicos", data.backgrounds.pharmacological);
    if (data.backgrounds.family) drawMixedText("Ant. Familiares", data.backgrounds.family);
    if (data.backgrounds.toxic) drawMixedText("Ant. Hábitos / Tóxicos", data.backgrounds.toxic);
    if (data.gender === "Femenino" && data.backgrounds.gynecoObstetric) {
      drawMixedText("Ant. Gineco-obstétricos", data.backgrounds.gynecoObstetric);
    }
  } else if (data.medicalHistory) {
    drawMixedText("Antecedentes", data.medicalHistory);
  }

  y += 10;

  // --- 3. EXAMEN FÍSICO Y SIGNOS VITALES ---
  checkPageBreak(120);
  y = drawSectionHeader("EXAMEN FÍSICO Y SIGNOS VITALES", y);

  // Vitals Grid
  const drawVitals = () => {
    const vY = y;
    const vCols = 4;
    const vWidth = contentWidth / vCols;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setColor(COLOR_LIGHT_TEXT);
    
    // IMC calculation
    let bmiLabel = "";
    if (data.vitalSigns.weight && data.vitalSigns.height) {
      const w = parseFloat(data.vitalSigns.weight.replace(",", "."));
      const h = parseFloat(data.vitalSigns.height.replace(",", "."));
      if (!isNaN(w) && !isNaN(h) && h > 0.5) {
        const bmi = w / (h * h);
        let lbl = "Normal";
        if (bmi < 18.5) lbl = "Bajo peso";
        else if (bmi >= 25 && bmi < 30) lbl = "Sobrepeso";
        else if (bmi >= 30) lbl = "Obesidad";
        bmiLabel = ` / IMC: ${bmi.toFixed(1)} (${lbl})`;
      }
    }

    const vitals = [
      { label: "Tensión Arterial", val: data.vitalSigns.bloodPressure ? `${data.vitalSigns.bloodPressure} mmHg` : "-", isRed: false },
      { label: "Frec. Cardíaca", val: data.vitalSigns.heartRate ? `${data.vitalSigns.heartRate} lpm` : "-", isRed: false },
      { label: "Frec. Resp.", val: data.vitalSigns.respiratoryRate ? `${data.vitalSigns.respiratoryRate} rpm` : "-", isRed: false },
      { label: "Saturación O2", val: data.vitalSigns.oxygenSaturation ? `${data.vitalSigns.oxygenSaturation}%` : "-", isRed: false },
      { label: "Temp. / Peso / Talla", val: `${data.vitalSigns.temperature ? data.vitalSigns.temperature + ' °C' : '-'} / ${data.vitalSigns.weight ? data.vitalSigns.weight + ' kg' : '-'} / ${data.vitalSigns.height ? data.vitalSigns.height + ' m' : '-'}${bmiLabel}`, isRed: false },
    ];

    if (data.vitalSigns.bloodPressure) {
      const bpMatch = data.vitalSigns.bloodPressure.match(/(\d+)\s*\/\s*(\d+)/);
      if (bpMatch) {
        if (parseInt(bpMatch[1]) >= 140 || parseInt(bpMatch[2]) >= 90) vitals[0].isRed = true;
      }
    }
    if (data.vitalSigns.heartRate && (parseInt(data.vitalSigns.heartRate) >= 100 || parseInt(data.vitalSigns.heartRate) < 50)) vitals[1].isRed = true;
    if (data.vitalSigns.respiratoryRate && parseInt(data.vitalSigns.respiratoryRate) >= 22) vitals[2].isRed = true;
    if (data.vitalSigns.oxygenSaturation && parseInt(data.vitalSigns.oxygenSaturation) <= 90) vitals[3].isRed = true;

    for (let i = 0; i < vitals.length; i++) {
      const cx = margin + i * vWidth + (vWidth / 2);
      setColor(COLOR_LIGHT_TEXT);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const lW = doc.getTextWidth(vitals[i].label);
      doc.text(vitals[i].label, cx - lW/2, vY);
      
      if (vitals[i].isRed) setColor(COLOR_RED);
      else setColor(COLOR_TEXT);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      const vW = doc.getTextWidth(vitals[i].val);
      doc.text(vitals[i].val, cx - vW/2, vY + 16);
    }
    y += 40;
  };
  drawVitals();

  if (data.physicalExam) {
    drawMixedText("Hallazgos", data.physicalExam);
  }
  y += 10;

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
  doc.text(diagLines, margin + 40, y);
  y += diagLines.length * 14 + 5;

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

  y = drawSectionHeader("PLAN DE TRATAMIENTO", y);

  doc.setFont("helvetica", "normal");
  setColor(COLOR_TEXT);
  const tpLines = doc.splitTextToSize(data.treatmentPlan, contentWidth - 10);
  for (const line of tpLines) {
    checkPageBreak(15);
    const printLine = line.trim().startsWith("-") || line.trim().startsWith("•") ? line : `• ${line}`;
    doc.text(printLine, margin + 5, y);
    y += 14;
  }
  y += 10;

  if (data.recommendations) {
    checkPageBreak(40);
    y = drawSectionHeader("RECOMENDACIONES", y);
    const recLines = doc.splitTextToSize(data.recommendations, contentWidth - 10);
    for (const line of recLines) {
      checkPageBreak(15);
      const printLine = line.trim().startsWith("-") || line.trim().startsWith("•") ? line : `• ${line}`;
      doc.text(printLine, margin + 5, y);
      y += 14;
    }
    y += 10;
  }

  if (data.warningSigns) {
    checkPageBreak(60);
    setFill("#FEF2F2");
    doc.setDrawColor(220, 38, 38);
    doc.setLineWidth(1);
    
    const warnLines = doc.splitTextToSize(data.warningSigns, contentWidth - 20);
    const wBoxHeight = warnLines.length * 14 + 35;
    
    doc.rect(margin, y, contentWidth, wBoxHeight, "FD");
    
    doc.setFont("helvetica", "bold");
    setColor(COLOR_RED);
    doc.text("SIGNOS DE ALARMA - CONSULTAR A URGENCIAS", margin + 10, y + 18);
    
    doc.setFont("helvetica", "normal");
    let wy = y + 35;
    for (const line of warnLines) {
      const printLine = line.trim().startsWith("-") || line.trim().startsWith("•") ? line : `• ${line}`;
      doc.text(printLine, margin + 10, wy);
      wy += 14;
    }
    y += wBoxHeight + 30;
  }

  if (y > pageHeight - 150) {
    doc.addPage();
    y = margin + 50;
  } else {
    y = Math.max(y + 50, pageHeight - 150);
  }

  if (letterhead.signature_data_url) {
    try {
      doc.addImage(
        letterhead.signature_data_url,
        resolveImageFormat(letterhead.signature_data_url),
        margin + 20,
        y - 45,
        120,
        45
      );
    } catch {}
  }

  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.5);
  doc.line(margin, y, margin + 200, y);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  setColor(COLOR_TEXT);
  doc.text("Firma del Profesional Médico", margin + 10, y + 15);
  doc.setFont("helvetica", "bold");
  doc.text(letterhead.doctor_name || "", margin + 10, y + 30);

  doc.save(`consulta-${data.patientDocument}-${Date.now()}.pdf`);
}
