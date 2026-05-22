import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Política de Privacidad — Glyphix",
  description:
    "Conoce cómo Glyphix recopila, protege y gestiona los datos clínicos y personales de los profesionales de salud que usan nuestra plataforma.",
  alternates: { canonical: "/privacidad" },
};

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <div className="max-w-3xl mx-auto py-12 px-6">
        <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-8 font-medium">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al inicio
        </Link>
        <h1 className="text-3xl font-bold mb-6 text-slate-800">Política de Privacidad</h1>
        <div className="prose prose-slate prose-blue max-w-none text-slate-600 space-y-4">
          <p>Última actualización: Mayo 2026</p>
          <p>
            En Glyphix, nos tomamos muy en serio la privacidad y seguridad de los datos. Esta política describe cómo
            recopilamos, usamos y protegemos la información clínica y personal que procesamos a través de nuestra plataforma.
          </p>
          
          <h2 className="text-xl font-semibold text-slate-800 mt-6">1. Información que Recopilamos</h2>
          <p>
            Recopilamos información de los profesionales de la salud (usuarios del sistema) para gestionar sus cuentas, 
            y almacenamos los datos clínicos (PHI) que estos ingresan sobre sus pacientes, actuando como encargados del tratamiento de datos.
          </p>

          <h2 className="text-xl font-semibold text-slate-800 mt-6">2. Cifrado y Seguridad</h2>
          <p>
            La información clínica sensible (PHI) se cifra en tránsito y en reposo. Para el uso de la aplicación offline, 
            los datos se almacenan cifrados en el dispositivo local (IndexedDB) utilizando la Web Crypto API.
          </p>

          <h2 className="text-xl font-semibold text-slate-800 mt-6">3. Uso de los Datos</h2>
          <p>
            Utilizamos la información exclusivamente para proporcionar y mejorar los servicios de historia clínica electrónica.
            No vendemos, alquilamos ni compartimos la información clínica de los pacientes con terceros para fines comerciales o publicitarios.
          </p>

          <h2 className="text-xl font-semibold text-slate-800 mt-6">4. Inteligencia Artificial</h2>
          <p>
            Ciertas funciones (como sugerencias CIE-10) utilizan procesamiento en la nube. Los datos enviados a estos servicios 
            están anonimizados y no contienen información personal identificable del paciente.
          </p>

          <h2 className="text-xl font-semibold text-slate-800 mt-6">5. Derechos del Usuario</h2>
          <p>
            Los profesionales pueden acceder, exportar, modificar o eliminar los datos de sus clínicas en cualquier momento. 
            Si desea eliminar su cuenta y todos los datos asociados, contáctenos en nuestro correo de soporte.
          </p>

          <h2 className="text-xl font-semibold text-slate-800 mt-6">6. Contacto</h2>
          <p>
            Para consultas relacionadas con la privacidad de datos, por favor contáctenos a soporte@glyphix.app.
          </p>
        </div>
      </div>
    </div>
  );
}
