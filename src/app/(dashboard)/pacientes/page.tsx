import type { Metadata } from "next";
import PatientsView from "@/features/patients/components/PatientsView";
import { APP_NAME } from "@/lib/constants/app";

export const metadata: Metadata = {
  title: `Pacientes | ${APP_NAME}`,
};

export default function PacientesPage() {
  return <PatientsView />;
}
