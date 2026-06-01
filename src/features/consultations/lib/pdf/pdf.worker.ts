/**
 * pdf.worker.ts — A-18: Web Worker para generación de PDF
 *
 * Se ejecuta en un hilo separado (Web Worker) para no bloquear
 * la UI principal durante los 8-15s que tarda jsPDF en móviles.
 *
 * webpack lo bundlea por separado cuando se usa:
 *   new Worker(new URL('./pdf.worker.ts', import.meta.url))
 *
 * Nota: NO acceder a window/document aquí — contexto Worker puro.
 */

import type { LetterheadSettings } from "@/features/dashboard/lib/letterhead";
import type { ConsultationPdfData } from "./pdf-types";

type WorkerInput = {
  letterhead: LetterheadSettings;
  data: ConsultationPdfData;
  filename: string;
};

type WorkerOutput =
  | { ok: true; bytes: Uint8Array; filename: string }
  | { ok: false; error: string };

self.addEventListener("message", async (event: MessageEvent<WorkerInput>) => {
  const { letterhead, data, filename } = event.data;

  try {
    // Import dinámico: webpack incluye las dependencias en el bundle del worker
    const { generateConsultationPdf } = await import("./pdf-renderer");

    // "blob" output → retorna Uint8Array sin tocar el DOM
    const bytes = await generateConsultationPdf(letterhead, data, "blob");

    if (!bytes) {
      throw new Error("generateConsultationPdf devolvió undefined en modo blob");
    }

    // Transferir el buffer (zero-copy) al main thread
    const buffer = bytes.buffer.slice(0) as ArrayBuffer;
    (self as any).postMessage(
      { ok: true, bytes: new Uint8Array(buffer), filename } as WorkerOutput,
      [buffer]
    );
  } catch (err) {
    self.postMessage({ ok: false, error: String(err) } as WorkerOutput);
  }
});
