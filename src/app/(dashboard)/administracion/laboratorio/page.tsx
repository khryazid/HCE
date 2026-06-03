import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants/app";
import { LaboratorioAdminClient } from "./page.client";

export const metadata: Metadata = {
  title: `Admin Laboratorio | ${APP_NAME}`,
};

export default function LaboratorioAdminPage() {
  return <LaboratorioAdminClient />;
}
