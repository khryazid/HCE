import React, { useState, useMemo } from "react";
import { useCashTransactions, useCreateTransaction, useVoidTransaction, useCurrentCashShift, useOpenShift, useCloseShift } from "../lib/use-cash-flow";
import { usePatients } from "@/features/patients/lib/use-patients-queries";
import { Card } from "@/components/ui/card";
import { Loader2, Plus, ArrowDownCircle, ArrowUpCircle, XCircle, Search, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface CashFlowViewProps {
  clinicId: string;
  userId: string;
  tenant: any; // Using any for simplicity as it comes from context
}

export function CashFlowView({ clinicId, userId, tenant }: CashFlowViewProps) {
  const { data: transactions, isLoading, error } = useCashTransactions(clinicId);
  const { data: patients } = usePatients(tenant);
  
  const { data: currentShift, isLoading: shiftLoading } = useCurrentCashShift(clinicId, userId);
  
  const createTx = useCreateTransaction();
  const voidTx = useVoidTransaction();
  const openShift = useOpenShift();
  const closeShift = useCloseShift();

  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [initialAmount, setInitialAmount] = useState("");
  
  // Form State
  const [type, setType] = useState<"income" | "expense">("income");
  const [amount, setAmount] = useState("");
  const [concept, setConcept] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "transfer" | "other">("cash");
  const [patientId, setPatientId] = useState("");
  const [reference, setReference] = useState("");

  const filteredTransactions = useMemo(() => {
    if (!transactions || !currentShift) return [];
    
    // Solo mostrar transacciones del turno actual
    const shiftTransactions = transactions.filter(tx => tx.shift_id === currentShift.id);
    
    if (!searchTerm) return shiftTransactions;
    const term = searchTerm.toLowerCase();
    return shiftTransactions.filter(tx => 
      tx.concept.toLowerCase().includes(term) ||
      tx.patients?.full_name.toLowerCase().includes(term) ||
      tx.reference_code?.toLowerCase().includes(term)
    );
  }, [transactions, searchTerm, currentShift]);

  const summary = useMemo(() => {
    if (!transactions || !currentShift) return { income: 0, expense: 0, balance: 0, total_cash: 0 };
    
    const shiftTransactions = transactions.filter(tx => tx.shift_id === currentShift.id);
    
    const totals = shiftTransactions.reduce((acc, tx) => {
      if (tx.status === "voided") return acc;
      if (tx.type === "income") {
        acc.income += tx.amount;
        acc.balance += tx.amount;
        if (tx.payment_method === "cash") acc.total_cash += tx.amount;
      } else {
        acc.expense += tx.amount;
        acc.balance -= tx.amount;
        if (tx.payment_method === "cash") acc.total_cash -= tx.amount;
      }
      return acc;
    }, { income: 0, expense: 0, balance: 0, total_cash: currentShift.initial_amount });
    
    return totals;
  }, [transactions, currentShift]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !concept || !currentShift) return;

    await createTx.mutateAsync({
      clinic_id: clinicId,
      user_id: userId,
      type,
      amount: parseFloat(amount),
      concept,
      payment_method: paymentMethod,
      patient_id: patientId || null,
      reference_code: reference || null,
      shift_id: currentShift.id,
      status: "completed"
    });

    setShowForm(false);
    setAmount("");
    setConcept("");
    setReference("");
    setPatientId("");
  };

  const handleVoid = async (id: string) => {
    if (confirm("¿Estás seguro de anular esta transacción?")) {
      await voidTx.mutateAsync(id);
    }
  };

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initialAmount) return;
    await openShift.mutateAsync({
      clinic_id: clinicId,
      user_id: userId,
      initial_amount: parseFloat(initialAmount)
    });
  };

  const handleCloseShift = async () => {
    if (!currentShift) return;
    if (confirm(`¿Estás seguro de cerrar el turno de caja?\nMonto en Efectivo Esperado: $${summary.total_cash.toFixed(2)}`)) {
      await closeShift.mutateAsync({
        id: currentShift.id,
        clinicId,
        userId,
        finalAmount: summary.total_cash
      });
    }
  };

  if (isLoading || shiftLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
        <p className="font-semibold">Error al cargar la caja</p>
        <p className="text-sm">{(error as Error).message}</p>
      </div>
    );
  }

  if (!currentShift) {
    return (
      <div className="max-w-md mx-auto mt-10">
        <Card className="p-6 border-accent/20 bg-accent/5">
          <form onSubmit={handleOpenShift} className="space-y-6">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 bg-accent/10 rounded-full flex items-center justify-center mb-4">
                <DollarSign className="h-6 w-6 text-accent" />
              </div>
              <h2 className="text-2xl font-bold text-ink">Abrir Turno de Caja</h2>
              <p className="text-sm text-ink-soft mt-1">
                Ingresa el monto de apertura para comenzar a registrar transacciones.
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink">Monto Inicial en Caja ($)</label>
              <Input 
                type="number" 
                step="0.01" 
                min="0"
                required
                value={initialAmount}
                onChange={(e) => setInitialAmount(e.target.value)}
                placeholder="Ej. 100.00"
                className="bg-white text-lg h-12"
              />
            </div>

            <Button type="submit" className="w-full h-12 text-md" disabled={openShift.isPending}>
              {openShift.isPending ? "Abriendo caja..." : "Abrir Turno"}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-ink">Caja por Turno</h2>
          <p className="text-sm text-ink-soft">
            Turno abierto: {format(new Date(currentShift.opened_at), "dd MMM yyyy, HH:mm", { locale: es })}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button onClick={handleCloseShift} variant="destructive" className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Cerrar Turno
          </Button>
          <Button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2">
            {showForm ? <XCircle className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Cancelar" : "Nueva Transacción"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gray-50 border-gray-200">
          <p className="text-sm font-medium text-gray-600 flex items-center gap-2">Monto Base</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">${currentShift.initial_amount.toFixed(2)}</p>
        </Card>
        <Card className="p-4 bg-green-50 border-green-100">
          <p className="text-sm font-medium text-green-800 flex items-center gap-2"><ArrowUpCircle className="h-4 w-4" /> Ingresos Totales</p>
          <p className="text-2xl font-bold text-green-900 mt-1">${summary.income.toFixed(2)}</p>
        </Card>
        <Card className="p-4 bg-red-50 border-red-100">
          <p className="text-sm font-medium text-red-800 flex items-center gap-2"><ArrowDownCircle className="h-4 w-4" /> Egresos</p>
          <p className="text-2xl font-bold text-red-900 mt-1">${summary.expense.toFixed(2)}</p>
        </Card>
        <Card className="p-4 bg-blue-50 border-blue-100 ring-2 ring-blue-500/20">
          <p className="text-sm font-medium text-blue-800 flex items-center gap-2"><DollarSign className="h-4 w-4" /> Efectivo Esperado</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">${summary.total_cash.toFixed(2)}</p>
        </Card>
      </div>

      {showForm && (
        <Card className="p-6 border-accent/20 bg-accent/5 animate-in fade-in slide-in-from-top-2">
          <form onSubmit={handleCreate} className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              Registrar Nueva Transacción
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-ink-soft">Tipo</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setType("income")} className={`flex-1 py-2 rounded-md border text-sm font-medium transition ${type === "income" ? "bg-green-100 border-green-500 text-green-800" : "bg-white text-ink-soft hover:bg-gray-50"}`}>Ingreso</button>
                  <button type="button" onClick={() => setType("expense")} className={`flex-1 py-2 rounded-md border text-sm font-medium transition ${type === "expense" ? "bg-red-100 border-red-500 text-red-800" : "bg-white text-ink-soft hover:bg-gray-50"}`}>Egreso</button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-ink-soft">Monto ($)</label>
                <Input 
                  type="number" 
                  step="0.01" 
                  min="0"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-ink-soft">Concepto</label>
                <Input 
                  required
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  placeholder="Ej. Consulta Médica, Compra de Insumos..."
                  className="bg-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-ink-soft">Método de Pago</label>
                <select 
                  className="w-full bg-white border border-input px-3 py-2 text-sm rounded-md ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                >
                  <option value="cash">Efectivo</option>
                  <option value="card">Tarjeta (Crédito/Débito)</option>
                  <option value="transfer">Transferencia Bancaria</option>
                  <option value="other">Otro</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-ink-soft">Paciente (Opcional)</label>
                <select 
                  className="w-full bg-white border border-input px-3 py-2 text-sm rounded-md ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                >
                  <option value="">-- Ninguno --</option>
                  {patients?.map(p => (
                    <option key={p.id} value={p.id}>{p.full_name} ({p.document_number})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-ink-soft">Código de Referencia (Opcional)</label>
                <Input 
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Nro Factura, Transferencia..."
                  className="bg-white"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button type="submit" disabled={createTx.isPending}>
                {createTx.isPending ? "Guardando..." : "Guardar Transacción"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="relative w-full sm:w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-lighter" />
        <Input 
          placeholder="Buscar concepto o paciente..." 
          className="pl-9 bg-white"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-ink-soft">
            <tr>
              <th className="px-6 py-3 font-semibold">Fecha</th>
              <th className="px-6 py-3 font-semibold">Concepto / Paciente</th>
              <th className="px-6 py-3 font-semibold">Tipo</th>
              <th className="px-6 py-3 font-semibold">Monto</th>
              <th className="px-6 py-3 font-semibold text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-ink-soft">
                  No hay transacciones registradas.
                </td>
              </tr>
            ) : (
              filteredTransactions.map((tx) => (
                <tr key={tx.id} className={`hover:bg-gray-50 ${tx.status === "voided" ? "opacity-50" : ""}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {format(new Date(tx.created_at), "dd MMM yyyy HH:mm", { locale: es })}
                  </td>
                  <td className="px-6 py-4">
                    <p className={`font-medium ${tx.status === "voided" ? "line-through" : ""}`}>{tx.concept}</p>
                    {tx.patients && <p className="text-xs text-ink-soft mt-0.5">{tx.patients.full_name}</p>}
                    {tx.reference_code && <p className="text-xs text-ink-lighter mt-0.5 font-mono">Ref: {tx.reference_code}</p>}
                  </td>
                  <td className="px-6 py-4">
                    {tx.type === "income" ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        Ingreso
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                        Egreso
                      </span>
                    )}
                  </td>
                  <td className={`px-6 py-4 font-bold ${tx.type === "income" ? "text-green-700" : "text-red-700"} ${tx.status === "voided" ? "line-through" : ""}`}>
                    {tx.type === "income" ? "+" : "-"}${tx.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {tx.status === "completed" ? (
                      <button 
                        onClick={() => handleVoid(tx.id)}
                        className="text-xs text-red-600 hover:underline font-medium"
                      >
                        Anular
                      </button>
                    ) : (
                      <span className="text-xs text-ink-soft italic">Anulada</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
