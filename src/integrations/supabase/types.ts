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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      achievement_catalogue: {
        Row: {
          code: string
          description: string
          family: Database["public"]["Enums"]["achievement_family"]
          goal: number | null
          icon: string | null
          metadata: Json | null
          name: string
        }
        Insert: {
          code: string
          description: string
          family: Database["public"]["Enums"]["achievement_family"]
          goal?: number | null
          icon?: string | null
          metadata?: Json | null
          name: string
        }
        Update: {
          code?: string
          description?: string
          family?: Database["public"]["Enums"]["achievement_family"]
          goal?: number | null
          icon?: string | null
          metadata?: Json | null
          name?: string
        }
        Relationships: []
      }
      achievements: {
        Row: {
          achievement_type: string
          earned_at: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          achievement_type: string
          earned_at?: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          achievement_type?: string
          earned_at?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          sender_id: string
          thread_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          sender_id: string
          thread_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "direct_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_threads: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          last_read_at_a: string
          last_read_at_b: string
          member_a: string
          member_b: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          last_read_at_a?: string
          last_read_at_b?: string
          member_a: string
          member_b: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          last_read_at_a?: string
          last_read_at_b?: string
          member_a?: string
          member_b?: string
        }
        Relationships: []
      }
      edge_invocation_logs: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_message: string | null
          function_name: string
          id: string
          metadata: Json | null
          status: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          function_name: string
          id?: string
          metadata?: Json | null
          status: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          function_name?: string
          id?: string
          metadata?: Json | null
          status?: string
        }
        Relationships: []
      }
      event_areas: {
        Row: {
          ends_at: string | null
          id: string
          lat: number
          lng: number
          name: string
          radius_m: number
          shape: Database["public"]["Enums"]["event_shape"] | null
          starts_at: string | null
          vibe: string | null
        }
        Insert: {
          ends_at?: string | null
          id?: string
          lat: number
          lng: number
          name: string
          radius_m: number
          shape?: Database["public"]["Enums"]["event_shape"] | null
          starts_at?: string | null
          vibe?: string | null
        }
        Update: {
          ends_at?: string | null
          id?: string
          lat?: number
          lng?: number
          name?: string
          radius_m?: number
          shape?: Database["public"]["Enums"]["event_shape"] | null
          starts_at?: string | null
          vibe?: string | null
        }
        Relationships: []
      }
      flock_auto_suggestions: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          expires_at: string | null
          id: string
          reasoning_data: Json | null
          status: Database["public"]["Enums"]["suggestion_status_enum"] | null
          suggested_users: string[] | null
          suggestion_type: Database["public"]["Enums"]["suggestion_type_enum"]
          target_floq_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          reasoning_data?: Json | null
          status?: Database["public"]["Enums"]["suggestion_status_enum"] | null
          suggested_users?: string[] | null
          suggestion_type: Database["public"]["Enums"]["suggestion_type_enum"]
          target_floq_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          reasoning_data?: Json | null
          status?: Database["public"]["Enums"]["suggestion_status_enum"] | null
          suggested_users?: string[] | null
          suggestion_type?: Database["public"]["Enums"]["suggestion_type_enum"]
          target_floq_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flock_auto_suggestions_target_floq_id_fkey"
            columns: ["target_floq_id"]
            isOneToOne: false
            referencedRelation: "floqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flock_auto_suggestions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      flock_history: {
        Row: {
          created_at: string | null
          event_type: Database["public"]["Enums"]["flock_event_type_enum"]
          floq_id: string
          id: string
          metadata: Json | null
          new_vibe: Database["public"]["Enums"]["vibe_enum"] | null
          previous_vibe: Database["public"]["Enums"]["vibe_enum"] | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: Database["public"]["Enums"]["flock_event_type_enum"]
          floq_id: string
          id?: string
          metadata?: Json | null
          new_vibe?: Database["public"]["Enums"]["vibe_enum"] | null
          previous_vibe?: Database["public"]["Enums"]["vibe_enum"] | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: Database["public"]["Enums"]["flock_event_type_enum"]
          floq_id?: string
          id?: string
          metadata?: Json | null
          new_vibe?: Database["public"]["Enums"]["vibe_enum"] | null
          previous_vibe?: Database["public"]["Enums"]["vibe_enum"] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flock_history_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flock_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      flock_relationships: {
        Row: {
          created_at: string | null
          id: string
          interaction_count: number | null
          last_interaction_at: string | null
          relationship_strength: number | null
          updated_at: string | null
          user_a_id: string
          user_b_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          interaction_count?: number | null
          last_interaction_at?: string | null
          relationship_strength?: number | null
          updated_at?: string | null
          user_a_id: string
          user_b_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          interaction_count?: number | null
          last_interaction_at?: string | null
          relationship_strength?: number | null
          updated_at?: string | null
          user_a_id?: string
          user_b_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_a"
            columns: ["user_a_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_b"
            columns: ["user_b_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      floq_boosts: {
        Row: {
          boost_type: string
          created_at: string
          expires_at: string
          floq_id: string
          id: string
          user_id: string
        }
        Insert: {
          boost_type?: string
          created_at?: string
          expires_at?: string
          floq_id: string
          id?: string
          user_id: string
        }
        Update: {
          boost_type?: string
          created_at?: string
          expires_at?: string
          floq_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_floq_boosts_floq"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_boosts_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      floq_ignored: {
        Row: {
          floq_id: string
          ignored_at: string | null
          user_id: string
        }
        Insert: {
          floq_id: string
          ignored_at?: string | null
          user_id: string
        }
        Update: {
          floq_id?: string
          ignored_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "floq_ignored_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floqs"
            referencedColumns: ["id"]
          },
        ]
      }
      floq_invitations: {
        Row: {
          created_at: string
          floq_id: string
          id: string
          invitee_id: string
          inviter_id: string
          responded_at: string | null
          status: Database["public"]["Enums"]["invitation_status"]
        }
        Insert: {
          created_at?: string
          floq_id: string
          id?: string
          invitee_id: string
          inviter_id: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["invitation_status"]
        }
        Update: {
          created_at?: string
          floq_id?: string
          id?: string
          invitee_id?: string
          inviter_id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["invitation_status"]
        }
        Relationships: [
          {
            foreignKeyName: "floq_invitations_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_invitations_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_invitations_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      floq_mention_cooldown: {
        Row: {
          floq_id: string
          last_mention_at: string
          user_id: string
        }
        Insert: {
          floq_id: string
          last_mention_at?: string
          user_id: string
        }
        Update: {
          floq_id?: string
          last_mention_at?: string
          user_id?: string
        }
        Relationships: []
      }
      floq_messages: {
        Row: {
          body: string | null
          created_at: string
          emoji: string | null
          floq_id: string
          id: string
          sender_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          emoji?: string | null
          floq_id: string
          id?: string
          sender_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          emoji?: string | null
          floq_id?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "floq_messages_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      floq_participants: {
        Row: {
          floq_id: string
          joined_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          floq_id: string
          joined_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          floq_id?: string
          joined_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "floq_participants_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      floq_plans: {
        Row: {
          created_at: string | null
          creator_id: string
          description: string | null
          end_at: string | null
          floq_id: string
          id: string
          location: unknown | null
          max_participants: number | null
          planned_at: string
          status: Database["public"]["Enums"]["plan_status_enum"] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          description?: string | null
          end_at?: string | null
          floq_id: string
          id?: string
          location?: unknown | null
          max_participants?: number | null
          planned_at: string
          status?: Database["public"]["Enums"]["plan_status_enum"] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          description?: string | null
          end_at?: string | null
          floq_id?: string
          id?: string
          location?: unknown | null
          max_participants?: number | null
          planned_at?: string
          status?: Database["public"]["Enums"]["plan_status_enum"] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "floq_plans_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floqs"
            referencedColumns: ["id"]
          },
        ]
      }
      floq_settings: {
        Row: {
          activity_visibility: Database["public"]["Enums"]["activity_visibility_enum"]
          floq_id: string
          join_approval_required: boolean
          mention_permissions: Database["public"]["Enums"]["mention_permissions_enum"]
          notifications_enabled: boolean
          updated_at: string
          welcome_message: string | null
        }
        Insert: {
          activity_visibility?: Database["public"]["Enums"]["activity_visibility_enum"]
          floq_id: string
          join_approval_required?: boolean
          mention_permissions?: Database["public"]["Enums"]["mention_permissions_enum"]
          notifications_enabled?: boolean
          updated_at?: string
          welcome_message?: string | null
        }
        Update: {
          activity_visibility?: Database["public"]["Enums"]["activity_visibility_enum"]
          floq_id?: string
          join_approval_required?: boolean
          mention_permissions?: Database["public"]["Enums"]["mention_permissions_enum"]
          notifications_enabled?: boolean
          updated_at?: string
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "floq_settings_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: true
            referencedRelation: "floqs"
            referencedColumns: ["id"]
          },
        ]
      }
      floqs: {
        Row: {
          activity_score: number
          auto_created: boolean | null
          catchment_area: unknown | null
          created_at: string | null
          creator_id: string | null
          deleted_at: string | null
          description: string | null
          ends_at: string | null
          expires_at: string | null
          flock_tags: string[] | null
          flock_type: Database["public"]["Enums"]["flock_type_enum"] | null
          geo: unknown | null
          id: string
          last_activity_at: string | null
          location: unknown
          max_participants: number | null
          name: string | null
          parent_flock_id: string | null
          pinned_note: string | null
          primary_vibe: Database["public"]["Enums"]["vibe_enum"]
          radius_m: number | null
          recurrence_pattern: Json | null
          starts_at: string | null
          title: string
          type: string | null
          updated_at: string | null
          vibe_tag: Database["public"]["Enums"]["vibe_enum"] | null
          visibility: string | null
          walkable_zone: unknown | null
        }
        Insert: {
          activity_score?: number
          auto_created?: boolean | null
          catchment_area?: unknown | null
          created_at?: string | null
          creator_id?: string | null
          deleted_at?: string | null
          description?: string | null
          ends_at?: string | null
          expires_at?: string | null
          flock_tags?: string[] | null
          flock_type?: Database["public"]["Enums"]["flock_type_enum"] | null
          geo?: unknown | null
          id?: string
          last_activity_at?: string | null
          location: unknown
          max_participants?: number | null
          name?: string | null
          parent_flock_id?: string | null
          pinned_note?: string | null
          primary_vibe: Database["public"]["Enums"]["vibe_enum"]
          radius_m?: number | null
          recurrence_pattern?: Json | null
          starts_at?: string | null
          title: string
          type?: string | null
          updated_at?: string | null
          vibe_tag?: Database["public"]["Enums"]["vibe_enum"] | null
          visibility?: string | null
          walkable_zone?: unknown | null
        }
        Update: {
          activity_score?: number
          auto_created?: boolean | null
          catchment_area?: unknown | null
          created_at?: string | null
          creator_id?: string | null
          deleted_at?: string | null
          description?: string | null
          ends_at?: string | null
          expires_at?: string | null
          flock_tags?: string[] | null
          flock_type?: Database["public"]["Enums"]["flock_type_enum"] | null
          geo?: unknown | null
          id?: string
          last_activity_at?: string | null
          location?: unknown
          max_participants?: number | null
          name?: string | null
          parent_flock_id?: string | null
          pinned_note?: string | null
          primary_vibe?: Database["public"]["Enums"]["vibe_enum"]
          radius_m?: number | null
          recurrence_pattern?: Json | null
          starts_at?: string | null
          title?: string
          type?: string | null
          updated_at?: string | null
          vibe_tag?: Database["public"]["Enums"]["vibe_enum"] | null
          visibility?: string | null
          walkable_zone?: unknown | null
        }
        Relationships: [
          {
            foreignKeyName: "floqs_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floqs_parent_flock_id_fkey"
            columns: ["parent_flock_id"]
            isOneToOne: false
            referencedRelation: "floqs"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_requests: {
        Row: {
          created_at: string | null
          friend_id: string
          id: string
          responded_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          friend_id: string
          id?: string
          responded_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          friend_id?: string
          id?: string
          responded_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_friend_requests_friend"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_friend_requests_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          created_at: string | null
          friend_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          friend_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          friend_id?: string
          user_id?: string
        }
        Relationships: []
      }
      message_mentions: {
        Row: {
          created_at: string
          mentioned_user: string
          message_id: string
        }
        Insert: {
          created_at?: string
          mentioned_user: string
          message_id: string
        }
        Update: {
          created_at?: string
          mentioned_user?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_message_mentions_message"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "floq_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_message_mentions_user"
            columns: ["mentioned_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_queue: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          processed_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      place_banners: {
        Row: {
          channel: string | null
          created_at: string | null
          cta_type: string
          expires_at: string
          headline: string
          id: string
          metadata: Json | null
          venue_id: string
        }
        Insert: {
          channel?: string | null
          created_at?: string | null
          cta_type?: string
          expires_at?: string
          headline: string
          id?: string
          metadata?: Json | null
          venue_id: string
        }
        Update: {
          channel?: string | null
          created_at?: string | null
          cta_type?: string
          expires_at?: string
          headline?: string
          id?: string
          metadata?: Json | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "place_banners_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_participants: {
        Row: {
          joined_at: string | null
          plan_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string | null
          plan_id: string
          user_id: string
        }
        Update: {
          joined_at?: string | null
          plan_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_participants_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "floq_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          custom_status: string | null
          display_name: string
          first_name: string | null
          full_name: string | null
          id: string
          interests: string[] | null
          last_name: string | null
          push_token: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          custom_status?: string | null
          display_name: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          interests?: string[] | null
          last_name?: string | null
          push_token?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          custom_status?: string | null
          display_name?: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          interests?: string[] | null
          last_name?: string | null
          push_token?: string | null
          username?: string
        }
        Relationships: []
      }
      reserved_usernames: {
        Row: {
          name: string
        }
        Insert: {
          name: string
        }
        Update: {
          name?: string
        }
        Relationships: []
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          code: string
          earned_at: string | null
          progress: number | null
          user_id: string
        }
        Insert: {
          code: string
          earned_at?: string | null
          progress?: number | null
          user_id: string
        }
        Update: {
          code?: string
          earned_at?: string | null
          progress?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_code_fkey"
            columns: ["code"]
            isOneToOne: false
            referencedRelation: "achievement_catalogue"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_floq_activity_tracking: {
        Row: {
          created_at: string
          floq_id: string
          last_activity_viewed_at: string
          last_chat_viewed_at: string
          last_plans_viewed_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          floq_id: string
          last_activity_viewed_at?: string
          last_chat_viewed_at?: string
          last_plans_viewed_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          floq_id?: string
          last_activity_viewed_at?: string
          last_chat_viewed_at?: string
          last_plans_viewed_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_tracking_floq"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floqs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          created_at: string
          floq_id: string | null
          id: string
          kind: string
          message_id: string | null
          plan_id: string | null
          read_at: string | null
          subtitle: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          floq_id?: string | null
          id?: string
          kind: string
          message_id?: string | null
          plan_id?: string | null
          read_at?: string | null
          subtitle?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          floq_id?: string | null
          id?: string
          kind?: string
          message_id?: string | null
          plan_id?: string | null
          read_at?: string | null
          subtitle?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notifications_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "floq_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notifications_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "floq_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          available_until: string | null
          created_at: string
          notification_preferences: Json | null
          preferred_welcome_template:
            | Database["public"]["Enums"]["welcome_template_enum"]
            | null
          privacy_settings: Json | null
          theme_preferences: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          available_until?: string | null
          created_at?: string
          notification_preferences?: Json | null
          preferred_welcome_template?:
            | Database["public"]["Enums"]["welcome_template_enum"]
            | null
          privacy_settings?: Json | null
          theme_preferences?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          available_until?: string | null
          created_at?: string
          notification_preferences?: Json | null
          preferred_welcome_template?:
            | Database["public"]["Enums"]["welcome_template_enum"]
            | null
          privacy_settings?: Json | null
          theme_preferences?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_vibe_states: {
        Row: {
          active: boolean | null
          location: unknown | null
          started_at: string
          user_id: string
          vibe_tag: Database["public"]["Enums"]["vibe_enum"]
          visible_to: string | null
        }
        Insert: {
          active?: boolean | null
          location?: unknown | null
          started_at?: string
          user_id: string
          vibe_tag: Database["public"]["Enums"]["vibe_enum"]
          visible_to?: string | null
        }
        Update: {
          active?: boolean | null
          location?: unknown | null
          started_at?: string
          user_id?: string
          vibe_tag?: Database["public"]["Enums"]["vibe_enum"]
          visible_to?: string | null
        }
        Relationships: []
      }
      venue_clusters: {
        Row: {
          active_hours: unknown | null
          boundary: unknown | null
          cluster_type: Database["public"]["Enums"]["cluster_type_enum"]
          created_at: string | null
          id: string
          name: string
          venue_count: number | null
        }
        Insert: {
          active_hours?: unknown | null
          boundary?: unknown | null
          cluster_type: Database["public"]["Enums"]["cluster_type_enum"]
          created_at?: string | null
          id?: string
          name: string
          venue_count?: number | null
        }
        Update: {
          active_hours?: unknown | null
          boundary?: unknown | null
          cluster_type?: Database["public"]["Enums"]["cluster_type_enum"]
          created_at?: string | null
          id?: string
          name?: string
          venue_count?: number | null
        }
        Relationships: []
      }
      venue_feed_posts: {
        Row: {
          content_type: string
          created_at: string
          expires_at: string
          id: string
          location: unknown
          mood_tags: string[] | null
          reaction_count: number | null
          storage_path: string | null
          text_content: string | null
          user_id: string
          venue_id: string
          vibe: Database["public"]["Enums"]["vibe_enum"]
          view_count: number | null
        }
        Insert: {
          content_type: string
          created_at?: string
          expires_at?: string
          id?: string
          location: unknown
          mood_tags?: string[] | null
          reaction_count?: number | null
          storage_path?: string | null
          text_content?: string | null
          user_id: string
          venue_id: string
          vibe: Database["public"]["Enums"]["vibe_enum"]
          view_count?: number | null
        }
        Update: {
          content_type?: string
          created_at?: string
          expires_at?: string
          id?: string
          location?: unknown
          mood_tags?: string[] | null
          reaction_count?: number | null
          storage_path?: string | null
          text_content?: string | null
          user_id?: string
          venue_id?: string
          vibe?: Database["public"]["Enums"]["vibe_enum"]
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "venue_feed_posts_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_live_presence: {
        Row: {
          checked_in: string | null
          checked_in_at: string
          expires_at: string
          last_heartbeat: string
          session_duration: unknown | null
          user_id: string
          venue_id: string
          vibe: Database["public"]["Enums"]["vibe_enum"]
        }
        Insert: {
          checked_in?: string | null
          checked_in_at?: string
          expires_at?: string
          last_heartbeat?: string
          session_duration?: unknown | null
          user_id: string
          venue_id: string
          vibe: Database["public"]["Enums"]["vibe_enum"]
        }
        Update: {
          checked_in?: string | null
          checked_in_at?: string
          expires_at?: string
          last_heartbeat?: string
          session_duration?: unknown | null
          user_id?: string
          venue_id?: string
          vibe?: Database["public"]["Enums"]["vibe_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "venue_live_presence_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          created_at: string | null
          description: string | null
          geo: unknown | null
          id: string
          lat: number
          lng: number
          name: string
          radius_m: number | null
          source: string | null
          vibe: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          geo?: unknown | null
          id?: string
          lat: number
          lng: number
          name: string
          radius_m?: number | null
          source?: string | null
          vibe?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          geo?: unknown | null
          id?: string
          lat?: number
          lng?: number
          name?: string
          radius_m?: number | null
          source?: string | null
          vibe?: string | null
        }
        Relationships: []
      }
      vibes_log: {
        Row: {
          location: unknown
          ts: string
          user_id: string
          venue_id: string | null
          vibe: Database["public"]["Enums"]["vibe_enum"]
        }
        Insert: {
          location: unknown
          ts?: string
          user_id: string
          venue_id?: string | null
          vibe: Database["public"]["Enums"]["vibe_enum"]
        }
        Update: {
          location?: unknown
          ts?: string
          user_id?: string
          venue_id?: string | null
          vibe?: Database["public"]["Enums"]["vibe_enum"]
        }
        Relationships: []
      }
      vibes_now: {
        Row: {
          broadcast_radius: number | null
          expires_at: string | null
          geo: unknown | null
          geohash6: string | null
          location: unknown
          updated_at: string | null
          user_id: string
          venue_id: string | null
          vibe: Database["public"]["Enums"]["vibe_enum"]
          visibility: string | null
        }
        Insert: {
          broadcast_radius?: number | null
          expires_at?: string | null
          geo?: unknown | null
          geohash6?: string | null
          location: unknown
          updated_at?: string | null
          user_id: string
          venue_id?: string | null
          vibe: Database["public"]["Enums"]["vibe_enum"]
          visibility?: string | null
        }
        Update: {
          broadcast_radius?: number | null
          expires_at?: string | null
          geo?: unknown | null
          geohash6?: string | null
          location?: unknown
          updated_at?: string | null
          user_id?: string
          venue_id?: string | null
          vibe?: Database["public"]["Enums"]["vibe_enum"]
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vibes_now_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vibes_now_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      achievement_system_metrics: {
        Row: {
          metric: string | null
          value: string | null
        }
        Relationships: []
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown | null
          f_table_catalog: unknown | null
          f_table_name: unknown | null
          f_table_schema: unknown | null
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown | null
          f_table_catalog: string | null
          f_table_name: unknown | null
          f_table_schema: unknown | null
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown | null
          f_table_catalog?: string | null
          f_table_name?: unknown | null
          f_table_schema?: unknown | null
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown | null
          f_table_catalog?: string | null
          f_table_name?: unknown | null
          f_table_schema?: unknown | null
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      leaderboard_cache: {
        Row: {
          earned_count: number | null
          rank: number | null
          total_users: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_floq_unread_counts: {
        Row: {
          floq_id: string | null
          unread_activity: number | null
          unread_chat: number | null
          unread_plans: number | null
          unread_total: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "floq_participants_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_active_users: {
        Row: {
          lat: number | null
          lng: number | null
          updated_at: string | null
          user_id: string | null
          vibe: Database["public"]["Enums"]["vibe_enum"] | null
        }
        Insert: {
          lat?: never
          lng?: never
          updated_at?: string | null
          user_id?: string | null
          vibe?: Database["public"]["Enums"]["vibe_enum"] | null
        }
        Update: {
          lat?: never
          lng?: never
          updated_at?: string | null
          user_id?: string | null
          vibe?: Database["public"]["Enums"]["vibe_enum"] | null
        }
        Relationships: [
          {
            foreignKeyName: "vibes_now_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_friends_with_profile: {
        Row: {
          avatar_url: string | null
          bio: string | null
          display_name: string | null
          friend_id: string | null
          friend_since: string | null
          friendship_created_at: string | null
          friendship_id: string | null
          username: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { oldname: string; newname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { tbl: unknown; col: string }
        Returns: unknown
      }
      _postgis_pgsql_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      _postgis_scripts_pgsql_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      _postgis_selectivity: {
        Args: { tbl: unknown; att_name: string; geom: unknown; mode?: string }
        Returns: number
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_bestsrid: {
        Args: { "": unknown }
        Returns: number
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby: {
        Args:
          | { geog1: unknown; geog2: unknown }
          | { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_covers: {
        Args:
          | { geog1: unknown; geog2: unknown }
          | { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_pointoutside: {
        Args: { "": unknown }
        Returns: unknown
      }
      _st_sortablehash: {
        Args: { geom: unknown }
        Returns: number
      }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          g1: unknown
          clip?: unknown
          tolerance?: number
          return_polygons?: boolean
        }
        Returns: unknown
      }
      _st_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      accept_friend_request: {
        Args: { req_id: string }
        Returns: {
          created_at: string | null
          friend_id: string
          id: string
          responded_at: string | null
          status: string | null
          user_id: string
        }
      }
      add_friend: {
        Args: { target: string }
        Returns: undefined
      }
      addauth: {
        Args: { "": string }
        Returns: boolean
      }
      addgeometrycolumn: {
        Args:
          | {
              catalog_name: string
              schema_name: string
              table_name: string
              column_name: string
              new_srid_in: number
              new_type: string
              new_dim: number
              use_typmod?: boolean
            }
          | {
              schema_name: string
              table_name: string
              column_name: string
              new_srid: number
              new_type: string
              new_dim: number
              use_typmod?: boolean
            }
          | {
              table_name: string
              column_name: string
              new_srid: number
              new_type: string
              new_dim: number
              use_typmod?: boolean
            }
        Returns: string
      }
      attempt_claim_username: {
        Args: { desired: string } | { desired: string }
        Returns: boolean
      }
      award_achievement_optimized: {
        Args: { _user: string; _code: string; _increment: number }
        Returns: Json
      }
      award_if_goal_met: {
        Args: { _user: string; _code: string; _increment: number }
        Returns: boolean
      }
      blhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      box: {
        Args: { "": unknown } | { "": unknown }
        Returns: unknown
      }
      box2d: {
        Args: { "": unknown } | { "": unknown }
        Returns: unknown
      }
      box2d_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      box2d_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      box2df_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      box2df_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      box3d: {
        Args: { "": unknown } | { "": unknown }
        Returns: unknown
      }
      box3d_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      box3d_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      box3dtobox: {
        Args: { "": unknown }
        Returns: unknown
      }
      bulk_upsert_relationships: {
        Args: { relationship_pairs: Json }
        Returns: Json
      }
      bytea: {
        Args: { "": unknown } | { "": unknown }
        Returns: string
      }
      calculate_floq_activity_score: {
        Args:
          | {
              p_floq_id: string
              p_event_type: Database["public"]["Enums"]["flock_event_type_enum"]
              p_proximity_boost?: number
              p_decay_hours?: number
            }
          | {
              p_floq_id: string
              p_event_type: string
              p_proximity_boost?: number
              p_decay_hours?: number
            }
        Returns: Json
      }
      calculate_relationship_strength: {
        Args: { interaction_count: number; days_since_last_interaction: number }
        Returns: number
      }
      check_floq_admin_role: {
        Args: { p_floq_id: string; p_user_id?: string }
        Returns: boolean
      }
      check_floq_visibility: {
        Args: { p_floq_id: string }
        Returns: string
      }
      citext: {
        Args: { "": boolean } | { "": string } | { "": unknown }
        Returns: string
      }
      citext_hash: {
        Args: { "": string }
        Returns: number
      }
      citextin: {
        Args: { "": unknown }
        Returns: string
      }
      citextout: {
        Args: { "": string }
        Returns: unknown
      }
      citextrecv: {
        Args: { "": unknown }
        Returns: string
      }
      citextsend: {
        Args: { "": string }
        Returns: string
      }
      cleanup_expired_floq_boosts: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_expired_rows: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_suggestions: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_expired_venue_data: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_inactive_floqs: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      cleanup_old_vibes_logs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_floq: {
        Args:
          | {
              p_lat: number
              p_lng: number
              p_starts_at: string
              p_vibe: Database["public"]["Enums"]["vibe_enum"]
              p_visibility?: string
              p_title?: string
              p_invitees?: string[]
              p_ends_at?: string
              p_flock_type?: Database["public"]["Enums"]["flock_type_enum"]
            }
          | {
              p_location: unknown
              p_starts_at: string
              p_vibe: Database["public"]["Enums"]["vibe_enum"]
              p_visibility?: string
              p_title?: string
              p_invitees?: string[]
              p_ends_at?: string
              p_flock_type?: Database["public"]["Enums"]["flock_type_enum"]
            }
        Returns: string
      }
      create_or_replace_cron_job: {
        Args: { job_name: string; schedule: string; command: string }
        Returns: undefined
      }
      create_place_banner: {
        Args: {
          _venue_id: string
          _headline: string
          _cta_type?: string
          _ttl_secs?: number
          _metadata?: Json
        }
        Returns: string
      }
      delete_floq: {
        Args: { p_floq_id: string }
        Returns: Json
      }
      disablelongtransactions: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      dropgeometrycolumn: {
        Args:
          | {
              catalog_name: string
              schema_name: string
              table_name: string
              column_name: string
            }
          | { schema_name: string; table_name: string; column_name: string }
          | { table_name: string; column_name: string }
        Returns: string
      }
      dropgeometrytable: {
        Args:
          | { catalog_name: string; schema_name: string; table_name: string }
          | { schema_name: string; table_name: string }
          | { table_name: string }
        Returns: string
      }
      enablelongtransactions: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      end_floq: {
        Args: { p_floq_id: string; p_reason?: string }
        Returns: Json
      }
      equals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      events_containing_point: {
        Args: { user_lat: number; user_lng: number }
        Returns: {
          id: string
          name: string
          vibe: string
          radius_m: number
        }[]
      }
      find_or_create_dm: {
        Args: { a: string; b: string; p_use_demo?: boolean }
        Returns: string
      }
      friend_count: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      friends_nearby: {
        Args: { user_lat: number; user_lng: number; radius_km?: number }
        Returns: {
          id: string
          display_name: string
          avatar_url: string
          lat: number
          lng: number
          distance_m: number
        }[]
      }
      gc_vibes_now: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_floq_suggestions: {
        Args: {
          p_user_id: string
          p_user_lat: number
          p_user_lng: number
          p_limit?: number
        }
        Returns: {
          floq_id: string
          title: string
          primary_vibe: Database["public"]["Enums"]["vibe_enum"]
          distance_meters: number
          participant_count: number
          confidence_score: number
          reasoning: Json
        }[]
      }
      generate_friend_suggestions: {
        Args: {
          p_user_id: string
          p_user_lat: number
          p_user_lng: number
          p_limit?: number
        }
        Returns: {
          user_id: string
          username: string
          display_name: string
          avatar_url: string
          confidence_score: number
          reasoning: Json
        }[]
      }
      geography: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      geography_analyze: {
        Args: { "": unknown }
        Returns: boolean
      }
      geography_gist_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      geography_gist_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      geography_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      geography_send: {
        Args: { "": unknown }
        Returns: string
      }
      geography_spgist_compress_nd: {
        Args: { "": unknown }
        Returns: unknown
      }
      geography_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      geography_typmod_out: {
        Args: { "": number }
        Returns: unknown
      }
      geometry: {
        Args:
          | { "": string }
          | { "": string }
          | { "": unknown }
          | { "": unknown }
          | { "": unknown }
          | { "": unknown }
          | { "": unknown }
          | { "": unknown }
        Returns: unknown
      }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_analyze: {
        Args: { "": unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gist_compress_2d: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_gist_compress_nd: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_gist_decompress_2d: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_gist_decompress_nd: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_gist_sortsupport_2d: {
        Args: { "": unknown }
        Returns: undefined
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_hash: {
        Args: { "": unknown }
        Returns: number
      }
      geometry_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_recv: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_send: {
        Args: { "": unknown }
        Returns: string
      }
      geometry_sortsupport: {
        Args: { "": unknown }
        Returns: undefined
      }
      geometry_spgist_compress_2d: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_spgist_compress_3d: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_spgist_compress_nd: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      geometry_typmod_out: {
        Args: { "": number }
        Returns: unknown
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometrytype: {
        Args: { "": unknown } | { "": unknown }
        Returns: string
      }
      geomfromewkb: {
        Args: { "": string }
        Returns: unknown
      }
      geomfromewkt: {
        Args: { "": string }
        Returns: unknown
      }
      get_achievement_progress: {
        Args: { _user_id?: string; _codes?: string[] }
        Returns: Json
      }
      get_achievement_stats: {
        Args: { target_user_id?: string }
        Returns: Json
      }
      get_achievement_system_health: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_active_floqs_with_members: {
        Args:
          | {
              p_limit?: number
              p_offset?: number
              p_user_lat?: number
              p_user_lng?: number
            }
          | {
              p_limit?: number
              p_offset?: number
              p_user_lat?: number
              p_user_lng?: number
            }
          | {
              p_limit?: number
              p_offset?: number
              p_user_lat?: number
              p_user_lng?: number
              p_flock_type?: Database["public"]["Enums"]["flock_type_enum"]
            }
          | {
              p_use_demo?: boolean
              p_limit?: number
              p_offset?: number
              p_user_lat?: number
              p_user_lng?: number
            }
        Returns: {
          id: string
          title: string
          name: string
          primary_vibe: Database["public"]["Enums"]["vibe_enum"]
          vibe_tag: Database["public"]["Enums"]["vibe_enum"]
          type: string
          starts_at: string
          ends_at: string
          participant_count: number
          boost_count: number
          starts_in_min: number
          distance_meters: number
          members: Json
        }[]
      }
      get_cluster_venues: {
        Args: {
          min_lng: number
          min_lat: number
          max_lng: number
          max_lat: number
          limit_n?: number
        }
        Returns: {
          id: string
          name: string
          category: string
          lat: number
          lng: number
          vibe_score: number
          live_count: number
          check_ins: number
        }[]
      }
      get_floq_full_details: {
        Args: { p_floq_id: string }
        Returns: {
          id: string
          title: string
          description: string
          primary_vibe: Database["public"]["Enums"]["vibe_enum"]
          flock_type: Database["public"]["Enums"]["flock_type_enum"]
          starts_at: string
          ends_at: string
          visibility: string
          creator_id: string
          participant_count: number
          boost_count: number
          notifications_enabled: boolean
          mention_permissions: Database["public"]["Enums"]["mention_permissions_enum"]
          join_approval_required: boolean
          activity_visibility: Database["public"]["Enums"]["activity_visibility_enum"]
          welcome_message: string
          participants: Json
          pending_invites: Json
        }[]
      }
      get_friends_with_profile: {
        Args: Record<PropertyKey, never>
        Returns: {
          friendship_id: string
          friend_id: string
          username: string
          display_name: string
          avatar_url: string
          bio: string
          friend_since: string
          friendship_created_at: string
        }[]
      }
      get_nearby_presence: {
        Args: { user_lat: number; user_lng: number; radius_meters?: number }
        Returns: {
          user_id: string
          vibe: Database["public"]["Enums"]["vibe_enum"]
          distance_meters: number
          updated_at: string
        }[]
      }
      get_profile_stats: {
        Args: { target_user_id: string; metres?: number; seconds?: number }
        Returns: Json
      }
      get_proj4_from_srid: {
        Args: { "": number }
        Returns: string
      }
      get_unread_counts: {
        Args: { user_id_param: string }
        Returns: {
          thread_id: string
          friend_id: string
          unread_count: number
        }[]
      }
      get_user_by_username: {
        Args: { lookup_username: string } | { lookup_username: string }
        Returns: {
          id: string
          username: string
          display_name: string
          avatar_url: string
          created_at: string
        }[]
      }
      get_user_location: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      get_venues_in_bbox: {
        Args: { west: number; south: number; east: number; north: number }
        Returns: {
          id: string
          name: string
          lat: number
          lng: number
          vibe: string
          source: string
        }[]
      }
      get_walkable_floqs: {
        Args: { user_lat: number; user_lng: number; max_walk_meters?: number }
        Returns: {
          id: string
          title: string
          primary_vibe: Database["public"]["Enums"]["vibe_enum"]
          participant_count: number
          distance_meters: number
          starts_at: string
        }[]
      }
      gettransactionid: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      gidx_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gidx_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      join_floq: {
        Args: { p_floq_id: string; p_user_id?: string; p_use_demo?: boolean }
        Returns: Json
      }
      join_or_leave_plan: {
        Args: { p_plan_id: string; p_join: boolean }
        Returns: Json
      }
      json: {
        Args: { "": unknown }
        Returns: Json
      }
      jsonb: {
        Args: { "": unknown }
        Returns: Json
      }
      leave_floq: {
        Args: { p_floq_id: string; p_user_id?: string; p_use_demo?: boolean }
        Returns: Json
      }
      list_friends: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      longtransactionsenabled: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      mark_notifications_read: {
        Args: { notification_ids?: string[]; mark_all_for_user?: boolean }
        Returns: number
      }
      path: {
        Args: { "": unknown }
        Returns: unknown
      }
      people_crossed_paths_today: {
        Args: { in_me: string; proximity_meters?: number }
        Returns: {
          user_id: string
          username: string
          display_name: string
          avatar_url: string
          last_seen_ts: string
          last_seen_vibe: Database["public"]["Enums"]["vibe_enum"]
          venue_name: string
          distance_meters: number
        }[]
      }
      pgis_asflatgeobuf_finalfn: {
        Args: { "": unknown }
        Returns: string
      }
      pgis_asgeobuf_finalfn: {
        Args: { "": unknown }
        Returns: string
      }
      pgis_asmvt_finalfn: {
        Args: { "": unknown }
        Returns: string
      }
      pgis_asmvt_serialfn: {
        Args: { "": unknown }
        Returns: string
      }
      pgis_geometry_clusterintersecting_finalfn: {
        Args: { "": unknown }
        Returns: unknown[]
      }
      pgis_geometry_clusterwithin_finalfn: {
        Args: { "": unknown }
        Returns: unknown[]
      }
      pgis_geometry_collect_finalfn: {
        Args: { "": unknown }
        Returns: unknown
      }
      pgis_geometry_makeline_finalfn: {
        Args: { "": unknown }
        Returns: unknown
      }
      pgis_geometry_polygonize_finalfn: {
        Args: { "": unknown }
        Returns: unknown
      }
      pgis_geometry_union_parallel_finalfn: {
        Args: { "": unknown }
        Returns: unknown
      }
      pgis_geometry_union_parallel_serialfn: {
        Args: { "": unknown }
        Returns: string
      }
      point: {
        Args: { "": unknown }
        Returns: unknown
      }
      polygon: {
        Args: { "": unknown }
        Returns: unknown
      }
      populate_geometry_columns: {
        Args:
          | { tbl_oid: unknown; use_typmod?: boolean }
          | { use_typmod?: boolean }
        Returns: string
      }
      postgis_addbbox: {
        Args: { "": unknown }
        Returns: unknown
      }
      postgis_constraint_dims: {
        Args: { geomschema: string; geomtable: string; geomcolumn: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomschema: string; geomtable: string; geomcolumn: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomschema: string; geomtable: string; geomcolumn: string }
        Returns: string
      }
      postgis_dropbbox: {
        Args: { "": unknown }
        Returns: unknown
      }
      postgis_extensions_upgrade: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_full_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_geos_noop: {
        Args: { "": unknown }
        Returns: unknown
      }
      postgis_geos_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_getbbox: {
        Args: { "": unknown }
        Returns: unknown
      }
      postgis_hasbbox: {
        Args: { "": unknown }
        Returns: boolean
      }
      postgis_index_supportfn: {
        Args: { "": unknown }
        Returns: unknown
      }
      postgis_lib_build_date: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_lib_revision: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_lib_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_libjson_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_liblwgeom_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_libprotobuf_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_libxml_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_noop: {
        Args: { "": unknown }
        Returns: unknown
      }
      postgis_proj_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_scripts_build_date: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_scripts_installed: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_scripts_released: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_svn_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_type_name: {
        Args: {
          geomname: string
          coord_dimension: number
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_typmod_dims: {
        Args: { "": number }
        Returns: number
      }
      postgis_typmod_srid: {
        Args: { "": number }
        Returns: number
      }
      postgis_typmod_type: {
        Args: { "": number }
        Returns: string
      }
      postgis_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_wagyu_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      presence_nearby: {
        Args: { lat: number; lng: number; km: number; include_self?: boolean }
        Returns: {
          broadcast_radius: number | null
          expires_at: string | null
          geo: unknown | null
          geohash6: string | null
          location: unknown
          updated_at: string | null
          user_id: string
          venue_id: string | null
          vibe: Database["public"]["Enums"]["vibe_enum"]
          visibility: string | null
        }[]
      }
      refresh_leaderboard_cache: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_venue_social_metrics: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      remove_friend: {
        Args: { target: string }
        Returns: undefined
      }
      request_friendship: {
        Args: { _target: string }
        Returns: undefined
      }
      respond_friend_request: {
        Args: { request_user_id: string; response_type: string }
        Returns: {
          created_at: string | null
          friend_id: string
          id: string
          responded_at: string | null
          status: string | null
          user_id: string
        }
      }
      search_everything: {
        Args: { query: string; limit_count?: number }
        Returns: {
          kind: string
          id: string
          label: string
          sublabel: string
          similarity: number
          distance_m: number
          starts_at: string
        }[]
      }
      search_users: {
        Args: { p_query: string; p_limit?: number } | { search_query: string }
        Returns: {
          id: string
          display_name: string
          avatar_url: string
          created_at: string
        }[]
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      set_participant_role: {
        Args: { p_floq_id: string; p_user_id: string; p_new_role: string }
        Returns: undefined
      }
      should_log_presence: {
        Args: { p_user: string; p_loc: unknown; p_now?: string }
        Returns: boolean
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      spheroid_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      spheroid_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlength: {
        Args: { "": unknown }
        Returns: number
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dperimeter: {
        Args: { "": unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle: {
        Args:
          | { line1: unknown; line2: unknown }
          | { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
        Returns: number
      }
      st_area: {
        Args:
          | { "": string }
          | { "": unknown }
          | { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_area2d: {
        Args: { "": unknown }
        Returns: number
      }
      st_asbinary: {
        Args: { "": unknown } | { "": unknown }
        Returns: string
      }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkb: {
        Args: { "": unknown }
        Returns: string
      }
      st_asewkt: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      st_asgeojson: {
        Args:
          | { "": string }
          | { geog: unknown; maxdecimaldigits?: number; options?: number }
          | { geom: unknown; maxdecimaldigits?: number; options?: number }
          | {
              r: Record<string, unknown>
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
            }
        Returns: string
      }
      st_asgml: {
        Args:
          | { "": string }
          | {
              geog: unknown
              maxdecimaldigits?: number
              options?: number
              nprefix?: string
              id?: string
            }
          | { geom: unknown; maxdecimaldigits?: number; options?: number }
          | {
              version: number
              geog: unknown
              maxdecimaldigits?: number
              options?: number
              nprefix?: string
              id?: string
            }
          | {
              version: number
              geom: unknown
              maxdecimaldigits?: number
              options?: number
              nprefix?: string
              id?: string
            }
        Returns: string
      }
      st_ashexewkb: {
        Args: { "": unknown }
        Returns: string
      }
      st_askml: {
        Args:
          | { "": string }
          | { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
          | { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
        Returns: string
      }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: {
        Args: { geom: unknown; format?: string }
        Returns: string
      }
      st_asmvtgeom: {
        Args: {
          geom: unknown
          bounds: unknown
          extent?: number
          buffer?: number
          clip_geom?: boolean
        }
        Returns: unknown
      }
      st_assvg: {
        Args:
          | { "": string }
          | { geog: unknown; rel?: number; maxdecimaldigits?: number }
          | { geom: unknown; rel?: number; maxdecimaldigits?: number }
        Returns: string
      }
      st_astext: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      st_astwkb: {
        Args:
          | {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_z?: number
              prec_m?: number
              with_sizes?: boolean
              with_boxes?: boolean
            }
          | {
              geom: unknown
              prec?: number
              prec_z?: number
              prec_m?: number
              with_sizes?: boolean
              with_boxes?: boolean
            }
        Returns: string
      }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth: {
        Args:
          | { geog1: unknown; geog2: unknown }
          | { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_boundary: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_boundingdiagonal: {
        Args: { geom: unknown; fits?: boolean }
        Returns: unknown
      }
      st_buffer: {
        Args:
          | { geom: unknown; radius: number; options?: string }
          | { geom: unknown; radius: number; quadsegs: number }
        Returns: unknown
      }
      st_buildarea: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_centroid: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      st_cleangeometry: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_clipbybox2d: {
        Args: { geom: unknown; box: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_clusterintersecting: {
        Args: { "": unknown[] }
        Returns: unknown[]
      }
      st_collect: {
        Args: { "": unknown[] } | { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collectionextract: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_collectionhomogenize: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_concavehull: {
        Args: {
          param_geom: unknown
          param_pctconvex: number
          param_allow_holes?: boolean
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_convexhull: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_coorddim: {
        Args: { geometry: unknown }
        Returns: number
      }
      st_coveredby: {
        Args:
          | { geog1: unknown; geog2: unknown }
          | { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_covers: {
        Args:
          | { geog1: unknown; geog2: unknown }
          | { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_curvetoline: {
        Args: { geom: unknown; tol?: number; toltype?: number; flags?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { g1: unknown; tolerance?: number; flags?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_dimension: {
        Args: { "": unknown }
        Returns: number
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance: {
        Args:
          | { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
          | { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_distancesphere: {
        Args:
          | { geom1: unknown; geom2: unknown }
          | { geom1: unknown; geom2: unknown; radius: number }
        Returns: number
      }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dump: {
        Args: { "": unknown }
        Returns: Database["public"]["CompositeTypes"]["geometry_dump"][]
      }
      st_dumppoints: {
        Args: { "": unknown }
        Returns: Database["public"]["CompositeTypes"]["geometry_dump"][]
      }
      st_dumprings: {
        Args: { "": unknown }
        Returns: Database["public"]["CompositeTypes"]["geometry_dump"][]
      }
      st_dumpsegments: {
        Args: { "": unknown }
        Returns: Database["public"]["CompositeTypes"]["geometry_dump"][]
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_endpoint: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_envelope: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_equals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_expand: {
        Args:
          | { box: unknown; dx: number; dy: number }
          | { box: unknown; dx: number; dy: number; dz?: number }
          | { geom: unknown; dx: number; dy: number; dz?: number; dm?: number }
        Returns: unknown
      }
      st_exteriorring: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_flipcoordinates: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_force2d: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_force3d: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; zvalue?: number; mvalue?: number }
        Returns: unknown
      }
      st_forcecollection: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_forcecurve: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_forcepolygonccw: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_forcepolygoncw: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_forcerhr: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_forcesfs: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_generatepoints: {
        Args:
          | { area: unknown; npoints: number }
          | { area: unknown; npoints: number; seed: number }
        Returns: unknown
      }
      st_geogfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_geogfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_geographyfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_geohash: {
        Args:
          | { geog: unknown; maxchars?: number }
          | { geom: unknown; maxchars?: number }
        Returns: string
      }
      st_geomcollfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomcollfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_geometricmedian: {
        Args: {
          g: unknown
          tolerance?: number
          max_iter?: number
          fail_if_not_converged?: boolean
        }
        Returns: unknown
      }
      st_geometryfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_geometrytype: {
        Args: { "": unknown }
        Returns: string
      }
      st_geomfromewkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomfromewkt: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomfromgeojson: {
        Args: { "": Json } | { "": Json } | { "": string }
        Returns: unknown
      }
      st_geomfromgml: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomfromkml: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomfrommarc21: {
        Args: { marc21xml: string }
        Returns: unknown
      }
      st_geomfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomfromtwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_gmltosql: {
        Args: { "": string }
        Returns: unknown
      }
      st_hasarc: {
        Args: { geometry: unknown }
        Returns: boolean
      }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { size: number; cell_i: number; cell_j: number; origin?: unknown }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { size: number; bounds: unknown }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects: {
        Args:
          | { geog1: unknown; geog2: unknown }
          | { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_isclosed: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_iscollection: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_isempty: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_ispolygonccw: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_ispolygoncw: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_isring: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_issimple: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_isvalid: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_isvaliddetail: {
        Args: { geom: unknown; flags?: number }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
      }
      st_isvalidreason: {
        Args: { "": unknown }
        Returns: string
      }
      st_isvalidtrajectory: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_length: {
        Args:
          | { "": string }
          | { "": unknown }
          | { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_length2d: {
        Args: { "": unknown }
        Returns: number
      }
      st_letters: {
        Args: { letters: string; font?: Json }
        Returns: unknown
      }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { txtin: string; nprecision?: number }
        Returns: unknown
      }
      st_linefrommultipoint: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_linefromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_linefromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linemerge: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_linestringfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_linetocurve: {
        Args: { geometry: unknown }
        Returns: unknown
      }
      st_locatealong: {
        Args: { geometry: unknown; measure: number; leftrightoffset?: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          geometry: unknown
          frommeasure: number
          tomeasure: number
          leftrightoffset?: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { geometry: unknown; fromelevation: number; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_m: {
        Args: { "": unknown }
        Returns: number
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { "": unknown[] } | { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makepolygon: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { "": unknown } | { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_maximuminscribedcircle: {
        Args: { "": unknown }
        Returns: Record<string, unknown>
      }
      st_memsize: {
        Args: { "": unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_minimumboundingradius: {
        Args: { "": unknown }
        Returns: Record<string, unknown>
      }
      st_minimumclearance: {
        Args: { "": unknown }
        Returns: number
      }
      st_minimumclearanceline: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_mlinefromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_mlinefromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_mpointfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_mpointfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_mpolyfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_mpolyfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_multi: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_multilinefromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_multilinestringfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_multipointfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_multipointfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_multipolyfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_multipolygonfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_ndims: {
        Args: { "": unknown }
        Returns: number
      }
      st_node: {
        Args: { g: unknown }
        Returns: unknown
      }
      st_normalize: {
        Args: { geom: unknown }
        Returns: unknown
      }
      st_npoints: {
        Args: { "": unknown }
        Returns: number
      }
      st_nrings: {
        Args: { "": unknown }
        Returns: number
      }
      st_numgeometries: {
        Args: { "": unknown }
        Returns: number
      }
      st_numinteriorring: {
        Args: { "": unknown }
        Returns: number
      }
      st_numinteriorrings: {
        Args: { "": unknown }
        Returns: number
      }
      st_numpatches: {
        Args: { "": unknown }
        Returns: number
      }
      st_numpoints: {
        Args: { "": unknown }
        Returns: number
      }
      st_offsetcurve: {
        Args: { line: unknown; distance: number; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_orientedenvelope: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { "": unknown } | { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_perimeter2d: {
        Args: { "": unknown }
        Returns: number
      }
      st_pointfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_pointfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_pointm: {
        Args: {
          xcoordinate: number
          ycoordinate: number
          mcoordinate: number
          srid?: number
        }
        Returns: unknown
      }
      st_pointonsurface: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_points: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
          srid?: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
          mcoordinate: number
          srid?: number
        }
        Returns: unknown
      }
      st_polyfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_polyfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_polygonfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_polygonfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_polygonize: {
        Args: { "": unknown[] }
        Returns: unknown
      }
      st_project: {
        Args: { geog: unknown; distance: number; azimuth: number }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_x: number
          prec_y?: number
          prec_z?: number
          prec_m?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: string
      }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_reverse: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid: {
        Args: { geog: unknown; srid: number } | { geom: unknown; srid: number }
        Returns: unknown
      }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shiftlongitude: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; vertex_fraction: number; is_outer?: boolean }
        Returns: unknown
      }
      st_split: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_square: {
        Args: { size: number; cell_i: number; cell_j: number; origin?: unknown }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { size: number; bounds: unknown }
        Returns: Record<string, unknown>[]
      }
      st_srid: {
        Args: { geog: unknown } | { geom: unknown }
        Returns: number
      }
      st_startpoint: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_subdivide: {
        Args: { geom: unknown; maxvertices?: number; gridsize?: number }
        Returns: unknown[]
      }
      st_summary: {
        Args: { "": unknown } | { "": unknown }
        Returns: string
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          zoom: number
          x: number
          y: number
          bounds?: unknown
          margin?: number
        }
        Returns: unknown
      }
      st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_transform: {
        Args:
          | { geom: unknown; from_proj: string; to_proj: string }
          | { geom: unknown; from_proj: string; to_srid: number }
          | { geom: unknown; to_proj: string }
        Returns: unknown
      }
      st_triangulatepolygon: {
        Args: { g1: unknown }
        Returns: unknown
      }
      st_union: {
        Args:
          | { "": unknown[] }
          | { geom1: unknown; geom2: unknown }
          | { geom1: unknown; geom2: unknown; gridsize: number }
        Returns: unknown
      }
      st_voronoilines: {
        Args: { g1: unknown; tolerance?: number; extend_to?: unknown }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { g1: unknown; tolerance?: number; extend_to?: unknown }
        Returns: unknown
      }
      st_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_wkbtosql: {
        Args: { wkb: string }
        Returns: unknown
      }
      st_wkttosql: {
        Args: { "": string }
        Returns: unknown
      }
      st_wrapx: {
        Args: { geom: unknown; wrap: number; move: number }
        Returns: unknown
      }
      st_x: {
        Args: { "": unknown }
        Returns: number
      }
      st_xmax: {
        Args: { "": unknown }
        Returns: number
      }
      st_xmin: {
        Args: { "": unknown }
        Returns: number
      }
      st_y: {
        Args: { "": unknown }
        Returns: number
      }
      st_ymax: {
        Args: { "": unknown }
        Returns: number
      }
      st_ymin: {
        Args: { "": unknown }
        Returns: number
      }
      st_z: {
        Args: { "": unknown }
        Returns: number
      }
      st_zmax: {
        Args: { "": unknown }
        Returns: number
      }
      st_zmflag: {
        Args: { "": unknown }
        Returns: number
      }
      st_zmin: {
        Args: { "": unknown }
        Returns: number
      }
      suggest_friends: {
        Args: { target_user_id?: string; limit_count?: number }
        Returns: {
          user_id: string
          username: string
          display_name: string
          avatar_url: string
          compatibility_score: number
          mutual_friends_count: number
          crossed_paths_count: number
          shared_interests: string[]
        }[]
      }
      text: {
        Args: { "": unknown }
        Returns: string
      }
      unlockrows: {
        Args: { "": string }
        Returns: number
      }
      update_last_read_at: {
        Args: { thread_id_param: string; user_id_param: string }
        Returns: undefined
      }
      update_suggestion_metrics: {
        Args: {
          p_user_id: string
          p_suggestion_type: Database["public"]["Enums"]["suggestion_type_enum"]
          p_action: string
          p_suggestion_id?: string
        }
        Returns: Json
      }
      update_user_activity_tracking: {
        Args: { p_floq_id: string; p_section?: string }
        Returns: undefined
      }
      update_username: {
        Args: { p_username: string }
        Returns: Json
      }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          schema_name: string
          table_name: string
          column_name: string
          new_srid_in: number
        }
        Returns: string
      }
      upsert_venue_presence_smart: {
        Args: {
          _venue_id: string
          _user_id: string
          _vibe: Database["public"]["Enums"]["vibe_enum"]
          _heartbeat_ts?: string
        }
        Returns: boolean
      }
      upsert_vibes_now_smart: {
        Args: {
          _user_id: string
          _vibe: Database["public"]["Enums"]["vibe_enum"]
          _location: unknown
          _venue_id?: string
          _visibility?: string
        }
        Returns: boolean
      }
      user_is_floq_participant: {
        Args: { p_floq_id: string; p_user_id?: string }
        Returns: boolean
      }
      username_available: {
        Args: { u: string } | { u: string }
        Returns: boolean
      }
      venue_details: {
        Args: { v_id: string }
        Returns: {
          id: string
          name: string
          vibe: string
          description: string
          live_count: number
          lat: number
          lng: number
        }[]
      }
      venues_near_me: {
        Args: { user_lat: number; user_lng: number; radius_km?: number }
        Returns: {
          id: string
          name: string
          lat: number
          lng: number
          vibe: string
          source: string
          distance_m: number
          live_count: number
        }[]
      }
      walkable_floqs: {
        Args: { lat: number; lng: number; max_walk_meters: number }
        Returns: {
          id: string
          title: string
          primary_vibe: Database["public"]["Enums"]["vibe_enum"]
          participant_count: number
          distance_meters: number
          starts_at: string
        }[]
      }
    }
    Enums: {
      achievement_family:
        | "social"
        | "location"
        | "vibe"
        | "activity"
        | "milestone"
        | "special"
      activity_visibility_enum: "public" | "members_only"
      cluster_type_enum:
        | "nightlife"
        | "cafe"
        | "park"
        | "transit"
        | "creative"
        | "wellness"
      event_shape: "circle"
      flock_event_type_enum:
        | "created"
        | "joined"
        | "left"
        | "vibe_changed"
        | "location_changed"
        | "activity_detected"
        | "merged"
        | "split"
        | "ended"
        | "deleted"
        | "boosted"
        | "plan_created"
        | "invited"
      flock_type_enum: "momentary" | "persistent" | "recurring" | "template"
      invitation_status: "pending" | "accepted" | "declined"
      mention_permissions_enum: "all" | "co-admins" | "host"
      plan_status_enum: "draft" | "active" | "closed" | "cancelled"
      suggestion_status_enum: "pending" | "accepted" | "dismissed" | "expired"
      suggestion_type_enum:
        | "merge_flocks"
        | "invite_user"
        | "recommend_venue"
        | "schedule_activity"
        | "change_vibe"
      vibe_enum:
        | "chill"
        | "hype"
        | "curious"
        | "social"
        | "solo"
        | "romantic"
        | "weird"
        | "down"
        | "flowing"
        | "open"
      vibe_visibility: "public" | "friends" | "off"
      welcome_template_enum:
        | "casual-hangout"
        | "professional-meetup"
        | "event-based"
        | "study-group"
        | "creative-collab"
        | "support-group"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown | null
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown | null
      }
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
      achievement_family: [
        "social",
        "location",
        "vibe",
        "activity",
        "milestone",
        "special",
      ],
      activity_visibility_enum: ["public", "members_only"],
      cluster_type_enum: [
        "nightlife",
        "cafe",
        "park",
        "transit",
        "creative",
        "wellness",
      ],
      event_shape: ["circle"],
      flock_event_type_enum: [
        "created",
        "joined",
        "left",
        "vibe_changed",
        "location_changed",
        "activity_detected",
        "merged",
        "split",
        "ended",
        "deleted",
        "boosted",
        "plan_created",
        "invited",
      ],
      flock_type_enum: ["momentary", "persistent", "recurring", "template"],
      invitation_status: ["pending", "accepted", "declined"],
      mention_permissions_enum: ["all", "co-admins", "host"],
      plan_status_enum: ["draft", "active", "closed", "cancelled"],
      suggestion_status_enum: ["pending", "accepted", "dismissed", "expired"],
      suggestion_type_enum: [
        "merge_flocks",
        "invite_user",
        "recommend_venue",
        "schedule_activity",
        "change_vibe",
      ],
      vibe_enum: [
        "chill",
        "hype",
        "curious",
        "social",
        "solo",
        "romantic",
        "weird",
        "down",
        "flowing",
        "open",
      ],
      vibe_visibility: ["public", "friends", "off"],
      welcome_template_enum: [
        "casual-hangout",
        "professional-meetup",
        "event-based",
        "study-group",
        "creative-collab",
        "support-group",
      ],
    },
  },
} as const
