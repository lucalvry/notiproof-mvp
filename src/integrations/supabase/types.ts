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
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string | null
          business_id: string | null
          created_at: string
          details: Json
          id: string
        }
        Insert: {
          action: string
          admin_user_id?: string | null
          business_id?: string | null
          created_at?: string
          details?: Json
          id?: string
        }
        Update: {
          action?: string
          admin_user_id?: string | null
          business_id?: string | null
          created_at?: string
          details?: Json
          id?: string
        }
        Relationships: []
      }
      app_secrets: {
        Row: {
          created_at: string
          name: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          name: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          name?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      business_brand_voice: {
        Row: {
          avoid_words: string[]
          business_id: string
          created_at: string
          default_tone: string
          id: string
          updated_at: string
          use_words: string[]
          voice_examples: string | null
        }
        Insert: {
          avoid_words?: string[]
          business_id: string
          created_at?: string
          default_tone?: string
          id?: string
          updated_at?: string
          use_words?: string[]
          voice_examples?: string | null
        }
        Update: {
          avoid_words?: string[]
          business_id?: string
          created_at?: string
          default_tone?: string
          id?: string
          updated_at?: string
          use_words?: string[]
          voice_examples?: string | null
        }
        Relationships: []
      }
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
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
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
          content_auto_generate: boolean
          content_default_output_types: string[]
          content_default_tones: string[]
          content_notify_on_ready: boolean
          created_at: string
          extra_seats_purchased: number
          id: string
          industry: string | null
          install_verified: boolean
          logo_url: string | null
          monthly_event_limit: number
          monthly_proof_limit: number
          name: string
          onboarding_completed: boolean
          plan: string
          plan_expires_at: string | null
          plan_tier: string
          script_id: string | null
          settings: Json
          slug: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          suspended_at: string | null
          time_zone: string
          trial_ends_at: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          brand_color?: string | null
          content_auto_generate?: boolean
          content_default_output_types?: string[]
          content_default_tones?: string[]
          content_notify_on_ready?: boolean
          created_at?: string
          extra_seats_purchased?: number
          id?: string
          industry?: string | null
          install_verified?: boolean
          logo_url?: string | null
          monthly_event_limit?: number
          monthly_proof_limit?: number
          name: string
          onboarding_completed?: boolean
          plan?: string
          plan_expires_at?: string | null
          plan_tier?: string
          script_id?: string | null
          settings?: Json
          slug?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          suspended_at?: string | null
          time_zone?: string
          trial_ends_at?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          brand_color?: string | null
          content_auto_generate?: boolean
          content_default_output_types?: string[]
          content_default_tones?: string[]
          content_notify_on_ready?: boolean
          created_at?: string
          extra_seats_purchased?: number
          id?: string
          industry?: string | null
          install_verified?: boolean
          logo_url?: string | null
          monthly_event_limit?: number
          monthly_proof_limit?: number
          name?: string
          onboarding_completed?: boolean
          plan?: string
          plan_expires_at?: string | null
          plan_tier?: string
          script_id?: string | null
          settings?: Json
          slug?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          suspended_at?: string | null
          time_zone?: string
          trial_ends_at?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          business_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          request_config: Json
          requests_sent_count: number
          responses_received_count: number
          trigger_config: Json
          type: Database["public"]["Enums"]["campaign_type"]
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          request_config?: Json
          requests_sent_count?: number
          responses_received_count?: number
          trigger_config?: Json
          type: Database["public"]["Enums"]["campaign_type"]
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          request_config?: Json
          requests_sent_count?: number
          responses_received_count?: number
          trigger_config?: Json
          type?: Database["public"]["Enums"]["campaign_type"]
          updated_at?: string
        }
        Relationships: []
      }
      case_studies: {
        Row: {
          ai_model: string
          business_id: string
          content: string | null
          created_at: string
          customer_handle: string | null
          edit_history: Json
          id: string
          length_target: string
          meta_description: string | null
          meta_title: string | null
          original_content: string
          sections: Json
          slug: string | null
          status: Database["public"]["Enums"]["case_study_status"]
          title: string
          tone: string
          updated_at: string
          word_count: number | null
        }
        Insert: {
          ai_model: string
          business_id: string
          content?: string | null
          created_at?: string
          customer_handle?: string | null
          edit_history?: Json
          id?: string
          length_target?: string
          meta_description?: string | null
          meta_title?: string | null
          original_content: string
          sections?: Json
          slug?: string | null
          status?: Database["public"]["Enums"]["case_study_status"]
          title: string
          tone?: string
          updated_at?: string
          word_count?: number | null
        }
        Update: {
          ai_model?: string
          business_id?: string
          content?: string | null
          created_at?: string
          customer_handle?: string | null
          edit_history?: Json
          id?: string
          length_target?: string
          meta_description?: string | null
          meta_title?: string | null
          original_content?: string
          sections?: Json
          slug?: string | null
          status?: Database["public"]["Enums"]["case_study_status"]
          title?: string
          tone?: string
          updated_at?: string
          word_count?: number | null
        }
        Relationships: []
      }
      case_study_proof_links: {
        Row: {
          case_study_id: string
          created_at: string
          id: string
          is_primary: boolean
          position: number
          proof_object_id: string
        }
        Insert: {
          case_study_id: string
          created_at?: string
          id?: string
          is_primary?: boolean
          position?: number
          proof_object_id: string
        }
        Update: {
          case_study_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          position?: number
          proof_object_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_study_proof_links_case_study_id_fkey"
            columns: ["case_study_id"]
            isOneToOne: false
            referencedRelation: "case_studies"
            referencedColumns: ["id"]
          },
        ]
      }
      content_pieces: {
        Row: {
          ai_model: string | null
          business_id: string
          char_count: number
          content: string
          created_at: string
          edit_history: Json
          generation_prompt: string | null
          id: string
          original_content: string
          output_type: Database["public"]["Enums"]["content_output_type"]
          proof_object_id: string
          published_count: number
          status: Database["public"]["Enums"]["content_piece_status"]
          tone_used: string | null
          updated_at: string
        }
        Insert: {
          ai_model?: string | null
          business_id: string
          char_count?: number
          content: string
          created_at?: string
          edit_history?: Json
          generation_prompt?: string | null
          id?: string
          original_content: string
          output_type: Database["public"]["Enums"]["content_output_type"]
          proof_object_id: string
          published_count?: number
          status?: Database["public"]["Enums"]["content_piece_status"]
          tone_used?: string | null
          updated_at?: string
        }
        Update: {
          ai_model?: string | null
          business_id?: string
          char_count?: number
          content?: string
          created_at?: string
          edit_history?: Json
          generation_prompt?: string | null
          id?: string
          original_content?: string
          output_type?: Database["public"]["Enums"]["content_output_type"]
          proof_object_id?: string
          published_count?: number
          status?: Database["public"]["Enums"]["content_piece_status"]
          tone_used?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      content_publish_events: {
        Row: {
          business_id: string
          channel_id: string | null
          clicks: number
          content_piece_id: string
          created_at: string
          error_message: string | null
          external_post_id: string | null
          external_post_url: string | null
          id: string
          impressions: number
          payload: Json
          published_at: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["publish_event_status"]
          updated_at: string
        }
        Insert: {
          business_id: string
          channel_id?: string | null
          clicks?: number
          content_piece_id: string
          created_at?: string
          error_message?: string | null
          external_post_id?: string | null
          external_post_url?: string | null
          id?: string
          impressions?: number
          payload?: Json
          published_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["publish_event_status"]
          updated_at?: string
        }
        Update: {
          business_id?: string
          channel_id?: string | null
          clicks?: number
          content_piece_id?: string
          created_at?: string
          error_message?: string | null
          external_post_id?: string | null
          external_post_url?: string | null
          id?: string
          impressions?: number
          payload?: Json
          published_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["publish_event_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_publish_events_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "publishing_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_publish_events_content_piece_id_fkey"
            columns: ["content_piece_id"]
            isOneToOne: false
            referencedRelation: "content_pieces"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_events: {
        Row: {
          business_id: string
          error_message: string | null
          event_type: string
          external_event_id: string | null
          id: string
          integration_id: string
          payload: Json
          processed_at: string | null
          proof_object_id: string | null
          received_at: string
          status: string
        }
        Insert: {
          business_id: string
          error_message?: string | null
          event_type: string
          external_event_id?: string | null
          id?: string
          integration_id: string
          payload?: Json
          processed_at?: string | null
          proof_object_id?: string | null
          received_at?: string
          status?: string
        }
        Update: {
          business_id?: string
          error_message?: string | null
          event_type?: string
          external_event_id?: string | null
          id?: string
          integration_id?: string
          payload?: Json
          processed_at?: string | null
          proof_object_id?: string | null
          received_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_events_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_events_proof_object_id_fkey"
            columns: ["proof_object_id"]
            isOneToOne: false
            referencedRelation: "proof_objects"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          api_token: string | null
          auto_request_delay_days: number
          auto_request_delay_minutes: number | null
          auto_request_enabled: boolean
          business_id: string
          config: Json
          created_at: string
          credentials: Json
          credentials_encrypted: string | null
          id: string
          last_sync_at: string | null
          platform: Database["public"]["Enums"]["integration_provider"]
          provider: Database["public"]["Enums"]["integration_provider"]
          status: Database["public"]["Enums"]["integration_status"]
          updated_at: string
        }
        Insert: {
          api_token?: string | null
          auto_request_delay_days?: number
          auto_request_delay_minutes?: number | null
          auto_request_enabled?: boolean
          business_id: string
          config?: Json
          created_at?: string
          credentials?: Json
          credentials_encrypted?: string | null
          id?: string
          last_sync_at?: string | null
          platform: Database["public"]["Enums"]["integration_provider"]
          provider: Database["public"]["Enums"]["integration_provider"]
          status?: Database["public"]["Enums"]["integration_status"]
          updated_at?: string
        }
        Update: {
          api_token?: string | null
          auto_request_delay_days?: number
          auto_request_delay_minutes?: number | null
          auto_request_enabled?: boolean
          business_id?: string
          config?: Json
          created_at?: string
          credentials?: Json
          credentials_encrypted?: string | null
          id?: string
          last_sync_at?: string | null
          platform?: Database["public"]["Enums"]["integration_provider"]
          provider?: Database["public"]["Enums"]["integration_provider"]
          status?: Database["public"]["Enums"]["integration_status"]
          updated_at?: string
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
      pii_encryption_audit: {
        Row: {
          action: string
          actor_user_id: string | null
          business_id: string | null
          context: Json
          created_at: string
          id: string
          resource_id: string
          resource_table: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          business_id?: string | null
          context?: Json
          created_at?: string
          id?: string
          resource_id: string
          resource_table: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          business_id?: string | null
          context?: Json
          created_at?: string
          id?: string
          resource_id?: string
          resource_table?: string
        }
        Relationships: []
      }
      proof_objects: {
        Row: {
          ai_confidence: number | null
          ai_summary: string | null
          author_avatar_url: string | null
          author_company: string | null
          author_company_logo_url: string | null
          author_email: string | null
          author_email_encrypted: string | null
          author_name: string | null
          author_photo_url: string | null
          author_role: string | null
          author_website_url: string | null
          business_id: string
          content: string | null
          content_pieces_count: number
          created_at: string
          cta_label: string | null
          cta_url: string | null
          customer_email_hash: string | null
          customer_handle: string | null
          external_ref_id: string | null
          highlight_phrase: string | null
          id: string
          media_duration_seconds: number | null
          media_size_bytes: number | null
          media_type: string | null
          media_url: string | null
          outcome_claim: string | null
          poster_url: string | null
          product_reference: string | null
          proof_event_at: string | null
          proof_type: Database["public"]["Enums"]["proof_type"]
          published_at: string | null
          rating: number | null
          raw_content: string | null
          schema_version: number
          sentiment_score: number | null
          source: string | null
          source_metadata: Json
          status: Database["public"]["Enums"]["proof_status"]
          tags: string[]
          transcript: string | null
          type: Database["public"]["Enums"]["proof_type"]
          updated_at: string
          verification_method: string | null
          verification_tier: string | null
          verification_tier_int: number | null
          verified: boolean
          video_url: string | null
        }
        Insert: {
          ai_confidence?: number | null
          ai_summary?: string | null
          author_avatar_url?: string | null
          author_company?: string | null
          author_company_logo_url?: string | null
          author_email?: string | null
          author_email_encrypted?: string | null
          author_name?: string | null
          author_photo_url?: string | null
          author_role?: string | null
          author_website_url?: string | null
          business_id: string
          content?: string | null
          content_pieces_count?: number
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          customer_email_hash?: string | null
          customer_handle?: string | null
          external_ref_id?: string | null
          highlight_phrase?: string | null
          id?: string
          media_duration_seconds?: number | null
          media_size_bytes?: number | null
          media_type?: string | null
          media_url?: string | null
          outcome_claim?: string | null
          poster_url?: string | null
          product_reference?: string | null
          proof_event_at?: string | null
          proof_type: Database["public"]["Enums"]["proof_type"]
          published_at?: string | null
          rating?: number | null
          raw_content?: string | null
          schema_version?: number
          sentiment_score?: number | null
          source?: string | null
          source_metadata?: Json
          status?: Database["public"]["Enums"]["proof_status"]
          tags?: string[]
          transcript?: string | null
          type: Database["public"]["Enums"]["proof_type"]
          updated_at?: string
          verification_method?: string | null
          verification_tier?: string | null
          verification_tier_int?: number | null
          verified?: boolean
          video_url?: string | null
        }
        Update: {
          ai_confidence?: number | null
          ai_summary?: string | null
          author_avatar_url?: string | null
          author_company?: string | null
          author_company_logo_url?: string | null
          author_email?: string | null
          author_email_encrypted?: string | null
          author_name?: string | null
          author_photo_url?: string | null
          author_role?: string | null
          author_website_url?: string | null
          business_id?: string
          content?: string | null
          content_pieces_count?: number
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          customer_email_hash?: string | null
          customer_handle?: string | null
          external_ref_id?: string | null
          highlight_phrase?: string | null
          id?: string
          media_duration_seconds?: number | null
          media_size_bytes?: number | null
          media_type?: string | null
          media_url?: string | null
          outcome_claim?: string | null
          poster_url?: string | null
          product_reference?: string | null
          proof_event_at?: string | null
          proof_type?: Database["public"]["Enums"]["proof_type"]
          published_at?: string | null
          rating?: number | null
          raw_content?: string | null
          schema_version?: number
          sentiment_score?: number | null
          source?: string | null
          source_metadata?: Json
          status?: Database["public"]["Enums"]["proof_status"]
          tags?: string[]
          transcript?: string | null
          type?: Database["public"]["Enums"]["proof_type"]
          updated_at?: string
          verification_method?: string | null
          verification_tier?: string | null
          verification_tier_int?: number | null
          verified?: boolean
          video_url?: string | null
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
      publishing_channels: {
        Row: {
          account_label: string | null
          business_id: string
          config: Json
          created_at: string
          credentials_encrypted: string | null
          external_account_id: string | null
          id: string
          last_used_at: string | null
          provider: Database["public"]["Enums"]["publish_channel_provider"]
          status: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          account_label?: string | null
          business_id: string
          config?: Json
          created_at?: string
          credentials_encrypted?: string | null
          external_account_id?: string | null
          id?: string
          last_used_at?: string | null
          provider: Database["public"]["Enums"]["publish_channel_provider"]
          status?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          account_label?: string | null
          business_id?: string
          config?: Json
          created_at?: string
          credentials_encrypted?: string | null
          external_account_id?: string | null
          id?: string
          last_used_at?: string | null
          provider?: Database["public"]["Enums"]["publish_channel_provider"]
          status?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          bucket_key: string
          count: number
          created_at: string
          id: string
          window_start: string
        }
        Insert: {
          bucket_key: string
          count?: number
          created_at?: string
          id?: string
          window_start: string
        }
        Update: {
          bucket_key?: string
          count?: number
          created_at?: string
          id?: string
          window_start?: string
        }
        Relationships: []
      }
      scheduled_jobs: {
        Row: {
          attempts: number
          business_id: string | null
          created_at: string
          id: string
          job_type: string
          last_error: string | null
          payload: Json
          run_at: string
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          business_id?: string | null
          created_at?: string
          id?: string
          job_type?: string
          last_error?: string | null
          payload?: Json
          run_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          business_id?: string | null
          created_at?: string
          id?: string
          job_type?: string
          last_error?: string | null
          payload?: Json
          run_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_invitations: {
        Row: {
          accepted_at: string | null
          business_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          business_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          business_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      testimonial_requests: {
        Row: {
          attempts: number
          business_id: string
          campaign_id: string | null
          completed_at: string | null
          created_at: string
          custom_message: string | null
          expires_at: string
          id: string
          opened_at: string | null
          prompt_questions: Json
          proof_object_id: string | null
          recipient_email: string
          recipient_name: string | null
          reminder_delay_days: number
          reminder_enabled: boolean
          reminder_sent_at: string | null
          requested_type: string
          responded_at: string | null
          send_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["testimonial_request_status"]
          token: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          business_id: string
          campaign_id?: string | null
          completed_at?: string | null
          created_at?: string
          custom_message?: string | null
          expires_at?: string
          id?: string
          opened_at?: string | null
          prompt_questions?: Json
          proof_object_id?: string | null
          recipient_email: string
          recipient_name?: string | null
          reminder_delay_days?: number
          reminder_enabled?: boolean
          reminder_sent_at?: string | null
          requested_type?: string
          responded_at?: string | null
          send_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["testimonial_request_status"]
          token?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          business_id?: string
          campaign_id?: string | null
          completed_at?: string | null
          created_at?: string
          custom_message?: string | null
          expires_at?: string
          id?: string
          opened_at?: string | null
          prompt_questions?: Json
          proof_object_id?: string | null
          recipient_email?: string
          recipient_name?: string | null
          reminder_delay_days?: number
          reminder_enabled?: boolean
          reminder_sent_at?: string | null
          requested_type?: string
          responded_at?: string | null
          send_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["testimonial_request_status"]
          token?: string
          updated_at?: string
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
            foreignKeyName: "testimonial_requests_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
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
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_admin: boolean
          onboarding_completed: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_admin?: boolean
          onboarding_completed?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_admin?: boolean
          onboarding_completed?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      widget_events: {
        Row: {
          business_id: string
          device_type: string | null
          event_type: string
          fired_at: string
          id: string
          meta: Json
          page_url: string | null
          proof_object_id: string | null
          session_id: string | null
          variant: string | null
          visitor_id: string | null
          visitor_type: string | null
          widget_id: string
        }
        Insert: {
          business_id: string
          device_type?: string | null
          event_type: string
          fired_at?: string
          id?: string
          meta?: Json
          page_url?: string | null
          proof_object_id?: string | null
          session_id?: string | null
          variant?: string | null
          visitor_id?: string | null
          visitor_type?: string | null
          widget_id: string
        }
        Update: {
          business_id?: string
          device_type?: string | null
          event_type?: string
          fired_at?: string
          id?: string
          meta?: Json
          page_url?: string | null
          proof_object_id?: string | null
          session_id?: string | null
          variant?: string | null
          visitor_id?: string | null
          visitor_type?: string | null
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
      widgets: {
        Row: {
          ab_test_group_id: string | null
          business_id: string
          config: Json
          created_at: string
          frequency_cap_per_user: number | null
          id: string
          impressions_total: number
          interactions_total: number
          load_delay_ms: number
          name: string
          status: Database["public"]["Enums"]["widget_status"]
          target_url: string | null
          type: Database["public"]["Enums"]["widget_type"]
          updated_at: string
          variant: string | null
        }
        Insert: {
          ab_test_group_id?: string | null
          business_id: string
          config?: Json
          created_at?: string
          frequency_cap_per_user?: number | null
          id?: string
          impressions_total?: number
          interactions_total?: number
          load_delay_ms?: number
          name: string
          status?: Database["public"]["Enums"]["widget_status"]
          target_url?: string | null
          type?: Database["public"]["Enums"]["widget_type"]
          updated_at?: string
          variant?: string | null
        }
        Update: {
          ab_test_group_id?: string | null
          business_id?: string
          config?: Json
          created_at?: string
          frequency_cap_per_user?: number | null
          id?: string
          impressions_total?: number
          interactions_total?: number
          load_delay_ms?: number
          name?: string
          status?: Database["public"]["Enums"]["widget_status"]
          target_url?: string | null
          type?: Database["public"]["Enums"]["widget_type"]
          updated_at?: string
          variant?: string | null
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
      accept_team_invitation: { Args: { _token: string }; Returns: string }
      admin_daily_series: {
        Args: { _days?: number }
        Returns: {
          day: string
          new_businesses: number
          new_proofs: number
        }[]
      }
      admin_integration_health: {
        Args: never
        Returns: {
          business_id: string
          business_name: string
          events_24h: number
          integration_id: string
          last_sync_at: string
          processed_24h: number
          provider: string
          status: string
          success_rate: number
          unprocessed_24h: number
        }[]
      }
      admin_overview_stats: { Args: never; Returns: Json }
      admin_replay_integration_event: {
        Args: { _event_id: string }
        Returns: boolean
      }
      business_id_for_collection_token: {
        Args: { _token: string }
        Returns: string
      }
      business_integration_stats: {
        Args: { _business_id: string }
        Returns: {
          events_total: number
          integration_id: string
          last_event_at: string
          proof_count: number
        }[]
      }
      business_plan_usage: { Args: { _business_id: string }; Returns: Json }
      can_activate_widget: {
        Args: { _business_id: string; _exclude_widget?: string }
        Returns: boolean
      }
      can_add_domain: { Args: { _business_id: string }; Returns: boolean }
      can_create_proof: { Args: { _business_id: string }; Returns: boolean }
      can_invite_seat: { Args: { _business_id: string }; Returns: boolean }
      can_upload_media: {
        Args: { _additional_bytes: number; _business_id: string }
        Returns: boolean
      }
      check_rate_limit: {
        Args: { _key: string; _max: number; _window_seconds: number }
        Returns: boolean
      }
      cleanup_rate_limits: { Args: never; Returns: number }
      create_business: { Args: { _name: string }; Returns: string }
      create_placeholder_proof_for_request: {
        Args: { _business_id: string }
        Returns: string
      }
      get_collection_context: {
        Args: { _token: string }
        Returns: {
          brand_color: string
          business_logo_url: string
          business_name: string
          expires_at: string
          recipient_name: string
          status: Database["public"]["Enums"]["testimonial_request_status"]
        }[]
      }
      get_testimonial_request: {
        Args: { _token: string }
        Returns: {
          expires_at: string
          recipient_name: string
          status: Database["public"]["Enums"]["testimonial_request_status"]
          token: string
        }[]
      }
      get_top_proof_performance: {
        Args: {
          _business_id: string
          _end: string
          _limit?: number
          _start: string
        }
        Returns: {
          assists: number
          author_name: string
          conversions: number
          impressions: number
          interactions: number
          proof_id: string
          proof_type: string
        }[]
      }
      get_widget_analytics: {
        Args: { _business_id: string; _end: string; _start: string }
        Returns: {
          assists: number
          bucket: string
          conversions: number
          impressions: number
          interactions: number
        }[]
      }
      has_business_role: {
        Args: {
          _business_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      is_business_member: { Args: { _business_id: string }; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
      log_admin_action: {
        Args: { _action: string; _business_id: string; _details?: Json }
        Returns: string
      }
      mark_business_onboarding_complete: {
        Args: { _business_id: string }
        Returns: boolean
      }
      mark_testimonial_request_opened: {
        Args: { _token: string }
        Returns: boolean
      }
      normalize_domain: { Args: { _raw: string }; Returns: string }
      plan_limits: {
        Args: { _plan: string }
        Returns: {
          active_widget_limit: number
          data_retention_days: number
          domain_limit: number
          event_limit: number
          max_video_seconds: number
          proof_limit: number
          remove_branding: boolean
          storage_mb: number
          team_seats_included: number
        }[]
      }
      submit_testimonial_request:
        | {
            Args: {
              _author_email: string
              _author_name: string
              _content: string
              _media_url?: string
              _rating?: number
              _token: string
            }
            Returns: string
          }
        | {
            Args: {
              _author_company?: string
              _author_email: string
              _author_name: string
              _author_photo_url?: string
              _author_role?: string
              _author_website_url?: string
              _content: string
              _media_url?: string
              _rating?: number
              _token: string
            }
            Returns: string
          }
        | {
            Args: {
              _author_company?: string
              _author_email: string
              _author_name: string
              _author_photo_url?: string
              _author_role?: string
              _author_website_url?: string
              _content: string
              _highlight_phrase?: string
              _media_url?: string
              _outcome_claim?: string
              _rating?: number
              _token: string
            }
            Returns: string
          }
      update_proof_media_metadata: {
        Args: { _bytes: number; _duration_seconds: number; _proof_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "editor" | "viewer"
      campaign_type: "post_purchase" | "milestone" | "anniversary" | "manual"
      case_study_status: "draft" | "published" | "archived"
      content_output_type:
        | "twitter_post"
        | "linkedin_post"
        | "email_block"
        | "ad_copy_headline"
        | "ad_copy_body"
        | "website_quote"
        | "short_caption"
        | "meta_description"
        | "case_study_section"
      content_piece_status: "draft" | "approved" | "published" | "archived"
      integration_provider:
        | "stripe"
        | "shopify"
        | "woocommerce"
        | "gumroad"
        | "webhook"
        | "zapier"
        | "google_reviews"
        | "trustpilot"
        | "plaid"
        | "wordpress"
        | "g2"
      integration_status: "connected" | "disconnected" | "error" | "pending"
      proof_status:
        | "pending"
        | "approved"
        | "rejected"
        | "archived"
        | "pending_review"
      proof_type:
        | "testimonial"
        | "review"
        | "purchase"
        | "signup"
        | "visitor_count"
        | "custom"
      publish_channel_provider:
        | "buffer"
        | "mailchimp"
        | "klaviyo"
        | "convertkit"
        | "linkedin"
        | "twitter"
      publish_event_status:
        | "scheduled"
        | "publishing"
        | "published"
        | "failed"
        | "cancelled"
      testimonial_request_status:
        | "pending"
        | "sent"
        | "completed"
        | "expired"
        | "scheduled"
        | "opened"
        | "responded"
      widget_status: "draft" | "active" | "paused"
      widget_type:
        | "popup"
        | "banner"
        | "inline"
        | "wall"
        | "carousel"
        | "marquee"
        | "masonry"
        | "avatar_row"
        | "video_hero"
        | "logo_strip"
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
      app_role: ["owner", "editor", "viewer"],
      campaign_type: ["post_purchase", "milestone", "anniversary", "manual"],
      case_study_status: ["draft", "published", "archived"],
      content_output_type: [
        "twitter_post",
        "linkedin_post",
        "email_block",
        "ad_copy_headline",
        "ad_copy_body",
        "website_quote",
        "short_caption",
        "meta_description",
        "case_study_section",
      ],
      content_piece_status: ["draft", "approved", "published", "archived"],
      integration_provider: [
        "stripe",
        "shopify",
        "woocommerce",
        "gumroad",
        "webhook",
        "zapier",
        "google_reviews",
        "trustpilot",
        "plaid",
        "wordpress",
        "g2",
      ],
      integration_status: ["connected", "disconnected", "error", "pending"],
      proof_status: [
        "pending",
        "approved",
        "rejected",
        "archived",
        "pending_review",
      ],
      proof_type: [
        "testimonial",
        "review",
        "purchase",
        "signup",
        "visitor_count",
        "custom",
      ],
      publish_channel_provider: [
        "buffer",
        "mailchimp",
        "klaviyo",
        "convertkit",
        "linkedin",
        "twitter",
      ],
      publish_event_status: [
        "scheduled",
        "publishing",
        "published",
        "failed",
        "cancelled",
      ],
      testimonial_request_status: [
        "pending",
        "sent",
        "completed",
        "expired",
        "scheduled",
        "opened",
        "responded",
      ],
      widget_status: ["draft", "active", "paused"],
      widget_type: [
        "popup",
        "banner",
        "inline",
        "wall",
        "carousel",
        "marquee",
        "masonry",
        "avatar_row",
        "video_hero",
        "logo_strip",
      ],
    },
  },
} as const
