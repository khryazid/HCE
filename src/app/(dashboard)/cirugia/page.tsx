import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants/app";
import SurgeryClient from "./page.client";

export const metadata: Metadata = {
  title: `Área Quirúrgica | ${APP_NAME}`,
};

export default function SurgeryPage() {
  return <SurgeryClient />;
}
