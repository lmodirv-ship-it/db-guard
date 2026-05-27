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
      api_keys: {
        Row: {
          created_at: string
          id: string
          key_hash: string
          key_prefix: string
          name: string
          revoked_at: string | null
          scopes: string[]
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          key_prefix: string
          name: string
          revoked_at?: string | null
          scopes?: string[]
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          key_prefix?: string
          name?: string
          revoked_at?: string | null
          scopes?: string[]
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      auth_audit_log: {
        Row: {
          created_at: string
          email: string | null
          event: string
          id: string
          ip_address: string | null
          metadata: Json | null
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          event: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          event?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      connected_apps: {
        Row: {
          allowed_redirect_hosts: string[]
          app_key: string
          created_at: string
          id: string
          name: string
          status: string
        }
        Insert: {
          allowed_redirect_hosts?: string[]
          app_key: string
          created_at?: string
          id?: string
          name: string
          status?: string
        }
        Update: {
          allowed_redirect_hosts?: string[]
          app_key?: string
          created_at?: string
          id?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      dbguard_connections: {
        Row: {
          api_key_hash: string | null
          api_key_hint: string | null
          created_at: string
          endpoint_url: string | null
          id: string
          last_synced_at: string | null
          project_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key_hash?: string | null
          api_key_hint?: string | null
          created_at?: string
          endpoint_url?: string | null
          id?: string
          last_synced_at?: string | null
          project_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key_hash?: string | null
          api_key_hint?: string | null
          created_at?: string
          endpoint_url?: string | null
          id?: string
          last_synced_at?: string | null
          project_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dbguard_export_logs: {
        Row: {
          created_at: string
          error: string | null
          id: string
          items_count: number
          payload_size: number
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          items_count?: number
          payload_size?: number
          status: string
          user_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          items_count?: number
          payload_size?: number
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          status: string
          subject: string
          to_email: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          status: string
          subject: string
          to_email: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          status?: string
          subject?: string
          to_email?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      email_verification_codes: {
        Row: {
          attempts: number
          code_hash: string
          created_at: string
          email: string
          expires_at: string
          id: string
          ip_address: string | null
          purpose: string
          used_at: string | null
          user_agent: string | null
        }
        Insert: {
          attempts?: number
          code_hash: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          ip_address?: string | null
          purpose?: string
          used_at?: string | null
          user_agent?: string | null
        }
        Update: {
          attempts?: number
          code_hash?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          purpose?: string
          used_at?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      hn_api_keys: {
        Row: {
          created_at: string
          full_key: string | null
          hn_user_id: string
          id: string
          key_hash: string
          key_hint: string
          key_prefix: string
          label: string
          last_used_at: string | null
          revoked_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          full_key?: string | null
          hn_user_id: string
          id?: string
          key_hash: string
          key_hint: string
          key_prefix: string
          label?: string
          last_used_at?: string | null
          revoked_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          full_key?: string | null
          hn_user_id?: string
          id?: string
          key_hash?: string
          key_hint?: string
          key_prefix?: string
          label?: string
          last_used_at?: string | null
          revoked_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hn_api_keys_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "hn_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      hn_api_logs: {
        Row: {
          api_key_id: string | null
          created_at: string
          duration_ms: number | null
          endpoint: string
          error: string | null
          hn_user_id: string | null
          id: number
          ip: string | null
          method: string
          origin: string | null
          request_bytes: number | null
          response_bytes: number | null
          status: number
          user_agent: string | null
          workspace_id: string | null
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string
          duration_ms?: number | null
          endpoint: string
          error?: string | null
          hn_user_id?: string | null
          id?: number
          ip?: string | null
          method: string
          origin?: string | null
          request_bytes?: number | null
          response_bytes?: number | null
          status: number
          user_agent?: string | null
          workspace_id?: string | null
        }
        Update: {
          api_key_id?: string | null
          created_at?: string
          duration_ms?: number | null
          endpoint?: string
          error?: string | null
          hn_user_id?: string | null
          id?: number
          ip?: string | null
          method?: string
          origin?: string | null
          request_bytes?: number | null
          response_bytes?: number | null
          status?: number
          user_agent?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      hn_data_records: {
        Row: {
          collection: string
          created_at: string
          data: Json
          id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          collection: string
          created_at?: string
          data?: Json
          id?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          collection?: string
          created_at?: string
          data?: Json
          id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hn_data_records_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "hn_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      hn_databases: {
        Row: {
          created_at: string
          hn_user_id: string
          id: string
          name: string
          region: string
          status: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          hn_user_id: string
          id?: string
          name?: string
          region?: string
          status?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          hn_user_id?: string
          id?: string
          name?: string
          region?: string
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hn_databases_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "hn_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      hn_sessions: {
        Row: {
          created_at: string
          device: string | null
          expires_at: string
          hn_user_code: string
          id: string
          ip_address: string | null
          last_active_at: string
          revoked_at: string | null
          source_app: string | null
          token_hash: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device?: string | null
          expires_at: string
          hn_user_code: string
          id?: string
          ip_address?: string | null
          last_active_at?: string
          revoked_at?: string | null
          source_app?: string | null
          token_hash: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device?: string | null
          expires_at?: string
          hn_user_code?: string
          id?: string
          ip_address?: string | null
          last_active_at?: string
          revoked_at?: string | null
          source_app?: string | null
          token_hash?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hn_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "hn_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hn_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "registered_users"
            referencedColumns: ["id"]
          },
        ]
      }
      hn_sites: {
        Row: {
          allowed_origins: string[]
          auth_enabled: boolean
          created_at: string
          data_enabled: boolean
          id: string
          name: string
          site_host: string
          site_url: string
          slug: string
          sso_app_key: string | null
          status: string
          storage_enabled: boolean
          storage_scope: string
          updated_at: string
          verified_at: string | null
          workspace_id: string
        }
        Insert: {
          allowed_origins?: string[]
          auth_enabled?: boolean
          created_at?: string
          data_enabled?: boolean
          id?: string
          name: string
          site_host: string
          site_url: string
          slug: string
          sso_app_key?: string | null
          status?: string
          storage_enabled?: boolean
          storage_scope?: string
          updated_at?: string
          verified_at?: string | null
          workspace_id: string
        }
        Update: {
          allowed_origins?: string[]
          auth_enabled?: boolean
          created_at?: string
          data_enabled?: boolean
          id?: string
          name?: string
          site_host?: string
          site_url?: string
          slug?: string
          sso_app_key?: string | null
          status?: string
          storage_enabled?: boolean
          storage_scope?: string
          updated_at?: string
          verified_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hn_sites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "hn_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      hn_sso_tickets: {
        Row: {
          created_at: string
          expires_at: string
          hn_user_code: string
          id: string
          redirect_url: string
          source_app: string | null
          target_app: string
          ticket_hash: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          hn_user_code: string
          id?: string
          redirect_url: string
          source_app?: string | null
          target_app: string
          ticket_hash: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          hn_user_code?: string
          id?: string
          redirect_url?: string
          source_app?: string | null
          target_app?: string
          ticket_hash?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      hn_storage_objects: {
        Row: {
          content_type: string | null
          created_at: string
          file_name: string
          id: string
          object_key: string
          site_id: string | null
          size_bytes: number
          updated_at: string
          uploaded_by_hn_user_id: string | null
          visibility: string
          workspace_id: string
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          file_name: string
          id?: string
          object_key: string
          site_id?: string | null
          size_bytes?: number
          updated_at?: string
          uploaded_by_hn_user_id?: string | null
          visibility?: string
          workspace_id: string
        }
        Update: {
          content_type?: string | null
          created_at?: string
          file_name?: string
          id?: string
          object_key?: string
          site_id?: string | null
          size_bytes?: number
          updated_at?: string
          uploaded_by_hn_user_id?: string | null
          visibility?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hn_storage_objects_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "hn_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hn_storage_objects_uploaded_by_hn_user_id_fkey"
            columns: ["uploaded_by_hn_user_id"]
            isOneToOne: false
            referencedRelation: "hn_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hn_storage_objects_uploaded_by_hn_user_id_fkey"
            columns: ["uploaded_by_hn_user_id"]
            isOneToOne: false
            referencedRelation: "registered_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hn_storage_objects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "hn_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      hn_users: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string
          email_verified: boolean
          full_name: string
          hn_user_code: string
          id: string
          last_login_at: string | null
          password_hash: string
          phone: string | null
          plan: string
          redirect_url: string | null
          registration_source: string | null
          source_app: string | null
          status: string
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email: string
          email_verified?: boolean
          full_name: string
          hn_user_code: string
          id?: string
          last_login_at?: string | null
          password_hash: string
          phone?: string | null
          plan?: string
          redirect_url?: string | null
          registration_source?: string | null
          source_app?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string
          email_verified?: boolean
          full_name?: string
          hn_user_code?: string
          id?: string
          last_login_at?: string | null
          password_hash?: string
          phone?: string | null
          plan?: string
          redirect_url?: string | null
          registration_source?: string | null
          source_app?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      hn_workspaces: {
        Row: {
          created_at: string
          hn_user_id: string
          id: string
          name: string
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          hn_user_id: string
          id?: string
          name: string
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          hn_user_id?: string
          id?: string
          name?: string
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      id_user_records: {
        Row: {
          created_at: string
          data: Json
          id: string
          owner_id: string
          title: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          owner_id: string
          title: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          owner_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "id_user_records_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "id_users"
            referencedColumns: ["id"]
          },
        ]
      }
      id_users: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          login_id: string
          phone: string | null
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          login_id: string
          phone?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          login_id?: string
          phone?: string | null
          status?: string
        }
        Relationships: []
      }
      password_reset_logs: {
        Row: {
          action: string
          created_at: string
          email: string | null
          id: string
          ip: string | null
          metadata: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          email?: string | null
          id?: string
          ip?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          email?: string | null
          id?: string
          ip?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      password_reset_tokens: {
        Row: {
          attempts: number
          channel: string
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          ip: string | null
          token_hash: string
          used_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          attempts?: number
          channel?: string
          code_hash: string
          created_at?: string
          expires_at: string
          id?: string
          ip?: string | null
          token_hash: string
          used_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          attempts?: number
          channel?: string
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          ip?: string | null
          token_hash?: string
          used_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_activity_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          user_id?: string
        }
        Relationships: []
      }
      user_files: {
        Row: {
          created_at: string
          id: string
          mime_type: string | null
          name: string
          size_bytes: number
          url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mime_type?: string | null
          name: string
          size_bytes?: number
          url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mime_type?: string | null
          name?: string
          size_bytes?: number
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          language: string
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          language?: string
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          language?: string
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_records: {
        Row: {
          created_at: string
          data: Json
          id: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          title?: string
          type?: string
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
      registered_users: {
        Row: {
          created_at: string | null
          email: string | null
          email_verified: boolean | null
          full_name: string | null
          hn_user_code: string | null
          id: string | null
          last_login_at: string | null
          phone: string | null
          plan: string | null
          registration_source: string | null
          source_app: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          email_verified?: boolean | null
          full_name?: string | null
          hn_user_code?: string | null
          id?: string | null
          last_login_at?: string | null
          phone?: string | null
          plan?: string | null
          registration_source?: string | null
          source_app?: never
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          email_verified?: boolean | null
          full_name?: string | null
          hn_user_code?: string | null
          id?: string | null
          last_login_at?: string | null
          phone?: string | null
          plan?: string | null
          registration_source?: string | null
          source_app?: never
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      generate_hn_user_code: { Args: never; Returns: string }
      get_public_tables: {
        Args: never
        Returns: {
          row_count_est: number
          table_name: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      list_public_tables: {
        Args: never
        Returns: {
          row_count: number
          table_name: string
        }[]
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "user"
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
      app_role: ["owner", "admin", "user"],
    },
  },
} as const
