export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          context: Json | null
          created_at: string
          id: string
          message: string | null
          type: string
          user_id: string | null
          widget_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string
          id?: string
          message?: string | null
          type: string
          user_id?: string | null
          widget_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string
          id?: string
          message?: string | null
          type?: string
          user_id?: string | null
          widget_id?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          clicks: number | null
          created_at: string | null
          event_data: Json
          event_type: string
          flagged: boolean
          id: string
          ip: string | null
          user_agent: string | null
          views: number | null
          widget_id: string
        }
        Insert: {
          clicks?: number | null
          created_at?: string | null
          event_data: Json
          event_type: string
          flagged?: boolean
          id?: string
          ip?: string | null
          user_agent?: string | null
          views?: number | null
          widget_id: string
        }
        Update: {
          clicks?: number | null
          created_at?: string | null
          event_data?: Json
          event_type?: string
          flagged?: boolean
          id?: string
          ip?: string | null
          user_agent?: string | null
          views?: number | null
          widget_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_widget_id_fkey"
            columns: ["widget_id"]
            isOneToOne: false
            referencedRelation: "widgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_events_widget"
            columns: ["widget_id"]
            isOneToOne: false
            referencedRelation: "widgets"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          pattern: string
          type: string
          widget_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          pattern: string
          type: string
          widget_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          pattern?: string
          type?: string
          widget_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_widget_id_fkey"
            columns: ["widget_id"]
            isOneToOne: false
            referencedRelation: "widgets"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_hooks: {
        Row: {
          created_at: string
          id: string
          type: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          type: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          id: string
          name: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
        }
        Insert: {
          created_at?: string | null
          id: string
          name: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
        }
        Relationships: []
      }
      widgets: {
        Row: {
          created_at: string | null
          display_rules: Json
          id: string
          integration: string
          name: string
          status: string
          style_config: Json | null
          template_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          display_rules?: Json
          id?: string
          integration?: string
          name: string
          status?: string
          style_config?: Json | null
          template_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          display_rules?: Json
          id?: string
          integration?: string
          name?: string
          status?: string
          style_config?: Json | null
          template_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "widgets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "support"
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
      app_role: ["admin", "user", "support"],
    },
  },
} as const
