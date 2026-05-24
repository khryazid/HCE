export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      api_rate_limits: {
        Row: {
          identifier: string
          request_count: number
          scope: string
          updated_at: string
          window_started_at: string
        }
        Insert: {
          identifier: string
          request_count?: number
          scope: string
          updated_at?: string
          window_started_at?: string
        }
        Update: {
          identifier?: string
          request_count?: number
          scope?: string
          updated_at?: string
          window_started_at?: string
        }
        Relationships: []
      }
      app_config: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          amount: number | null
          clinic_id: string
          consultation_type: string | null
          created_at: string
          doctor_id: string
          end_time: string
          id: string
          notes: string | null
          patient_birth_date: string | null
          patient_document: string | null
          patient_id: string | null
          patient_name: string
          patient_phone: string | null
          payment_method: string | null
          payment_status: string
          start_time: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          clinic_id: string
          consultation_type?: string | null
          created_at?: string
          doctor_id: string
          end_time: string
          id?: string
          notes?: string | null
          patient_birth_date?: string | null
          patient_document?: string | null
          patient_id?: string | null
          patient_name: string
          patient_phone?: string | null
          payment_method?: string | null
          payment_status?: string
          start_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          clinic_id?: string
          consultation_type?: string | null
          created_at?: string
          doctor_id?: string
          end_time?: string
          id?: string
          notes?: string | null
          patient_birth_date?: string | null
          patient_document?: string | null
          patient_id?: string | null
          patient_name?: string
          patient_phone?: string | null
          payment_method?: string | null
          payment_status?: string
          start_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          changes: Json
          clinic_id: string
          created_at: string
          doctor_id: string | null
          entry_hash: string
          event_type: string
          id: number
          metadata: Json
          previous_hash: string | null
          resource_id: string
          resource_type: string
          sequence_no: number
        }
        Insert: {
          changes: Json
          clinic_id: string
          created_at?: string
          doctor_id?: string | null
          entry_hash: string
          event_type: string
          id?: never
          metadata?: Json
          previous_hash?: string | null
          resource_id: string
          resource_type: string
          sequence_no: number
        }
        Update: {
          changes?: Json
          clinic_id?: string
          created_at?: string
          doctor_id?: string | null
          entry_hash?: string
          event_type?: string
          id?: never
          metadata?: Json
          previous_hash?: string | null
          resource_id?: string
          resource_type?: string
          sequence_no?: number
        }
        Relationships: []
      }
      clinic_members: {
        Row: {
          clinic_id: string
          created_at: string
          doctor_id: string
          id: string
          invited_by: string | null
          joined_at: string
          role: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          doctor_id: string
          id?: string
          invited_by?: string | null
          joined_at?: string
          role: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          doctor_id?: string
          id?: string
          invited_by?: string | null
          joined_at?: string
          role?: string
        }
        Relationships: []
      }
      clinical_records: {
        Row: {
          chief_complaint: string
          cie_codes: string[]
          clinic_id: string
          created_at: string
          doctor_id: string
          id: string
          patient_id: string
          specialty_data: Json
          specialty_kind: string
          updated_at: string
        }
        Insert: {
          chief_complaint: string
          cie_codes?: string[]
          clinic_id: string
          created_at?: string
          doctor_id: string
          id?: string
          patient_id: string
          specialty_data?: Json
          specialty_kind: string
          updated_at?: string
        }
        Update: {
          chief_complaint?: string
          cie_codes?: string[]
          clinic_id?: string
          created_at?: string
          doctor_id?: string
          id?: string
          patient_id?: string
          specialty_data?: Json
          specialty_kind?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_up_tasks: {
        Row: {
          clinic_id: string
          clinical_record_id: string | null
          created_at: string
          doctor_id: string
          due_date: string
          id: string
          note: string
          patient_id: string
          status: string
          updated_at: string
        }
        Insert: {
          clinic_id: string
          clinical_record_id?: string | null
          created_at?: string
          doctor_id: string
          due_date: string
          id?: string
          note?: string
          patient_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          clinical_record_id?: string | null
          created_at?: string
          doctor_id?: string
          due_date?: string
          id?: string
          note?: string
          patient_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_tasks_clinical_record_id_fkey"
            columns: ["clinical_record_id"]
            isOneToOne: false
            referencedRelation: "clinical_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_tasks_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_log: {
        Row: {
          doctor_id: string
          notification_date: string
          sent_at: string
          type: string
        }
        Insert: {
          doctor_id: string
          notification_date?: string
          sent_at?: string
          type: string
        }
        Update: {
          doctor_id?: string
          notification_date?: string
          sent_at?: string
          type?: string
        }
        Relationships: []
      }
      patients: {
        Row: {
          birth_date: string | null
          clinic_id: string
          created_at: string
          doctor_id: string
          document_number: string
          full_name: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          clinic_id: string
          created_at?: string
          doctor_id: string
          document_number: string
          full_name: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          clinic_id?: string
          created_at?: string
          doctor_id?: string
          document_number?: string
          full_name?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          clinic_id: string
          created_at: string
          doctor_id: string
          full_name: string
          id: string
          payment_config: Json
          plan: string
          specialty: string[]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_expires_at: string | null
          subscription_status: string | null
          terms_accepted_at: string | null
          terms_accepted_version: string | null
          ui_preferences: Json
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          doctor_id: string
          full_name: string
          id?: string
          payment_config?: Json
          plan?: string
          specialty?: string[]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_expires_at?: string | null
          subscription_status?: string | null
          terms_accepted_at?: string | null
          terms_accepted_version?: string | null
          ui_preferences?: Json
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          doctor_id?: string
          full_name?: string
          id?: string
          payment_config?: Json
          plan?: string
          specialty?: string[]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_expires_at?: string | null
          subscription_status?: string | null
          terms_accepted_at?: string | null
          terms_accepted_version?: string | null
          ui_preferences?: Json
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          clinic_id: string
          created_at: string
          doctor_id: string
          endpoint: string
          id: string
          p256dh: string
        }
        Insert: {
          auth: string
          clinic_id: string
          created_at?: string
          doctor_id: string
          endpoint: string
          id?: string
          p256dh: string
        }
        Update: {
          auth?: string
          clinic_id?: string
          created_at?: string
          doctor_id?: string
          endpoint?: string
          id?: string
          p256dh?: string
        }
        Relationships: []
      }
      specialty_data: {
        Row: {
          clinic_id: string
          clinical_record_id: string
          created_at: string
          data: Json
          doctor_id: string
          id: string
          specialty_kind: string
          updated_at: string
        }
        Insert: {
          clinic_id: string
          clinical_record_id: string
          created_at?: string
          data: Json
          doctor_id: string
          id?: string
          specialty_kind: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          clinical_record_id?: string
          created_at?: string
          data?: Json
          doctor_id?: string
          id?: string
          specialty_kind?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "specialty_data_clinical_record_id_fkey"
            columns: ["clinical_record_id"]
            isOneToOne: false
            referencedRelation: "clinical_records"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_webhook_events: {
        Row: {
          processed_at: string
          stripe_event_id: string
        }
        Insert: {
          processed_at?: string
          stripe_event_id: string
        }
        Update: {
          processed_at?: string
          stripe_event_id?: string
        }
        Relationships: []
      }
      treatment_templates: {
        Row: {
          clinic_id: string
          created_at: string
          current_version: number
          doctor_id: string
          extra_sections: Json
          id: string
          title: string
          treatment: string
          trigger: string
          updated_at: string
          versions: Json
        }
        Insert: {
          clinic_id: string
          created_at?: string
          current_version?: number
          doctor_id: string
          extra_sections?: Json
          id?: string
          title: string
          treatment: string
          trigger: string
          updated_at?: string
          versions?: Json
        }
        Update: {
          clinic_id?: string
          created_at?: string
          current_version?: number
          doctor_id?: string
          extra_sections?: Json
          id?: string
          title?: string
          treatment?: string
          trigger?: string
          updated_at?: string
          versions?: Json
        }
        Relationships: []
      }
    }
    Views: {
      mv_dashboard_kpis_daily: {
        Row: {
          clinic_id: string | null
          consultations_created: number | null
          doctor_id: string | null
          patients_created: number | null
          report_date: string | null
        }
        Relationships: []
      }
      v_dashboard_kpis_daily: {
        Row: {
          clinic_id: string | null
          consultations_created: number | null
          doctor_id: string | null
          patients_created: number | null
          report_date: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      claim_api_rate_limit: {
        Args: {
          p_identifier: string
          p_max_requests: number
          p_scope: string
          p_window_seconds: number
        }
        Returns: boolean
      }
      expire_stale_trials: { Args: never; Returns: undefined }
      get_user_id_by_email: { Args: { email_input: string }; Returns: string }
      has_active_subscription: { Args: { c_id: string }; Returns: boolean }
      is_clinic_admin: { Args: { check_clinic_id: string }; Returns: boolean }
      is_clinic_member: { Args: { check_clinic_id: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      log_audit_event: {
        Args: {
          p_changes: Json
          p_clinic_id: string
          p_doctor_id: string
          p_event_type: string
          p_metadata?: Json
          p_resource_id: string
          p_resource_type: string
        }
        Returns: number
      }
      notify_followup_due_today: {
        Args: {
          p_doctor_id: string
          p_due_count: number
          p_push_secret: string
          p_site_url: string
        }
        Returns: undefined
      }
      search_global: {
        Args: { p_query: string }
        Returns: {
          id: string
          kind: string
          patient_id: string
          rank: number
          subtitle: string
          title: string
          updated_at: string
        }[]
      }
      send_followup_emails: { Args: never; Returns: undefined }
      send_followup_push_notifications: { Args: never; Returns: undefined }
      send_trial_ending_emails: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
