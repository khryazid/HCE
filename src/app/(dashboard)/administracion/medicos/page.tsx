import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants/app";
import { MedicosClient } from "./page.client";

export const metadata: Metadata = {
  title: `Estadísticas por Médico | ${APP_NAME}`,
};

export default function MedicosPage() {
  return <MedicosClient />;
}
