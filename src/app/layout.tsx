import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, DM_Sans } from "next/font/google";
import "./globals.css";
import { SyncBootstrap } from "@/features/sync/components/sync-bootstrap";
import { QueryProvider } from "@/lib/query-provider";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: "Glyph — Motor Clínico",
  description:
    "Historia clínica electrónica multiespecialidad con IA, trabajo offline y sincronización automática. Diseñado para médicos modernos.",
  manifest: "/manifest.json",
  keywords: [
    "historia clínica electrónica", "HCE", "software médico", "CIE-10",
    "consulta médica", "offline-first", "médicos", "salud digital",
  ],
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    title: "Glyph — Motor Clínico para médicos modernos",
    description:
      "Historia clínica multiespecialidad, sincronización offline-first y sugerencias CIE-10 con IA. Documentá cada consulta en menos de 3 minutos.",
    siteName: "Glyph",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Glyph — Motor Clínico" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Glyph — Motor Clínico para médicos modernos",
    description:
      "Historia clínica multiespecialidad, sincronización offline-first y sugerencias CIE-10 con IA.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-ES" className={`${inter.variable} ${jakarta.variable} ${dmSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-bg text-ink font-sans">
        <QueryProvider>
          <SyncBootstrap />
          {children}
        </QueryProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
