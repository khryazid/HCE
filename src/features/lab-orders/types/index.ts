export type OrderType = "laboratory" | "imaging";
export type OrderStatus = "pending" | "in_progress" | "completed" | "cancelled";

export interface LabOrderItem {
  name: string;
  code?: string;
  notes?: string;
}

export interface LabOrder {
  id: string;
  clinic_id: string;
  doctor_id: string;
  patient_id: string;
  clinical_record_id: string | null;
  order_type: OrderType;
  items: LabOrderItem[];
  reason: string;
  status: OrderStatus;
  results: any | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LabOrderInsert {
  clinic_id: string;
  doctor_id: string;
  patient_id: string;
  clinical_record_id?: string | null;
  order_type: OrderType;
  items: LabOrderItem[];
  reason?: string;
  status?: OrderStatus;
  results?: any | null;
  completed_at?: string | null;
}

export interface LabOrderUpdate {
  status?: OrderStatus;
  results?: any | null;
  completed_at?: string | null;
}
