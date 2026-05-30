"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { APP_NAME } from "@/lib/constants/app";
import { Loader2, CheckCircle2, XCircle, Building2 } from "lucide-react";

type InvitationData = {
  invitation_id: string;
  organization_id: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
  organization_name: string;
};

const passwordSchema = z.object({
  fullName: z.string().min(1, "El nombre es obligatorio."),
  password: z.string()
    .min(8, "Mínimo 8 caracteres.")
    .regex(/[A-Z]/, "Debe contener una mayúscula.")
    .regex(/[0-9]/, "Debe contener un número.")
    .regex(/[^A-Za-z0-9]/, "Debe contener un carácter especial."),
  confirmPassword: z.string().min(1, "Confirma tu contraseña."),
}).refine(data => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

/**
 * /invite/[token] — Invitation acceptance page
 *
 * Flow:
 * 1. Validate token (exists, not expired, status=pending)
 * 2. If email exists in auth → show "Accept" button
 * 3. If new user → show registration form (name + password)
 * 4. Atomic: INSERT user + INSERT org_member + UPDATE invitation
 */
export default function InviteTokenPage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  // Step 1: Validate token on mount
  useEffect(() => {
    async function validateToken() {
      try {
        const res = await fetch(`/api/invitations/validate?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Invitación inválida.");
          setLoading(false);
          return;
        }

        setInvitation(data.invitation);
        setIsExistingUser(data.user_exists);
        setLoading(false);
      } catch {
        setError("Error al validar la invitación.");
        setLoading(false);
      }
    }

    if (token) validateToken();
  }, [token]);

  // Accept invitation (existing user)
  async function handleAccept() {
    if (!invitation) return;
    setIsAccepting(true);
    setError(null);

    try {
      const res = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al aceptar la invitación.");
        return;
      }

      setAccepted(true);
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.replace(data.redirect || "/dashboard");
      }, 2000);
    } catch {
      setError("Error al aceptar la invitación.");
    } finally {
      setIsAccepting(false);
    }
  }

  // Accept invitation (new user — create account)
  async function handleNewUserSubmit(formData: PasswordFormData) {
    if (!invitation) return;
    setError(null);

    try {
      const res = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          full_name: formData.fullName,
          password: formData.password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al crear la cuenta.");
        return;
      }

      setAccepted(true);
      setTimeout(() => {
        router.replace(data.redirect || "/login");
      }, 2000);
    } catch {
      setError("Error al crear la cuenta.");
    }
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto" />
          <p className="text-sm text-ink-soft">Validando invitación...</p>
        </div>
      </div>
    );
  }

  // ── Accepted state ──
  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-center space-y-4 max-w-md">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
          <h2 className="text-xl font-bold text-ink">¡Invitación aceptada!</h2>
          <p className="text-sm text-ink-soft">
            Te has unido a {invitation?.organization_name}. Redirigiendo...
          </p>
        </div>
      </div>
    );
  }

  // ── Error state (invalid/expired token) ──
  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-center space-y-4 max-w-md">
          <XCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold text-ink">Invitación inválida</h2>
          <p className="text-sm text-ink-soft">{error}</p>
          <Button onClick={() => router.replace("/login")} variant="outline">
            Ir al inicio de sesión
          </Button>
        </div>
      </div>
    );
  }

  // ── Main invitation UI ──
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center">
            <Building2 className="w-7 h-7 text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">
            Invitación a {invitation?.organization_name}
          </h1>
          <p className="text-sm text-ink-soft">
            Has sido invitado como{" "}
            <strong className="text-ink capitalize">{invitation?.role}</strong>{" "}
            en {APP_NAME}.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-soft">Email</span>
            <span className="font-medium text-ink">{invitation?.email}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-soft">Rol</span>
            <span className="font-medium text-ink capitalize">{invitation?.role}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-soft">Expira</span>
            <span className="font-medium text-ink">
              {invitation?.expires_at
                ? new Date(invitation.expires_at).toLocaleDateString("es", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—"}
            </span>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {isExistingUser ? (
            /* Existing user: just accept */
            <Button
              onClick={handleAccept}
              disabled={isAccepting}
              className="w-full min-h-[44px]"
            >
              {isAccepting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Aceptando...
                </>
              ) : (
                "Aceptar invitación"
              )}
            </Button>
          ) : (
            /* New user: registration form */
            <form onSubmit={handleSubmit(handleNewUserSubmit)} className="space-y-4">
              <p className="text-sm text-ink-soft bg-bg-soft p-3 rounded-lg">
                No tienes cuenta aún. Completa tus datos para unirte.
              </p>

              <div>
                <label className="text-sm font-medium text-ink block mb-1">
                  Nombre completo
                </label>
                <Input
                  {...register("fullName")}
                  placeholder="Tu nombre y apellido"
                  autoComplete="name"
                />
                {errors.fullName && (
                  <p className="text-xs text-red-700 mt-1">{errors.fullName.message}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-ink block mb-1">
                  Contraseña
                </label>
                <Input
                  type="password"
                  {...register("password")}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                />
                {errors.password && (
                  <p className="text-xs text-red-700 mt-1">{errors.password.message}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-ink block mb-1">
                  Confirmar contraseña
                </label>
                <Input
                  type="password"
                  {...register("confirmPassword")}
                  placeholder="Repite tu contraseña"
                  autoComplete="new-password"
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-red-700 mt-1">{errors.confirmPassword.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[44px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creando cuenta...
                  </>
                ) : (
                  "Crear cuenta y unirme"
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
