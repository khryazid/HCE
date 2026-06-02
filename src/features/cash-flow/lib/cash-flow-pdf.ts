import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CashTransaction } from "../types";

export interface CashFlowSummary {
  income: number;
  expense: number;
  balance: number;
  total_cash: number;
  income_by_method: Record<string, number>;
  expense_by_method: Record<string, number>;
  balance_by_method: Record<string, number>;
}

export function exportCashFlowPdf(
  transactions: (CashTransaction & { patients: { full_name: string } | null })[],
  summary: CashFlowSummary,
  periodInfo: string,
  clinicName: string
) {
  const doc = new jsPDF();
  const margin = 14;
  let y = 20;

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Reporte de Flujo de Caja", margin, y);
  
  y += 8;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Clínica: ${clinicName || "No especificada"}`, margin, y);
  y += 6;
  doc.text(periodInfo, margin, y);
  y += 15;

  // Summary Section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Resumen Financiero", margin, y);
  y += 10;
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Ingresos Totales: $${summary.income.toFixed(2)}`, margin, y);
  y += 6;
  doc.text(`Egresos Totales: $${summary.expense.toFixed(2)}`, margin, y);
  y += 6;
  doc.text(`Efectivo Esperado: $${summary.total_cash.toFixed(2)}`, margin, y);
  
  // Breakdown by method
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.text("Balance por Medio de Pago (Cierre de Caja):", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  Object.entries(summary.balance_by_method).forEach(([method, amount]) => {
    doc.text(`${method}: $${amount.toFixed(2)}`, margin + 4, y);
    y += 6;
  });

  y += 10;

  // Transactions Table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Detalle de Transacciones", margin, y);
  y += 6;

  const tableData = transactions.map(tx => [
    format(new Date(tx.created_at), "dd MMM yyyy HH:mm", { locale: es }),
    tx.concept + (tx.patients ? `\nPaciente: ${tx.patients.full_name}` : "") + (tx.reference_code ? `\nRef: ${tx.reference_code}` : ""),
    tx.type === "income" ? "Ingreso" : "Egreso",
    (tx.type === "income" ? "+" : "-") + "$" + tx.amount.toFixed(2),
    tx.status === "voided" ? "Anulada" : "Completada"
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Fecha", "Concepto / Paciente", "Tipo", "Monto", "Estado"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [41, 128, 185] },
    columnStyles: {
      3: { halign: "right", fontStyle: "bold" }
    },
    styles: { fontSize: 9 }
  });

  const safePeriod = periodInfo.replace(/[^a-zA-Z0-9]/g, "-").replace(/-+/g, "-").substring(0, 30);
  doc.save(`caja-${safePeriod}.pdf`);
}
