"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants/app";
import { acceptTermsAction } from "@/lib/supabase/actions";
import Link from "next/link";

type TermsAcceptanceModalProps = {
  isOpen: boolean;
};

export function TermsAcceptanceModal({ isOpen }: TermsAcceptanceModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleAccept = () => {
    setError(null);
    startTransition(async () => {
      const result = await acceptTermsAction();
      if (!result.success) {
        setError(result.error ?? "Ocurrió un error al aceptar los términos.");
        return;
      }
      
      // Forzar recarga completa para que se actualice el contexto del tenant
      window.location.reload();
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-[500px] [&>button]:hidden" 
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Actualización de Políticas</DialogTitle>
          <DialogDescription>
            Hemos actualizado nuestros Términos y Condiciones y nuestra Política de Privacidad.
            Para continuar usando {APP_NAME}, es necesario que leas y aceptes las nuevas políticas.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 text-sm text-ink-soft bg-bg-soft rounded-lg px-4 border border-border">
          <p className="mb-2">
            Nuestros esfuerzos están enfocados en proteger tu información y la de tus pacientes.
            Puedes revisar los detalles de estos cambios en nuestra página de{" "}
            <Link href="/terminos" target="_blank" className="text-accent hover:underline font-medium">
              Términos y Condiciones
            </Link>.
          </p>
          <p>
            Al hacer clic en &quot;Aceptar&quot;, confirmas que has leído y estás de acuerdo con el uso
            de nuestra plataforma bajo estos nuevos lineamientos.
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-600 font-medium bg-red-50 p-2 rounded">{error}</p>
        )}

        <DialogFooter className="mt-4">
          <Button
            onClick={handleAccept}
            disabled={isPending}
            className="w-full sm:w-auto"
          >
            {isPending ? "Procesando..." : "He leído y acepto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
