"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateUserPassword } from "@/lib/supabase/auth-actions";
import { APP_NAME } from "@/lib/constants/app";

const updateSchema = z.object({
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
});

type UpdateFormData = z.infer<typeof updateSchema>;

export function UpdatePasswordForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateFormData>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: UpdateFormData) {
    setError(null);
    const result = await updateUserPassword(data.password);

    if (result.success) {
      // Redirigir al dashboard u otra zona segura
      router.replace("/dashboard");
    } else {
      setError(result.error);
    }
  }

  return (
    <section className="mx-auto w-full max-w-xl rounded-3xl border border-border bg-card/90 p-6 shadow-2xl backdrop-blur-sm sm:p-8">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">{APP_NAME}</p>
        <h2 className="text-2xl font-extrabold tracking-tight text-ink">Establece tu contraseña</h2>
        <p className="text-sm leading-6 text-ink-soft">
          Ingresa una nueva contraseña para acceder de forma segura a tu cuenta en la plataforma.
        </p>
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <label className="block space-y-2 text-sm font-medium text-ink-soft">
          <span>Nueva contraseña</span>
          <div className="flex gap-2">
            <Input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Mínimo 6 caracteres"
              {...register("password")}
            />
            <Button
              type="button"
              variant="secondary"
              className="px-3 py-2 text-xs font-semibold text-ink-soft"
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? "Ocultar" : "Mostrar"}
            </Button>
          </div>
          {errors.password && (
            <p className="text-xs text-red-700">{errors.password.message}</p>
          )}
        </label>

        <label className="block space-y-2 text-sm font-medium text-ink-soft">
          <span>Confirmar nueva contraseña</span>
          <Input
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Repite tu contraseña"
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-red-700">{errors.confirmPassword.message}</p>
          )}
        </label>

        {error && (
          <p className="hce-alert-error" role="alert">{error}</p>
        )}

        <Button
          type="submit"
          disabled={isSubmitting}
          className="hce-btn-primary w-full justify-center py-3 text-sm font-semibold disabled:cursor-not-allowed mt-4"
          aria-busy={isSubmitting}
        >
          {isSubmitting ? "Actualizando..." : "Guardar y Entrar"}
        </Button>
      </form>
    </section>
  );
}
