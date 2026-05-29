import type { Metadata } from "next";
import "./globals.css";
import { SyncBootstrap } from "@/features/sync/components/sync-bootstrap";
import { QueryProvider } from "@/lib/query-provider";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
import { Space_Grotesk, Outfit } from "next/font/google";
import { APP_NAME, APP_FULL_NAME, APP_TAGLINE } from "@/lib/constants/app";
import { ThemeScript } from "@/components/ui/theme-script";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  preload: false,
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")),
  title: `${APP_NAME} — ${APP_TAGLINE}`,
  description:
    "Historia clínica electrónica multiespecialidad con IA, trabajo offline y sincronización automática. Diseñado para médicos modernos.",
  manifest: "/manifest.json",
  keywords: [
    "historia clínica electrónica", "software médico", "CIE-11",
    "consulta médica", "offline-first", "médicos", "salud digital", "Glyphix",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
      { url: "/icons/icon-96.webp", sizes: "96x96", type: "image/webp" },
      { url: "/icons/icon-192.webp", sizes: "192x192", type: "image/webp" },
      { url: "/icons/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
    startupImage: [
      {
        url: "/apple-splash-screen-1170x2532.png",
        media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)",
      },
    ],
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    title: `${APP_FULL_NAME} para médicos modernos`,
    description:
      "Historia clínica multiespecialidad, sincronización offline-first y sugerencias CIE-11 con IA. Documentá cada consulta en menos de 3 minutos.",
    siteName: APP_NAME,
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: `${APP_FULL_NAME}` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_FULL_NAME} para médicos modernos`,
    description:
      "Historia clínica multiespecialidad, sincronización offline-first y sugerencias CIE-11 con IA.",
    images: ["/og-image.jpg"],
  },
  // M-14: hreflang — la app usa locale via cookie (no rutas prefijadas /en/...)
  // Se ha removido la configuración global de canonical: "/" para evitar canibalización SEO
  // de subpáginas. Cada página debe definir su propio canonical.
};

import { headers } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const headersList = await headers();
  const nonce = headersList.get("x-nonce") || undefined;

  return (
    <html lang={locale} className="h-full antialiased" suppressHydrationWarning>

      {/*
        Anti-flash theme script: runs synchronously before React hydrates.
        Reads localStorage('hce:theme') and sets data-theme on <html>.
        'system' (or missing) → no attribute → CSS media query takes over.
      */}
      <head>
        {/* Font variable injection for legacy variables */}
        <style suppressHydrationWarning>{`
          :root {
            --font-sentient: var(--font-display, 'Space Grotesk', system-ui, sans-serif);
            --font-switzer:  var(--font-ui, 'Outfit', system-ui, sans-serif);
          }
        `}</style>
        <ThemeScript nonce={nonce} />
      </head>

      <body className={`${spaceGrotesk.variable} ${outfit.variable} min-h-full flex flex-col bg-bg text-ink font-sans`} suppressHydrationWarning>
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
