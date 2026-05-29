import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants/app";
import { LaboratorioPageClient } from "./page.client";

export const metadata: Metadata = {
  title: `Laboratorio | ${APP_NAME}`,
};

export default function LaboratorioPage() {
  return <LaboratorioPageClient />;
}
