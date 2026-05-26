"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { requestPasswordReset } from "@/lib/supabase/auth-actions";
import { APP_NAME } from "@/lib/constants/app";

const recoverSchema = z.object({
  email: z.string().min(1, "El correo es obligatorio.").email("Ingresa un correo válido."),
});

type RecoverFormData = z.infer<typeof recoverSchema>;

export function RecoverPasswordForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RecoverFormData>({
    resolver: zodResolver(recoverSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(data: RecoverFormData) {
    setMessage(null);
    setError(null);

    const result = await requestPasswordReset(data.email);

    if (result.success) {
      setMessage("Se ha enviado un enlace a tu correo. Revisa tu bandeja de entrada (y la carpeta de spam) para continuar.");
    } else {
      setError(result.error);
    }
  }

  return (
    <section className="mx-auto w-full max-w-xl rounded-3xl border border-border bg-card/90 p-6 shadow-2xl backdrop-blur-sm sm:p-8">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">{APP_NAME}</p>
        <h2 className="text-2xl font-extrabold tracking-tight text-ink">Recuperar contraseña</h2>
        <p className="text-sm leading-6 text-ink-soft">
          Ingresa el correo electrónico asociado a tu cuenta. Te enviaremos un enlace mágico para que puedas crear una nueva contraseña.
        </p>
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <label className="block space-y-2 text-sm font-medium text-ink-soft">
          <span>Correo electrónico</span>
          <Input
            type="email"
            autoComplete="email"
            placeholder="tu-correo@empresa.com"
            {...register("email")}
            aria-invalid={errors.email ? "true" : undefined}
            aria-describedby={errors.email ? "field-error-email" : undefined}
          />
          {errors.email && (
            <p id="field-error-email" className="text-xs text-red-700" role="alert">
              {errors.email.message}
            </p>
          )}
        </label>

        {error && (
          <p className="hce-alert-error" role="alert">{error}</p>
        )}

        {message && (
          <p className="hce-alert-success" role="status">{message}</p>
        )}

        <Button
          type="submit"
          disabled={isSubmitting || message !== null}
          className="hce-btn-primary w-full justify-center py-3 text-sm font-semibold disabled:cursor-not-allowed mt-4"
          aria-busy={isSubmitting}
        >
          {isSubmitting ? "Enviando..." : "Enviar enlace de recuperación"}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-ink-soft">
        <Link href="/login" className="font-semibold text-accent underline-offset-4 hover:underline">
          Volver a inicio de sesión
        </Link>
      </p>
    </section>
  );
}
