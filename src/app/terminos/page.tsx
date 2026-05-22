import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Términos y Condiciones — Glyphix",
  description:
    "Lee los términos y condiciones de uso de Glyphix, la plataforma de historia clínica electrónica para profesionales de la salud.",
  alternates: { canonical: "/terminos" },
};

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <div className="max-w-3xl mx-auto py-12 px-6">
        <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-8 font-medium">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al inicio
        </Link>
        <h1 className="text-3xl font-bold mb-6 text-slate-800">Términos y Condiciones</h1>
        <div className="prose prose-slate prose-blue max-w-none text-slate-600 space-y-4">
          <p>Última actualización: Mayo 2026</p>
          <p>
            Al utilizar Glyphix, usted acepta estos Términos y Condiciones.
            El servicio está destinado exclusivamente a profesionales e instituciones de la salud acreditados.
          </p>

          <h2 className="text-xl font-semibold text-slate-800 mt-6">1. Responsabilidad Profesional</h2>
          <p>
            Glyphix es una herramienta de asistencia administrativa y documental. No reemplaza el criterio médico, 
            el diagnóstico ni el tratamiento. Toda la información ingresada y las decisiones clínicas derivadas 
            son responsabilidad exclusiva del profesional tratante.
          </p>

          <h2 className="text-xl font-semibold text-slate-800 mt-6">2. Uso de la Cuenta</h2>
          <p>
            Usted es responsable de mantener la confidencialidad de sus credenciales de acceso.
            Cada cuenta es personal e intransferible. El acceso no autorizado a los datos de los pacientes
            será motivo de terminación inmediata de la cuenta.
          </p>

          <h2 className="text-xl font-semibold text-slate-800 mt-6">3. Disponibilidad del Servicio y Offline</h2>
          <p>
            El sistema cuenta con una modalidad offline. Usted es responsable de asegurarse de que su dispositivo
            esté debidamente protegido. La sincronización de datos requiere conexión a internet y no garantizamos
            una disponibilidad ininterrumpida de los servidores en la nube en caso de mantenimientos o fallas de red.
          </p>

          <h2 className="text-xl font-semibold text-slate-800 mt-6">4. Facturación y Pagos</h2>
          <p>
            Para los planes de pago, los cargos se realizarán según lo acordado. La falta de pago resultará en 
            la suspensión del acceso a las funciones premium, aunque se garantizará un período para la exportación 
            de datos según lo estipulado por ley.
          </p>

          <h2 className="text-xl font-semibold text-slate-800 mt-6">5. Modificaciones</h2>
          <p>
            Nos reservamos el derecho de modificar estos términos en cualquier momento. El uso continuado de la 
            plataforma después de cualquier cambio constituye su aceptación de los nuevos términos.
          </p>
        </div>
      </div>
    </div>
  );
}
