/* eslint-disable react/no-unescaped-entities, @typescript-eslint/no-unused-vars */
import { APP_NAME } from "@/lib/constants/app";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpen, ChevronRight, Stethoscope, Users, Calendar, Settings, Zap, Download, MonitorSmartphone } from "lucide-react";

export const metadata: Metadata = {
  title: `Manual de Usuario | ${APP_NAME}`,
  description: "Guía completa para el uso del motor clínico.",
};

export default function DocsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-bg md:flex-row">
      {/* Sidebar */}
      <aside className="w-full border-r border-border bg-card p-6 md:w-64 md:sticky md:top-0 md:h-screen md:overflow-y-auto print:hidden">

        <h1 className="mb-6 text-xl font-bold font-display text-ink flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-accent" />
          Manual
        </h1>
        <nav className="flex flex-col gap-1 text-sm font-medium text-ink-soft">
          <a href="#primeros-pasos" className="flex items-center gap-2 rounded-lg p-2 hover:bg-bg-soft hover:text-ink transition"><Zap className="h-4 w-4" /> Primeros Pasos</a>
          <a href="#pacientes" className="flex items-center gap-2 rounded-lg p-2 hover:bg-bg-soft hover:text-ink transition"><Users className="h-4 w-4" /> Pacientes</a>
          <a href="#consulta" className="flex items-center gap-2 rounded-lg p-2 hover:bg-bg-soft hover:text-ink transition"><Stethoscope className="h-4 w-4" /> La Consulta</a>
          <a href="#agenda" className="flex items-center gap-2 rounded-lg p-2 hover:bg-bg-soft hover:text-ink transition"><Calendar className="h-4 w-4" /> Agenda</a>
          <a href="#offline" className="flex items-center gap-2 rounded-lg p-2 hover:bg-bg-soft hover:text-ink transition"><MonitorSmartphone className="h-4 w-4" /> Modo Offline</a>
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 p-6 md:p-12 lg:px-24 xl:px-32 max-w-4xl focus:outline-none">
        <section id="primeros-pasos" className="mb-16">
          <h2 className="text-3xl font-bold text-ink mb-6">🌟 Primeros Pasos</h2>
          <p className="text-ink-soft mb-4">Bienvenido a <strong>{APP_NAME}</strong>, el motor clínico diseñado para ser rápido, seguro y funcionar incluso sin conexión a Internet.</p>
          
          <h3 className="text-xl font-bold text-ink mt-8 mb-4">Configurando su perfil y membrete</h3>
          <p className="text-ink-soft mb-4">Para que sus recetas médicas y PDF se generen correctamente, debe configurar su perfil:</p>
          <ol className="list-decimal pl-5 space-y-2 text-ink-soft">
            <li>Vaya a la sección <strong>Ajustes</strong> en el menú principal.</li>
            <li>Complete su Nombre completo, Especialidad y Número de Colegiado/Registro.</li>
            <li>Añada la información de su clínica (Dirección, Teléfono).</li>
            <li>Pulse <strong>Guardar Cambios</strong>.</li>
          </ol>

          <h3 className="text-xl font-bold text-ink mt-8 mb-4">Instalación (PWA)</h3>
          <p className="text-ink-soft mb-4">{APP_NAME} puede instalarse como una aplicación nativa:</p>
          <ul className="list-disc pl-5 space-y-2 text-ink-soft">
            <li><strong>iOS (iPhone/iPad):</strong> Abra Safari, pulse el botón "Compartir" y seleccione "Añadir a la pantalla de inicio".</li>
            <li><strong>Android:</strong> Abra Chrome, el navegador le sugerirá instalar la app, o pulse el menú (3 puntos) y seleccione "Instalar aplicación".</li>
            <li><strong>PC/Mac:</strong> En Chrome o Edge, haga clic en el ícono de instalación que aparece en el lado derecho de la barra de direcciones de la web.</li>
          </ul>
        </section>

        <section id="pacientes" className="mb-16">
          <h2 className="text-3xl font-bold text-ink mb-6">👥 Pacientes y Directorio</h2>
          
          <h3 className="text-xl font-bold text-ink mt-8 mb-4">Añadir un paciente nuevo</h3>
          <ol className="list-decimal pl-5 space-y-2 text-ink-soft mb-6">
            <li>Vaya a la sección <strong>Pacientes</strong> en el menú izquierdo.</li>
            <li>Haga clic en el botón <strong>+ Nuevo Paciente</strong>.</li>
            <li>Complete los datos básicos. No necesita llenarlos todos inmediatamente, puede actualizarlos luego.</li>
            <li>Haga clic en <strong>Guardar</strong>.</li>
          </ol>

          <h3 className="text-xl font-bold text-ink mt-8 mb-4">El Historial Clínico</h3>
          <p className="text-ink-soft mb-4">Al hacer clic sobre un paciente, entrará a su <strong>Expediente</strong>. Aquí verá cronológicamente todas las consultas pasadas, recetas generadas y signos vitales históricos.</p>
          
          <div className="bg-bg-soft border border-border rounded-xl p-4 my-6">
            <h4 className="font-bold flex items-center gap-2 mb-2 text-ink"><Zap className="h-4 w-4 text-accent"/> Atajo de teclado: Búsqueda Rápida</h4>
            <p className="text-sm text-ink-soft">Presione <strong>Ctrl + K</strong> (Windows) o <strong>Cmd + K</strong> (Mac) desde cualquier lugar de la app para abrir el buscador universal. Escriba el nombre o documento de su paciente y presione Enter para ir directo a su expediente.</p>
          </div>
        </section>

        <section id="consulta" className="mb-16">
          <h2 className="text-3xl font-bold text-ink mb-6">🩺 La Consulta Médica</h2>
          <p className="text-ink-soft mb-4">La consulta en {APP_NAME} está diseñada en 6 pasos fluidos. Todo su progreso se guarda automáticamente como borrador.</p>

          <div className="space-y-6 mt-8">
            <div className="border-l-2 border-accent pl-4">
              <h4 className="font-bold text-ink">1. Motivo y Anamnesis</h4>
              <p className="text-sm text-ink-soft">Registre el padecimiento actual del paciente.</p>
            </div>
            <div className="border-l-2 border-accent pl-4">
              <h4 className="font-bold text-ink">2. Signos Vitales</h4>
              <p className="text-sm text-ink-soft">El sistema calcula automáticamente la <strong>Presión Arterial Media (PAM)</strong> y el <strong>IMC</strong> al ingresar los datos básicos.</p>
            </div>
            <div className="border-l-2 border-accent pl-4">
              <h4 className="font-bold text-ink">3. Examen Físico</h4>
              <p className="text-sm text-ink-soft">Anote sus hallazgos por sistema (cabeza, cuello, tórax, etc).</p>
            </div>
            <div className="border-l-2 border-accent pl-4">
              <h4 className="font-bold text-ink">4. Diagnóstico (Asistido por IA)</h4>
              <p className="text-sm text-ink-soft">Escriba su impresión diagnóstica clínica. Presione el botón de la IA y el sistema le sugerirá el código CIE-10 exacto basándose en el texto de la consulta.</p>
            </div>
            <div className="border-l-2 border-accent pl-4">
              <h4 className="font-bold text-ink">5. Posología</h4>
              <p className="text-sm text-ink-soft">Agregue los medicamentos. Puede guardar recetas comunes como "Plantillas" para usarlas con un solo clic en futuros pacientes.</p>
            </div>
            <div className="border-l-2 border-accent pl-4">
              <h4 className="font-bold text-ink">6. Cierre y PDF</h4>
              <p className="text-sm text-ink-soft">Revise todos los datos y finalice. Esto sellará legalmente la consulta y generará un PDF listo para imprimir.</p>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 my-8">
            <h4 className="font-bold text-amber-800 dark:text-amber-300 mb-2">Borradores automáticos</h4>
            <p className="text-sm text-amber-700 dark:text-amber-400">Si necesita atender una urgencia, ¡no se preocupe! Si cierra la ventana o va a otro paciente, la consulta quedará guardada como "Borrador en curso". Podrá retomarla luego.</p>
          </div>
        </section>

        <section id="agenda" className="mb-16">
          <h2 className="text-3xl font-bold text-ink mb-6">📅 Agenda</h2>
          <p className="text-ink-soft mb-4">Mantenga el control de sus citas médicas desde la vista de Agenda.</p>
          <ul className="list-disc pl-5 space-y-2 text-ink-soft">
            <li>Puede crear citas haciendo clic en cualquier espacio vacío del calendario.</li>
            <li>Al crear una cita, puede enlazarla directamente a un paciente existente.</li>
            <li>Los colores le indicarán el estado de la cita (confirmada, completada, ausente).</li>
          </ul>
        </section>

        <section id="offline" className="mb-16">
          <h2 className="text-3xl font-bold text-ink mb-6">📱 Trabajando sin conexión (Offline)</h2>
          <p className="text-ink-soft mb-4">{APP_NAME} es una aplicación "Offline-First". Está diseñada para seguir funcionando aunque falle el WiFi de su consultorio.</p>
          
          <h3 className="text-xl font-bold text-ink mt-8 mb-4">¿Qué pasa si me quedo sin Internet?</h3>
          <ul className="list-disc pl-5 space-y-2 text-ink-soft mb-6">
            <li>¡Nada se detiene! Puede seguir registrando consultas y creando pacientes.</li>
            <li>Verá un indicador <span className="inline-flex items-center gap-1 text-red-500 font-bold"><span className="w-2 h-2 rounded-full bg-red-500"></span> Offline</span> en el menú lateral.</li>
            <li>Todo se guarda en el almacenamiento seguro de su dispositivo.</li>
          </ul>

          <h3 className="text-xl font-bold text-ink mt-8 mb-4">¿Cómo se sincronizan mis datos?</h3>
          <p className="text-ink-soft mb-4">Cuando el Internet regrese, el indicador cambiará a <strong>"Sincronizando..."</strong>. El sistema subirá todo su trabajo a la nube sin que deba presionar nada.</p>

          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-xl p-4 my-8">
            <h4 className="font-bold text-red-800 dark:text-red-300 mb-2">Advertencia Crítica</h4>
            <p className="text-sm text-red-700 dark:text-red-400">Si ha trabajado sin conexión, <strong>NO CIERRE LA SESIÓN</strong> ni limpie los datos del navegador, o perderá los datos que aún no se han subido. Espere a que el indicador verde "Sincronizado" aparezca antes de cerrar la sesión.</p>
          </div>
        </section>

        <footer className="border-t border-border pt-8 pb-12 mt-16 text-center text-sm text-ink-faint">
          <p>© {new Date().getFullYear()} {APP_NAME}. Todos los derechos reservados.</p>
        </footer>
      </main>
    </div>
  );
}
