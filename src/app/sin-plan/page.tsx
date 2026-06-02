import Link from "next/link";
import { APP_NAME } from "@/lib/constants/app";
import { AlertTriangle } from "lucide-react";
import { LogoutButton } from "@/features/auth/components/logout-button";

export default function SinPlanPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-6">
      <div className="text-center space-y-6 max-w-md">
        <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto" />
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">
            Sin plan activo
          </h1>
          <p className="text-sm text-ink-soft mt-3 leading-relaxed">
            Tu cuenta no tiene una membresía activa en ninguna organización, o tu
            suscripción ha sido cancelada. Para seguir usando {APP_NAME}, necesitas
            activar un plan o ser invitado a una organización.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/planes/profesional"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent/90 transition-colors"
          >
            Ver planes disponibles
          </Link>
          <LogoutButton mode="full" />
        </div>

        <p className="text-xs text-ink-faint">
          Si crees que esto es un error, contacta a{" "}
          <a href="mailto:soporte@glyphix.app" className="text-accent underline">
            soporte@glyphix.app
          </a>
        </p>
      </div>
    </div>
  );
}
