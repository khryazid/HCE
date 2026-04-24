export type SyncAction = "insert" | "update" | "delete";
export type SyncStatus = "pending" | "syncing" | "failed" | "conflicted" | "done";

export type SyncQueueItem = {
  id: string;
  table_name: "profiles" | "patients" | "clinical_records" | "specialty_data";
  record_id: string;
  table_name_record_id?: string;
  action: SyncAction;
  payload: Record<string, unknown>;
  doctor_id: string;
  clinic_id: string;
  client_timestamp: number;
  status: SyncStatus;
  retry_count: number;
  last_error?: string;
};
