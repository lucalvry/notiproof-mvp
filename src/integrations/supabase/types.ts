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
      analytics_insights: {
        Row: {
          action_items: string[] | null
          confidence_score: number | null
          created_at: string
          data_points: Json
          description: string
          expires_at: string | null
          id: string
          insight_type: string
          priority: string
          status: string
          title: string
          user_id: string
          widget_id: string | null
        }
        Insert: {
          action_items?: string[] | null
          confidence_score?: number | null
          created_at?: string
          data_points?: Json
          description: string
          expires_at?: string | null
          id?: string
          insight_type: string
          priority?: string
          status?: string
          title: string
          user_id: string
          widget_id?: string | null
        }
        Update: {
          action_items?: string[] | null
          confidence_score?: number | null
          created_at?: string
          data_points?: Json
          description?: string
          expires_at?: string | null
          id?: string
          insight_type?: string
          priority?: string
          status?: string
          title?: string
          user_id?: string
          widget_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_insights_widget_id_fkey"
            columns: ["widget_id"]
            isOneToOne: false
            referencedRelation: "widgets"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          auto_repeat: boolean
          created_at: string
          description: string | null
          display_rules: Json
          end_date: string | null
          id: string
          name: string
          organization_id: string | null
          repeat_config: Json | null
          start_date: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_repeat?: boolean
          created_at?: string
          description?: string | null
          display_rules?: Json
          end_date?: string | null
          id?: string
          name: string
          organization_id?: string | null
          repeat_config?: Json | null
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_repeat?: boolean
          created_at?: string
          description?: string | null
          display_rules?: Json
          end_date?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          repeat_config?: Json | null
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
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
          variant_id: string | null
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
          variant_id?: string | null
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
          variant_id?: string | null
          views?: number | null
          widget_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "widget_variants"
            referencedColumns: ["id"]
          },
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
      heatmap_clicks: {
        Row: {
          click_x: number
          click_y: number
          created_at: string
          element_selector: string | null
          element_text: string | null
          event_id: string | null
          id: string
          page_url: string
          session_id: string | null
          viewport_height: number | null
          viewport_width: number | null
          widget_id: string
        }
        Insert: {
          click_x: number
          click_y: number
          created_at?: string
          element_selector?: string | null
          element_text?: string | null
          event_id?: string | null
          id?: string
          page_url: string
          session_id?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
          widget_id: string
        }
        Update: {
          click_x?: number
          click_y?: number
          created_at?: string
          element_selector?: string | null
          element_text?: string | null
          event_id?: string | null
          id?: string
          page_url?: string
          session_id?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
          widget_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "heatmap_clicks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "heatmap_clicks_widget_id_fkey"
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
      marketplace_templates: {
        Row: {
          category: string
          created_at: string
          created_by: string
          description: string | null
          display_rules: Json
          download_count: number
          id: string
          is_featured: boolean
          is_public: boolean
          name: string
          preview_image: string | null
          price_cents: number | null
          rating_average: number | null
          rating_count: number
          style_config: Json
          tags: string[] | null
          template_config: Json
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by: string
          description?: string | null
          display_rules?: Json
          download_count?: number
          id?: string
          is_featured?: boolean
          is_public?: boolean
          name: string
          preview_image?: string | null
          price_cents?: number | null
          rating_average?: number | null
          rating_count?: number
          style_config?: Json
          tags?: string[] | null
          template_config?: Json
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          description?: string | null
          display_rules?: Json
          download_count?: number
          id?: string
          is_featured?: boolean
          is_public?: boolean
          name?: string
          preview_image?: string | null
          price_cents?: number | null
          rating_average?: number | null
          rating_count?: number
          style_config?: Json
          tags?: string[] | null
          template_config?: Json
          updated_at?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
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
      social_connectors: {
        Row: {
          config: Json
          created_at: string
          id: string
          last_sync: string | null
          name: string
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          last_sync?: string | null
          name: string
          status?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          last_sync?: string | null
          name?: string
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      social_items: {
        Row: {
          author_avatar: string | null
          author_name: string | null
          connector_id: string
          content: string
          created_at: string
          external_id: string
          id: string
          moderated_at: string | null
          moderated_by: string | null
          moderation_status: string
          posted_at: string | null
          rating: number | null
          source_url: string | null
          type: string
        }
        Insert: {
          author_avatar?: string | null
          author_name?: string | null
          connector_id: string
          content: string
          created_at?: string
          external_id: string
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_status?: string
          posted_at?: string | null
          rating?: number | null
          source_url?: string | null
          type: string
        }
        Update: {
          author_avatar?: string | null
          author_name?: string | null
          connector_id?: string
          content?: string
          created_at?: string
          external_id?: string
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_status?: string
          posted_at?: string | null
          rating?: number | null
          source_url?: string | null
          type?: string
        }
        Relationships: []
      }
      team_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          role: Database["public"]["Enums"]["team_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          organization_id: string
          role?: Database["public"]["Enums"]["team_role"]
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["team_role"]
          token?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          invited_at: string | null
          invited_by: string | null
          joined_at: string | null
          organization_id: string
          role: Database["public"]["Enums"]["team_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["team_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["team_role"]
          user_id?: string
        }
        Relationships: []
      }
      template_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      template_downloads: {
        Row: {
          downloaded_at: string
          id: string
          template_id: string
          user_id: string
        }
        Insert: {
          downloaded_at?: string
          id?: string
          template_id: string
          user_id: string
        }
        Update: {
          downloaded_at?: string
          id?: string
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_downloads_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "marketplace_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_ratings: {
        Row: {
          created_at: string
          id: string
          rating: number
          review: string | null
          template_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rating: number
          review?: string | null
          template_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rating?: number
          review?: string | null
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_ratings_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "marketplace_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_tags: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      tracking_pixels: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_active: boolean
          pixel_id: string
          platform: string
          updated_at: string
          user_id: string
          widget_id: string | null
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          pixel_id: string
          platform: string
          updated_at?: string
          user_id: string
          widget_id?: string | null
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          pixel_id?: string
          platform?: string
          updated_at?: string
          user_id?: string
          widget_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tracking_pixels_widget_id_fkey"
            columns: ["widget_id"]
            isOneToOne: false
            referencedRelation: "widgets"
            referencedColumns: ["id"]
          },
        ]
      }
      visitor_sessions: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          is_active: boolean
          last_seen_at: string
          page_url: string
          session_id: string
          started_at: string
          user_agent: string | null
          widget_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean
          last_seen_at?: string
          page_url: string
          session_id: string
          started_at?: string
          user_agent?: string | null
          widget_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean
          last_seen_at?: string
          page_url?: string
          session_id?: string
          started_at?: string
          user_agent?: string | null
          widget_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visitor_sessions_widget_id_fkey"
            columns: ["widget_id"]
            isOneToOne: false
            referencedRelation: "widgets"
            referencedColumns: ["id"]
          },
        ]
      }
      widget_template_tags: {
        Row: {
          tag_id: string
          template_id: string
        }
        Insert: {
          tag_id: string
          template_id: string
        }
        Update: {
          tag_id?: string
          template_id?: string
        }
        Relationships: []
      }
      widget_templates: {
        Row: {
          category_id: string | null
          created_at: string
          created_by: string
          description: string | null
          display_rules: Json
          downloads_count: number
          id: string
          is_featured: boolean
          is_public: boolean
          name: string
          preview_image: string | null
          style_config: Json
          template_name: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          display_rules?: Json
          downloads_count?: number
          id?: string
          is_featured?: boolean
          is_public?: boolean
          name: string
          preview_image?: string | null
          style_config?: Json
          template_name: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          display_rules?: Json
          downloads_count?: number
          id?: string
          is_featured?: boolean
          is_public?: boolean
          name?: string
          preview_image?: string | null
          style_config?: Json
          template_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      widget_variants: {
        Row: {
          active: boolean
          content_config: Json | null
          created_at: string
          id: string
          is_control: boolean
          name: string
          split_percentage: number
          style_config: Json | null
          updated_at: string
          widget_id: string
        }
        Insert: {
          active?: boolean
          content_config?: Json | null
          created_at?: string
          id?: string
          is_control?: boolean
          name: string
          split_percentage?: number
          style_config?: Json | null
          updated_at?: string
          widget_id: string
        }
        Update: {
          active?: boolean
          content_config?: Json | null
          created_at?: string
          id?: string
          is_control?: boolean
          name?: string
          split_percentage?: number
          style_config?: Json | null
          updated_at?: string
          widget_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "widget_variants_widget_id_fkey"
            columns: ["widget_id"]
            isOneToOne: false
            referencedRelation: "widgets"
            referencedColumns: ["id"]
          },
        ]
      }
      widgets: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          display_rules: Json
          id: string
          integration: string
          name: string
          organization_id: string | null
          status: string
          style_config: Json | null
          template_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          display_rules?: Json
          id?: string
          integration?: string
          name: string
          organization_id?: string | null
          status?: string
          style_config?: Json | null
          template_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          display_rules?: Json
          id?: string
          integration?: string
          name?: string
          organization_id?: string | null
          status?: string
          style_config?: Json | null
          template_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "widgets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
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
      get_integration_count: {
        Args: { _user_id: string; _types?: string[] }
        Returns: number
      }
      get_user_team_memberships: {
        Args: { _user_id: string }
        Returns: {
          organization_id: string
          role: Database["public"]["Enums"]["team_role"]
        }[]
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      update_user_role: {
        Args: {
          _user_id: string
          _new_role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      user_has_org_role: {
        Args: {
          _user_id: string
          _org_id: string
          _roles: Database["public"]["Enums"]["team_role"][]
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "support"
      team_role: "owner" | "admin" | "member" | "viewer"
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
      team_role: ["owner", "admin", "member", "viewer"],
    },
  },
} as const
