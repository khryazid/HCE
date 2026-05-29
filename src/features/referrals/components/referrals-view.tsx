import React, { useState } from "react";
import { useMedicalReferrals, useUpdateReferralStatus } from "../lib/use-referrals";
import { Card } from "@/components/ui/card";
import { Loader2, UserPlus, CheckCircle, Clock, XCircle, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ReferralsViewProps {
  clinicId: string;
}

export function ReferralsView({ clinicId }: ReferralsViewProps) {
  const [tab, setTab] = useState<"received" | "sent">("received");
  const { data: referrals, isLoading, error } = useMedicalReferrals(clinicId, tab);
  const updateStatus = useUpdateReferralStatus();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
        <p className="font-semibold">Error al cargar las referencias</p>
        <p className="text-sm">{(error as Error).message}</p>
      </div>
    );
  }

  const handleStatus = (id: string, newStatus: "pending" | "accepted" | "completed" | "declined") => {
    updateStatus.mutate({ id, status: newStatus });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800"><Clock className="mr-1 h-3 w-3" /> Pendiente</span>;
      case "accepted":
        return <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800"><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Aceptado</span>;
      case "completed":
        return <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800"><CheckCircle className="mr-1 h-3 w-3" /> Completado</span>;
      case "declined":
        return <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800"><XCircle className="mr-1 h-3 w-3" /> Rechazado</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-ink">Referencias Médicas</h2>
          <p className="text-sm text-ink-soft">Gestiona pacientes derivados hacia ti o que tú has derivado.</p>
        </div>
      </div>

      <div className="flex space-x-1 border-b border-gray-200">
        <button
          className={`pb-2 px-4 text-sm font-medium border-b-2 transition-colors ${tab === "received" ? "border-accent text-accent" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
          onClick={() => setTab("received")}
        >
          Recibidas
        </button>
        <button
          className={`pb-2 px-4 text-sm font-medium border-b-2 transition-colors ${tab === "sent" ? "border-accent text-accent" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
          onClick={() => setTab("sent")}
        >
          Enviadas
        </button>
      </div>

      <div className="grid gap-4">
        {referrals?.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center bg-white/50">
            <ArrowRightLeft className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-semibold text-ink">No hay referencias {tab === "received" ? "recibidas" : "enviadas"}</h3>
            <p className="text-sm text-ink-soft mt-1">Cuando {tab === "received" ? "un médico te derive un paciente" : "derives un paciente a otro médico"}, aparecerá aquí.</p>
          </div>
        ) : (
          referrals?.map((ref) => (
            <Card key={ref.id} className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-5 w-5 text-accent" />
                      <h3 className="font-semibold text-lg">{ref.patients?.full_name}</h3>
                      {getStatusBadge(ref.status)}
                    </div>
                    <span className="text-sm text-ink-lighter">
                      {format(new Date(ref.created_at), "dd MMM yyyy", { locale: es })}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    {tab === "received" ? (
                      <div>
                        <p className="text-ink-lighter font-medium">Derivado por</p>
                        <p className="font-semibold">{ref.referring?.full_name}</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-ink-lighter font-medium">Derivado a</p>
                        <p className="font-semibold">{ref.referred?.full_name || ref.external_doctor_name}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-ink-lighter font-medium">Paciente CI</p>
                      <p>{ref.patients?.document_number}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-md border border-gray-100 text-sm">
                    <p className="text-ink-lighter font-medium mb-1">Motivo de referencia:</p>
                    <p>{ref.reason}</p>
                  </div>
                </div>

                {tab === "received" && ref.status === "pending" && (
                  <div className="flex flex-col gap-2 justify-center md:border-l pl-0 md:pl-6">
                    <Button onClick={() => handleStatus(ref.id, "accepted")}>Aceptar Paciente</Button>
                    <Button variant="outline" onClick={() => handleStatus(ref.id, "declined")} className="text-red-600 hover:text-red-700">Rechazar</Button>
                  </div>
                )}
                
                {tab === "received" && ref.status === "accepted" && (
                  <div className="flex flex-col gap-2 justify-center md:border-l pl-0 md:pl-6">
                    <Button onClick={() => handleStatus(ref.id, "completed")} className="bg-green-600 hover:bg-green-700">Marcar Completado</Button>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
