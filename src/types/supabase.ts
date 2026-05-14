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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action_description: string
          action_type: string
          coa_action: string | null
          created_at: string | null
          id: string
          organization: string
          performed_by: string
          submission_id: string | null
        }
        Insert: {
          action_description: string
          action_type: string
          coa_action?: string | null
          created_at?: string | null
          id?: string
          organization: string
          performed_by: string
          submission_id?: string | null
        }
        Update: {
          action_description?: string
          action_type?: string
          coa_action?: string | null
          created_at?: string | null
          id?: string
          organization?: string
          performed_by?: string
          submission_id?: string | null
        }
        Relationships: []
      }
      advisers: {
        Row: {
          created_at: string | null
          id: string
          name: string
          position: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          position: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          position?: string
        }
        Relationships: []
      }
      annotations: {
        Row: {
          created_at: string | null
          data: Json
          file_url: string
          id: string
          submission_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json
          file_url: string
          id?: string
          submission_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json
          file_url?: string
          id?: string
          submission_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      coa_audit_schedule: {
        Row: {
          audit_type: string
          created_at: string | null
          description: string | null
          id: string
          month: number
          month_name: string
          semester: string
        }
        Insert: {
          audit_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          month: number
          month_name: string
          semester: string
        }
        Update: {
          audit_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          month?: number
          month_name?: string
          semester?: string
        }
        Relationships: []
      }
      coa_review_copies: {
        Row: {
          audit_type: string
          copied_at: string | null
          file_name: string
          file_url: string
          id: string
          organization: string
          original_submission_date: string | null
          semester: string
          storage_path: string
          submission_id: string
          year: number
        }
        Insert: {
          audit_type: string
          copied_at?: string | null
          file_name: string
          file_url: string
          id?: string
          organization: string
          original_submission_date?: string | null
          semester: string
          storage_path: string
          submission_id: string
          year: number
        }
        Update: {
          audit_type?: string
          copied_at?: string | null
          file_name?: string
          file_url?: string
          id?: string
          organization?: string
          original_submission_date?: string | null
          semester?: string
          storage_path?: string
          submission_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "coa_review_copies_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          start_date: string
          title: string
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          start_date: string
          title: string
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          start_date?: string
          title?: string
        }
        Relationships: []
      }
      form_templates: {
        Row: {
          file_name: string
          file_url: string
          id: string
          organization: string
          template_type: string
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          file_name: string
          file_url: string
          id?: string
          organization: string
          template_type: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          file_name?: string
          file_url?: string
          id?: string
          organization?: string
          template_type?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: []
      }
      notification_read_status: {
        Row: {
          id: string
          notification_id: string
          read_at: string | null
          read_by: string
        }
        Insert: {
          id?: string
          notification_id: string
          read_at?: string | null
          read_by: string
        }
        Update: {
          id?: string
          notification_id?: string
          read_at?: string | null
          read_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_read_status_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          created_by: string
          event_description: string | null
          event_id: string
          event_title: string
          id: string
          is_read: boolean | null
          target_org: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          event_description?: string | null
          event_id: string
          event_title: string
          id?: string
          is_read?: boolean | null
          target_org?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          event_description?: string | null
          event_id?: string
          event_title?: string
          id?: string
          is_read?: boolean | null
          target_org?: string | null
        }
        Relationships: []
      }
      officers: {
        Row: {
          created_at: string | null
          id: string
          name: string
          position: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          position: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          position?: string
        }
        Relationships: []
      }
      org_accounts: {
        Row: {
          created_at: string | null
          email: string
          id: string
          organization: string
          organization_name: string | null
          password: string
          role: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          organization: string
          organization_name?: string | null
          password: string
          role?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          organization?: string
          organization_name?: string | null
          password?: string
          role?: string | null
          status?: string
        }
        Relationships: []
      }
      org_documents: {
        Row: {
          document_type: string
          file_name: string
          file_url: string
          id: string
          organization: string
          updated_at: string | null
          uploaded_at: string | null
        }
        Insert: {
          document_type: string
          file_name: string
          file_url: string
          id?: string
          organization: string
          updated_at?: string | null
          uploaded_at?: string | null
        }
        Update: {
          document_type?: string
          file_name?: string
          file_url?: string
          id?: string
          organization?: string
          updated_at?: string | null
          uploaded_at?: string | null
        }
        Relationships: []
      }
      org_officers: {
        Row: {
          created_at: string | null
          id: string
          image: string | null
          name: string
          organization: string
          position: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image?: string | null
          name: string
          organization: string
          position: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image?: string | null
          name?: string
          organization?: string
          position?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      org_social_contacts: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          facebook_url: string | null
          id: string
          organization: string
          updated_at: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          facebook_url?: string | null
          id?: string
          organization: string
          updated_at?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          facebook_url?: string | null
          id?: string
          organization?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      organization_profile: {
        Row: {
          accreditation_status: string
          facebook_url: string | null
          id: string
          other_platform_url: string | null
          updated_at: string | null
        }
        Insert: {
          accreditation_status?: string
          facebook_url?: string | null
          id?: string
          other_platform_url?: string | null
          updated_at?: string | null
        }
        Update: {
          accreditation_status?: string
          facebook_url?: string | null
          id?: string
          other_platform_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      osld_events: {
        Row: {
          accomplishment_deadline: string | null
          accomplishment_deadline_override: string | null
          all_day: boolean | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string
          end_time: string | null
          id: string
          liquidation_deadline: string | null
          liquidation_deadline_override: string | null
          recurrence_day: string | null
          recurrence_rule: string | null
          require_accomplishment: boolean | null
          require_liquidation: boolean | null
          start_date: string
          start_time: string | null
          target_organization: string | null
          title: string
          venue: string | null
        }
        Insert: {
          accomplishment_deadline?: string | null
          accomplishment_deadline_override?: string | null
          all_day?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date: string
          end_time?: string | null
          id: string
          liquidation_deadline?: string | null
          liquidation_deadline_override?: string | null
          recurrence_day?: string | null
          recurrence_rule?: string | null
          require_accomplishment?: boolean | null
          require_liquidation?: boolean | null
          start_date: string
          start_time?: string | null
          target_organization?: string | null
          title: string
          venue?: string | null
        }
        Update: {
          accomplishment_deadline?: string | null
          accomplishment_deadline_override?: string | null
          all_day?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string
          end_time?: string | null
          id?: string
          liquidation_deadline?: string | null
          liquidation_deadline_override?: string | null
          recurrence_day?: string | null
          recurrence_rule?: string | null
          require_accomplishment?: boolean | null
          require_liquidation?: boolean | null
          start_date?: string
          start_time?: string | null
          target_organization?: string | null
          title?: string
          venue?: string | null
        }
        Relationships: []
      }
      osld_profile: {
        Row: {
          accreditation_status: string | null
          advisers: Json | null
          contact_email: string | null
          contact_phone: string | null
          id: string
          officers: Json | null
          platforms: Json | null
          updated_at: string | null
        }
        Insert: {
          accreditation_status?: string | null
          advisers?: Json | null
          contact_email?: string | null
          contact_phone?: string | null
          id?: string
          officers?: Json | null
          platforms?: Json | null
          updated_at?: string | null
        }
        Update: {
          accreditation_status?: string | null
          advisers?: Json | null
          contact_email?: string | null
          contact_phone?: string | null
          id?: string
          officers?: Json | null
          platforms?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      submissions: {
        Row: {
          activity_budget: string
          activity_duration: string
          activity_funds: string
          activity_likha: string
          activity_participants: string
          activity_sdg: string
          activity_title: string
          activity_venue: string
          approved_by: string | null
          audit_type: string | null
          coa_comment: string | null
          coa_opinion: string | null
          coa_reviewed: boolean | null
          coa_reviewed_at: string | null
          endorsed_to_coa: boolean | null
          endorsed_to_osld: boolean | null
          event_id: string | null
          file_name: string | null
          file_revision_status: Json | null
          file_url: string | null
          file_urls: string | null
          gdrive_link: string | null
          id: string
          organization: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          revision_count: number | null
          revision_reason: string | null
          semester: string | null
          status: string | null
          submission_type: string
          submitted_at: string | null
          submitted_to: string | null
        }
        Insert: {
          activity_budget: string
          activity_duration: string
          activity_funds: string
          activity_likha: string
          activity_participants: string
          activity_sdg: string
          activity_title: string
          activity_venue: string
          approved_by?: string | null
          audit_type?: string | null
          coa_comment?: string | null
          coa_opinion?: string | null
          coa_reviewed?: boolean | null
          coa_reviewed_at?: string | null
          endorsed_to_coa?: boolean | null
          endorsed_to_osld?: boolean | null
          event_id?: string | null
          file_name?: string | null
          file_revision_status?: Json | null
          file_url?: string | null
          file_urls?: string | null
          gdrive_link?: string | null
          id?: string
          organization: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_count?: number | null
          revision_reason?: string | null
          semester?: string | null
          status?: string | null
          submission_type: string
          submitted_at?: string | null
          submitted_to?: string | null
        }
        Update: {
          activity_budget?: string
          activity_duration?: string
          activity_funds?: string
          activity_likha?: string
          activity_participants?: string
          activity_sdg?: string
          activity_title?: string
          activity_venue?: string
          approved_by?: string | null
          audit_type?: string | null
          coa_comment?: string | null
          coa_opinion?: string | null
          coa_reviewed?: boolean | null
          coa_reviewed_at?: string | null
          endorsed_to_coa?: boolean | null
          endorsed_to_osld?: boolean | null
          event_id?: string | null
          file_name?: string | null
          file_revision_status?: Json | null
          file_url?: string | null
          file_urls?: string | null
          gdrive_link?: string | null
          id?: string
          organization?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_count?: number | null
          revision_reason?: string | null
          semester?: string | null
          status?: string | null
          submission_type?: string
          submitted_at?: string | null
          submitted_to?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_working_days: {
        Args: { num_days: number; start_date: string }
        Returns: string
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
