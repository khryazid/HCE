import type { Metadata } from "next";
import ConsultationsView from "@/features/consultations/components/ConsultationsView";
import { APP_NAME } from "@/lib/constants/app";

export const metadata: Metadata = {
  title: `Consultas | ${APP_NAME}`,
};

export default function ConsultasPage() {
  return <ConsultationsView />;
}
