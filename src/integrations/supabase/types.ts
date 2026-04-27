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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      business_domains: {
        Row: {
          business_id: string
          created_at: string
          domain: string
          id: string
          is_primary: boolean
          is_verified: boolean
          verified_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          domain: string
          id?: string
          is_primary?: boolean
          is_verified?: boolean
          verified_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          domain?: string
          id?: string
          is_primary?: boolean
          is_verified?: boolean
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_domains_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_users: {
        Row: {
          business_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_users_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          brand_color: string | null
          created_at: string
          id: string
          industry: string | null
          install_verified: boolean
          logo_url: string | null
          name: string
          plan: Database["public"]["Enums"]["business_plan"]
          time_zone: string | null
          updated_at: string
        }
        Insert: {
          brand_color?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          install_verified?: boolean
          logo_url?: string | null
          name: string
          plan?: Database["public"]["Enums"]["business_plan"]
          time_zone?: string | null
          updated_at?: string
        }
        Update: {
          brand_color?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          install_verified?: boolean
          logo_url?: string | null
          name?: string
          plan?: Database["public"]["Enums"]["business_plan"]
          time_zone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      integration_events: {
        Row: {
          attempts: number
          business_id: string | null
          created_at: string
          error_message: string | null
          event_type: string
          external_event_id: string | null
          id: string
          integration_id: string
          payload: Json
          processed: boolean
          processed_at: string | null
          proof_object_id: string | null
          received_at: string
          status: string
        }
        Insert: {
          attempts?: number
          business_id?: string | null
          created_at?: string
          error_message?: string | null
          event_type: string
          external_event_id?: string | null
          id?: string
          integration_id: string
          payload?: Json
          processed?: boolean
          processed_at?: string | null
          proof_object_id?: string | null
          received_at?: string
          status?: string
        }
        Update: {
          attempts?: number
          business_id?: string | null
          created_at?: string
          error_message?: string | null
          event_type?: string
          external_event_id?: string | null
          id?: string
          integration_id?: string
          payload?: Json
          processed?: boolean
          processed_at?: string | null
          proof_object_id?: string | null
          received_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_events_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          access_token: string | null
          auto_request_enabled: boolean
          business_id: string
          config: Json
          connected_at: string | null
          created_at: string
          display_name: string | null
          id: string
          last_event_at: string | null
          platform: Database["public"]["Enums"]["integration_platform"]
          refresh_token: string | null
          status: Database["public"]["Enums"]["integration_status"]
          updated_at: string
          webhook_id: string | null
          webhook_secret: string | null
        }
        Insert: {
          access_token?: string | null
          auto_request_enabled?: boolean
          business_id: string
          config?: Json
          connected_at?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          last_event_at?: string | null
          platform: Database["public"]["Enums"]["integration_platform"]
          refresh_token?: string | null
          status?: Database["public"]["Enums"]["integration_status"]
          updated_at?: string
          webhook_id?: string | null
          webhook_secret?: string | null
        }
        Update: {
          access_token?: string | null
          auto_request_enabled?: boolean
          business_id?: string
          config?: Json
          connected_at?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          last_event_at?: string | null
          platform?: Database["public"]["Enums"]["integration_platform"]
          refresh_token?: string | null
          status?: Database["public"]["Enums"]["integration_status"]
          updated_at?: string
          webhook_id?: string | null
          webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integrations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          business_id: string
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string | null
        }
        Insert: {
          body?: string | null
          business_id: string
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id?: string | null
        }
        Update: {
          body?: string | null
          business_id?: string
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string | null
        }
        Relationships: []
      }
      proof_objects: {
        Row: {
          ai_claims: Json | null
          author_avatar_url: string | null
          author_location: string | null
          author_name: string | null
          business_id: string
          content: string
          created_at: string
          id: string
          is_approved: boolean
          media_url: string | null
          rating: number | null
          sentiment_score: number | null
          source_ref: string | null
          source_type: Database["public"]["Enums"]["proof_source_type"]
          tags: string[] | null
          updated_at: string
          verification_tier: Database["public"]["Enums"]["verification_tier"]
        }
        Insert: {
          ai_claims?: Json | null
          author_avatar_url?: string | null
          author_location?: string | null
          author_name?: string | null
          business_id: string
          content: string
          created_at?: string
          id?: string
          is_approved?: boolean
          media_url?: string | null
          rating?: number | null
          sentiment_score?: number | null
          source_ref?: string | null
          source_type: Database["public"]["Enums"]["proof_source_type"]
          tags?: string[] | null
          updated_at?: string
          verification_tier?: Database["public"]["Enums"]["verification_tier"]
        }
        Update: {
          ai_claims?: Json | null
          author_avatar_url?: string | null
          author_location?: string | null
          author_name?: string | null
          business_id?: string
          content?: string
          created_at?: string
          id?: string
          is_approved?: boolean
          media_url?: string | null
          rating?: number | null
          sentiment_score?: number | null
          source_ref?: string | null
          source_type?: Database["public"]["Enums"]["proof_source_type"]
          tags?: string[] | null
          updated_at?: string
          verification_tier?: Database["public"]["Enums"]["verification_tier"]
        }
        Relationships: [
          {
            foreignKeyName: "proof_objects_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      testimonial_requests: {
        Row: {
          business_id: string
          collection_token: string
          completed_at: string | null
          created_at: string
          customer_email: string
          customer_name: string | null
          expires_at: string
          id: string
          opened_at: string | null
          proof_object_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["testimonial_request_status"]
        }
        Insert: {
          business_id: string
          collection_token: string
          completed_at?: string | null
          created_at?: string
          customer_email: string
          customer_name?: string | null
          expires_at?: string
          id?: string
          opened_at?: string | null
          proof_object_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["testimonial_request_status"]
        }
        Update: {
          business_id?: string
          collection_token?: string
          completed_at?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string | null
          expires_at?: string
          id?: string
          opened_at?: string | null
          proof_object_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["testimonial_request_status"]
        }
        Relationships: [
          {
            foreignKeyName: "testimonial_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "testimonial_requests_proof_object_id_fkey"
            columns: ["proof_object_id"]
            isOneToOne: false
            referencedRelation: "proof_objects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          business_id: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_admin: boolean
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_admin?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_admin?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      widget_events: {
        Row: {
          business_id: string
          event_type: Database["public"]["Enums"]["widget_event_type"]
          id: string
          occurred_at: string
          page_url: string | null
          proof_object_id: string | null
          visitor_id: string | null
          widget_id: string
        }
        Insert: {
          business_id: string
          event_type: Database["public"]["Enums"]["widget_event_type"]
          id?: string
          occurred_at?: string
          page_url?: string | null
          proof_object_id?: string | null
          visitor_id?: string | null
          widget_id: string
        }
        Update: {
          business_id?: string
          event_type?: Database["public"]["Enums"]["widget_event_type"]
          id?: string
          occurred_at?: string
          page_url?: string | null
          proof_object_id?: string | null
          visitor_id?: string | null
          widget_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "widget_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "widget_events_proof_object_id_fkey"
            columns: ["proof_object_id"]
            isOneToOne: false
            referencedRelation: "proof_objects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "widget_events_widget_id_fkey"
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
      widgets: {
        Row: {
          ab_test_group_id: string | null
          business_id: string
          config: Json
          created_at: string
          id: string
          impressions_total: number
          name: string
          status: Database["public"]["Enums"]["widget_status"]
          updated_at: string
          variant: string | null
          widget_type: Database["public"]["Enums"]["widget_type"]
        }
        Insert: {
          ab_test_group_id?: string | null
          business_id: string
          config?: Json
          created_at?: string
          id?: string
          impressions_total?: number
          name: string
          status?: Database["public"]["Enums"]["widget_status"]
          updated_at?: string
          variant?: string | null
          widget_type?: Database["public"]["Enums"]["widget_type"]
        }
        Update: {
          ab_test_group_id?: string | null
          business_id?: string
          config?: Json
          created_at?: string
          id?: string
          impressions_total?: number
          name?: string
          status?: Database["public"]["Enums"]["widget_status"]
          updated_at?: string
          variant?: string | null
          widget_type?: Database["public"]["Enums"]["widget_type"]
        }
        Relationships: [
          {
            foreignKeyName: "widgets_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_replay_integration_event: {
        Args: { _event_id: string }
        Returns: boolean
      }
      get_website_by_domain: {
        Args: { _domain: string }
        Returns: {
          domain: string
          id: string
          is_verified: boolean
          name: string
          user_id: string
        }[]
      }
      get_widget_analytics: {
        Args: { _business_id: string; _end: string; _start: string }
        Returns: {
          bucket: string
          conversions: number
          impressions: number
          interactions: number
        }[]
      }
      has_role:
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
        | { Args: { _role: string; _user_id: string }; Returns: boolean }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_superadmin: { Args: { _user_id: string }; Returns: boolean }
      migrate_integration_connectors_to_integrations: {
        Args: never
        Returns: undefined
      }
      normalize_domain: { Args: { _raw: string }; Returns: string }
      poll_active_campaigns: { Args: never; Returns: undefined }
      refresh_revenue_stats: {
        Args: { _campaign_id: string; _period_type?: string }
        Returns: undefined
      }
      sweep_expired_testimonial_requests: { Args: never; Returns: number }
      update_user_role: {
        Args: {
          _new_role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_business_role: {
        Args: { _business_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      user_in_business: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
      verify_website: {
        Args: {
          _ip_address?: string
          _user_agent?: string
          _verification_data?: Json
          _verification_type: string
          _website_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "support" | "superadmin" | "moderator"
      business_plan: "free" | "starter" | "growth" | "scale" | "agency"
      integration_platform:
        | "stripe"
        | "shopify"
        | "woocommerce"
        | "paypal"
        | "google_reviews"
        | "trustpilot"
        | "g2"
        | "capterra"
        | "mailchimp"
        | "klaviyo"
        | "hubspot"
        | "webhook"
      integration_status: "connected" | "disconnected" | "error" | "pending"
      notification_type:
        | "proof_pending_review"
        | "testimonial_request_expired"
        | "integration_disconnected"
      proof_source_type:
        | "purchase"
        | "signup"
        | "review"
        | "testimonial"
        | "social_post"
        | "manual"
      testimonial_request_status:
        | "pending"
        | "sent"
        | "opened"
        | "completed"
        | "expired"
      user_role: "owner" | "editor" | "viewer"
      verification_tier: "verified" | "pending" | "unverified"
      widget_event_type: "impression" | "interaction" | "conversion"
      widget_status: "draft" | "active" | "paused"
      widget_type: "floating" | "inline" | "badge"
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
      app_role: ["admin", "user", "support", "superadmin", "moderator"],
      business_plan: ["free", "starter", "growth", "scale", "agency"],
      integration_platform: [
        "stripe",
        "shopify",
        "woocommerce",
        "paypal",
        "google_reviews",
        "trustpilot",
        "g2",
        "capterra",
        "mailchimp",
        "klaviyo",
        "hubspot",
        "webhook",
      ],
      integration_status: ["connected", "disconnected", "error", "pending"],
      notification_type: [
        "proof_pending_review",
        "testimonial_request_expired",
        "integration_disconnected",
      ],
      proof_source_type: [
        "purchase",
        "signup",
        "review",
        "testimonial",
        "social_post",
        "manual",
      ],
      testimonial_request_status: [
        "pending",
        "sent",
        "opened",
        "completed",
        "expired",
      ],
      user_role: ["owner", "editor", "viewer"],
      verification_tier: ["verified", "pending", "unverified"],
      widget_event_type: ["impression", "interaction", "conversion"],
      widget_status: ["draft", "active", "paused"],
      widget_type: ["floating", "inline", "badge"],
    },
  },
} as const
