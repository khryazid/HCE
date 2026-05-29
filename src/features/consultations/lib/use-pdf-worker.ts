"use client";

/**
 * use-pdf-worker.ts — A-18: Hook que gestiona el ciclo de vida del PDF Worker
 *
 * Uso:
 *   const { generatePdfInWorker, isGenerating, pdfError } = usePdfWorker();
 *   await generatePdfInWorker(letterhead, data, "paciente-garcia-12345678.pdf");
 *
 * El worker se inicializa la primera vez que se llama a generatePdfInWorker
 * (lazy) y se reutiliza en llamadas sucesivas dentro del mismo componente.
 *
 * Fallback: si el Worker no está soportado o falla la creación,
 * se llama a generateConsultationPdf directamente en el main thread.
 */

import { useCallback, useRef, useState } from "react";
import type { LetterheadSettings } from "@/features/dashboard/lib/letterhead";
import type { ConsultationPdfData } from "@/features/consultations/lib/pdf/pdf-types";
import type { PdfSectionKey } from "@/features/consultations/lib/pdf/pdf-section-selector";

function triggerDownload(bytes: Uint8Array, filename: string) {
  // new ArrayBuffer() garantiza un ArrayBuffer concreto — no SharedArrayBuffer
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const blob = new Blob([buffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function usePdfWorker() {
  const workerRef = useRef<Worker | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const generatePdfInWorker = useCallback(
    async (
      letterhead: LetterheadSettings,
      data: ConsultationPdfData,
      filename: string,
      enabledSections?: Set<PdfSectionKey>,
    ): Promise<void> => {
      setIsGenerating(true);
      setPdfError(null);

      // Intentar usar Web Worker
      if (typeof Worker !== "undefined") {
        try {
          // Lazy init del worker (reutilizado entre llamadas)
          if (!workerRef.current) {
            workerRef.current = new Worker(
              new URL("./pdf/pdf.worker.ts", import.meta.url),
            );
          }

          const worker = workerRef.current;

          await new Promise<void>((resolve, reject) => {
            const handleMessage = (event: MessageEvent) => {
              cleanup();
              if (event.data.ok) {
                triggerDownload(event.data.bytes as Uint8Array, event.data.filename as string);
                setIsGenerating(false);
                resolve();
              } else {
                const errMsg = event.data.error as string;
                setPdfError(errMsg);
                setIsGenerating(false);
                reject(new Error(errMsg));
              }
            };

            const handleError = (err: ErrorEvent) => {
              cleanup();
              setPdfError(err.message);
              setIsGenerating(false);
              reject(err);
            };

            const cleanup = () => {
              worker.removeEventListener("message", handleMessage);
              worker.removeEventListener("error", handleError);
            };

            worker.addEventListener("message", handleMessage);
            worker.addEventListener("error", handleError);
            worker.postMessage({ letterhead, data, filename });
          });

          return;
        } catch {
          // Worker falló — caer en fallback de main thread
          workerRef.current?.terminate();
          workerRef.current = null;
        }
      }

      // Fallback: main thread (bloquea UI pero no falla silenciosamente)
      try {
        const { generateConsultationPdf } = await import(
          "@/features/consultations/lib/pdf/pdf-renderer"
        );
        await generateConsultationPdf(letterhead, data, "download", enabledSections);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error generando PDF";
        setPdfError(msg);
        throw err;
      } finally {
        setIsGenerating(false);
      }
    },
    [],
  );

  return { generatePdfInWorker, isGenerating, pdfError };
}
