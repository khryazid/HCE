"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateUserPassword } from "@/lib/supabase/auth-actions";
import { APP_NAME } from "@/lib/constants/app";

const updateSchema = z.object({
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.")
    .regex(/[A-Z]/, "Debe contener al menos una letra mayúscula.")
    .regex(/[0-9]/, "Debe contener al menos un número.")
    .regex(/[^A-Za-z0-9]/, "Debe contener al menos un carácter especial."),
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

  useEffect(() => {
    // Inicializar el cliente de Supabase para que intercepte el token en el hash de la URL
    // y lo convierta en una cookie de sesión antes de que el usuario envíe el formulario.
    getSupabaseClient();
  }, []);

  const {
    register,
    handleSubmit,
    watch,
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
              placeholder="Mínimo 8 caracteres"
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
          <div className="mt-2 space-y-2">
            <div className="flex gap-1 h-1">
              {[
                watch("password")?.length >= 8,
                /[A-Z]/.test(watch("password") || ""),
                /[0-9]/.test(watch("password") || ""),
                /[^A-Za-z0-9]/.test(watch("password") || ""),
              ].map((passed, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-full transition-colors ${
                    !watch("password")
                      ? "bg-accent/10"
                      : passed
                      ? "bg-emerald-500"
                      : "bg-red-200"
                  }`}
                />
              ))}
            </div>
            <p className="text-[11px] text-ink-soft flex flex-wrap gap-x-3 gap-y-1">
              <span className={watch("password")?.length >= 8 ? "text-emerald-600 font-medium" : ""}>✓ 8 caracteres</span>
              <span className={/[A-Z]/.test(watch("password") || "") ? "text-emerald-600 font-medium" : ""}>✓ 1 mayúscula</span>
              <span className={/[0-9]/.test(watch("password") || "") ? "text-emerald-600 font-medium" : ""}>✓ 1 número</span>
              <span className={/[^A-Za-z0-9]/.test(watch("password") || "") ? "text-emerald-600 font-medium" : ""}>✓ 1 especial</span>
            </p>
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
