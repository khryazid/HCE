import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants/app";
import { CajaPageClient } from "./page.client";

export const metadata: Metadata = {
  title: `Caja y Facturación | ${APP_NAME}`,
};

export default function CajaPage() {
  return <CajaPageClient />;
}
