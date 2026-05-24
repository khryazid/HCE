import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

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
      options: {},
    },
  ],
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  workboxOptions: {
    disableDevLogs: true,
  },
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
  // S-05: Referrer-Policy — evita filtrar el path completo a dominios externos
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // S-05: Permissions-Policy — deshabilitar APIs del navegador no utilizadas
  {
    key: "Permissions-Policy",
    value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://js.stripe.com")',
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

export default withNextIntl(withPWA(nextConfig));
