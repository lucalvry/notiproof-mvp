export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      events: {
        Row: {
          id: string
          widget_id: string
          event_type: string
          event_data: Json
          views: number | null
          clicks: number | null
          created_at: string | null
          flagged: boolean
          ip: string | null
          user_agent: string | null
        }
        Insert: {
          id?: string
          widget_id: string
          event_type: string
          event_data: Json
          views?: number | null
          clicks?: number | null
          created_at?: string | null
          flagged?: boolean
          ip?: string | null
          user_agent?: string | null
        }
        Update: {
          id?: string
          widget_id?: string
          event_type?: string
          event_data?: Json
          views?: number | null
          clicks?: number | null
          created_at?: string | null
          flagged?: boolean
          ip?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_widget_id_fkey"
            columns: ["widget_id"]
            isOneToOne: false
            referencedRelation: "widgets"
            referencedColumns: ["id"]
          }
        ]
      }
      goals: {
        Row: {
          type: string
          name: string
          pattern: string
          id: string
          widget_id: string
          active: boolean
          created_at: string | null
        }
        Insert: {
          type: string
          name: string
          pattern: string
          id?: string
          widget_id: string
          active?: boolean
          created_at?: string | null
        }
        Update: {
          type?: string
          name?: string
          pattern?: string
          id?: string
          widget_id?: string
          active?: boolean
          created_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          name: string
          role: 'admin' | 'user'
          status: string
          created_at: string | null
        }
        Insert: {
          id: string
          name: string
          role?: 'admin' | 'user'
          status?: string
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          role?: 'admin' | 'user'
          status?: string
          created_at?: string | null
        }
        Relationships: []
      }
      widgets: {
        Row: {
          id: string
          user_id: string
          name: string
          template_name: string
          style_config: Json | null
          display_rules: Json
          integration: string
          status: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          template_name: string
          style_config?: Json | null
          display_rules?: Json
          integration?: string
          status?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          template_name?: string
          style_config?: Json | null
          display_rules?: Json
          integration?: string
          status?: string
          created_at?: string | null
          updated_at?: string | null
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
          _user_id: string
          _role: 'admin' | 'user'
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: 'admin' | 'user'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
        Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
    ? Database["public"]["Enums"][PublicEnumNameOrOptions]
    : never