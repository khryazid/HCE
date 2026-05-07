import type { Metadata } from "next";

export const landingMetadata: Metadata = {
  title: "Glyph — Historia Clínica Electrónica para médicos modernos",
  description:
    "Software médico SaaS con historia clínica multiespecialidad, sugerencias CIE-10 por IA, trabajo offline y generación de PDF clínico. Diseñado para médicos independientes y consultorios.",
  keywords: [
    "historia clínica electrónica",
    "software médico",
    "HCE",
    "CIE-10 IA",
    "consultorio médico",
    "receta médica PDF",
    "offline médico",
    "expediente clínico digital",
  ],
  openGraph: {
    title: "Glyph — Historia Clínica Electrónica",
    description:
      "Motor clínico offline-first con IA integrada. Pacientes ilimitados, PDF profesional y sincronización automática.",
    type: "website",
    locale: "es_ES",
  },
  twitter: {
    card: "summary_large_image",
    title: "Glyph — Historia Clínica Electrónica",
    description:
      "Software médico con IA, trabajo offline y PDF clínico. Prueba gratis.",
  },
  alternates: { canonical: "/" },
};
