import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants/app";
import { LaboratorioAjustesClient } from "./laboratorio-ajustes-client";

export const metadata: Metadata = {
  title: `Ajustes del Laboratorio | ${APP_NAME}`,
};

export default function LaboratorioAjustesPage() {
  return <LaboratorioAjustesClient />;
}
