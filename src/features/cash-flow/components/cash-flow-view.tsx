import React, { useState, useMemo } from "react";
import { useCashTransactions, useCreateTransaction, useVoidTransaction, useCurrentCashShift, useOpenShift, useCloseShift, useAppointmentsMetrics } from "../lib/use-cash-flow";
import { usePatients } from "@/features/patients/lib/use-patients-queries";
import { Card } from "@/components/ui/card";
import { Loader2, Plus, ArrowDownCircle, ArrowUpCircle, XCircle, Search, DollarSign, Activity, FileText, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DateRangeFilter, DateFilterValue, getDefaultDateFilter } from "@/components/ui/date-range-filter";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from "recharts";
import { usePaymentConfig } from "@/lib/use-payment-config";

interface CashFlowViewProps {
  clinicId: string;
  userId: string;
  tenant: any; // Using any for simplicity as it comes from context
}

export function CashFlowView({ clinicId, userId, tenant }: CashFlowViewProps) {
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(getDefaultDateFilter("today"));
  const isHistoricalMode = dateFilter.type !== "today";

  const { data: transactions, isLoading, error } = useCashTransactions(clinicId, isHistoricalMode ? dateFilter.start : undefined, isHistoricalMode ? dateFilter.end : undefined);
  const { data: patients } = usePatients(tenant);
  
  const { data: currentShift, isLoading: shiftLoading } = useCurrentCashShift(clinicId, userId);
  const { data: aptMetrics } = useAppointmentsMetrics(clinicId, userId, isHistoricalMode ? dateFilter.start : undefined, isHistoricalMode ? dateFilter.end : undefined);
  
  const createTx = useCreateTransaction();
  const voidTx = useVoidTransaction();
  const openShift = useOpenShift();
  const closeShift = useCloseShift();

  const [searchTerm, setSearchTerm] = useState("");
  const { data: paymentConfig } = usePaymentConfig(tenant?.doctor_id);
  const [showForm, setShowForm] = useState(false);
  const [initialAmount, setInitialAmount] = useState(() => {
    const prefs = tenant?.ui_preferences?.cash_register_settings;
    if (prefs?.auto_open) {
      return prefs.default_initial_amount?.toString() || "0";
    }
    return "";
  });
  
  // Form State
  const [type, setType] = useState<"income" | "expense">("income");
  const [amount, setAmount] = useState("");
  const [concept, setConcept] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [patientId, setPatientId] = useState("");
  const [reference, setReference] = useState("");

  // Modal State
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    description: string;
    variant?: "danger" | "warning";
    onConfirm: () => void | Promise<void>;
  }>({
    open: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    
    let shiftTransactions = [];
    if (isHistoricalMode) {
      shiftTransactions = transactions;
    } else if (currentShift) {
      shiftTransactions = transactions.filter(tx => tx.shift_id === currentShift.id);
    } else {
      shiftTransactions = transactions.filter(tx => {
        const d = new Date(tx.created_at);
        return d >= dateFilter.start && d <= dateFilter.end;
      });
    }
    
    if (!searchTerm) return shiftTransactions;
    const term = searchTerm.toLowerCase();
    return shiftTransactions.filter(tx => 
      tx.concept.toLowerCase().includes(term) ||
      tx.patients?.full_name.toLowerCase().includes(term) ||
      tx.reference_code?.toLowerCase().includes(term)
    );
  }, [transactions, searchTerm, currentShift, isHistoricalMode, dateFilter.start, dateFilter.end]);

  const summary = useMemo(() => {
    if (!transactions) return { 
      income: 0, expense: 0, balance: 0, total_cash: 0,
      income_by_method: {} as Record<string, number>
    };
    
    let shiftTransactions = [];
    if (isHistoricalMode) {
      shiftTransactions = transactions;
    } else if (currentShift) {
      shiftTransactions = transactions.filter(tx => tx.shift_id === currentShift.id);
    } else {
      shiftTransactions = transactions.filter(tx => {
        const d = new Date(tx.created_at);
        return d >= dateFilter.start && d <= dateFilter.end;
      });
    }
    
    const totals = shiftTransactions.reduce((acc, tx) => {
      if (tx.status === "voided") return acc;
      
      const method = tx.payment_method || "No especificado";
      const isCash = method.toLowerCase().includes("efectivo");
      
      if (tx.type === "income") {
        acc.income += tx.amount;
        acc.balance += tx.amount;
        if (isCash) acc.total_cash += tx.amount;
        
        acc.income_by_method[method] = (acc.income_by_method[method] || 0) + tx.amount;
      } else {
        acc.expense += tx.amount;
        acc.balance -= tx.amount;
        if (isCash) acc.total_cash -= tx.amount;
      }
      return acc;
    }, { 
      income: 0, expense: 0, balance: 0, 
      total_cash: !isHistoricalMode && currentShift ? currentShift.initial_amount : 0,
      income_by_method: {} as Record<string, number>
    });
    
    return totals;
  }, [transactions, currentShift, isHistoricalMode, dateFilter]);

  const dailyData = useMemo(() => {
    if (!transactions || (!isHistoricalMode && currentShift)) return [];
    
    let shiftTransactions = [];
    if (isHistoricalMode) {
      shiftTransactions = transactions;
    } else {
      shiftTransactions = transactions.filter(tx => {
        const d = new Date(tx.created_at);
        return d >= dateFilter.start && d <= dateFilter.end;
      });
    }

    const grouped = shiftTransactions.reduce((acc: Record<string, any>, tx) => {
      if (tx.status === "voided") return acc;
      const dateStr = format(new Date(tx.created_at), "yyyy-MM-dd");
      if (!acc[dateStr]) {
        acc[dateStr] = { 
          date: dateStr, 
          name: format(new Date(tx.created_at), "dd MMM", { locale: es }), 
          Ingresos: 0, 
          Egresos: 0, 
          count: 0 
        };
      }
      if (tx.type === "income") acc[dateStr].Ingresos += tx.amount;
      else acc[dateStr].Egresos += tx.amount;
      acc[dateStr].count += 1;
      return acc;
    }, {});
    
    return Object.values(grouped).sort((a: any, b: any) => a.date.localeCompare(b.date));
  }, [transactions, isHistoricalMode, dateFilter, currentShift]);

  const consultMetrics = useMemo(() => {
    if (!aptMetrics) return { paid: 0, pending: 0, honorific: 0, total: 0 };
    return aptMetrics.reduce((acc, apt) => {
      acc.total++;
      if (apt.payment_status === "paid") acc.paid++;
      else if (apt.payment_status === "pending") acc.pending++;
      else if (apt.payment_status === "honorific") acc.honorific++;
      return acc;
    }, { paid: 0, pending: 0, honorific: 0, total: 0 });
  }, [aptMetrics]);

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
    setConfirmModal({
      open: true,
      title: "Anular transacción",
      description: "¿Estás seguro de anular esta transacción? Esta acción no se puede deshacer y el monto dejará de sumar a la caja.",
      variant: "danger",
      onConfirm: async () => {
        await voidTx.mutateAsync(id);
        setConfirmModal(prev => ({ ...prev, open: false }));
      }
    });
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
    
    setConfirmModal({
      open: true,
      title: "Cerrar Turno de Caja",
      description: `¿Estás seguro de cerrar el turno de caja?\n\nMonto en Efectivo Esperado: $${summary.total_cash.toFixed(2)}`,
      variant: "warning",
      onConfirm: async () => {
        await closeShift.mutateAsync({
          id: currentShift.id,
          clinicId,
          userId,
          finalAmount: summary.total_cash
        });
        setConfirmModal(prev => ({ ...prev, open: false }));
      }
    });
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-ink">
            {isHistoricalMode ? "Historial de Caja" : (currentShift ? "Caja por Turno" : "Caja (Cerrada)")}
          </h2>
          <p className="text-sm text-ink-soft">
            {isHistoricalMode || !currentShift
              ? `Periodo: ${format(dateFilter.start, "dd MMM")} - ${format(dateFilter.end, "dd MMM yyyy")}`
              : `Turno abierto: ${format(new Date(currentShift.opened_at), "dd MMM yyyy, HH:mm", { locale: es })}`
            }
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <DateRangeFilter value={dateFilter} onChange={setDateFilter} />
          
          {!isHistoricalMode && currentShift && (
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
          )}
        </div>
      </div>

      {!isHistoricalMode && !currentShift && (
        <Card className="p-6 border-accent/20 bg-accent/5 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-accent/10 rounded-full flex items-center justify-center shrink-0">
              <DollarSign className="h-6 w-6 text-accent" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-ink">El turno de caja está cerrado</h3>
              <p className="text-sm text-ink-soft">
                {tenant?.ui_preferences?.cash_register_settings?.auto_open 
                  ? "Se ha precargado el monto inicial según tus ajustes de automatización. Haz clic en Abrir Turno." 
                  : "Abre un nuevo turno para poder registrar ingresos y egresos de hoy."}
              </p>
            </div>
          </div>
          <form onSubmit={handleOpenShift} className="flex items-end gap-3 w-full sm:w-auto">
            <div className="space-y-1 flex-1 sm:w-48">
              <label className="text-xs font-semibold text-ink uppercase tracking-wider">Monto Inicial ($)</label>
              <Input 
                type="number" 
                step="0.01" 
                min="0"
                required
                value={initialAmount}
                onChange={(e) => setInitialAmount(e.target.value)}
                placeholder="Ej. 100.00"
                className="bg-transparent h-10"
              />
            </div>
            <Button type="submit" className="h-10 px-6 shrink-0" disabled={openShift.isPending}>
              {openShift.isPending ? "Abriendo..." : "Abrir Turno"}
            </Button>
          </form>
        </Card>
      )}

      <div className={`grid gap-4 ${isHistoricalMode ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"}`}>
        {!isHistoricalMode && (
          <Card className="p-4 bg-bg-soft border-border">
            <p className="text-sm font-medium text-ink-soft flex items-center gap-2">Monto Base</p>
            <p className="text-2xl font-bold text-ink mt-1">${currentShift ? currentShift.initial_amount.toFixed(2) : '0.00'}</p>
          </Card>
        )}
        <Card className="p-4 bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-400 flex items-center gap-2"><ArrowUpCircle className="h-4 w-4" /> Ingresos Totales</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-300 mt-1">${summary.income.toFixed(2)}</p>
            </div>
            <div className="text-xs text-green-800 dark:text-green-400 bg-green-100/50 dark:bg-green-900/20 rounded-lg p-2 space-y-1 w-full sm:w-auto">
              {Object.entries(summary.income_by_method).map(([method, amount]) => (
                <div key={method} className="flex justify-between gap-4">
                  <span>{method}:</span> <strong>${amount.toFixed(2)}</strong>
                </div>
              ))}
              {Object.keys(summary.income_by_method).length === 0 && (
                <div className="text-green-800/60 dark:text-green-400/60 italic">Sin ingresos</div>
              )}
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30">
          <p className="text-sm font-medium text-red-800 dark:text-red-400 flex items-center gap-2"><ArrowDownCircle className="h-4 w-4" /> Egresos Totales</p>
          <p className="text-2xl font-bold text-red-900 dark:text-red-300 mt-1">${summary.expense.toFixed(2)}</p>
        </Card>
        {!isHistoricalMode && (
          <Card className="p-4 bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/30 ring-2 ring-blue-500/20">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-400 flex items-center gap-2"><DollarSign className="h-4 w-4" /> Efectivo Esperado</p>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-300 mt-1">${summary.total_cash.toFixed(2)}</p>
          </Card>
        )}
      </div>

      {dailyData.length > 0 && (
        <div className="pt-4">
          <Card className="p-6 border-border bg-card">
            <h3 className="text-lg font-bold text-ink mb-6 flex items-center gap-2">
              <Activity className="h-5 w-5 text-accent" />
              Rendimiento Diario
            </h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#6b7280', fontSize: 12 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <RechartsTooltip 
                    cursor={{ fill: '#f3f4f6' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any) => [`$${Number(value || 0).toFixed(2)}`, undefined as any]}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="Ingresos" fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  <Bar dataKey="Egresos" fill="#dc2626" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      <div className="pt-4">
        <h3 className="text-lg font-bold text-ink mb-3 flex items-center gap-2">
          <Activity className="h-5 w-5 text-accent" />
          Métricas de Consultas ({isHistoricalMode || !currentShift ? "Histórico" : "Hoy"})
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
            <p className="text-xs font-semibold text-ink-soft uppercase flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Totales</p>
            <p className="text-xl font-bold text-ink mt-1">{consultMetrics.total}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/30 dark:bg-emerald-900/10 p-3 shadow-sm">
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Cobradas</p>
            <p className="text-xl font-bold text-emerald-800 dark:text-emerald-300 mt-1">{consultMetrics.paid}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-900/10 p-3 shadow-sm">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Pendientes</p>
            <p className="text-xl font-bold text-amber-800 dark:text-amber-300 mt-1">{consultMetrics.pending}</p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 dark:border-blue-900/30 dark:bg-blue-900/10 p-3 shadow-sm">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Honoríficas</p>
            <p className="text-xl font-bold text-blue-800 dark:text-blue-300 mt-1">{consultMetrics.honorific}</p>
          </div>
        </div>
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
                  <button type="button" onClick={() => setType("income")} className={`flex-1 py-2 rounded-md border text-sm font-medium transition ${type === "income" ? "bg-green-100 border-green-500 text-green-800 dark:bg-green-900/30 dark:text-green-300" : "bg-transparent text-ink-soft hover:bg-bg-soft"}`}>Ingreso</button>
                  <button type="button" onClick={() => setType("expense")} className={`flex-1 py-2 rounded-md border text-sm font-medium transition ${type === "expense" ? "bg-red-100 border-red-500 text-red-800 dark:bg-red-900/30 dark:text-red-300" : "bg-transparent text-ink-soft hover:bg-bg-soft"}`}>Egreso</button>
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
                  className="bg-transparent"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-ink-soft">Concepto</label>
                <Input 
                  required
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  placeholder="Ej. Consulta Médica, Compra de Insumos..."
                  className="bg-transparent"
                />
              </div>

              <div className="space-y-1">
              <label className="text-sm font-semibold text-ink">Medio de Pago</label>
              <select 
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 bg-transparent border border-border rounded-lg text-sm text-ink focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              >
                <option value="">Selecciona medio de pago...</option>
                {paymentConfig?.methods.map((method, i) => (
                  <option key={i} value={method.name}>{method.name}</option>
                ))}
              </select>
            </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-ink-soft">Paciente (Opcional)</label>
                <select 
                  className="w-full bg-transparent border border-input px-3 py-2 text-sm rounded-md ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                  className="bg-transparent"
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
          className="pl-9 bg-transparent"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-bg-soft border-b border-border text-xs uppercase text-ink-soft">
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
                <tr key={tx.id} className="border-b border-border last:border-0 hover:bg-bg-soft transition">
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
                        disabled={isHistoricalMode || !currentShift}
                      >
                        {isHistoricalMode || !currentShift ? "" : "Anular"}
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

      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        description={confirmModal.description}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, open: false }))}
      />
    </div>
  );
}
