import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants/app";
import { FinanzasClient } from "./page.client";

export const metadata: Metadata = {
  title: `Finanzas por Sección | ${APP_NAME}`,
};

export default function FinanzasPage() {
  return <FinanzasClient />;
}
