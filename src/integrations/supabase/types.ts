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
      course_deployments: {
        Row: {
          created_at: string
          deployment_status: string
          deployment_url: string | null
          id: string
          project_id: string
          published_at: string | null
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          deployment_status?: string
          deployment_url?: string | null
          id?: string
          project_id: string
          published_at?: string | null
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          created_at?: string
          deployment_status?: string
          deployment_url?: string | null
          id?: string
          project_id?: string
          published_at?: string | null
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_deployments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      course_feedbacks: {
        Row: {
          comment: string | null
          created_at: string
          deployment_id: string | null
          feedback_type: string
          id: string
          project_id: string
          rating: number | null
          user_email: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          deployment_id?: string | null
          feedback_type?: string
          id?: string
          project_id: string
          rating?: number | null
          user_email?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          deployment_id?: string | null
          feedback_type?: string
          id?: string
          project_id?: string
          rating?: number | null
          user_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_feedbacks_deployment_id_fkey"
            columns: ["deployment_id"]
            isOneToOne: false
            referencedRelation: "course_deployments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_feedbacks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_ai_results: {
        Row: {
          ai_model: string
          created_at: string
          generated_content: string | null
          id: string
          project_id: string
          status: string
          updated_at: string
        }
        Insert: {
          ai_model: string
          created_at?: string
          generated_content?: string | null
          id?: string
          project_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          ai_model?: string
          created_at?: string
          generated_content?: string | null
          id?: string
          project_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_stages: {
        Row: {
          ai_model: string
          content: string | null
          created_at: string
          feedback: string | null
          id: string
          project_id: string
          stage_name: string
          stage_order: number
          status: string
          updated_at: string
        }
        Insert: {
          ai_model?: string
          content?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          project_id: string
          stage_name: string
          stage_order: number
          status?: string
          updated_at?: string
        }
        Update: {
          ai_model?: string
          content?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          project_id?: string
          stage_name?: string
          stage_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_stages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_templates: {
        Row: {
          ai_model: string
          created_at: string
          description: string | null
          education_course: string | null
          education_duration: string | null
          education_session: number | null
          id: string
          template_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_model?: string
          created_at?: string
          description?: string | null
          education_course?: string | null
          education_duration?: string | null
          education_session?: number | null
          id?: string
          template_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_model?: string
          created_at?: string
          description?: string | null
          education_course?: string | null
          education_duration?: string | null
          education_session?: number | null
          id?: string
          template_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          ai_model: string
          created_at: string
          description: string | null
          document_content: string | null
          document_url: string | null
          education_course: string | null
          education_duration: string | null
          education_session: number | null
          generated_content: string | null
          id: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_model?: string
          created_at?: string
          description?: string | null
          document_content?: string | null
          document_url?: string | null
          education_course?: string | null
          education_duration?: string | null
          education_session?: number | null
          generated_content?: string | null
          id?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_model?: string
          created_at?: string
          description?: string | null
          document_content?: string | null
          document_url?: string | null
          education_course?: string | null
          education_duration?: string | null
          education_session?: number | null
          generated_content?: string | null
          id?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
