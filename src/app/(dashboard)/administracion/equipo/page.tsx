import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants/app";
import { EquipoClient } from "./page.client";

export const metadata: Metadata = {
  title: `Equipo | ${APP_NAME}`,
};

export default function EquipoPage() {
  return <EquipoClient />;
}
