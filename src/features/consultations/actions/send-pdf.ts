"use server";

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export type SendPdfActionState = {
  success: boolean;
  message: string;
};

export async function sendPdfAction(
  email: string,
  pdfBase64: string,
  fileName: string,
  patientName: string,
  doctorName: string
): Promise<SendPdfActionState> {
  if (!process.env.RESEND_API_KEY) {
    return {
      success: false,
      message: "Resend no está configurado (falta RESEND_API_KEY en .env).",
    };
  }

  if (!email || !pdfBase64 || !fileName) {
    return {
      success: false,
      message: "Faltan parámetros requeridos para enviar el correo.",
    };
  }

  try {
    const { error } = await resend.emails.send({
      from: "Consultorio Clínico <no-reply@hce-saas.com>", // Replace with verified domain later
      to: [email],
      subject: `Resumen de consulta médica - ${patientName}`,
      html: `
        <p>Hola <strong>${patientName}</strong>,</p>
        <p>Adjuntamos a este correo el resumen (receta/indicaciones) de su reciente consulta con el Dr. ${doctorName}.</p>
        <p>Por favor, revise el documento PDF adjunto.</p>
        <br />
        <p>Atentamente,</p>
        <p><strong>El equipo del consultorio</strong></p>
      `,
      attachments: [
        {
          filename: fileName,
          content: pdfBase64,
        },
      ],
    });

    if (error) {
      console.error("Resend API error:", error);
      return { success: false, message: error.message };
    }

    return { success: true, message: "Correo enviado exitosamente." };
  } catch (err) {
    console.error("Failed to send email:", err);
    return {
      success: false,
      message:
        err instanceof Error
          ? err.message
          : "Error desconocido al intentar enviar el correo.",
    };
  }
}
