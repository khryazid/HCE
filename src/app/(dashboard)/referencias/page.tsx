import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants/app";
import { ReferenciasPageClient } from "./page.client";

export const metadata: Metadata = {
  title: `Referencias Médicas | ${APP_NAME}`,
};

export default function ReferenciasPage() {
  return <ReferenciasPageClient />;
}
