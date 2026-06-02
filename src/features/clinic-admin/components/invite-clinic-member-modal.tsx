"use client";

import { useState } from "react";
import { X, Loader2, UserPlus, Mail, Shield, Key } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InviteClinicMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  clinicId: string;
}

export function InviteClinicMemberModal({ isOpen, onClose, clinicId }: InviteClinicMemberModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<string>("doctor");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      setLoading(false);
      return;
    }

    try {
      const payload: any = { email, role, clinic_id: clinicId, password };

      const res = await fetch("/api/clinic/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudo invitar al miembro");
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setRole("doctor");
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-border">
        <div className="flex items-center justify-between p-6 border-b border-border bg-bg-soft/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink leading-none mb-1">Invitar Miembro</h2>
              <p className="text-xs text-ink-soft">Agrega personal a tu clínica</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-bg-soft text-ink-soft transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {success ? (
            <div className="text-center py-6">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 mb-4">
                <UserPlus className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold text-ink">Invitación Enviada</h3>
              <p className="text-sm text-ink-soft mt-2">
                El usuario ha sido invitado correctamente y se le ha enviado un correo.
              </p>
            </div>
          ) : (
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-ink flex items-center gap-2">
                  <Mail className="h-4 w-4 text-ink-soft" /> Correo Electrónico
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  className="w-full h-11 px-4 rounded-xl border border-border bg-field text-ink focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-ink flex items-center gap-2">
                  <Shield className="h-4 w-4 text-ink-soft" /> Rol del Miembro
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-input bg-bg-soft text-ink focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent text-sm transition-all"
                >
                  <option value="doctor">Doctor</option>
                  <option value="receptionist">Recepcionista</option>
                  <option value="lab">Laboratorio</option>
                  <option value="imaging">Imagenología</option>
                  <option value="surgery">Área Quirúrgica</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-ink flex items-center gap-2">
                  <Key className="h-4 w-4 text-ink-soft" /> Contraseña Temporal
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Escribe la contraseña (obligatoria)"
                  className="w-full h-11 px-4 rounded-xl border border-border bg-field text-ink focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-ink flex items-center gap-2">
                  <Key className="h-4 w-4 text-ink-soft" /> Confirmar Contraseña
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Vuelve a escribir la contraseña"
                  className="w-full h-11 px-4 rounded-xl border border-border bg-field text-ink focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all outline-none"
                />
                <p className="text-[10px] text-ink-faint mt-1">El usuario deberá usarla para iniciar sesión la primera vez.</p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
                  Cancelar
                </Button>
                <Button type="submit" variant="default" className="flex-1 bg-accent text-white hover:bg-accent-hover" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Invitar Ahora"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
