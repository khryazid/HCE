export type CashTransactionType = "income" | "expense";
export type CashPaymentMethod = string;
export type CashTransactionStatus = "completed" | "voided";

export interface CashTransaction {
  id: string;
  clinic_id: string;
  user_id: string;
  patient_id: string | null;
  type: CashTransactionType;
  amount: number;
  concept: string;
  payment_method: CashPaymentMethod;
  status: CashTransactionStatus;
  reference_code: string | null;
  shift_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CashTransactionInsert {
  clinic_id: string;
  user_id: string;
  patient_id?: string | null;
  type: CashTransactionType;
  amount: number;
  concept: string;
  payment_method?: CashPaymentMethod;
  status?: CashTransactionStatus;
  reference_code?: string | null;
  shift_id?: string | null;
}

export interface CashShift {
  id: string;
  clinic_id: string;
  user_id: string;
  opened_at: string;
  closed_at: string | null;
  initial_amount: number;
  final_amount: number | null;
  status: "open" | "closed";
  created_at: string;
  updated_at: string;
}

export interface CashShiftInsert {
  clinic_id: string;
  user_id: string;
  initial_amount: number;
}
