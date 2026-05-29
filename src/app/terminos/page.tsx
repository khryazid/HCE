import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getPublicGlobalConfig } from "@/lib/supabase/actions";
import ReactMarkdown from "react-markdown";

export const metadata: Metadata = {
  title: "Términos y Condiciones — Glyphix",
  description:
    "Lee los términos y condiciones de uso de Glyphix, la plataforma de historia clínica electrónica para profesionales de la salud.",
  alternates: { canonical: "/terminos" },
};

export default async function TerminosPage() {
  const config = await getPublicGlobalConfig();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <div className="max-w-3xl mx-auto py-12 px-6">
        <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-8 font-medium transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al inicio
        </Link>
        
        <div className="prose prose-slate prose-blue max-w-none text-slate-700 bg-white p-6 sm:p-10 rounded-2xl shadow-sm border border-slate-200">
          <div className="mb-8 border-b border-slate-100 pb-6">
            <h1 className="text-3xl font-bold mb-2 text-slate-900 mt-0">Términos y Condiciones</h1>
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold tracking-wide">
              Versión Activa: {config.terms_version}
            </div>
          </div>
          
          {config.terms_content ? (
            <ReactMarkdown>{config.terms_content}</ReactMarkdown>
          ) : (
            <div className="text-center py-12 text-slate-500 italic">
              <p>El documento de Términos y Condiciones aún no ha sido cargado por el administrador.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
