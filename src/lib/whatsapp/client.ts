import { serverEnv } from "@/lib/env";
import { serverLog } from "@/lib/observability/server-logger";

const WHATSAPP_API_URL = "https://graph.facebook.com/v19.0";

/**
 * Cliente para interactuar con la WhatsApp Cloud API (Meta Graph API)
 */
export const whatsappClient = {
  /**
   * Envía un mensaje de texto de recordatorio de cita.
   * En producción real, Meta requiere que los mensajes iniciados por la empresa usen una "Message Template" preaprobada.
   * Para simplificar, enviaremos un mensaje de texto estándar asumiendo que es una plantilla preaprobada o un entorno de pruebas.
   */
  async sendTextReminder(phone: string, patientName: string, dateStr: string): Promise<boolean> {
    if (!serverEnv.WHATSAPP_ACCESS_TOKEN || !serverEnv.WHATSAPP_PHONE_NUMBER_ID) {
      serverLog.warn("whatsapp", "Credenciales de WhatsApp no configuradas, saltando envío.");
      return false;
    }

    try {
      const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phone.replace(/[^0-9]/g, ""),
        type: "text",
        text: {
          preview_url: false,
          body: `Hola ${patientName} 👋, te recordamos tu cita médica programada para el ${dateStr}. ¡Te esperamos!`
        }
      };

      const response = await fetch(
        `${WHATSAPP_API_URL}/${serverEnv.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${serverEnv.WHATSAPP_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        serverLog.error("whatsapp", "Error enviando recordatorio", { result });
        return false;
      }

      return true;
    } catch (err) {
      serverLog.error("whatsapp", "Excepción enviando recordatorio", { error: err });
      return false;
    }
  },

  /**
   * Envía un documento PDF (ej: Resultados de laboratorio) a través de un link.
   */
  async sendPdfDocument(phone: string, pdfUrl: string, patientName: string, filename: string): Promise<boolean> {
    if (!serverEnv.WHATSAPP_ACCESS_TOKEN || !serverEnv.WHATSAPP_PHONE_NUMBER_ID) {
      serverLog.warn("whatsapp", "Credenciales de WhatsApp no configuradas, saltando envío.");
      return false;
    }

    try {
      const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phone.replace(/[^0-9]/g, ""),
        type: "document",
        document: {
          link: pdfUrl,
          caption: `Hola ${patientName}, aquí tienes tus resultados de laboratorio.`,
          filename: filename,
        }
      };

      const response = await fetch(
        `${WHATSAPP_API_URL}/${serverEnv.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${serverEnv.WHATSAPP_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        serverLog.error("whatsapp", "Error enviando PDF", { result });
        return false;
      }

      return true;
    } catch (err) {
      serverLog.error("whatsapp", "Excepción enviando PDF", { error: err });
      return false;
    }
  }
};
