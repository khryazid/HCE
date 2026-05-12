import type { Metadata } from "next";
import "./globals.css";
import { SyncBootstrap } from "@/features/sync/components/sync-bootstrap";
import { QueryProvider } from "@/lib/query-provider";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
import { Space_Grotesk, Outfit } from "next/font/google";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")),
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

import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className="h-full antialiased" suppressHydrationWarning>

      {/*
        Anti-flash theme script: runs synchronously before React hydrates.
        Reads localStorage('hce:theme') and sets data-theme on <html>.
        'system' (or missing) → no attribute → CSS media query takes over.
      */}
      <head>
        {/* Font variable injection for legacy variables */}
        <style>{`
          :root {
            --font-sentient: var(--font-display, 'Space Grotesk', system-ui, sans-serif);
            --font-switzer:  var(--font-ui, 'Outfit', system-ui, sans-serif);
          }
        `}</style>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('hce:theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`,
          }}
        />
      </head>

      <body className={`${spaceGrotesk.variable} ${outfit.variable} min-h-full flex flex-col bg-bg text-ink font-sans`}>
        <NextIntlClientProvider messages={messages}>
          <QueryProvider>
            <SyncBootstrap />
            {children}
          </QueryProvider>
        </NextIntlClientProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
