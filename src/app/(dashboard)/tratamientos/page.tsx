import type { Metadata } from "next";
import TreatmentsView from "@/features/consultations/components/treatments-view";
import { APP_NAME } from "@/lib/constants/app";

export const metadata: Metadata = {
  title: `Tratamientos | ${APP_NAME}`,
};

export default function TratamientosPage() {
  return <TreatmentsView />;
}
