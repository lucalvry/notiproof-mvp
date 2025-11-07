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
      ab_test_variants: {
        Row: {
          animation: string | null
          clicks: number | null
          conversion_rate: number | null
          created_at: string
          id: string
          is_control: boolean
          message_template: string | null
          name: string
          position: string | null
          style_config: Json | null
          test_id: string
          timing_config: Json | null
          updated_at: string
          views: number | null
        }
        Insert: {
          animation?: string | null
          clicks?: number | null
          conversion_rate?: number | null
          created_at?: string
          id?: string
          is_control?: boolean
          message_template?: string | null
          name: string
          position?: string | null
          style_config?: Json | null
          test_id: string
          timing_config?: Json | null
          updated_at?: string
          views?: number | null
        }
        Update: {
          animation?: string | null
          clicks?: number | null
          conversion_rate?: number | null
          created_at?: string
          id?: string
          is_control?: boolean
          message_template?: string | null
          name?: string
          position?: string | null
          style_config?: Json | null
          test_id?: string
          timing_config?: Json | null
          updated_at?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ab_test_variants_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "ab_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      ab_tests: {
        Row: {
          campaign_id: string
          confidence_level: number | null
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          name: string
          start_date: string | null
          status: string
          total_clicks: number | null
          total_views: number | null
          traffic_split: Json
          updated_at: string
          user_id: string
          winner_declared_at: string | null
          winner_variant_id: string | null
        }
        Insert: {
          campaign_id: string
          confidence_level?: number | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          start_date?: string | null
          status?: string
          total_clicks?: number | null
          total_views?: number | null
          traffic_split?: Json
          updated_at?: string
          user_id: string
          winner_declared_at?: string | null
          winner_variant_id?: string | null
        }
        Update: {
          campaign_id?: string
          confidence_level?: number | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          start_date?: string | null
          status?: string
          total_clicks?: number | null
          total_views?: number | null
          traffic_split?: Json
          updated_at?: string
          user_id?: string
          winner_declared_at?: string | null
          winner_variant_id?: string | null
        }
        Relationships: []
      }
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
      audit_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          auto_repeat: boolean
          created_at: string
          data_source: string | null
          description: string | null
          display_rules: Json
          end_date: string | null
          id: string
          name: string
          organization_id: string | null
          polling_config: Json | null
          repeat_config: Json | null
          start_date: string | null
          status: string
          updated_at: string
          user_id: string
          website_id: string
        }
        Insert: {
          auto_repeat?: boolean
          created_at?: string
          data_source?: string | null
          description?: string | null
          display_rules?: Json
          end_date?: string | null
          id?: string
          name: string
          organization_id?: string | null
          polling_config?: Json | null
          repeat_config?: Json | null
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
          website_id: string
        }
        Update: {
          auto_repeat?: boolean
          created_at?: string
          data_source?: string | null
          description?: string | null
          display_rules?: Json
          end_date?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          polling_config?: Json | null
          repeat_config?: Json | null
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          website_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_website_id_fkey"
            columns: ["website_id"]
            isOneToOne: false
            referencedRelation: "websites"
            referencedColumns: ["id"]
          },
        ]
      }
      email_preferences: {
        Row: {
          created_at: string | null
          id: string
          marketing_emails: boolean | null
          security_alerts: boolean | null
          updated_at: string | null
          user_id: string
          weekly_reports: boolean | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          marketing_emails?: boolean | null
          security_alerts?: boolean | null
          updated_at?: string | null
          user_id: string
          weekly_reports?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: string
          marketing_emails?: boolean | null
          security_alerts?: boolean | null
          updated_at?: string | null
          user_id?: string
          weekly_reports?: boolean | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          email_type: string
          error_message: string | null
          id: string
          ip_address: string | null
          recipient_email: string
          retry_after: string | null
          sent_at: string | null
          status: string
          user_agent: string | null
        }
        Insert: {
          email_type: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          recipient_email: string
          retry_after?: string | null
          sent_at?: string | null
          status: string
          user_agent?: string | null
        }
        Update: {
          email_type?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          recipient_email?: string
          retry_after?: string | null
          sent_at?: string | null
          status?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      event_templates: {
        Row: {
          business_type: Database["public"]["Enums"]["business_type"]
          created_at: string
          event_type: string
          id: string
          integration_type: Database["public"]["Enums"]["integration_type"]
          is_active: boolean | null
          placeholders: Json
          priority: number | null
          template: string
        }
        Insert: {
          business_type: Database["public"]["Enums"]["business_type"]
          created_at?: string
          event_type: string
          id?: string
          integration_type: Database["public"]["Enums"]["integration_type"]
          is_active?: boolean | null
          placeholders?: Json
          priority?: number | null
          template: string
        }
        Update: {
          business_type?: Database["public"]["Enums"]["business_type"]
          created_at?: string
          event_type?: string
          id?: string
          integration_type?: Database["public"]["Enums"]["integration_type"]
          is_active?: boolean | null
          placeholders?: Json
          priority?: number | null
          template?: string
        }
        Relationships: []
      }
      event_usage_tracking: {
        Row: {
          created_at: string
          events_quota: number
          events_used: number
          id: string
          last_reset_at: string
          month_year: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          events_quota: number
          events_used?: number
          id?: string
          last_reset_at?: string
          month_year: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          events_quota?: number
          events_used?: number
          id?: string
          last_reset_at?: string
          month_year?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          business_context: Json | null
          business_type: Database["public"]["Enums"]["business_type"] | null
          clicks: number | null
          context_template: string | null
          created_at: string | null
          event_data: Json
          event_type: string
          expires_at: string | null
          flagged: boolean
          id: string
          integration_type:
            | Database["public"]["Enums"]["integration_type"]
            | null
          ip: string | null
          message_template: string | null
          moderation_status:
            | Database["public"]["Enums"]["moderation_status"]
            | null
          page_url: string | null
          quality_score: number | null
          source: Database["public"]["Enums"]["event_source"] | null
          status: Database["public"]["Enums"]["event_status"] | null
          user_agent: string | null
          user_email: string | null
          user_location: string | null
          user_name: string | null
          variant_id: string | null
          views: number | null
          website_id: string | null
          widget_id: string
        }
        Insert: {
          business_context?: Json | null
          business_type?: Database["public"]["Enums"]["business_type"] | null
          clicks?: number | null
          context_template?: string | null
          created_at?: string | null
          event_data: Json
          event_type: string
          expires_at?: string | null
          flagged?: boolean
          id?: string
          integration_type?:
            | Database["public"]["Enums"]["integration_type"]
            | null
          ip?: string | null
          message_template?: string | null
          moderation_status?:
            | Database["public"]["Enums"]["moderation_status"]
            | null
          page_url?: string | null
          quality_score?: number | null
          source?: Database["public"]["Enums"]["event_source"] | null
          status?: Database["public"]["Enums"]["event_status"] | null
          user_agent?: string | null
          user_email?: string | null
          user_location?: string | null
          user_name?: string | null
          variant_id?: string | null
          views?: number | null
          website_id?: string | null
          widget_id: string
        }
        Update: {
          business_context?: Json | null
          business_type?: Database["public"]["Enums"]["business_type"] | null
          clicks?: number | null
          context_template?: string | null
          created_at?: string | null
          event_data?: Json
          event_type?: string
          expires_at?: string | null
          flagged?: boolean
          id?: string
          integration_type?:
            | Database["public"]["Enums"]["integration_type"]
            | null
          ip?: string | null
          message_template?: string | null
          moderation_status?:
            | Database["public"]["Enums"]["moderation_status"]
            | null
          page_url?: string | null
          quality_score?: number | null
          source?: Database["public"]["Enums"]["event_source"] | null
          status?: Database["public"]["Enums"]["event_status"] | null
          user_agent?: string | null
          user_email?: string | null
          user_location?: string | null
          user_name?: string | null
          variant_id?: string | null
          views?: number | null
          website_id?: string | null
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
      help_article_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      help_article_feedback: {
        Row: {
          article_id: string
          created_at: string
          feedback_text: string | null
          id: string
          is_helpful: boolean
          user_id: string | null
        }
        Insert: {
          article_id: string
          created_at?: string
          feedback_text?: string | null
          id?: string
          is_helpful: boolean
          user_id?: string | null
        }
        Update: {
          article_id?: string
          created_at?: string
          feedback_text?: string | null
          id?: string
          is_helpful?: boolean
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "help_article_feedback_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "help_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      help_article_views: {
        Row: {
          article_id: string
          id: string
          ip_address: unknown
          user_agent: string | null
          user_id: string | null
          viewed_at: string
        }
        Insert: {
          article_id: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
          viewed_at?: string
        }
        Update: {
          article_id?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_article_views_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "help_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      help_articles: {
        Row: {
          author_id: string | null
          category_id: string | null
          content: string
          created_at: string
          excerpt: string | null
          featured_image_url: string | null
          helpful_count: number | null
          id: string
          is_featured: boolean | null
          is_published: boolean | null
          slug: string
          sort_order: number | null
          tags: string[] | null
          title: string
          updated_at: string
          video_type: string | null
          video_url: string | null
          view_count: number | null
        }
        Insert: {
          author_id?: string | null
          category_id?: string | null
          content: string
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          helpful_count?: number | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          slug: string
          sort_order?: number | null
          tags?: string[] | null
          title: string
          updated_at?: string
          video_type?: string | null
          video_url?: string | null
          view_count?: number | null
        }
        Update: {
          author_id?: string | null
          category_id?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          helpful_count?: number | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          slug?: string
          sort_order?: number | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          video_type?: string | null
          video_url?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_help_articles_category"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "help_article_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "help_articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "help_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      help_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      integration_connectors: {
        Row: {
          config: Json
          created_at: string
          id: string
          integration_type: Database["public"]["Enums"]["integration_type"]
          last_sync: string | null
          name: string
          status: string | null
          updated_at: string
          user_id: string
          website_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          integration_type: Database["public"]["Enums"]["integration_type"]
          last_sync?: string | null
          name: string
          status?: string | null
          updated_at?: string
          user_id: string
          website_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          integration_type?: Database["public"]["Enums"]["integration_type"]
          last_sync?: string | null
          name?: string
          status?: string | null
          updated_at?: string
          user_id?: string
          website_id?: string
        }
        Relationships: []
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
      integration_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          duration_ms: number | null
          error_message: string | null
          id: string
          integration_type: string
          request_data: Json | null
          response_data: Json | null
          status: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          integration_type: string
          request_data?: Json | null
          response_data?: Json | null
          status: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          integration_type?: string
          request_data?: Json | null
          response_data?: Json | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      integrations_config: {
        Row: {
          config: Json
          connector_type: string | null
          created_at: string
          created_by: string | null
          id: string
          integration_type: string
          is_active: boolean
          oauth_spec: Json | null
          polling_interval_minutes: number | null
          requires_admin_credentials: boolean | null
          requires_oauth: boolean | null
          setup_instructions: string | null
          updated_at: string
        }
        Insert: {
          config?: Json
          connector_type?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          integration_type: string
          is_active?: boolean
          oauth_spec?: Json | null
          polling_interval_minutes?: number | null
          requires_admin_credentials?: boolean | null
          requires_oauth?: boolean | null
          setup_instructions?: string | null
          updated_at?: string
        }
        Update: {
          config?: Json
          connector_type?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          integration_type?: string
          is_active?: boolean
          oauth_spec?: Json | null
          polling_interval_minutes?: number | null
          requires_admin_credentials?: boolean | null
          requires_oauth?: boolean | null
          setup_instructions?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      marketplace_templates: {
        Row: {
          business_types: string[] | null
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
          priority: number | null
          rating_average: number | null
          rating_count: number
          style_config: Json
          supported_campaign_types: string[] | null
          tags: string[] | null
          template_config: Json
          updated_at: string
        }
        Insert: {
          business_types?: string[] | null
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
          priority?: number | null
          rating_average?: number | null
          rating_count?: number
          style_config?: Json
          supported_campaign_types?: string[] | null
          tags?: string[] | null
          template_config?: Json
          updated_at?: string
        }
        Update: {
          business_types?: string[] | null
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
          priority?: number | null
          rating_average?: number | null
          rating_count?: number
          style_config?: Json
          supported_campaign_types?: string[] | null
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
          business_type: Database["public"]["Enums"]["business_type"] | null
          created_at: string | null
          demo_mode_enabled: boolean
          id: string
          name: string
          onboarding_progress: Json | null
          role: Database["public"]["Enums"]["app_role"]
          status: string
          white_label_settings: Json | null
        }
        Insert: {
          business_type?: Database["public"]["Enums"]["business_type"] | null
          created_at?: string | null
          demo_mode_enabled?: boolean
          id: string
          name: string
          onboarding_progress?: Json | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          white_label_settings?: Json | null
        }
        Update: {
          business_type?: Database["public"]["Enums"]["business_type"] | null
          created_at?: string | null
          demo_mode_enabled?: boolean
          id?: string
          name?: string
          onboarding_progress?: Json | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          white_label_settings?: Json | null
        }
        Relationships: []
      }
      quick_win_templates: {
        Row: {
          business_type: Database["public"]["Enums"]["business_type"]
          category: string
          created_at: string
          default_metadata: Json
          description: string | null
          event_type: string
          id: string
          is_active: boolean
          name: string
          required_fields: Json
          template_message: string
          updated_at: string
        }
        Insert: {
          business_type: Database["public"]["Enums"]["business_type"]
          category?: string
          created_at?: string
          default_metadata?: Json
          description?: string | null
          event_type: string
          id?: string
          is_active?: boolean
          name: string
          required_fields?: Json
          template_message: string
          updated_at?: string
        }
        Update: {
          business_type?: Database["public"]["Enums"]["business_type"]
          category?: string
          created_at?: string
          default_metadata?: Json
          description?: string | null
          event_type?: string
          id?: string
          is_active?: boolean
          name?: string
          required_fields?: Json
          template_message?: string
          updated_at?: string
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
          converted_to_event: boolean | null
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
          converted_to_event?: boolean | null
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
          converted_to_event?: boolean | null
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
      subscription_plans: {
        Row: {
          created_at: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          max_events_per_month: number | null
          max_websites: number | null
          name: string
          polling_limits: Json | null
          price_monthly: number | null
          price_yearly: number | null
          stripe_price_id_monthly: string | null
          stripe_price_id_yearly: string | null
          stripe_product_id: string | null
          trial_period_days: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_events_per_month?: number | null
          max_websites?: number | null
          name: string
          polling_limits?: Json | null
          price_monthly?: number | null
          price_yearly?: number | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          stripe_product_id?: string | null
          trial_period_days?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_events_per_month?: number | null
          max_websites?: number | null
          name?: string
          polling_limits?: Json | null
          price_monthly?: number | null
          price_yearly?: number | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          stripe_product_id?: string | null
          trial_period_days?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
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
          permissions: Json | null
          role: Database["public"]["Enums"]["team_role"]
          user_id: string
          website_access: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          organization_id: string
          permissions?: Json | null
          role?: Database["public"]["Enums"]["team_role"]
          user_id: string
          website_access?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          organization_id?: string
          permissions?: Json | null
          role?: Database["public"]["Enums"]["team_role"]
          user_id?: string
          website_access?: Json | null
        }
        Relationships: []
      }
      template_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug?: string | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string | null
          sort_order?: number | null
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
      user_quick_wins: {
        Row: {
          created_at: string
          custom_metadata: Json
          expires_at: string | null
          id: string
          is_enabled: boolean
          template_id: string
          updated_at: string
          user_id: string
          widget_id: string
        }
        Insert: {
          created_at?: string
          custom_metadata?: Json
          expires_at?: string | null
          id?: string
          is_enabled?: boolean
          template_id: string
          updated_at?: string
          user_id: string
          widget_id: string
        }
        Update: {
          created_at?: string
          custom_metadata?: Json
          expires_at?: string | null
          id?: string
          is_enabled?: boolean
          template_id?: string
          updated_at?: string
          user_id?: string
          widget_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_quick_wins_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "quick_win_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_quick_wins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_quick_wins_widget_id_fkey"
            columns: ["widget_id"]
            isOneToOne: false
            referencedRelation: "widgets"
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
      user_subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          trial_start: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id: string
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_trial_history: {
        Row: {
          created_at: string | null
          id: string
          subscription_id: string | null
          trial_ended_at: string | null
          trial_started_at: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          subscription_id?: string | null
          trial_ended_at?: string | null
          trial_started_at?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          subscription_id?: string | null
          trial_ended_at?: string | null
          trial_started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_trial_history_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
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
      webhook_dedup: {
        Row: {
          created_at: string
          id: string
          idempotency_key: string
          payload: Json | null
          processed_at: string
          webhook_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          idempotency_key: string
          payload?: Json | null
          processed_at?: string
          webhook_type: string
        }
        Update: {
          created_at?: string
          id?: string
          idempotency_key?: string
          payload?: Json | null
          processed_at?: string
          webhook_type?: string
        }
        Relationships: []
      }
      website_settings: {
        Row: {
          border_radius: number | null
          brand_color: string | null
          created_at: string | null
          display_notifications: boolean | null
          id: string
          mobile_notifications: boolean | null
          sound_effects: boolean | null
          updated_at: string | null
          website_id: string
        }
        Insert: {
          border_radius?: number | null
          brand_color?: string | null
          created_at?: string | null
          display_notifications?: boolean | null
          id?: string
          mobile_notifications?: boolean | null
          sound_effects?: boolean | null
          updated_at?: string | null
          website_id: string
        }
        Update: {
          border_radius?: number | null
          brand_color?: string | null
          created_at?: string | null
          display_notifications?: boolean | null
          id?: string
          mobile_notifications?: boolean | null
          sound_effects?: boolean | null
          updated_at?: string | null
          website_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_settings_website_id_fkey"
            columns: ["website_id"]
            isOneToOne: true
            referencedRelation: "websites"
            referencedColumns: ["id"]
          },
        ]
      }
      website_verifications: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          is_successful: boolean | null
          user_agent: string | null
          verification_data: Json | null
          verification_type: string
          verified_at: string | null
          website_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          is_successful?: boolean | null
          user_agent?: string | null
          verification_data?: Json | null
          verification_type: string
          verified_at?: string | null
          website_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          is_successful?: boolean | null
          user_agent?: string | null
          verification_data?: Json | null
          verification_type?: string
          verified_at?: string | null
          website_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_verifications_website_id_fkey"
            columns: ["website_id"]
            isOneToOne: false
            referencedRelation: "websites"
            referencedColumns: ["id"]
          },
        ]
      }
      websites: {
        Row: {
          business_type: Database["public"]["Enums"]["business_type"]
          created_at: string
          domain: string
          favicon_url: string | null
          id: string
          is_verified: boolean
          last_verification_at: string | null
          name: string
          status: string
          updated_at: string
          user_id: string
          verification_attempts: number | null
          verification_method: string | null
          verification_token: string | null
        }
        Insert: {
          business_type?: Database["public"]["Enums"]["business_type"]
          created_at?: string
          domain: string
          favicon_url?: string | null
          id?: string
          is_verified?: boolean
          last_verification_at?: string | null
          name: string
          status?: string
          updated_at?: string
          user_id: string
          verification_attempts?: number | null
          verification_method?: string | null
          verification_token?: string | null
        }
        Update: {
          business_type?: Database["public"]["Enums"]["business_type"]
          created_at?: string
          domain?: string
          favicon_url?: string | null
          id?: string
          is_verified?: boolean
          last_verification_at?: string | null
          name?: string
          status?: string
          updated_at?: string
          user_id?: string
          verification_attempts?: number | null
          verification_method?: string | null
          verification_token?: string | null
        }
        Relationships: []
      }
      widget_impressions: {
        Row: {
          created_at: string
          event_id: string | null
          id: string
          page_url: string
          session_id: string
          user_agent: string | null
          viewport_height: number | null
          viewport_width: number | null
          widget_id: string
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          id?: string
          page_url: string
          session_id: string
          user_agent?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
          widget_id: string
        }
        Update: {
          created_at?: string
          event_id?: string | null
          id?: string
          page_url?: string
          session_id?: string
          user_agent?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
          widget_id?: string
        }
        Relationships: []
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
          allow_fallback_content: boolean | null
          allowed_event_sources: string[] | null
          campaign_id: string
          created_at: string | null
          display_rules: Json
          feature_flags: Json | null
          id: string
          integration: string
          name: string
          notification_types: Json | null
          organization_id: string | null
          status: string
          style_config: Json | null
          template_name: string
          updated_at: string | null
          user_id: string
          website_id: string
        }
        Insert: {
          allow_fallback_content?: boolean | null
          allowed_event_sources?: string[] | null
          campaign_id: string
          created_at?: string | null
          display_rules?: Json
          feature_flags?: Json | null
          id?: string
          integration?: string
          name: string
          notification_types?: Json | null
          organization_id?: string | null
          status?: string
          style_config?: Json | null
          template_name: string
          updated_at?: string | null
          user_id: string
          website_id: string
        }
        Update: {
          allow_fallback_content?: boolean | null
          allowed_event_sources?: string[] | null
          campaign_id?: string
          created_at?: string | null
          display_rules?: Json
          feature_flags?: Json | null
          id?: string
          integration?: string
          name?: string
          notification_types?: Json | null
          organization_id?: string | null
          status?: string
          style_config?: Json | null
          template_name?: string
          updated_at?: string | null
          user_id?: string
          website_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_widgets_website"
            columns: ["website_id"]
            isOneToOne: false
            referencedRelation: "websites"
            referencedColumns: ["id"]
          },
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
      onboarding_analytics: {
        Row: {
          average_completion: number | null
          stuck_at_campaign: number | null
          stuck_at_conversion: number | null
          stuck_at_installation: number | null
          stuck_at_website: number | null
          users_completed: number | null
          users_in_progress: number | null
          users_not_started: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      auto_declare_ab_test_winner: {
        Args: { test_uuid: string }
        Returns: boolean
      }
      calculate_ab_test_confidence: {
        Args: { test_uuid: string }
        Returns: number
      }
      calculate_onboarding_progress: {
        Args: { _user_id: string }
        Returns: number
      }
      check_email_exists: { Args: { email_to_check: string }; Returns: boolean }
      check_event_quota: {
        Args: { _events_to_add?: number; _user_id: string }
        Returns: Json
      }
      cleanup_all_template_events: {
        Args: { _user_id: string }
        Returns: undefined
      }
      cleanup_expired_demo_events: { Args: never; Returns: undefined }
      cleanup_webhook_dedup: { Args: never; Returns: undefined }
      clear_demo_events: { Args: { _user_id: string }; Returns: undefined }
      clear_manual_events: { Args: { _user_id: string }; Returns: undefined }
      generate_demo_events: {
        Args: {
          _business_type: Database["public"]["Enums"]["business_type"]
          _user_id: string
        }
        Returns: undefined
      }
      get_campaigns_due_for_polling: {
        Args: never
        Returns: {
          campaign_id: string
          interval_minutes: number
          user_id: string
          website_id: string
        }[]
      }
      get_db_stats: {
        Args: never
        Returns: {
          active_widgets: number
          connection_count: number
          db_size_mb: number
          pending_events: number
        }[]
      }
      get_default_permissions_for_role: {
        Args: { _role: Database["public"]["Enums"]["team_role"] }
        Returns: Json
      }
      get_integration_count: {
        Args: { _types?: string[]; _user_id: string }
        Returns: number
      }
      get_user_event_usage: { Args: { _user_id: string }; Returns: Json }
      get_user_primary_website: { Args: { _user_id: string }; Returns: string }
      get_user_team_memberships: {
        Args: { _user_id: string }
        Returns: {
          organization_id: string
          role: Database["public"]["Enums"]["team_role"]
        }[]
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
      has_role:
        | { Args: { _role: string; _user_id: string }; Returns: boolean }
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
      increment_article_view_count: {
        Args: { article_uuid: string }
        Returns: undefined
      }
      increment_event_counter: {
        Args: { counter_type: string; event_id: string }
        Returns: undefined
      }
      increment_event_usage: {
        Args: { _events_count?: number; _user_id: string }
        Returns: Json
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_superadmin: { Args: { _user_id: string }; Returns: boolean }
      log_admin_action: {
        Args: {
          _action: string
          _details?: Json
          _ip_address?: string
          _resource_id?: string
          _resource_type: string
          _user_agent?: string
        }
        Returns: string
      }
      log_integration_action: {
        Args: {
          _action: string
          _details?: Json
          _duration_ms?: number
          _error_message?: string
          _integration_type: string
          _status: string
          _user_id?: string
        }
        Returns: string
      }
      poll_active_campaigns: { Args: never; Returns: undefined }
      update_article_helpful_count: {
        Args: { article_uuid: string }
        Returns: undefined
      }
      update_onboarding_milestone: {
        Args: { _completed?: boolean; _milestone: string; _user_id: string }
        Returns: undefined
      }
      update_user_role: {
        Args: {
          _new_role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_has_org_role: {
        Args: {
          _org_id: string
          _roles: Database["public"]["Enums"]["team_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      user_has_team_permission: {
        Args: {
          _action: string
          _org_id: string
          _resource: string
          _user_id: string
        }
        Returns: boolean
      }
      user_has_website_access: {
        Args: { _user_id: string; _website_id: string }
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
      business_type:
        | "ecommerce"
        | "saas"
        | "services"
        | "events"
        | "blog"
        | "marketing_agency"
        | "ngo"
        | "education"
        | "retail"
        | "hospitality"
        | "healthcare"
        | "real_estate"
        | "automotive"
        | "fitness"
        | "beauty"
        | "food_beverage"
        | "travel"
        | "finance"
        | "technology"
        | "consulting"
        | "manufacturing"
        | "media"
        | "legal"
      event_source:
        | "manual"
        | "connector"
        | "tracking"
        | "demo"
        | "woocommerce"
        | "quick_win"
      event_status: "pending" | "approved" | "rejected"
      integration_type:
        | "manual"
        | "shopify"
        | "woocommerce"
        | "stripe"
        | "paystack"
        | "flutterwave"
        | "google_reviews"
        | "trustpilot"
        | "typeform"
        | "hubspot"
        | "wpforms"
        | "custom_sdk"
        | "api"
        | "form_hook"
        | "javascript_api"
        | "webhook"
        | "zapier"
        | "calendly"
        | "ga4"
        | "rss"
      moderation_status: "pending" | "approved" | "rejected" | "flagged"
      team_role: "owner" | "admin" | "member" | "viewer" | "editor"
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
      business_type: [
        "ecommerce",
        "saas",
        "services",
        "events",
        "blog",
        "marketing_agency",
        "ngo",
        "education",
        "retail",
        "hospitality",
        "healthcare",
        "real_estate",
        "automotive",
        "fitness",
        "beauty",
        "food_beverage",
        "travel",
        "finance",
        "technology",
        "consulting",
        "manufacturing",
        "media",
        "legal",
      ],
      event_source: [
        "manual",
        "connector",
        "tracking",
        "demo",
        "woocommerce",
        "quick_win",
      ],
      event_status: ["pending", "approved", "rejected"],
      integration_type: [
        "manual",
        "shopify",
        "woocommerce",
        "stripe",
        "paystack",
        "flutterwave",
        "google_reviews",
        "trustpilot",
        "typeform",
        "hubspot",
        "wpforms",
        "custom_sdk",
        "api",
        "form_hook",
        "javascript_api",
        "webhook",
        "zapier",
        "calendly",
        "ga4",
        "rss",
      ],
      moderation_status: ["pending", "approved", "rejected", "flagged"],
      team_role: ["owner", "admin", "member", "viewer", "editor"],
    },
  },
} as const
