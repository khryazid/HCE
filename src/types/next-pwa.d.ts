declare module "next-pwa" {
  import type { NextConfig } from "next";

  type NextPwaOptions = {
    dest: string;
    register?: boolean;
    skipWaiting?: boolean;
    disable?: boolean;
    fallbacks?: {
      document?: string;
    };
  };

  export default function withPWAInit(
    options: NextPwaOptions,
  ): (config: NextConfig) => NextConfig;
}
