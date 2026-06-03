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
          encrypted: boolean
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          encrypted?: boolean
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          encrypted?: boolean
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
            foreignKeyName: "appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
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
        Relationships: [
          {
            foreignKeyName: "audit_logs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_shifts: {
        Row: {
          clinic_id: string
          closed_at: string | null
          created_at: string
          final_amount: number | null
          id: string
          initial_amount: number
          opened_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          clinic_id: string
          closed_at?: string | null
          created_at?: string
          final_amount?: number | null
          id?: string
          initial_amount?: number
          opened_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          clinic_id?: string
          closed_at?: string | null
          created_at?: string
          final_amount?: number | null
          id?: string
          initial_amount?: number
          opened_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_shifts_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_transactions: {
        Row: {
          amount: number
          clinic_id: string
          concept: string
          created_at: string
          id: string
          patient_id: string | null
          payment_method: string
          reference_code: string | null
          shift_id: string | null
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          clinic_id: string
          concept: string
          created_at?: string
          id?: string
          patient_id?: string | null
          payment_method?: string
          reference_code?: string | null
          shift_id?: string | null
          status?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          clinic_id?: string
          concept?: string
          created_at?: string
          id?: string
          patient_id?: string | null
          payment_method?: string
          reference_code?: string | null
          shift_id?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_transactions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "cash_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_members: {
        Row: {
          clinic_id: string
          created_at: string
          custom_permissions: Json
          doctor_id: string
          id: string
          invited_by: string | null
          invited_by_member_id: string | null
          is_active: boolean
          joined_at: string
          role: string
          terms_accepted_at: string | null
          terms_version: string | null
        }
        Insert: {
          clinic_id: string
          created_at?: string
          custom_permissions?: Json
          doctor_id: string
          id?: string
          invited_by?: string | null
          invited_by_member_id?: string | null
          is_active?: boolean
          joined_at?: string
          role: string
          terms_accepted_at?: string | null
          terms_version?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string
          custom_permissions?: Json
          doctor_id?: string
          id?: string
          invited_by?: string | null
          invited_by_member_id?: string | null
          is_active?: boolean
          joined_at?: string
          role?: string
          terms_accepted_at?: string | null
          terms_version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_members_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_members_invited_by_member_id_fkey"
            columns: ["invited_by_member_id"]
            isOneToOne: false
            referencedRelation: "clinic_members"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_settings: {
        Row: {
          clinic_id: string
          lab_footer_text: string | null
          lab_letterhead_url: string | null
          updated_at: string
        }
        Insert: {
          clinic_id: string
          lab_footer_text?: string | null
          lab_letterhead_url?: string | null
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          lab_footer_text?: string | null
          lab_letterhead_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_settings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_form_templates: {
        Row: {
          clinic_id: string
          created_at: string
          description: string | null
          doctor_id: string | null
          id: string
          is_active: boolean
          name: string
          schema: Json
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          description?: string | null
          doctor_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          schema?: Json
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          description?: string | null
          doctor_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          schema?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_form_templates_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_records: {
        Row: {
          chief_complaint: string
          cie_codes: string[]
          clinic_id: string
          created_at: string
          deleted_at: string | null
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
          deleted_at?: string | null
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
          deleted_at?: string | null
          doctor_id?: string
          id?: string
          patient_id?: string
          specialty_data?: Json
          specialty_kind?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_records_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_user_id: string | null
          plan_type: string
          subscription_status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          owner_user_id?: string | null
          plan_type?: string
          subscription_status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_user_id?: string | null
          plan_type?: string
          subscription_status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      department_orders: {
        Row: {
          completed_at: string | null
          completed_by_member_id: string | null
          created_at: string
          department_type: string
          id: string
          notes: string | null
          ordered_by_member_id: string
          organization_id: string
          patient_id: string
          referral_id: string | null
          result_notes: string | null
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          completed_by_member_id?: string | null
          created_at?: string
          department_type: string
          id?: string
          notes?: string | null
          ordered_by_member_id: string
          organization_id: string
          patient_id: string
          referral_id?: string | null
          result_notes?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          completed_by_member_id?: string | null
          created_at?: string
          department_type?: string
          id?: string
          notes?: string | null
          ordered_by_member_id?: string
          organization_id?: string
          patient_id?: string
          referral_id?: string | null
          result_notes?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_orders_completed_by_member_id_fkey"
            columns: ["completed_by_member_id"]
            isOneToOne: false
            referencedRelation: "clinic_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_orders_ordered_by_member_id_fkey"
            columns: ["ordered_by_member_id"]
            isOneToOne: false
            referencedRelation: "clinic_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_orders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_orders_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_settings: {
        Row: {
          created_at: string
          id: string
          member_id: string
          organization_id: string
          receptionist_enabled: boolean
          updated_at: string
          vacation_mode: boolean
          vacation_redirect_member_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          organization_id: string
          receptionist_enabled?: boolean
          updated_at?: string
          vacation_mode?: boolean
          vacation_redirect_member_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          organization_id?: string
          receptionist_enabled?: boolean
          updated_at?: string
          vacation_mode?: boolean
          vacation_redirect_member_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctor_settings_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "clinic_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_settings_vacation_redirect_member_id_fkey"
            columns: ["vacation_redirect_member_id"]
            isOneToOne: false
            referencedRelation: "clinic_members"
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
            foreignKeyName: "follow_up_tasks_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
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
      invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by_member_id: string | null
          joined_at: string | null
          organization_id: string
          role: string
          status: string
          token: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by_member_id?: string | null
          joined_at?: string | null
          organization_id: string
          role: string
          status?: string
          token: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by_member_id?: string | null
          joined_at?: string | null
          organization_id?: string
          role?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_invited_by_member_id_fkey"
            columns: ["invited_by_member_id"]
            isOneToOne: false
            referencedRelation: "clinic_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_exams: {
        Row: {
          category: string
          clinic_id: string
          created_at: string
          default_price: number
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          category?: string
          clinic_id: string
          created_at?: string
          default_price?: number
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          category?: string
          clinic_id?: string
          created_at?: string
          default_price?: number
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_exams_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_orders: {
        Row: {
          clinic_id: string
          clinical_record_id: string | null
          completed_at: string | null
          created_at: string
          doctor_id: string
          id: string
          items: Json
          order_type: string
          patient_id: string
          reason: string
          results: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          clinic_id: string
          clinical_record_id?: string | null
          completed_at?: string | null
          created_at?: string
          doctor_id: string
          id?: string
          items?: Json
          order_type: string
          patient_id: string
          reason?: string
          results?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          clinical_record_id?: string | null
          completed_at?: string | null
          created_at?: string
          doctor_id?: string
          id?: string
          items?: Json
          order_type?: string
          patient_id?: string
          reason?: string
          results?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_orders_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_orders_clinical_record_id_fkey"
            columns: ["clinical_record_id"]
            isOneToOne: false
            referencedRelation: "clinical_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_orders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_referrals: {
        Row: {
          clinic_id: string
          clinical_record_id: string | null
          created_at: string
          external_doctor_contact: string | null
          external_doctor_name: string | null
          id: string
          include_report: boolean
          notes: string | null
          patient_id: string
          reason: string
          referred_doctor_id: string | null
          referring_doctor_id: string
          status: string
          updated_at: string
        }
        Insert: {
          clinic_id: string
          clinical_record_id?: string | null
          created_at?: string
          external_doctor_contact?: string | null
          external_doctor_name?: string | null
          id?: string
          include_report?: boolean
          notes?: string | null
          patient_id: string
          reason: string
          referred_doctor_id?: string | null
          referring_doctor_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          clinical_record_id?: string | null
          created_at?: string
          external_doctor_contact?: string | null
          external_doctor_name?: string | null
          id?: string
          include_report?: boolean
          notes?: string | null
          patient_id?: string
          reason?: string
          referred_doctor_id?: string | null
          referring_doctor_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_referrals_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_referrals_clinical_record_id_fkey"
            columns: ["clinical_record_id"]
            isOneToOne: false
            referencedRelation: "clinical_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_referrals_patient_id_fkey"
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
          deleted_at: string | null
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
          deleted_at?: string | null
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
          deleted_at?: string | null
          doctor_id?: string
          document_number?: string
          full_name?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          clinic_id: string
          created_at: string
          doctor_id: string
          full_name: string
          id: string
          is_platform_admin: boolean
          onboarding_state: Json
          payment_config: Json
          plan: string
          specialty: string[]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_expires_at: string | null
          subscription_status: string | null
          terms_accepted_at: string | null
          terms_accepted_version: string | null
          terms_version: string | null
          ui_preferences: Json
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          doctor_id: string
          full_name: string
          id?: string
          is_platform_admin?: boolean
          onboarding_state?: Json
          payment_config?: Json
          plan?: string
          specialty?: string[]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_expires_at?: string | null
          subscription_status?: string | null
          terms_accepted_at?: string | null
          terms_accepted_version?: string | null
          terms_version?: string | null
          ui_preferences?: Json
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          doctor_id?: string
          full_name?: string
          id?: string
          is_platform_admin?: boolean
          onboarding_state?: Json
          payment_config?: Json
          plan?: string
          specialty?: string[]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_expires_at?: string | null
          subscription_status?: string | null
          terms_accepted_at?: string | null
          terms_accepted_version?: string | null
          terms_version?: string | null
          ui_preferences?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          consultation_id: string | null
          created_at: string
          from_member_id: string
          id: string
          include_full_history: boolean
          note: string | null
          organization_id: string
          patient_id: string
          responded_at: string | null
          response_note: string | null
          status: string
          to_department: string | null
          to_member_id: string | null
        }
        Insert: {
          consultation_id?: string | null
          created_at?: string
          from_member_id: string
          id?: string
          include_full_history?: boolean
          note?: string | null
          organization_id: string
          patient_id: string
          responded_at?: string | null
          response_note?: string | null
          status?: string
          to_department?: string | null
          to_member_id?: string | null
        }
        Update: {
          consultation_id?: string | null
          created_at?: string
          from_member_id?: string
          id?: string
          include_full_history?: boolean
          note?: string | null
          organization_id?: string
          patient_id?: string
          responded_at?: string | null
          response_note?: string | null
          status?: string
          to_department?: string | null
          to_member_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "clinical_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_from_member_id_fkey"
            columns: ["from_member_id"]
            isOneToOne: false
            referencedRelation: "clinic_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_to_member_id_fkey"
            columns: ["to_member_id"]
            isOneToOne: false
            referencedRelation: "clinic_members"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "specialty_data_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
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
        Relationships: [
          {
            foreignKeyName: "treatment_templates_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "audit_logs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      v_dashboard_kpis_daily: {
        Row: {
          clinic_id: string | null
          consultations_created: number | null
          doctor_id: string | null
          patients_created: number | null
          report_date: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      anonymize_patient: { Args: { p_patient_id: string }; Returns: Json }
      claim_api_rate_limit: {
        Args: {
          p_identifier: string
          p_max_requests: number
          p_scope: string
          p_window_seconds: number
        }
        Returns: boolean
      }
      claim_followup_tasks: { Args: { p_doctor_id: string }; Returns: number }
      expire_old_invitations: { Args: never; Returns: undefined }
      expire_stale_trials: { Args: never; Returns: undefined }
      get_config_secret: { Args: { p_key: string }; Returns: string }
      get_member_role: { Args: { check_clinic_id: string }; Returns: string }
      get_user_clinic_ids: { Args: never; Returns: string[] }
      get_user_id_by_email: { Args: { email_input: string }; Returns: string }
      has_active_subscription: { Args: { c_id: string }; Returns: boolean }
      is_clinic_admin: { Args: { check_clinic_id: string }; Returns: boolean }
      is_clinic_member: { Args: { check_clinic_id: string }; Returns: boolean }
      is_org_owner: { Args: { check_clinic_id: string }; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      log_audit_event:
        | {
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
        | {
            Args: {
              p_changes: Json
              p_client_timestamp?: number
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
      notify_upcoming_appointments: { Args: never; Returns: undefined }
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
      send_daily_reports: { Args: never; Returns: undefined }
      send_followup_emails: { Args: never; Returns: undefined }
      send_followup_push_notifications: { Args: never; Returns: undefined }
      send_trial_ending_emails: { Args: never; Returns: undefined }
      set_config_secret: {
        Args: { p_key: string; p_value: string }
        Returns: undefined
      }
      validate_invitation_token: {
        Args: { p_token: string }
        Returns: {
          email: string
          expires_at: string
          id: string
          organization_id: string
          organization_name: string
          role: string
          status: string
        }[]
      }
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
