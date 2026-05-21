import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

const allowedDevOrigins =
  process.env.NEXT_ALLOWED_DEV_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];

// M-21: runtimeCaching es una opción válida de next-pwa@5 pero no está en sus tipos.
// Se usa type assertion para evitar el error TS sin perder la funcionalidad.
const pwaOptions = {
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  fallbacks: {
    document: "/offline",
  },
  // M-21: NetworkOnly para /api/* — las respuestas de API nunca se cachean
  runtimeCaching: [
    {
      urlPattern: /^\/api\//,
      handler: "NetworkOnly" as const,
    },
  ],
} as Parameters<typeof withPWAInit>[0];

const withPWA = withPWAInit(pwaOptions);

const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  {
    key: "Content-Security-Policy",
    value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://vitals.vercel-insights.com; frame-src 'self' https://js.stripe.com https://hooks.stripe.com;",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  ...(allowedDevOrigins.length > 0
    ? {
        allowedDevOrigins,
      }
    : {}),
};

import createNextIntlPlugin from 'next-intl/plugin';
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withPWA(withNextIntl(nextConfig));
