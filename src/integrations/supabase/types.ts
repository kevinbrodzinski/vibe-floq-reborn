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
          profile_id: string | null
        }
        Insert: {
          code: string
          description: string
          family: Database["public"]["Enums"]["achievement_family"]
          goal?: number | null
          icon?: string | null
          metadata?: Json | null
          name: string
          profile_id?: string | null
        }
        Update: {
          code?: string
          description?: string
          family?: Database["public"]["Enums"]["achievement_family"]
          goal?: number | null
          icon?: string | null
          metadata?: Json | null
          name?: string
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_achievement_catalogue_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_achievement_catalogue_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_achievement_catalogue_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_achievement_catalogue_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_achievement_catalogue_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      achievements: {
        Row: {
          achievement_type: string
          earned_at: string
          id: string
          metadata: Json | null
          profile_id: string | null
        }
        Insert: {
          achievement_type: string
          earned_at?: string
          id?: string
          metadata?: Json | null
          profile_id?: string | null
        }
        Update: {
          achievement_type?: string
          earned_at?: string
          id?: string
          metadata?: Json | null
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_achievements_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_achievements_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_achievements_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_achievements_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_achievements_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      afterglow_collection_items: {
        Row: {
          added_at: string | null
          collection_id: string
          daily_afterglow_id: string
          id: string
          profile_id: string | null
        }
        Insert: {
          added_at?: string | null
          collection_id: string
          daily_afterglow_id: string
          id?: string
          profile_id?: string | null
        }
        Update: {
          added_at?: string | null
          collection_id?: string
          daily_afterglow_id?: string
          id?: string
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "afterglow_collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "afterglow_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "afterglow_collection_items_daily_afterglow_id_fkey"
            columns: ["daily_afterglow_id"]
            isOneToOne: false
            referencedRelation: "daily_afterglow"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_afterglow_collection_items_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_afterglow_collection_items_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_afterglow_collection_items_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_afterglow_collection_items_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_afterglow_collection_items_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      afterglow_collections: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          profile_id: string | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          profile_id?: string | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          profile_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_afterglow_collections_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_afterglow_collections_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_afterglow_collections_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_afterglow_collections_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_afterglow_collections_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      afterglow_favorites: {
        Row: {
          created_at: string | null
          daily_afterglow_id: string
          id: string
          profile_id: string | null
        }
        Insert: {
          created_at?: string | null
          daily_afterglow_id: string
          id?: string
          profile_id?: string | null
        }
        Update: {
          created_at?: string | null
          daily_afterglow_id?: string
          id?: string
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "afterglow_favorites_daily_afterglow_id_fkey"
            columns: ["daily_afterglow_id"]
            isOneToOne: false
            referencedRelation: "daily_afterglow"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_afterglow_favorites_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_afterglow_favorites_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_afterglow_favorites_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_afterglow_favorites_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_afterglow_favorites_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      afterglow_moments: {
        Row: {
          color: string | null
          created_at: string | null
          daily_afterglow_id: string
          description: string | null
          id: string
          location_geom: unknown | null
          metadata: Json | null
          moment_type: Database["public"]["Enums"]["afterglow_moment_type"]
          profile_id: string | null
          timestamp: string
          title: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          daily_afterglow_id: string
          description?: string | null
          id?: string
          location_geom?: unknown | null
          metadata?: Json | null
          moment_type: Database["public"]["Enums"]["afterglow_moment_type"]
          profile_id?: string | null
          timestamp: string
          title: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          daily_afterglow_id?: string
          description?: string | null
          id?: string
          location_geom?: unknown | null
          metadata?: Json | null
          moment_type?: Database["public"]["Enums"]["afterglow_moment_type"]
          profile_id?: string | null
          timestamp?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "afterglow_moments_daily_afterglow_id_fkey"
            columns: ["daily_afterglow_id"]
            isOneToOne: false
            referencedRelation: "daily_afterglow"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_afterglow_moments_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_afterglow_moments_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_afterglow_moments_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_afterglow_moments_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_afterglow_moments_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      afterglow_people: {
        Row: {
          created_at: string | null
          interaction_strength: number | null
          moment_id: string
          person_id: string
          profile_id: string | null
          shared_moments_count: number | null
        }
        Insert: {
          created_at?: string | null
          interaction_strength?: number | null
          moment_id: string
          person_id: string
          profile_id?: string | null
          shared_moments_count?: number | null
        }
        Update: {
          created_at?: string | null
          interaction_strength?: number | null
          moment_id?: string
          person_id?: string
          profile_id?: string | null
          shared_moments_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "afterglow_people_moment_id_fkey"
            columns: ["moment_id"]
            isOneToOne: false
            referencedRelation: "afterglow_moments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "afterglow_people_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "afterglow_people_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "afterglow_people_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "afterglow_people_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "afterglow_people_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_afterglow_people_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_afterglow_people_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_afterglow_people_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_afterglow_people_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_afterglow_people_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      afterglow_share_links: {
        Row: {
          created_at: string | null
          daily_afterglow_id: string
          id: string
          og_image_url: string | null
          profile_id: string | null
          slug: string
        }
        Insert: {
          created_at?: string | null
          daily_afterglow_id: string
          id?: string
          og_image_url?: string | null
          profile_id?: string | null
          slug?: string
        }
        Update: {
          created_at?: string | null
          daily_afterglow_id?: string
          id?: string
          og_image_url?: string | null
          profile_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "afterglow_share_links_daily_afterglow_id_fkey"
            columns: ["daily_afterglow_id"]
            isOneToOne: false
            referencedRelation: "daily_afterglow"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_afterglow_share_links_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_afterglow_share_links_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_afterglow_share_links_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_afterglow_share_links_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_afterglow_share_links_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      afterglow_venues: {
        Row: {
          created_at: string | null
          lat: number
          lng: number
          moment_id: string
          name: string
          profile_id: string | null
          venue_id: string | null
          venue_type: string | null
        }
        Insert: {
          created_at?: string | null
          lat: number
          lng: number
          moment_id: string
          name: string
          profile_id?: string | null
          venue_id?: string | null
          venue_type?: string | null
        }
        Update: {
          created_at?: string | null
          lat?: number
          lng?: number
          moment_id?: string
          name?: string
          profile_id?: string | null
          venue_id?: string | null
          venue_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "afterglow_venues_moment_id_fkey"
            columns: ["moment_id"]
            isOneToOne: true
            referencedRelation: "afterglow_moments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_afterglow_venues_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_afterglow_venues_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_afterglow_venues_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_afterglow_venues_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_afterglow_venues_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_user_notification: {
        Row: {
          created_at: string | null
          id: number
          payload: Json
          profile_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          payload: Json
          profile_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          payload?: Json
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_app_user_notification_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_app_user_notification_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_app_user_notification_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_app_user_notification_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_app_user_notification_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_checkin_attempts: {
        Row: {
          attempted_at: string
          confidence_score: number | null
          detection_method: string | null
          error_reason: string | null
          id: string
          location_accuracy: number | null
          location_lat: number | null
          location_lng: number | null
          profile_id: string
          success: boolean
          venue_id: string | null
        }
        Insert: {
          attempted_at?: string
          confidence_score?: number | null
          detection_method?: string | null
          error_reason?: string | null
          id?: string
          location_accuracy?: number | null
          location_lat?: number | null
          location_lng?: number | null
          profile_id: string
          success: boolean
          venue_id?: string | null
        }
        Update: {
          attempted_at?: string
          confidence_score?: number | null
          detection_method?: string | null
          error_reason?: string | null
          id?: string
          location_accuracy?: number | null
          location_lat?: number | null
          location_lng?: number | null
          profile_id?: string
          success?: boolean
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auto_checkin_attempts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_checkin_attempts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "auto_checkin_attempts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_checkin_attempts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_checkin_attempts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_checkin_attempts_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "auto_checkin_attempts_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "auto_checkin_attempts_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "auto_checkin_attempts_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "auto_checkin_attempts_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      business_floqs: {
        Row: {
          created_at: string
          created_by: string
          floq_id: string
          org_id: string
          plan_tier: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          floq_id: string
          org_id: string
          plan_tier?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          floq_id?: string
          org_id?: string
          plan_tier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_floqs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_floqs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "business_floqs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_floqs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_floqs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_floqs_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: true
            referencedRelation: "business_floq_detail_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_floqs_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: true
            referencedRelation: "floq_peek_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_floqs_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: true
            referencedRelation: "floq_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_floqs_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: true
            referencedRelation: "floqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_floqs_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: true
            referencedRelation: "floqs_discovery_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_floqs_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: true
            referencedRelation: "my_floqs_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_floqs_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: true
            referencedRelation: "v_public_floqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_floqs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "business_orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      business_members: {
        Row: {
          created_at: string
          org_id: string
          profile_id: string
          role: string
        }
        Insert: {
          created_at?: string
          org_id: string
          profile_id: string
          role?: string
        }
        Update: {
          created_at?: string
          org_id?: string
          profile_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "business_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "business_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_orgs: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_profile_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_profile_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_orgs_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_orgs_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "business_orgs_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_orgs_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_orgs_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_message_reactions: {
        Row: {
          emoji: string
          message_id: string
          reacted_at: string
          reactor_id: string
        }
        Insert: {
          emoji: string
          message_id: string
          reacted_at?: string
          reactor_id: string
        }
        Update: {
          emoji?: string
          message_id?: string
          reacted_at?: string
          reactor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          body: string | null
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          message_type: string
          metadata: Json | null
          profile_id: string
          reply_to_id: string | null
          sender_id: string
          status: string
          surface: Database["public"]["Enums"]["chat_surface_enum"]
          thread_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          message_type?: string
          metadata?: Json | null
          profile_id: string
          reply_to_id?: string | null
          sender_id: string
          status?: string
          surface: Database["public"]["Enums"]["chat_surface_enum"]
          thread_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          message_type?: string
          metadata?: Json | null
          profile_id?: string
          reply_to_id?: string | null
          sender_id?: string
          status?: string
          surface?: Database["public"]["Enums"]["chat_surface_enum"]
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_chat_messages_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_chat_messages_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_chat_messages_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_chat_messages_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_chat_messages_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      circuit_breaker_state: {
        Row: {
          failure_count: number
          id: string
          last_failure_time: string | null
          metadata: Json | null
          next_attempt_time: string | null
          recorded_at: string
          state: string
          success_count: number
        }
        Insert: {
          failure_count?: number
          id?: string
          last_failure_time?: string | null
          metadata?: Json | null
          next_attempt_time?: string | null
          recorded_at?: string
          state: string
          success_count?: number
        }
        Update: {
          failure_count?: number
          id?: string
          last_failure_time?: string | null
          metadata?: Json | null
          next_attempt_time?: string | null
          recorded_at?: string
          state?: string
          success_count?: number
        }
        Relationships: []
      }
      consent_ledger: {
        Row: {
          aud: string
          created_at: string
          granted_at: string
          id: string
          profile_id: string
          purpose: string
          revoked_at: string | null
          scope: string
        }
        Insert: {
          aud: string
          created_at?: string
          granted_at?: string
          id?: string
          profile_id: string
          purpose: string
          revoked_at?: string | null
          scope: string
        }
        Update: {
          aud?: string
          created_at?: string
          granted_at?: string
          id?: string
          profile_id?: string
          purpose?: string
          revoked_at?: string | null
          scope?: string
        }
        Relationships: []
      }
      crossed_paths: {
        Row: {
          created_at: string | null
          encounter_date: string
          id: number
          profile_id: string | null
          ts: string
          user_a: string
          user_b: string
          venue_id: string
        }
        Insert: {
          created_at?: string | null
          encounter_date: string
          id?: number
          profile_id?: string | null
          ts: string
          user_a: string
          user_b: string
          venue_id: string
        }
        Update: {
          created_at?: string | null
          encounter_date?: string
          id?: number
          profile_id?: string | null
          ts?: string
          user_a?: string
          user_b?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_crossed_paths_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_crossed_paths_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_crossed_paths_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_crossed_paths_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_crossed_paths_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_afterglow: {
        Row: {
          ai_summary: string | null
          ai_summary_generated_at: string | null
          created_at: string | null
          crossed_paths_count: number | null
          date: string
          dominant_vibe: string | null
          emotion_journey: Json | null
          energy_score: number | null
          id: string
          is_pinned: boolean | null
          is_public: boolean | null
          is_stale: boolean
          moments: Json | null
          peak_vibe_time: string | null
          profile_id: string | null
          regenerated_at: string | null
          social_intensity: number | null
          summary_text: string | null
          total_floqs: number | null
          total_venues: number | null
          vibe_path: string[] | null
        }
        Insert: {
          ai_summary?: string | null
          ai_summary_generated_at?: string | null
          created_at?: string | null
          crossed_paths_count?: number | null
          date: string
          dominant_vibe?: string | null
          emotion_journey?: Json | null
          energy_score?: number | null
          id?: string
          is_pinned?: boolean | null
          is_public?: boolean | null
          is_stale?: boolean
          moments?: Json | null
          peak_vibe_time?: string | null
          profile_id?: string | null
          regenerated_at?: string | null
          social_intensity?: number | null
          summary_text?: string | null
          total_floqs?: number | null
          total_venues?: number | null
          vibe_path?: string[] | null
        }
        Update: {
          ai_summary?: string | null
          ai_summary_generated_at?: string | null
          created_at?: string | null
          crossed_paths_count?: number | null
          date?: string
          dominant_vibe?: string | null
          emotion_journey?: Json | null
          energy_score?: number | null
          id?: string
          is_pinned?: boolean | null
          is_public?: boolean | null
          is_stale?: boolean
          moments?: Json | null
          peak_vibe_time?: string | null
          profile_id?: string | null
          regenerated_at?: string | null
          social_intensity?: number | null
          summary_text?: string | null
          total_floqs?: number | null
          total_venues?: number | null
          vibe_path?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_daily_afterglow_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_daily_afterglow_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_daily_afterglow_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_daily_afterglow_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_daily_afterglow_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_recap_cache: {
        Row: {
          created_at: string | null
          day: string
          payload: Json
          profile_id: string | null
        }
        Insert: {
          created_at?: string | null
          day: string
          payload: Json
          profile_id?: string | null
        }
        Update: {
          created_at?: string | null
          day?: string
          payload?: Json
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_daily_recap_cache_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_daily_recap_cache_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_daily_recap_cache_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_daily_recap_cache_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_daily_recap_cache_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dedupe_decisions: {
        Row: {
          addr_sim: number | null
          address: string | null
          created_at: string
          decision: string
          dist_m: number | null
          id: string
          lat: number
          lng: number
          matched_venue_id: string | null
          name_sim: number | null
          notes: Json | null
          place_name: string
          provider: string
          provider_id: string
          radius_m: number
          run_id: string
          thresholds: Json
        }
        Insert: {
          addr_sim?: number | null
          address?: string | null
          created_at?: string
          decision: string
          dist_m?: number | null
          id?: string
          lat: number
          lng: number
          matched_venue_id?: string | null
          name_sim?: number | null
          notes?: Json | null
          place_name: string
          provider: string
          provider_id: string
          radius_m: number
          run_id: string
          thresholds: Json
        }
        Update: {
          addr_sim?: number | null
          address?: string | null
          created_at?: string
          decision?: string
          dist_m?: number | null
          id?: string
          lat?: number
          lng?: number
          matched_venue_id?: string | null
          name_sim?: number | null
          notes?: Json | null
          place_name?: string
          provider?: string
          provider_id?: string
          radius_m?: number
          run_id?: string
          thresholds?: Json
        }
        Relationships: [
          {
            foreignKeyName: "dedupe_decisions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "venue_import_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_message_reactions: {
        Row: {
          created_at: string
          emoji: string
          message_id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          message_id: string
          profile_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          message_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "direct_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "v_dm_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "v_dm_messages_expanded"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_message_reactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_message_reactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "direct_message_reactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_message_reactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_message_reactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_messages: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          message_type: Database["public"]["Enums"]["dm_msg_type"]
          metadata: Json | null
          profile_id: string
          reply_to: string | null
          reply_to_id: string | null
          status: string
          thread_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          message_type?: Database["public"]["Enums"]["dm_msg_type"]
          metadata?: Json | null
          profile_id: string
          reply_to?: string | null
          reply_to_id?: string | null
          status?: string
          thread_id: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          message_type?: Database["public"]["Enums"]["dm_msg_type"]
          metadata?: Json | null
          profile_id?: string
          reply_to?: string | null
          reply_to_id?: string | null
          status?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "direct_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "v_dm_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "v_dm_messages_expanded"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "direct_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "v_dm_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "v_dm_messages_expanded"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "direct_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_direct_messages_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_direct_messages_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_direct_messages_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_direct_messages_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_direct_messages_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
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
          member_a_profile_id: string
          member_b: string
          member_b_profile_id: string
          profile_id: string | null
          unread_a: number | null
          unread_b: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          last_read_at_a?: string
          last_read_at_b?: string
          member_a: string
          member_a_profile_id: string
          member_b: string
          member_b_profile_id: string
          profile_id?: string | null
          unread_a?: number | null
          unread_b?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          last_read_at_a?: string
          last_read_at_b?: string
          member_a?: string
          member_a_profile_id?: string
          member_b?: string
          member_b_profile_id?: string
          profile_id?: string | null
          unread_a?: number | null
          unread_b?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_direct_threads_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_direct_threads_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_direct_threads_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_direct_threads_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_direct_threads_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_member_a"
            columns: ["member_a_profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_member_a"
            columns: ["member_a_profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_member_a"
            columns: ["member_a_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_member_a"
            columns: ["member_a_profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_member_a"
            columns: ["member_a_profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_member_b"
            columns: ["member_b_profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_member_b"
            columns: ["member_b_profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_member_b"
            columns: ["member_b_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_member_b"
            columns: ["member_b_profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_member_b"
            columns: ["member_b_profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_media: {
        Row: {
          created_at: string | null
          height: number | null
          id: string
          message_id: string | null
          meta: Json | null
          mime_type: string
          object_path: string
          thread_id: string
          uploader_id: string
          uploader_profile_id: string
          width: number | null
        }
        Insert: {
          created_at?: string | null
          height?: number | null
          id?: string
          message_id?: string | null
          meta?: Json | null
          mime_type: string
          object_path: string
          thread_id: string
          uploader_id: string
          uploader_profile_id: string
          width?: number | null
        }
        Update: {
          created_at?: string | null
          height?: number | null
          id?: string
          message_id?: string | null
          meta?: Json | null
          mime_type?: string
          object_path?: string
          thread_id?: string
          uploader_id?: string
          uploader_profile_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dm_media_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "direct_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_media_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "v_dm_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_media_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "v_dm_messages_expanded"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_media_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "direct_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dm_media_uploader_profile"
            columns: ["uploader_profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dm_media_uploader_profile"
            columns: ["uploader_profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_dm_media_uploader_profile"
            columns: ["uploader_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dm_media_uploader_profile"
            columns: ["uploader_profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dm_media_uploader_profile"
            columns: ["uploader_profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_message_reactions: {
        Row: {
          emoji: string
          message_id: string
          profile_id: string
          reacted_at: string
        }
        Insert: {
          emoji: string
          message_id: string
          profile_id: string
          reacted_at?: string
        }
        Update: {
          emoji?: string
          message_id?: string
          profile_id?: string
          reacted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "direct_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "v_dm_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "v_dm_messages_expanded"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_message_reactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_message_reactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "dm_message_reactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_message_reactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_message_reactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dm_reactions_profile"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dm_reactions_profile"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_dm_reactions_profile"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dm_reactions_profile"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dm_reactions_profile"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      edge_invocation_logs: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_message: string | null
          function_name: string
          id: string
          metadata: Json | null
          profile_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          function_name: string
          id?: string
          metadata?: Json | null
          profile_id?: string | null
          status: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          function_name?: string
          id?: string
          metadata?: Json | null
          profile_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_edge_invocation_logs_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_edge_invocation_logs_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_edge_invocation_logs_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_edge_invocation_logs_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_edge_invocation_logs_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      epsilon_ledger: {
        Row: {
          created_at: string
          device_id: string | null
          entry_hash: string
          epsilon_spent: number
          event_type: string
          id: string
          jti: string
          k_anon_k: number
          kid: string
          metadata: Json | null
          min_interval_ok: boolean
          policy_ref: string
          prev_hash: string | null
          profile_id: string
          timestamp: string
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          entry_hash: string
          epsilon_spent?: number
          event_type: string
          id?: string
          jti: string
          k_anon_k?: number
          kid: string
          metadata?: Json | null
          min_interval_ok?: boolean
          policy_ref?: string
          prev_hash?: string | null
          profile_id: string
          timestamp?: string
        }
        Update: {
          created_at?: string
          device_id?: string | null
          entry_hash?: string
          epsilon_spent?: number
          event_type?: string
          id?: string
          jti?: string
          k_anon_k?: number
          kid?: string
          metadata?: Json | null
          min_interval_ok?: boolean
          policy_ref?: string
          prev_hash?: string | null
          profile_id?: string
          timestamp?: string
        }
        Relationships: []
      }
      eta_shares: {
        Row: {
          created_at: string
          distance_meters: number
          eta_minutes: number
          expires_at: string
          id: string
          other_profile_id: string
          sharer_id: string
          travel_mode: Database["public"]["Enums"]["travel_mode_enum"]
        }
        Insert: {
          created_at?: string
          distance_meters: number
          eta_minutes: number
          expires_at?: string
          id?: string
          other_profile_id: string
          sharer_id: string
          travel_mode?: Database["public"]["Enums"]["travel_mode_enum"]
        }
        Update: {
          created_at?: string
          distance_meters?: number
          eta_minutes?: number
          expires_at?: string
          id?: string
          other_profile_id?: string
          sharer_id?: string
          travel_mode?: Database["public"]["Enums"]["travel_mode_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "eta_shares_other_id_fkey"
            columns: ["other_profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eta_shares_other_id_fkey"
            columns: ["other_profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "eta_shares_other_id_fkey"
            columns: ["other_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eta_shares_other_id_fkey"
            columns: ["other_profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eta_shares_other_id_fkey"
            columns: ["other_profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eta_shares_sharer_id_fkey"
            columns: ["sharer_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eta_shares_sharer_id_fkey"
            columns: ["sharer_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "eta_shares_sharer_id_fkey"
            columns: ["sharer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eta_shares_sharer_id_fkey"
            columns: ["sharer_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eta_shares_sharer_id_fkey"
            columns: ["sharer_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_areas: {
        Row: {
          ends_at: string | null
          id: string
          lat: number
          lng: number
          name: string
          profile_id: string | null
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
          profile_id?: string | null
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
          profile_id?: string | null
          radius_m?: number
          shape?: Database["public"]["Enums"]["event_shape"] | null
          starts_at?: string | null
          vibe?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_event_areas_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_event_areas_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_event_areas_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_event_areas_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_event_areas_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_notifications: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          kind: string
          payload: Json | null
          profile_id: string | null
          seen_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          kind: string
          payload?: Json | null
          profile_id?: string | null
          seen_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          kind?: string
          payload?: Json | null
          profile_id?: string | null
          seen_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_event_notifications_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_event_notifications_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_event_notifications_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_event_notifications_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_event_notifications_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      field_tiles: {
        Row: {
          active_floq_ids: string[]
          avg_vibe: Json
          centroid: unknown | null
          crowd_count: number
          geohash6: string | null
          h3_7: string | null
          presence_cnt: number
          profile_id: string | null
          tile_id: string
          updated_at: string
          venue_cnt: number
        }
        Insert: {
          active_floq_ids?: string[]
          avg_vibe?: Json
          centroid?: unknown | null
          crowd_count?: number
          geohash6?: string | null
          h3_7?: string | null
          presence_cnt?: number
          profile_id?: string | null
          tile_id?: string
          updated_at?: string
          venue_cnt?: number
        }
        Update: {
          active_floq_ids?: string[]
          avg_vibe?: Json
          centroid?: unknown | null
          crowd_count?: number
          geohash6?: string | null
          h3_7?: string | null
          presence_cnt?: number
          profile_id?: string | null
          tile_id?: string
          updated_at?: string
          venue_cnt?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_field_tiles_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_field_tiles_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_field_tiles_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_field_tiles_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_field_tiles_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      field_tiles_v2: {
        Row: {
          active_profile_ids: string[] | null
          avg_vibe: Json | null
          center_lat: number
          center_lng: number
          crowd_count: number | null
          hex_geom: unknown
          last_activity: string | null
          tile_id: string
          updated_at: string
          vibe_mix: Json | null
        }
        Insert: {
          active_profile_ids?: string[] | null
          avg_vibe?: Json | null
          center_lat: number
          center_lng: number
          crowd_count?: number | null
          hex_geom: unknown
          last_activity?: string | null
          tile_id: string
          updated_at?: string
          vibe_mix?: Json | null
        }
        Update: {
          active_profile_ids?: string[] | null
          avg_vibe?: Json | null
          center_lat?: number
          center_lng?: number
          crowd_count?: number | null
          hex_geom?: unknown
          last_activity?: string | null
          tile_id?: string
          updated_at?: string
          vibe_mix?: Json | null
        }
        Relationships: []
      }
      flock_auto_suggestions: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          expires_at: string | null
          id: string
          profile_id: string | null
          reasoning_data: Json | null
          status: Database["public"]["Enums"]["suggestion_status_enum"] | null
          suggested_users: string[] | null
          suggestion_type: Database["public"]["Enums"]["suggestion_type_enum"]
          target_floq_id: string | null
          updated_at: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          profile_id?: string | null
          reasoning_data?: Json | null
          status?: Database["public"]["Enums"]["suggestion_status_enum"] | null
          suggested_users?: string[] | null
          suggestion_type: Database["public"]["Enums"]["suggestion_type_enum"]
          target_floq_id?: string | null
          updated_at?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          profile_id?: string | null
          reasoning_data?: Json | null
          status?: Database["public"]["Enums"]["suggestion_status_enum"] | null
          suggested_users?: string[] | null
          suggestion_type?: Database["public"]["Enums"]["suggestion_type_enum"]
          target_floq_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_flock_auto_suggestions_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_flock_auto_suggestions_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_flock_auto_suggestions_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_flock_auto_suggestions_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_flock_auto_suggestions_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flock_auto_suggestions_target_floq_id_fkey"
            columns: ["target_floq_id"]
            isOneToOne: false
            referencedRelation: "business_floq_detail_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flock_auto_suggestions_target_floq_id_fkey"
            columns: ["target_floq_id"]
            isOneToOne: false
            referencedRelation: "floq_peek_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flock_auto_suggestions_target_floq_id_fkey"
            columns: ["target_floq_id"]
            isOneToOne: false
            referencedRelation: "floq_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flock_auto_suggestions_target_floq_id_fkey"
            columns: ["target_floq_id"]
            isOneToOne: false
            referencedRelation: "floqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flock_auto_suggestions_target_floq_id_fkey"
            columns: ["target_floq_id"]
            isOneToOne: false
            referencedRelation: "floqs_discovery_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flock_auto_suggestions_target_floq_id_fkey"
            columns: ["target_floq_id"]
            isOneToOne: false
            referencedRelation: "my_floqs_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flock_auto_suggestions_target_floq_id_fkey"
            columns: ["target_floq_id"]
            isOneToOne: false
            referencedRelation: "v_public_floqs"
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
          profile_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: Database["public"]["Enums"]["flock_event_type_enum"]
          floq_id: string
          id?: string
          metadata?: Json | null
          new_vibe?: Database["public"]["Enums"]["vibe_enum"] | null
          previous_vibe?: Database["public"]["Enums"]["vibe_enum"] | null
          profile_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: Database["public"]["Enums"]["flock_event_type_enum"]
          floq_id?: string
          id?: string
          metadata?: Json | null
          new_vibe?: Database["public"]["Enums"]["vibe_enum"] | null
          previous_vibe?: Database["public"]["Enums"]["vibe_enum"] | null
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_flock_history_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_flock_history_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_flock_history_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_flock_history_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_flock_history_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flock_history_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "business_floq_detail_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flock_history_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floq_peek_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flock_history_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floq_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flock_history_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flock_history_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floqs_discovery_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flock_history_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "my_floqs_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flock_history_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "v_public_floqs"
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
          profile_id: string | null
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
          profile_id?: string | null
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
          profile_id?: string | null
          relationship_strength?: number | null
          updated_at?: string | null
          user_a_id?: string
          user_b_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_flock_relationships_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_flock_relationships_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_flock_relationships_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_flock_relationships_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_flock_relationships_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_a"
            columns: ["user_a_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_a"
            columns: ["user_a_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_user_a"
            columns: ["user_a_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_a"
            columns: ["user_a_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_a"
            columns: ["user_a_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_b"
            columns: ["user_b_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_b"
            columns: ["user_b_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_user_b"
            columns: ["user_b_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_b"
            columns: ["user_b_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_b"
            columns: ["user_b_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      floq_activity: {
        Row: {
          content: string | null
          created_at: string | null
          floq_id: string
          guest_name: string | null
          id: string
          kind: string
          plan_id: string | null
          profile_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          floq_id: string
          guest_name?: string | null
          id?: string
          kind: string
          plan_id?: string | null
          profile_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          floq_id?: string
          guest_name?: string | null
          id?: string
          kind?: string
          plan_id?: string | null
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_floq_activity_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_activity_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_floq_activity_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_activity_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_activity_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_activity_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "business_floq_detail_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_activity_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floq_peek_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_activity_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floq_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_activity_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_activity_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floqs_discovery_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_activity_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "my_floqs_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_activity_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "v_public_floqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_activity_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "floq_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_activity_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_activity_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "floq_activity_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_activity_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_activity_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      floq_afterglow: {
        Row: {
          chat_highlights: Json | null
          created_at: string | null
          date: string | null
          duration_minutes: number | null
          floq_id: string
          id: string
          join_time: string | null
          leave_time: string | null
          location_name: string | null
          peak_moment_text: string | null
          people_seen: string[] | null
          profile_id: string | null
          vibe_at_join: string | null
          vibe_at_leave: string | null
          vibe_changes: Json | null
        }
        Insert: {
          chat_highlights?: Json | null
          created_at?: string | null
          date?: string | null
          duration_minutes?: number | null
          floq_id: string
          id?: string
          join_time?: string | null
          leave_time?: string | null
          location_name?: string | null
          peak_moment_text?: string | null
          people_seen?: string[] | null
          profile_id?: string | null
          vibe_at_join?: string | null
          vibe_at_leave?: string | null
          vibe_changes?: Json | null
        }
        Update: {
          chat_highlights?: Json | null
          created_at?: string | null
          date?: string | null
          duration_minutes?: number | null
          floq_id?: string
          id?: string
          join_time?: string | null
          leave_time?: string | null
          location_name?: string | null
          peak_moment_text?: string | null
          people_seen?: string[] | null
          profile_id?: string | null
          vibe_at_join?: string | null
          vibe_at_leave?: string | null
          vibe_changes?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_floq_afterglow_floq"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "business_floq_detail_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_afterglow_floq"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floq_peek_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_afterglow_floq"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floq_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_afterglow_floq"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_afterglow_floq"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floqs_discovery_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_afterglow_floq"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "my_floqs_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_afterglow_floq"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "v_public_floqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_afterglow_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_afterglow_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_floq_afterglow_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_afterglow_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_afterglow_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
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
          profile_id: string | null
        }
        Insert: {
          boost_type?: string
          created_at?: string
          expires_at?: string
          floq_id: string
          id?: string
          profile_id?: string | null
        }
        Update: {
          boost_type?: string
          created_at?: string
          expires_at?: string
          floq_id?: string
          id?: string
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_floq_boosts_floq"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "business_floq_detail_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_boosts_floq"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floq_peek_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_boosts_floq"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floq_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_boosts_floq"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_boosts_floq"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floqs_discovery_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_boosts_floq"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "my_floqs_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_boosts_floq"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "v_public_floqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_boosts_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_boosts_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_floq_boosts_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_boosts_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_boosts_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      floq_ignored: {
        Row: {
          floq_id: string
          ignored_at: string | null
          profile_id: string | null
        }
        Insert: {
          floq_id: string
          ignored_at?: string | null
          profile_id?: string | null
        }
        Update: {
          floq_id?: string
          ignored_at?: string | null
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_floq_ignored_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_ignored_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_floq_ignored_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_ignored_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_ignored_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_ignored_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "business_floq_detail_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_ignored_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floq_peek_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_ignored_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floq_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_ignored_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_ignored_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floqs_discovery_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_ignored_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "my_floqs_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_ignored_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "v_public_floqs"
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
          profile_id: string | null
          responded_at: string | null
          status: Database["public"]["Enums"]["invitation_status"]
        }
        Insert: {
          created_at?: string
          floq_id: string
          id?: string
          invitee_id: string
          inviter_id?: string
          profile_id?: string | null
          responded_at?: string | null
          status?: Database["public"]["Enums"]["invitation_status"]
        }
        Update: {
          created_at?: string
          floq_id?: string
          id?: string
          invitee_id?: string
          inviter_id?: string
          profile_id?: string | null
          responded_at?: string | null
          status?: Database["public"]["Enums"]["invitation_status"]
        }
        Relationships: [
          {
            foreignKeyName: "fk_floq_invitations_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_invitations_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_floq_invitations_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_invitations_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_invitations_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_invitations_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "business_floq_detail_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_invitations_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floq_peek_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_invitations_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floq_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_invitations_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_invitations_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floqs_discovery_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_invitations_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "my_floqs_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_invitations_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "v_public_floqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_invitations_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_invitations_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "floq_invitations_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_invitations_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_invitations_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_invitations_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_invitations_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "floq_invitations_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_invitations_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_invitations_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      floq_mention_cooldown: {
        Row: {
          floq_id: string
          last_mention_at: string
          profile_id: string | null
        }
        Insert: {
          floq_id: string
          last_mention_at?: string
          profile_id?: string | null
        }
        Update: {
          floq_id?: string
          last_mention_at?: string
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_floq_mention_cooldown_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_mention_cooldown_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_floq_mention_cooldown_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_mention_cooldown_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_mention_cooldown_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      floq_message_mentions: {
        Row: {
          created_at: string | null
          end_idx: number
          message_id: string
          profile_id: string | null
          start_idx: number
          target_id: string
          target_type: Database["public"]["Enums"]["mention_target"]
        }
        Insert: {
          created_at?: string | null
          end_idx: number
          message_id: string
          profile_id?: string | null
          start_idx: number
          target_id: string
          target_type: Database["public"]["Enums"]["mention_target"]
        }
        Update: {
          created_at?: string | null
          end_idx?: number
          message_id?: string
          profile_id?: string | null
          start_idx?: number
          target_id?: string
          target_type?: Database["public"]["Enums"]["mention_target"]
        }
        Relationships: [
          {
            foreignKeyName: "fk_floq_message_mentions_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_message_mentions_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_floq_message_mentions_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_message_mentions_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_message_mentions_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_message_mentions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "floq_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_message_mentions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "v_chat_message"
            referencedColumns: ["id"]
          },
        ]
      }
      floq_message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          profile_id: string | null
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          profile_id?: string | null
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_floq_message_reactions_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_message_reactions_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_floq_message_reactions_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_message_reactions_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_message_reactions_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "floq_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "v_chat_message"
            referencedColumns: ["id"]
          },
        ]
      }
      floq_messages: {
        Row: {
          body: string | null
          created_at: string
          delivery_state: string | null
          emoji: string | null
          floq_id: string
          id: string
          profile_id: string | null
          reply_to_id: string | null
          sender_id: string
          status: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          delivery_state?: string | null
          emoji?: string | null
          floq_id: string
          id?: string
          profile_id?: string | null
          reply_to_id?: string | null
          sender_id: string
          status?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          delivery_state?: string | null
          emoji?: string | null
          floq_id?: string
          id?: string
          profile_id?: string | null
          reply_to_id?: string | null
          sender_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_floq_messages_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_messages_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_floq_messages_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_messages_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_messages_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_reply"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "floq_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_reply"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "v_chat_message"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_messages_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "business_floq_detail_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_messages_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floq_peek_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_messages_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floq_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_messages_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_messages_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floqs_discovery_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_messages_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "my_floqs_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_messages_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "v_public_floqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_messages_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_messages_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "floq_messages_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_messages_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_messages_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "floq_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "v_chat_message"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "floq_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      floq_participants: {
        Row: {
          floq_id: string
          joined_at: string | null
          last_read_message_at: string
          profile_id: string
          role: string | null
        }
        Insert: {
          floq_id: string
          joined_at?: string | null
          last_read_message_at?: string
          profile_id: string
          role?: string | null
        }
        Update: {
          floq_id?: string
          joined_at?: string | null
          last_read_message_at?: string
          profile_id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "floq_participants_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "business_floq_detail_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_participants_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floq_peek_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_participants_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floq_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_participants_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_participants_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floqs_discovery_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_participants_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "my_floqs_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_participants_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "v_public_floqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "floq_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      floq_plans: {
        Row: {
          archived_at: string | null
          budget_per_person: number | null
          collaboration_status: string | null
          created_at: string | null
          creator_id: string
          current_stop_id: string | null
          description: string | null
          duration_hours: number | null
          end_at: string | null
          end_time: string | null
          execution_started_at: string | null
          finalized_by: string | null
          finished_at: string | null
          floq_id: string | null
          id: string
          location: unknown | null
          locked_at: string | null
          max_participants: number | null
          plan_mode: Database["public"]["Enums"]["plan_mode"]
          plan_summary: string | null
          planned_at: string
          profile_id: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["plan_status_enum"] | null
          title: string
          total_budget: number | null
          updated_at: string | null
          vibe_tag: string | null
          vibe_tags: string[] | null
        }
        Insert: {
          archived_at?: string | null
          budget_per_person?: number | null
          collaboration_status?: string | null
          created_at?: string | null
          creator_id: string
          current_stop_id?: string | null
          description?: string | null
          duration_hours?: number | null
          end_at?: string | null
          end_time?: string | null
          execution_started_at?: string | null
          finalized_by?: string | null
          finished_at?: string | null
          floq_id?: string | null
          id?: string
          location?: unknown | null
          locked_at?: string | null
          max_participants?: number | null
          plan_mode?: Database["public"]["Enums"]["plan_mode"]
          plan_summary?: string | null
          planned_at: string
          profile_id?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["plan_status_enum"] | null
          title: string
          total_budget?: number | null
          updated_at?: string | null
          vibe_tag?: string | null
          vibe_tags?: string[] | null
        }
        Update: {
          archived_at?: string | null
          budget_per_person?: number | null
          collaboration_status?: string | null
          created_at?: string | null
          creator_id?: string
          current_stop_id?: string | null
          description?: string | null
          duration_hours?: number | null
          end_at?: string | null
          end_time?: string | null
          execution_started_at?: string | null
          finalized_by?: string | null
          finished_at?: string | null
          floq_id?: string | null
          id?: string
          location?: unknown | null
          locked_at?: string | null
          max_participants?: number | null
          plan_mode?: Database["public"]["Enums"]["plan_mode"]
          plan_summary?: string | null
          planned_at?: string
          profile_id?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["plan_status_enum"] | null
          title?: string
          total_budget?: number | null
          updated_at?: string | null
          vibe_tag?: string | null
          vibe_tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_floq_plans_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_plans_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_floq_plans_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_plans_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_plans_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_plans_creator_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_plans_creator_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "floq_plans_creator_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_plans_creator_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_plans_creator_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_plans_current_stop_id_fkey"
            columns: ["current_stop_id"]
            isOneToOne: false
            referencedRelation: "plan_stops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_plans_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "business_floq_detail_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_plans_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floq_peek_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_plans_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floq_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_plans_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_plans_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floqs_discovery_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_plans_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "my_floqs_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_plans_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "v_public_floqs"
            referencedColumns: ["id"]
          },
        ]
      }
      floq_session_feed: {
        Row: {
          author_profile_id: string
          created_at: string
          duration_sec: number | null
          expires_at: string | null
          floq_id: string
          id: string
          kind: Database["public"]["Enums"]["floq_feed_kind"]
          saved_to_ripple: boolean
          storage_key: string | null
          text_content: string | null
        }
        Insert: {
          author_profile_id: string
          created_at?: string
          duration_sec?: number | null
          expires_at?: string | null
          floq_id: string
          id?: string
          kind: Database["public"]["Enums"]["floq_feed_kind"]
          saved_to_ripple?: boolean
          storage_key?: string | null
          text_content?: string | null
        }
        Update: {
          author_profile_id?: string
          created_at?: string
          duration_sec?: number | null
          expires_at?: string | null
          floq_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["floq_feed_kind"]
          saved_to_ripple?: boolean
          storage_key?: string | null
          text_content?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "floq_session_feed_author_profile_id_fkey"
            columns: ["author_profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_session_feed_author_profile_id_fkey"
            columns: ["author_profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "floq_session_feed_author_profile_id_fkey"
            columns: ["author_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_session_feed_author_profile_id_fkey"
            columns: ["author_profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_session_feed_author_profile_id_fkey"
            columns: ["author_profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_session_feed_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "business_floq_detail_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_session_feed_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floq_peek_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_session_feed_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floq_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_session_feed_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_session_feed_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floqs_discovery_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_session_feed_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "my_floqs_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_session_feed_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "v_public_floqs"
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
          profile_id: string | null
          updated_at: string
          welcome_message: string | null
        }
        Insert: {
          activity_visibility?: Database["public"]["Enums"]["activity_visibility_enum"]
          floq_id: string
          join_approval_required?: boolean
          mention_permissions?: Database["public"]["Enums"]["mention_permissions_enum"]
          notifications_enabled?: boolean
          profile_id?: string | null
          updated_at?: string
          welcome_message?: string | null
        }
        Update: {
          activity_visibility?: Database["public"]["Enums"]["activity_visibility_enum"]
          floq_id?: string
          join_approval_required?: boolean
          mention_permissions?: Database["public"]["Enums"]["mention_permissions_enum"]
          notifications_enabled?: boolean
          profile_id?: string | null
          updated_at?: string
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_floq_settings_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_settings_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_floq_settings_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_settings_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floq_settings_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_settings_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: true
            referencedRelation: "business_floq_detail_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_settings_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: true
            referencedRelation: "floq_peek_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_settings_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: true
            referencedRelation: "floq_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_settings_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: true
            referencedRelation: "floqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_settings_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: true
            referencedRelation: "floqs_discovery_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_settings_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: true
            referencedRelation: "my_floqs_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_settings_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: true
            referencedRelation: "v_public_floqs"
            referencedColumns: ["id"]
          },
        ]
      }
      floqs: {
        Row: {
          activity_score: number
          archived_at: string | null
          auto_created: boolean | null
          catchment_area: unknown | null
          created_at: string | null
          creator_id: string
          deleted_at: string | null
          description: string | null
          ends_at: string | null
          expires_at: string | null
          flock_tags: string[] | null
          flock_type: Database["public"]["Enums"]["flock_type_enum"] | null
          geo: unknown | null
          h3_7: string | null
          id: string
          last_activity_at: string | null
          location: unknown | null
          max_participants: number | null
          name: string | null
          parent_flock_id: string | null
          pinned_note: string | null
          primary_vibe: Database["public"]["Enums"]["vibe_enum"]
          profile_id: string | null
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
          archived_at?: string | null
          auto_created?: boolean | null
          catchment_area?: unknown | null
          created_at?: string | null
          creator_id?: string
          deleted_at?: string | null
          description?: string | null
          ends_at?: string | null
          expires_at?: string | null
          flock_tags?: string[] | null
          flock_type?: Database["public"]["Enums"]["flock_type_enum"] | null
          geo?: unknown | null
          h3_7?: string | null
          id?: string
          last_activity_at?: string | null
          location?: unknown | null
          max_participants?: number | null
          name?: string | null
          parent_flock_id?: string | null
          pinned_note?: string | null
          primary_vibe: Database["public"]["Enums"]["vibe_enum"]
          profile_id?: string | null
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
        Update: {
          activity_score?: number
          archived_at?: string | null
          auto_created?: boolean | null
          catchment_area?: unknown | null
          created_at?: string | null
          creator_id?: string
          deleted_at?: string | null
          description?: string | null
          ends_at?: string | null
          expires_at?: string | null
          flock_tags?: string[] | null
          flock_type?: Database["public"]["Enums"]["flock_type_enum"] | null
          geo?: unknown | null
          h3_7?: string | null
          id?: string
          last_activity_at?: string | null
          location?: unknown | null
          max_participants?: number | null
          name?: string | null
          parent_flock_id?: string | null
          pinned_note?: string | null
          primary_vibe?: Database["public"]["Enums"]["vibe_enum"]
          profile_id?: string | null
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
            foreignKeyName: "fk_floqs_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floqs_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_floqs_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floqs_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floqs_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floqs_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floqs_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "floqs_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floqs_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floqs_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floqs_parent_flock_id_fkey"
            columns: ["parent_flock_id"]
            isOneToOne: false
            referencedRelation: "business_floq_detail_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floqs_parent_flock_id_fkey"
            columns: ["parent_flock_id"]
            isOneToOne: false
            referencedRelation: "floq_peek_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floqs_parent_flock_id_fkey"
            columns: ["parent_flock_id"]
            isOneToOne: false
            referencedRelation: "floq_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floqs_parent_flock_id_fkey"
            columns: ["parent_flock_id"]
            isOneToOne: false
            referencedRelation: "floqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floqs_parent_flock_id_fkey"
            columns: ["parent_flock_id"]
            isOneToOne: false
            referencedRelation: "floqs_discovery_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floqs_parent_flock_id_fkey"
            columns: ["parent_flock_id"]
            isOneToOne: false
            referencedRelation: "my_floqs_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floqs_parent_flock_id_fkey"
            columns: ["parent_flock_id"]
            isOneToOne: false
            referencedRelation: "v_public_floqs"
            referencedColumns: ["id"]
          },
        ]
      }
      frequency_caps: {
        Row: {
          cap_per_day: number
          created_at: string
          id: string
          partner_id: string
          profile_id: string
          reset_at: string
          updated_at: string
          used_today: number
        }
        Insert: {
          cap_per_day?: number
          created_at?: string
          id?: string
          partner_id: string
          profile_id: string
          reset_at?: string
          updated_at?: string
          used_today?: number
        }
        Update: {
          cap_per_day?: number
          created_at?: string
          id?: string
          partner_id?: string
          profile_id?: string
          reset_at?: string
          updated_at?: string
          used_today?: number
        }
        Relationships: []
      }
      friend_last_points: {
        Row: {
          accuracy_m: number | null
          captured_at: string | null
          geom: unknown | null
          profile_id: string
          updated_at: string | null
        }
        Insert: {
          accuracy_m?: number | null
          captured_at?: string | null
          geom?: unknown | null
          profile_id: string
          updated_at?: string | null
        }
        Update: {
          accuracy_m?: number | null
          captured_at?: string | null
          geom?: unknown | null
          profile_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_friend_last_points_profile_id"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_friend_last_points_profile_id"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_friend_last_points_profile_id"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_friend_last_points_profile_id"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_friend_last_points_profile_id"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_requests: {
        Row: {
          created_at: string | null
          id: string
          other_profile_id: string
          profile_id: string | null
          responded_at: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          other_profile_id: string
          profile_id?: string | null
          responded_at?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          other_profile_id?: string
          profile_id?: string | null
          responded_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_friend_requests_other"
            columns: ["other_profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_friend_requests_other"
            columns: ["other_profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_friend_requests_other"
            columns: ["other_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_friend_requests_other"
            columns: ["other_profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_friend_requests_other"
            columns: ["other_profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_friend_requests_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_friend_requests_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_friend_requests_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_friend_requests_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_friend_requests_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_share_pref: {
        Row: {
          auto_when: Database["public"]["Enums"]["auto_when_enum"][] | null
          ends_at: string | null
          is_live: boolean
          other_profile_id: string
          profile_id: string
          target_profile_id: string | null
          updated_at: string | null
        }
        Insert: {
          auto_when?: Database["public"]["Enums"]["auto_when_enum"][] | null
          ends_at?: string | null
          is_live?: boolean
          other_profile_id: string
          profile_id: string
          target_profile_id?: string | null
          updated_at?: string | null
        }
        Update: {
          auto_when?: Database["public"]["Enums"]["auto_when_enum"][] | null
          ends_at?: string | null
          is_live?: boolean
          other_profile_id?: string
          profile_id?: string
          target_profile_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "friend_share_pref_other_fk"
            columns: ["other_profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_share_pref_other_fk"
            columns: ["other_profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "friend_share_pref_other_fk"
            columns: ["other_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_share_pref_other_fk"
            columns: ["other_profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_share_pref_other_fk"
            columns: ["other_profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_share_pref_target_profile_id_fkey"
            columns: ["target_profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_share_pref_target_profile_id_fkey"
            columns: ["target_profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "friend_share_pref_target_profile_id_fkey"
            columns: ["target_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_share_pref_target_profile_id_fkey"
            columns: ["target_profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_share_pref_target_profile_id_fkey"
            columns: ["target_profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_suggestions: {
        Row: {
          confidence_level: string
          created_at: string
          expires_at: string
          id: string
          responded_at: string | null
          score: number
          signals_summary: Json
          status: string
          suggested_profile_id: string
          suggestion_reason: string
          target_profile_id: string
        }
        Insert: {
          confidence_level: string
          created_at?: string
          expires_at?: string
          id?: string
          responded_at?: string | null
          score: number
          signals_summary?: Json
          status?: string
          suggested_profile_id: string
          suggestion_reason: string
          target_profile_id: string
        }
        Update: {
          confidence_level?: string
          created_at?: string
          expires_at?: string
          id?: string
          responded_at?: string | null
          score?: number
          signals_summary?: Json
          status?: string
          suggested_profile_id?: string
          suggestion_reason?: string
          target_profile_id?: string
        }
        Relationships: []
      }
      friend_trails: {
        Row: {
          lat: number
          lng: number
          profile_id: string | null
          ts: string
        }
        Insert: {
          lat: number
          lng: number
          profile_id?: string | null
          ts?: string
        }
        Update: {
          lat?: number
          lng?: number
          profile_id?: string | null
          ts?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_friend_trails_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_friend_trails_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_friend_trails_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_friend_trails_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_friend_trails_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friendship_analysis: {
        Row: {
          confidence_level: string
          created_at: string
          overall_score: number
          relationship_type: string
          signals_data: Json
          updated_at: string
          user_high: string
          user_low: string
        }
        Insert: {
          confidence_level: string
          created_at?: string
          overall_score: number
          relationship_type: string
          signals_data?: Json
          updated_at?: string
          user_high: string
          user_low: string
        }
        Update: {
          confidence_level?: string
          created_at?: string
          overall_score?: number
          relationship_type?: string
          signals_data?: Json
          updated_at?: string
          user_high?: string
          user_low?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          created_at: string | null
          friend_state: Database["public"]["Enums"]["friend_state"]
          is_close: boolean
          profile_high: string
          profile_low: string
          responded_at: string | null
        }
        Insert: {
          created_at?: string | null
          friend_state?: Database["public"]["Enums"]["friend_state"]
          is_close?: boolean
          profile_high: string
          profile_low: string
          responded_at?: string | null
        }
        Update: {
          created_at?: string | null
          friend_state?: Database["public"]["Enums"]["friend_state"]
          is_close?: boolean
          profile_high?: string
          profile_low?: string
          responded_at?: string | null
        }
        Relationships: []
      }
      function_replacements: {
        Row: {
          function_name: string | null
          modified_definition: string | null
          original_definition: string | null
          schema_name: string | null
        }
        Insert: {
          function_name?: string | null
          modified_definition?: string | null
          original_definition?: string | null
          schema_name?: string | null
        }
        Update: {
          function_name?: string | null
          modified_definition?: string | null
          original_definition?: string | null
          schema_name?: string | null
        }
        Relationships: []
      }
      function_rewrite_log: {
        Row: {
          function_name: string
          id: number
          new_definition: string
          original_definition: string
          rewritten_at: string | null
          schema_name: string
        }
        Insert: {
          function_name: string
          id?: never
          new_definition: string
          original_definition: string
          rewritten_at?: string | null
          schema_name: string
        }
        Update: {
          function_name?: string
          id?: never
          new_definition?: string
          original_definition?: string
          rewritten_at?: string | null
          schema_name?: string
        }
        Relationships: []
      }
      geofence_data: {
        Row: {
          center_lat: number | null
          center_lng: number | null
          created_at: string
          geofence_id: string
          id: string
          polygon_coordinates: Json | null
          radius_meters: number | null
        }
        Insert: {
          center_lat?: number | null
          center_lng?: number | null
          created_at?: string
          geofence_id: string
          id?: string
          polygon_coordinates?: Json | null
          radius_meters?: number | null
        }
        Update: {
          center_lat?: number | null
          center_lng?: number | null
          created_at?: string
          geofence_id?: string
          id?: string
          polygon_coordinates?: Json | null
          radius_meters?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "geofence_data_geofence_id_fkey"
            columns: ["geofence_id"]
            isOneToOne: false
            referencedRelation: "geofences"
            referencedColumns: ["id"]
          },
        ]
      }
      geofences: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          privacy_level: string
          profile_id: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          privacy_level: string
          profile_id: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          privacy_level?: string
          profile_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "geofences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geofences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "geofences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geofences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geofences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_epsilon_registry: {
        Row: {
          created_at: string
          epsilon_remaining: number
          group_id: string
          id: string
          updated_at: string
          window_end: string
          window_start: string
        }
        Insert: {
          created_at?: string
          epsilon_remaining?: number
          group_id: string
          id?: string
          updated_at?: string
          window_end?: string
          window_start?: string
        }
        Update: {
          created_at?: string
          epsilon_remaining?: number
          group_id?: string
          id?: string
          updated_at?: string
          window_end?: string
          window_start?: string
        }
        Relationships: []
      }
      live_positions: {
        Row: {
          accuracy: number | null
          created_at: string
          expires_at: string
          geog: unknown | null
          id: string
          last_updated: string
          latitude: number
          longitude: number
          profile_id: string
          vibe: string | null
          visibility: string
        }
        Insert: {
          accuracy?: number | null
          created_at?: string
          expires_at?: string
          geog?: unknown | null
          id?: string
          last_updated?: string
          latitude: number
          longitude: number
          profile_id: string
          vibe?: string | null
          visibility?: string
        }
        Update: {
          accuracy?: number | null
          created_at?: string
          expires_at?: string
          geog?: unknown | null
          id?: string
          last_updated?: string
          latitude?: number
          longitude?: number
          profile_id?: string
          vibe?: string | null
          visibility?: string
        }
        Relationships: []
      }
      location_history: {
        Row: {
          accuracy: number | null
          created_at: string
          geog: unknown | null
          geohash6: string | null
          h3_idx: number | null
          id: string
          latitude: number
          longitude: number
          profile_id: string
          recorded_at: string
        }
        Insert: {
          accuracy?: number | null
          created_at?: string
          geog?: unknown | null
          geohash6?: string | null
          h3_idx?: number | null
          id?: string
          latitude: number
          longitude: number
          profile_id: string
          recorded_at?: string
        }
        Update: {
          accuracy?: number | null
          created_at?: string
          geog?: unknown | null
          geohash6?: string | null
          h3_idx?: number | null
          id?: string
          latitude?: number
          longitude?: number
          profile_id?: string
          recorded_at?: string
        }
        Relationships: []
      }
      location_metrics: {
        Row: {
          id: string
          metadata: Json
          metric_name: string
          metric_value: number
          profile_id: string | null
          recorded_at: string
        }
        Insert: {
          id?: string
          metadata?: Json
          metric_name: string
          metric_value: number
          profile_id?: string | null
          recorded_at?: string
        }
        Update: {
          id?: string
          metadata?: Json
          metric_name?: string
          metric_value?: number
          profile_id?: string | null
          recorded_at?: string
        }
        Relationships: []
      }
      location_performance_metrics: {
        Row: {
          duration_ms: number
          error_message: string | null
          id: string
          metadata: Json | null
          operation_type: string
          profile_id: string | null
          recorded_at: string
          success: boolean
        }
        Insert: {
          duration_ms: number
          error_message?: string | null
          id?: string
          metadata?: Json | null
          operation_type: string
          profile_id?: string | null
          recorded_at?: string
          success?: boolean
        }
        Update: {
          duration_ms?: number
          error_message?: string | null
          id?: string
          metadata?: Json | null
          operation_type?: string
          profile_id?: string | null
          recorded_at?: string
          success?: boolean
        }
        Relationships: []
      }
      location_requests: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          message: string | null
          requester_id: string
          responded_at: string | null
          response_location: unknown | null
          status: Database["public"]["Enums"]["location_request_status"]
          target_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          message?: string | null
          requester_id: string
          responded_at?: string | null
          response_location?: unknown | null
          status?: Database["public"]["Enums"]["location_request_status"]
          target_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          message?: string | null
          requester_id?: string
          responded_at?: string | null
          response_location?: unknown | null
          status?: Database["public"]["Enums"]["location_request_status"]
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "location_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_requests_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_requests_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "location_requests_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_requests_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_requests_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      location_system_health: {
        Row: {
          component_name: string
          id: string
          metadata: Json | null
          metric_name: string
          metric_value: number
          profile_id: string | null
          recorded_at: string
        }
        Insert: {
          component_name: string
          id?: string
          metadata?: Json | null
          metric_name: string
          metric_value: number
          profile_id?: string | null
          recorded_at?: string
        }
        Update: {
          component_name?: string
          id?: string
          metadata?: Json | null
          metric_name?: string
          metric_value?: number
          profile_id?: string | null
          recorded_at?: string
        }
        Relationships: []
      }
      location_vibe_patterns: {
        Row: {
          accuracy: number
          confidence: number
          created_at: string
          first_detected_at: string
          frequency: number
          id: string
          last_updated_at: string
          location: unknown | null
          location_context: Json
          location_hash: string
          profile_id: string
          temporal_patterns: Json
          venue_id: string | null
          vibe: Database["public"]["Enums"]["vibe_enum"]
        }
        Insert: {
          accuracy: number
          confidence: number
          created_at?: string
          first_detected_at?: string
          frequency?: number
          id?: string
          last_updated_at?: string
          location?: unknown | null
          location_context?: Json
          location_hash: string
          profile_id: string
          temporal_patterns?: Json
          venue_id?: string | null
          vibe: Database["public"]["Enums"]["vibe_enum"]
        }
        Update: {
          accuracy?: number
          confidence?: number
          created_at?: string
          first_detected_at?: string
          frequency?: number
          id?: string
          last_updated_at?: string
          location?: unknown | null
          location_context?: Json
          location_hash?: string
          profile_id?: string
          temporal_patterns?: Json
          venue_id?: string | null
          vibe?: Database["public"]["Enums"]["vibe_enum"]
        }
        Relationships: []
      }
      min_interval_table: {
        Row: {
          class: string
          created_at: string
          id: string
          interval_ms: number
          profile_id: string | null
          updated_at: string
        }
        Insert: {
          class: string
          created_at?: string
          id?: string
          interval_ms: number
          profile_id?: string | null
          updated_at?: string
        }
        Update: {
          class?: string
          created_at?: string
          id?: string
          interval_ms?: number
          profile_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      model_passports: {
        Row: {
          budget_remaining: number
          capabilities: string[]
          created_at: string
          enclave_attestation: string | null
          expires_at: string
          id: string
          model_version: string
          privacy_budget: number
          profile_id: string
          updated_at: string
        }
        Insert: {
          budget_remaining?: number
          capabilities?: string[]
          created_at?: string
          enclave_attestation?: string | null
          expires_at?: string
          id?: string
          model_version?: string
          privacy_budget?: number
          profile_id: string
          updated_at?: string
        }
        Update: {
          budget_remaining?: number
          capabilities?: string[]
          created_at?: string
          enclave_attestation?: string | null
          expires_at?: string
          id?: string
          model_version?: string
          privacy_budget?: number
          profile_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_queue: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          profile_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          processed_at?: string | null
          profile_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          profile_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_notification_queue_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_notification_queue_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_notification_queue_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_notification_queue_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_notification_queue_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ping_requests: {
        Row: {
          id: string
          profile_id: string | null
          requested_at: string
          requester_id: string
          responded_at: string | null
          status: string
          target_id: string
        }
        Insert: {
          id?: string
          profile_id?: string | null
          requested_at?: string
          requester_id: string
          responded_at?: string | null
          status: string
          target_id: string
        }
        Update: {
          id?: string
          profile_id?: string | null
          requested_at?: string
          requester_id?: string
          responded_at?: string | null
          status?: string
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_ping_requests_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ping_requests_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_ping_requests_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ping_requests_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ping_requests_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
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
          profile_id: string | null
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
          profile_id?: string | null
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
          profile_id?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_place_banners_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_place_banners_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_place_banners_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_place_banners_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_place_banners_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "place_banners_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "place_banners_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "place_banners_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "place_banners_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "place_banners_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      place_details: {
        Row: {
          data: Json
          fetched_at: string | null
          place_id: string
          profile_id: string | null
        }
        Insert: {
          data: Json
          fetched_at?: string | null
          place_id: string
          profile_id?: string | null
        }
        Update: {
          data?: Json
          fetched_at?: string | null
          place_id?: string
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "place_details_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "place_details_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "place_details_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "place_details_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "place_details_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_activities: {
        Row: {
          activity_type: string
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          plan_id: string
          profile_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          plan_id: string
          profile_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          plan_id?: string
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_plan_activities_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_activities_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_plan_activities_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_activities_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_activities_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_activities_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "floq_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_afterglow: {
        Row: {
          created_at: string | null
          date: string | null
          ending_sentiment: string | null
          group_energy_peak: string | null
          group_vibe_arc: Json | null
          id: string
          my_contribution: string | null
          plan_id: string
          profile_id: string | null
          shared_moments: Json | null
          would_repeat_score: number | null
        }
        Insert: {
          created_at?: string | null
          date?: string | null
          ending_sentiment?: string | null
          group_energy_peak?: string | null
          group_vibe_arc?: Json | null
          id?: string
          my_contribution?: string | null
          plan_id: string
          profile_id?: string | null
          shared_moments?: Json | null
          would_repeat_score?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string | null
          ending_sentiment?: string | null
          group_energy_peak?: string | null
          group_vibe_arc?: Json | null
          id?: string
          my_contribution?: string | null
          plan_id?: string
          profile_id?: string | null
          shared_moments?: Json | null
          would_repeat_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_plan_afterglow_plan"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "floq_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_afterglow_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_afterglow_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_plan_afterglow_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_afterglow_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_afterglow_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_ai_summaries: {
        Row: {
          created_at: string | null
          error_message: string | null
          plan_id: string
          profile_id: string | null
          status: string
          suggestions: Json | null
          summary_md: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          plan_id: string
          profile_id?: string | null
          status?: string
          suggestions?: Json | null
          summary_md?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          plan_id?: string
          profile_id?: string | null
          status?: string
          suggestions?: Json | null
          summary_md?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_plan_ai_summaries_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_ai_summaries_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_plan_ai_summaries_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_ai_summaries_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_ai_summaries_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_ai_summaries_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: true
            referencedRelation: "floq_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_check_ins: {
        Row: {
          checked_in_at: string
          checked_out_at: string | null
          created_at: string
          device_id: string | null
          geo_hash: string | null
          id: string
          location: unknown | null
          participant_id: string
          plan_id: string
          profile_id: string | null
          stop_id: string
        }
        Insert: {
          checked_in_at?: string
          checked_out_at?: string | null
          created_at?: string
          device_id?: string | null
          geo_hash?: string | null
          id?: string
          location?: unknown | null
          participant_id: string
          plan_id: string
          profile_id?: string | null
          stop_id: string
        }
        Update: {
          checked_in_at?: string
          checked_out_at?: string | null
          created_at?: string
          device_id?: string | null
          geo_hash?: string | null
          id?: string
          location?: unknown | null
          participant_id?: string
          plan_id?: string
          profile_id?: string | null
          stop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_plan_check_ins_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_check_ins_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_plan_check_ins_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_check_ins_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_check_ins_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_check_ins_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "floq_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_check_ins_stop_id_fkey"
            columns: ["stop_id"]
            isOneToOne: false
            referencedRelation: "plan_stops"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          mentioned_users: string[] | null
          plan_id: string
          profile_id: string | null
          reply_to_id: string | null
          stop_id: string | null
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          mentioned_users?: string[] | null
          plan_id: string
          profile_id?: string | null
          reply_to_id?: string | null
          stop_id?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          mentioned_users?: string[] | null
          plan_id?: string
          profile_id?: string | null
          reply_to_id?: string | null
          stop_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_plan_comments_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_comments_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_plan_comments_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_comments_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_comments_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_comments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "floq_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_comments_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "plan_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_comments_stop_id_fkey"
            columns: ["stop_id"]
            isOneToOne: false
            referencedRelation: "plan_stops"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_drafts: {
        Row: {
          created_at: string
          draft_data: Json
          id: string
          last_saved_at: string
          plan_id: string
          profile_id: string | null
          version: number
        }
        Insert: {
          created_at?: string
          draft_data: Json
          id?: string
          last_saved_at?: string
          plan_id: string
          profile_id?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          draft_data?: Json
          id?: string
          last_saved_at?: string
          plan_id?: string
          profile_id?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_plan_drafts_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_drafts_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_plan_drafts_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_drafts_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_drafts_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_drafts_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "floq_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_feedback: {
        Row: {
          created_at: string | null
          favorite_moment: string | null
          id: string
          plan_id: string
          profile_id: string | null
          vibe_rating: number | null
          would_repeat: boolean | null
        }
        Insert: {
          created_at?: string | null
          favorite_moment?: string | null
          id?: string
          plan_id: string
          profile_id?: string | null
          vibe_rating?: number | null
          would_repeat?: boolean | null
        }
        Update: {
          created_at?: string | null
          favorite_moment?: string | null
          id?: string
          plan_id?: string
          profile_id?: string | null
          vibe_rating?: number | null
          would_repeat?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_plan_feedback_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_feedback_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_plan_feedback_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_feedback_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_feedback_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_feedback_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "floq_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_floqs: {
        Row: {
          auto_disband: boolean
          created_at: string
          floq_id: string
          plan_id: string
          profile_id: string | null
        }
        Insert: {
          auto_disband?: boolean
          created_at?: string
          floq_id: string
          plan_id: string
          profile_id?: string | null
        }
        Update: {
          auto_disband?: boolean
          created_at?: string
          floq_id?: string
          plan_id?: string
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_plan_floqs_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_floqs_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_plan_floqs_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_floqs_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_floqs_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_floqs_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "business_floq_detail_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_floqs_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floq_peek_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_floqs_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floq_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_floqs_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_floqs_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floqs_discovery_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_floqs_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "my_floqs_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_floqs_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "v_public_floqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_floqs_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "floq_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_invitations: {
        Row: {
          archived: boolean | null
          expires_at: string | null
          id: string
          invitation_type: string | null
          invited_at: string | null
          invitee_email: string | null
          invitee_profile_id: string | null
          inviter_id: string
          plan_id: string
          profile_id: string | null
          responded_at: string | null
          status: string | null
          token: string | null
        }
        Insert: {
          archived?: boolean | null
          expires_at?: string | null
          id?: string
          invitation_type?: string | null
          invited_at?: string | null
          invitee_email?: string | null
          invitee_profile_id?: string | null
          inviter_id: string
          plan_id: string
          profile_id?: string | null
          responded_at?: string | null
          status?: string | null
          token?: string | null
        }
        Update: {
          archived?: boolean | null
          expires_at?: string | null
          id?: string
          invitation_type?: string | null
          invited_at?: string | null
          invitee_email?: string | null
          invitee_profile_id?: string | null
          inviter_id?: string
          plan_id?: string
          profile_id?: string | null
          responded_at?: string | null
          status?: string | null
          token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_plan_invitations_profile_id"
            columns: ["invitee_profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_invitations_profile_id"
            columns: ["invitee_profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_plan_invitations_profile_id"
            columns: ["invitee_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_invitations_profile_id"
            columns: ["invitee_profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_invitations_profile_id"
            columns: ["invitee_profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_invite_profile"
            columns: ["invitee_profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_invite_profile"
            columns: ["invitee_profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_plan_invite_profile"
            columns: ["invitee_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_invite_profile"
            columns: ["invitee_profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_invite_profile"
            columns: ["invitee_profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_invitations_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "floq_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_invites: {
        Row: {
          inserted_at: string
          plan_id: string
          profile_id: string | null
          status: Database["public"]["Enums"]["invite_status"]
          updated_at: string
        }
        Insert: {
          inserted_at?: string
          plan_id: string
          profile_id?: string | null
          status?: Database["public"]["Enums"]["invite_status"]
          updated_at?: string
        }
        Update: {
          inserted_at?: string
          plan_id?: string
          profile_id?: string | null
          status?: Database["public"]["Enums"]["invite_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_plan_invites_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_invites_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_plan_invites_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_invites_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_invites_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_invites_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "floq_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_participants: {
        Row: {
          guest_email: string | null
          guest_name: string | null
          guest_phone: string | null
          id: string
          invite_type: string | null
          invited_at: string | null
          is_guest: boolean
          joined_at: string | null
          notes: string | null
          plan_id: string
          profile_id: string | null
          reminded_at: string | null
          responded_at: string | null
          role: Database["public"]["Enums"]["plan_role_enum"]
          rsvp_status: Database["public"]["Enums"]["rsvp_status_enum"] | null
        }
        Insert: {
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          invite_type?: string | null
          invited_at?: string | null
          is_guest?: boolean
          joined_at?: string | null
          notes?: string | null
          plan_id: string
          profile_id?: string | null
          reminded_at?: string | null
          responded_at?: string | null
          role?: Database["public"]["Enums"]["plan_role_enum"]
          rsvp_status?: Database["public"]["Enums"]["rsvp_status_enum"] | null
        }
        Update: {
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          invite_type?: string | null
          invited_at?: string | null
          is_guest?: boolean
          joined_at?: string | null
          notes?: string | null
          plan_id?: string
          profile_id?: string | null
          reminded_at?: string | null
          responded_at?: string | null
          role?: Database["public"]["Enums"]["plan_role_enum"]
          rsvp_status?: Database["public"]["Enums"]["rsvp_status_enum"] | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_plan_participants_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_participants_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_plan_participants_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_participants_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_participants_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_participants_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "floq_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_share_links: {
        Row: {
          click_count: number
          created_at: string
          created_by: string | null
          id: string
          last_accessed_at: string | null
          plan_id: string
          profile_id: string | null
          slug: string
        }
        Insert: {
          click_count?: number
          created_at?: string
          created_by?: string | null
          id?: string
          last_accessed_at?: string | null
          plan_id: string
          profile_id?: string | null
          slug: string
        }
        Update: {
          click_count?: number
          created_at?: string
          created_by?: string | null
          id?: string
          last_accessed_at?: string | null
          plan_id?: string
          profile_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_plan_share_links_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_share_links_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_plan_share_links_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_share_links_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_share_links_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_stop_comments: {
        Row: {
          created_at: string | null
          guest_id: string | null
          id: string
          plan_id: string
          profile_id: string | null
          stop_id: string
          text: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          guest_id?: string | null
          id?: string
          plan_id: string
          profile_id?: string | null
          stop_id: string
          text: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          guest_id?: string | null
          id?: string
          plan_id?: string
          profile_id?: string | null
          stop_id?: string
          text?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_plan_stop_comments_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_stop_comments_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_plan_stop_comments_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_stop_comments_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_stop_comments_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_stop_comments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "floq_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_stop_comments_stop_id_fkey"
            columns: ["stop_id"]
            isOneToOne: false
            referencedRelation: "plan_stops"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_stop_votes: {
        Row: {
          created_at: string | null
          emoji_reaction: string | null
          guest_id: string | null
          id: string
          plan_id: string
          profile_id: string | null
          stop_id: string
          updated_at: string | null
          vote_type: string
        }
        Insert: {
          created_at?: string | null
          emoji_reaction?: string | null
          guest_id?: string | null
          id?: string
          plan_id: string
          profile_id?: string | null
          stop_id: string
          updated_at?: string | null
          vote_type: string
        }
        Update: {
          created_at?: string | null
          emoji_reaction?: string | null
          guest_id?: string | null
          id?: string
          plan_id?: string
          profile_id?: string | null
          stop_id?: string
          updated_at?: string | null
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_plan_stop_votes_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_stop_votes_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_plan_stop_votes_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_stop_votes_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_stop_votes_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_stops: {
        Row: {
          address: string | null
          created_at: string | null
          created_by: string
          description: string | null
          duration_minutes: number
          end_time: string | null
          estimated_cost_per_person: number | null
          estimated_duration_minutes: number | null
          id: string
          location: unknown | null
          plan_id: string
          profile_id: string | null
          sort_order: number
          start_time: string | null
          stop_order: number
          stop_type: string | null
          title: string
          updated_at: string | null
          venue_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          duration_minutes?: number
          end_time?: string | null
          estimated_cost_per_person?: number | null
          estimated_duration_minutes?: number | null
          id?: string
          location?: unknown | null
          plan_id: string
          profile_id?: string | null
          sort_order?: number
          start_time?: string | null
          stop_order: number
          stop_type?: string | null
          title: string
          updated_at?: string | null
          venue_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          duration_minutes?: number
          end_time?: string | null
          estimated_cost_per_person?: number | null
          estimated_duration_minutes?: number | null
          id?: string
          location?: unknown | null
          plan_id?: string
          profile_id?: string | null
          sort_order?: number
          start_time?: string | null
          stop_order?: number
          stop_type?: string | null
          title?: string
          updated_at?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_plan_stops_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_stops_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_plan_stops_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_stops_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_stops_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_stops_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "floq_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_stops_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "plan_stops_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "plan_stops_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "plan_stops_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "plan_stops_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_summaries: {
        Row: {
          created_at: string | null
          generated_at: string | null
          id: string
          mode: Database["public"]["Enums"]["summary_mode"]
          plan_id: string
          profile_id: string | null
          summary: string
        }
        Insert: {
          created_at?: string | null
          generated_at?: string | null
          id?: string
          mode: Database["public"]["Enums"]["summary_mode"]
          plan_id: string
          profile_id?: string | null
          summary: string
        }
        Update: {
          created_at?: string | null
          generated_at?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["summary_mode"]
          plan_id?: string
          profile_id?: string | null
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_plan_summaries_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_summaries_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_plan_summaries_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_summaries_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_summaries_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_summaries_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "floq_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_transit_cache: {
        Row: {
          created_at: string
          distance_meters: number | null
          duration_seconds: number | null
          from_geom: unknown
          from_stop_id: string
          id: string
          plan_id: string
          profile_id: string | null
          to_geom: unknown
          to_stop_id: string
          transit_data: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          distance_meters?: number | null
          duration_seconds?: number | null
          from_geom: unknown
          from_stop_id: string
          id?: string
          plan_id: string
          profile_id?: string | null
          to_geom: unknown
          to_stop_id: string
          transit_data: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          distance_meters?: number | null
          duration_seconds?: number | null
          from_geom?: unknown
          from_stop_id?: string
          id?: string
          plan_id?: string
          profile_id?: string | null
          to_geom?: unknown
          to_stop_id?: string
          transit_data?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_plan_transit_cache_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_transit_cache_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_plan_transit_cache_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_transit_cache_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_transit_cache_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_transit_cache_from_stop_id_fkey"
            columns: ["from_stop_id"]
            isOneToOne: false
            referencedRelation: "plan_stops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_transit_cache_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "floq_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_transit_cache_to_stop_id_fkey"
            columns: ["to_stop_id"]
            isOneToOne: false
            referencedRelation: "plan_stops"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_votes: {
        Row: {
          comment: string | null
          created_at: string | null
          emoji_reaction: string | null
          guest_name: string | null
          id: string
          plan_id: string
          profile_id: string | null
          stop_id: string
          updated_at: string | null
          vote_type: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          emoji_reaction?: string | null
          guest_name?: string | null
          id?: string
          plan_id: string
          profile_id?: string | null
          stop_id: string
          updated_at?: string | null
          vote_type: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          emoji_reaction?: string | null
          guest_name?: string | null
          id?: string
          plan_id?: string
          profile_id?: string | null
          stop_id?: string
          updated_at?: string | null
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_plan_votes_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_votes_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_plan_votes_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_votes_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_votes_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_votes_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "floq_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_votes_stop_id_fkey"
            columns: ["stop_id"]
            isOneToOne: false
            referencedRelation: "plan_stops"
            referencedColumns: ["id"]
          },
        ]
      }
      presence: {
        Row: {
          accuracy_m: number | null
          geohash6: string | null
          h3_idx: number | null
          id: string
          lat: number | null
          lng: number | null
          location: unknown | null
          profile_id: string
          started_at: string | null
          updated_at: string
          venue_id: string | null
          vibe: Database["public"]["Enums"]["vibe_enum"] | null
          vibe_tag: string | null
        }
        Insert: {
          accuracy_m?: number | null
          geohash6?: string | null
          h3_idx?: number | null
          id: string
          lat?: number | null
          lng?: number | null
          location?: unknown | null
          profile_id: string
          started_at?: string | null
          updated_at?: string
          venue_id?: string | null
          vibe?: Database["public"]["Enums"]["vibe_enum"] | null
          vibe_tag?: string | null
        }
        Update: {
          accuracy_m?: number | null
          geohash6?: string | null
          h3_idx?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          location?: unknown | null
          profile_id?: string
          started_at?: string | null
          updated_at?: string
          venue_id?: string | null
          vibe?: Database["public"]["Enums"]["vibe_enum"] | null
          vibe_tag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "presence_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presence_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "presence_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presence_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presence_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presence_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "presence_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "presence_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "presence_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "presence_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      presence_events: {
        Row: {
          accuracy_m: number | null
          created_at: string
          id: string
          location: unknown
          prev_state_duration_ms: number | null
          profile_id: string
          source: string
          status: Database["public"]["Enums"]["checkin_status"]
          venue_id: string | null
        }
        Insert: {
          accuracy_m?: number | null
          created_at?: string
          id?: string
          location: unknown
          prev_state_duration_ms?: number | null
          profile_id: string
          source?: string
          status: Database["public"]["Enums"]["checkin_status"]
          venue_id?: string | null
        }
        Update: {
          accuracy_m?: number | null
          created_at?: string
          id?: string
          location?: unknown
          prev_state_duration_ms?: number | null
          profile_id?: string
          source?: string
          status?: Database["public"]["Enums"]["checkin_status"]
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "presence_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presence_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "presence_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presence_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presence_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presence_events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "presence_events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "presence_events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "presence_events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "presence_events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      presence_log: {
        Row: {
          location: unknown
          profile_id: string
          ts: string
          vibe: Database["public"]["Enums"]["vibe_enum"]
        }
        Insert: {
          location: unknown
          profile_id: string
          ts?: string
          vibe?: Database["public"]["Enums"]["vibe_enum"]
        }
        Update: {
          location?: unknown
          profile_id?: string
          ts?: string
          vibe?: Database["public"]["Enums"]["vibe_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "presence_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presence_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "presence_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presence_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presence_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
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
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string
          interests: string[] | null
          is_searchable: boolean
          last_loc: unknown | null
          last_name: string | null
          live_accuracy: Database["public"]["Enums"]["acc_enum"] | null
          live_auto_when: string[] | null
          live_muted_until: string | null
          live_scope: Database["public"]["Enums"]["scope_enum"] | null
          live_smart_flags: Json | null
          profile_created: boolean | null
          profile_id: string | null
          push_token: string | null
          search_vec: unknown | null
          updated_at: string
          username: string
          vibe_preference: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          custom_status?: string | null
          display_name: string
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          interests?: string[] | null
          is_searchable?: boolean
          last_loc?: unknown | null
          last_name?: string | null
          live_accuracy?: Database["public"]["Enums"]["acc_enum"] | null
          live_auto_when?: string[] | null
          live_muted_until?: string | null
          live_scope?: Database["public"]["Enums"]["scope_enum"] | null
          live_smart_flags?: Json | null
          profile_created?: boolean | null
          profile_id?: string | null
          push_token?: string | null
          search_vec?: unknown | null
          updated_at?: string
          username: string
          vibe_preference?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          custom_status?: string | null
          display_name?: string
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          interests?: string[] | null
          is_searchable?: boolean
          last_loc?: unknown | null
          last_name?: string | null
          live_accuracy?: Database["public"]["Enums"]["acc_enum"] | null
          live_auto_when?: string[] | null
          live_muted_until?: string | null
          live_scope?: Database["public"]["Enums"]["scope_enum"] | null
          live_smart_flags?: Json | null
          profile_created?: boolean | null
          profile_id?: string | null
          push_token?: string | null
          search_vec?: unknown | null
          updated_at?: string
          username?: string
          vibe_preference?: string | null
        }
        Relationships: []
      }
      proximity_events: {
        Row: {
          accuracy_score: number | null
          confidence: number | null
          distance_meters: number | null
          event_ts: string
          event_type: string | null
          id: string
          location_accuracy_meters: number | null
          ml_features: Json | null
          profile_id_a: string
          profile_id_b: string
          venue_context: string | null
          venue_id: string | null
          vibe_context: Json | null
        }
        Insert: {
          accuracy_score?: number | null
          confidence?: number | null
          distance_meters?: number | null
          event_ts?: string
          event_type?: string | null
          id?: string
          location_accuracy_meters?: number | null
          ml_features?: Json | null
          profile_id_a: string
          profile_id_b: string
          venue_context?: string | null
          venue_id?: string | null
          vibe_context?: Json | null
        }
        Update: {
          accuracy_score?: number | null
          confidence?: number | null
          distance_meters?: number | null
          event_ts?: string
          event_type?: string | null
          id?: string
          location_accuracy_meters?: number | null
          ml_features?: Json | null
          profile_id_a?: string
          profile_id_b?: string
          venue_context?: string | null
          venue_id?: string | null
          vibe_context?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "proximity_events_profile_id_a_fkey"
            columns: ["profile_id_a"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proximity_events_profile_id_a_fkey"
            columns: ["profile_id_a"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "proximity_events_profile_id_a_fkey"
            columns: ["profile_id_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proximity_events_profile_id_a_fkey"
            columns: ["profile_id_a"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proximity_events_profile_id_a_fkey"
            columns: ["profile_id_a"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proximity_events_profile_id_b_fkey"
            columns: ["profile_id_b"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proximity_events_profile_id_b_fkey"
            columns: ["profile_id_b"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "proximity_events_profile_id_b_fkey"
            columns: ["profile_id_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proximity_events_profile_id_b_fkey"
            columns: ["profile_id_b"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proximity_events_profile_id_b_fkey"
            columns: ["profile_id_b"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      proximity_stats: {
        Row: {
          average_distance_meters: number | null
          confidence_score: number
          id: string
          last_encounter: string | null
          profile_id_a: string
          profile_id_b: string
          total_duration_minutes: number
          total_encounters: number
          updated_at: string
        }
        Insert: {
          average_distance_meters?: number | null
          confidence_score?: number
          id?: string
          last_encounter?: string | null
          profile_id_a: string
          profile_id_b: string
          total_duration_minutes?: number
          total_encounters?: number
          updated_at?: string
        }
        Update: {
          average_distance_meters?: number | null
          confidence_score?: number
          id?: string
          last_encounter?: string | null
          profile_id_a?: string
          profile_id_b?: string
          total_duration_minutes?: number
          total_encounters?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proximity_stats_profile_id_a_fkey"
            columns: ["profile_id_a"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proximity_stats_profile_id_a_fkey"
            columns: ["profile_id_a"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "proximity_stats_profile_id_a_fkey"
            columns: ["profile_id_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proximity_stats_profile_id_a_fkey"
            columns: ["profile_id_a"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proximity_stats_profile_id_a_fkey"
            columns: ["profile_id_a"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proximity_stats_profile_id_b_fkey"
            columns: ["profile_id_b"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proximity_stats_profile_id_b_fkey"
            columns: ["profile_id_b"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "proximity_stats_profile_id_b_fkey"
            columns: ["profile_id_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proximity_stats_profile_id_b_fkey"
            columns: ["profile_id_b"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proximity_stats_profile_id_b_fkey"
            columns: ["profile_id_b"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      proximity_system_logs: {
        Row: {
          active_geofences_count: number | null
          avg_confidence: number | null
          created_at: string | null
          id: number
          log_date: string
          total_events_24h: number | null
          unique_users_24h: number | null
          venue_signatures_count: number | null
        }
        Insert: {
          active_geofences_count?: number | null
          avg_confidence?: number | null
          created_at?: string | null
          id?: number
          log_date: string
          total_events_24h?: number | null
          unique_users_24h?: number | null
          venue_signatures_count?: number | null
        }
        Update: {
          active_geofences_count?: number | null
          avg_confidence?: number | null
          created_at?: string | null
          id?: number
          log_date?: string
          total_events_24h?: number | null
          unique_users_24h?: number | null
          venue_signatures_count?: number | null
        }
        Relationships: []
      }
      pulse_events: {
        Row: {
          created_at: string | null
          event_type: Database["public"]["Enums"]["pulse_event_type"]
          floq_id: string | null
          id: number
          meta: Json | null
          people_count: number | null
          profile_id: string | null
          venue_id: string | null
          vibe_tag: Database["public"]["Enums"]["vibe_tag"] | null
        }
        Insert: {
          created_at?: string | null
          event_type: Database["public"]["Enums"]["pulse_event_type"]
          floq_id?: string | null
          id?: number
          meta?: Json | null
          people_count?: number | null
          profile_id?: string | null
          venue_id?: string | null
          vibe_tag?: Database["public"]["Enums"]["vibe_tag"] | null
        }
        Update: {
          created_at?: string | null
          event_type?: Database["public"]["Enums"]["pulse_event_type"]
          floq_id?: string | null
          id?: number
          meta?: Json | null
          people_count?: number | null
          profile_id?: string | null
          venue_id?: string | null
          vibe_tag?: Database["public"]["Enums"]["vibe_tag"] | null
        }
        Relationships: [
          {
            foreignKeyName: "pulse_events_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "business_floq_detail_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_events_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floq_peek_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_events_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floq_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_events_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_events_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floqs_discovery_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_events_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "my_floqs_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_events_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "v_public_floqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "pulse_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "pulse_events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "pulse_events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "pulse_events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "pulse_events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_config: {
        Row: {
          action_type: string
          created_at: string
          id: string
          max_count: number
          per_target: boolean
          updated_at: string
          window_duration_minutes: number
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          max_count: number
          per_target?: boolean
          updated_at?: string
          window_duration_minutes: number
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          max_count?: number
          per_target?: boolean
          updated_at?: string
          window_duration_minutes?: number
        }
        Relationships: []
      }
      raw_locations: {
        Row: {
          acc: number | null
          accuracy_m: number | null
          captured_at: string
          geohash5: string | null
          geom: unknown | null
          id: number
          profile_id: string | null
        }
        Insert: {
          acc?: number | null
          accuracy_m?: number | null
          captured_at: string
          geohash5?: string | null
          geom?: unknown | null
          id?: never
          profile_id?: string | null
        }
        Update: {
          acc?: number | null
          accuracy_m?: number | null
          captured_at?: string
          geohash5?: string | null
          geom?: unknown | null
          id?: never
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_raw_locations_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_raw_locations_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_raw_locations_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_raw_locations_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_raw_locations_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_locations_202507: {
        Row: {
          acc: number | null
          accuracy_m: number | null
          captured_at: string
          geohash5: string | null
          geom: unknown | null
          id: number
          profile_id: string | null
        }
        Insert: {
          acc?: number | null
          accuracy_m?: number | null
          captured_at: string
          geohash5?: string | null
          geom?: unknown | null
          id?: never
          profile_id?: string | null
        }
        Update: {
          acc?: number | null
          accuracy_m?: number | null
          captured_at?: string
          geohash5?: string | null
          geom?: unknown | null
          id?: never
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_raw_locations_202507_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_raw_locations_202507_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_raw_locations_202507_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_raw_locations_202507_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_raw_locations_202507_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_locations_202508: {
        Row: {
          acc: number | null
          accuracy_m: number | null
          captured_at: string
          geohash5: string | null
          geom: unknown | null
          id: number
          profile_id: string | null
        }
        Insert: {
          acc?: number | null
          accuracy_m?: number | null
          captured_at: string
          geohash5?: string | null
          geom?: unknown | null
          id?: never
          profile_id?: string | null
        }
        Update: {
          acc?: number | null
          accuracy_m?: number | null
          captured_at?: string
          geohash5?: string | null
          geom?: unknown | null
          id?: never
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_raw_locations_202508_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_raw_locations_202508_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_raw_locations_202508_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_raw_locations_202508_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_raw_locations_202508_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_locations_202509: {
        Row: {
          acc: number | null
          accuracy_m: number | null
          captured_at: string
          geohash5: string | null
          geom: unknown | null
          id: number
          profile_id: string | null
        }
        Insert: {
          acc?: number | null
          accuracy_m?: number | null
          captured_at: string
          geohash5?: string | null
          geom?: unknown | null
          id?: never
          profile_id?: string | null
        }
        Update: {
          acc?: number | null
          accuracy_m?: number | null
          captured_at?: string
          geohash5?: string | null
          geom?: unknown | null
          id?: never
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_raw_locations_202509_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_raw_locations_202509_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_raw_locations_202509_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_raw_locations_202509_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_raw_locations_202509_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_locations_staging: {
        Row: {
          acc: number | null
          captured_at: string | null
          lat: number | null
          lng: number | null
          profile_id: string | null
        }
        Insert: {
          acc?: number | null
          captured_at?: string | null
          lat?: number | null
          lng?: number | null
          profile_id?: string | null
        }
        Update: {
          acc?: number | null
          captured_at?: string | null
          lat?: number | null
          lng?: number | null
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_raw_locations_staging_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_raw_locations_staging_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_raw_locations_staging_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_raw_locations_staging_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_raw_locations_staging_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rec_user_vibe_weights: {
        Row: {
          profile_id: string
          updated_at: string
          vibe: string
          weights: Json
        }
        Insert: {
          profile_id: string
          updated_at?: string
          vibe: string
          weights: Json
        }
        Update: {
          profile_id?: string
          updated_at?: string
          vibe?: string
          weights?: Json
        }
        Relationships: [
          {
            foreignKeyName: "rec_user_vibe_weights_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rec_user_vibe_weights_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "rec_user_vibe_weights_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rec_user_vibe_weights_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rec_user_vibe_weights_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rec_vibe_weights: {
        Row: {
          updated_at: string
          vibe: string
          w_cuisine_match: number
          w_distance: number
          w_popularity: number
          w_price_fit: number
          w_rating: number
          w_tag_match: number
        }
        Insert: {
          updated_at?: string
          vibe: string
          w_cuisine_match?: number
          w_distance?: number
          w_popularity?: number
          w_price_fit?: number
          w_rating?: number
          w_tag_match?: number
        }
        Update: {
          updated_at?: string
          vibe?: string
          w_cuisine_match?: number
          w_distance?: number
          w_popularity?: number
          w_price_fit?: number
          w_rating?: number
          w_tag_match?: number
        }
        Relationships: []
      }
      recommendation_events: {
        Row: {
          ab_bucket: string | null
          candidate_ids: string[]
          context: Json
          created_at: string
          id: string
          profile_id: string
          scores: number[]
          top_ids: string[]
        }
        Insert: {
          ab_bucket?: string | null
          candidate_ids: string[]
          context: Json
          created_at?: string
          id?: string
          profile_id: string
          scores: number[]
          top_ids: string[]
        }
        Update: {
          ab_bucket?: string | null
          candidate_ids?: string[]
          context?: Json
          created_at?: string
          id?: string
          profile_id?: string
          scores?: number[]
          top_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "recommendation_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      refresh_metrics: {
        Row: {
          created_at: string
          duration_ms: number
          id: string
          profile_id: string | null
          started_at: string
          view_name: string
        }
        Insert: {
          created_at?: string
          duration_ms: number
          id?: string
          profile_id?: string | null
          started_at: string
          view_name: string
        }
        Update: {
          created_at?: string
          duration_ms?: number
          id?: string
          profile_id?: string | null
          started_at?: string
          view_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_refresh_metrics_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_refresh_metrics_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_refresh_metrics_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_refresh_metrics_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_refresh_metrics_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rename_user_id_to_profile_id_log: {
        Row: {
          column_name: string | null
          error_message: string | null
          executed_at: string | null
          id: number
          new_definition: string | null
          object_name: string | null
          object_type: string | null
          original_definition: string | null
          schema_name: string | null
          status: string | null
        }
        Insert: {
          column_name?: string | null
          error_message?: string | null
          executed_at?: string | null
          id?: number
          new_definition?: string | null
          object_name?: string | null
          object_type?: string | null
          original_definition?: string | null
          schema_name?: string | null
          status?: string | null
        }
        Update: {
          column_name?: string | null
          error_message?: string | null
          executed_at?: string | null
          id?: number
          new_definition?: string | null
          object_name?: string | null
          object_type?: string | null
          original_definition?: string | null
          schema_name?: string | null
          status?: string | null
        }
        Relationships: []
      }
      reserved_usernames: {
        Row: {
          name: string
          profile_id: string | null
        }
        Insert: {
          name: string
          profile_id?: string | null
        }
        Update: {
          name?: string
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_reserved_usernames_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_reserved_usernames_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_reserved_usernames_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_reserved_usernames_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_reserved_usernames_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ripple_signals: {
        Row: {
          centroid: unknown
          created_at: string
          expires_at: string
          id: string
          p1: string
          p2: string
          venue_id: string | null
        }
        Insert: {
          centroid: unknown
          created_at?: string
          expires_at?: string
          id?: string
          p1: string
          p2: string
          venue_id?: string | null
        }
        Update: {
          centroid?: unknown
          created_at?: string
          expires_at?: string
          id?: string
          p1?: string
          p2?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ripple_signals_p1_fkey"
            columns: ["p1"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ripple_signals_p1_fkey"
            columns: ["p1"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "ripple_signals_p1_fkey"
            columns: ["p1"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ripple_signals_p1_fkey"
            columns: ["p1"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ripple_signals_p1_fkey"
            columns: ["p1"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ripple_signals_p2_fkey"
            columns: ["p2"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ripple_signals_p2_fkey"
            columns: ["p2"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "ripple_signals_p2_fkey"
            columns: ["p2"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ripple_signals_p2_fkey"
            columns: ["p2"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ripple_signals_p2_fkey"
            columns: ["p2"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ripple_signals_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "ripple_signals_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "ripple_signals_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "ripple_signals_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "ripple_signals_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_log: {
        Row: {
          created_at: string
          details: Json
          event_type: string
          id: string
          ip_address: string | null
          profile_id: string | null
          severity: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          details?: Json
          event_type: string
          id?: string
          ip_address?: string | null
          profile_id?: string | null
          severity?: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          details?: Json
          event_type?: string
          id?: string
          ip_address?: string | null
          profile_id?: string | null
          severity?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      shared_location_pins: {
        Row: {
          created_at: string
          expires_at: string
          geom: unknown
          id: string
          owner_id: string
          profile_id: string | null
          viewer_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          geom: unknown
          id?: string
          owner_id: string
          profile_id?: string | null
          viewer_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          geom?: unknown
          id?: string
          owner_id?: string
          profile_id?: string | null
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_shared_location_pins_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_shared_location_pins_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_shared_location_pins_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_shared_location_pins_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_shared_location_pins_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      snap_suggestion_logs: {
        Row: {
          confidence: number | null
          id: string
          original_time: string
          plan_id: string
          profile_id: string | null
          reason: string | null
          snapped_time: string
          source: string
          stop_id: string | null
          used_at: string
        }
        Insert: {
          confidence?: number | null
          id?: string
          original_time: string
          plan_id: string
          profile_id?: string | null
          reason?: string | null
          snapped_time: string
          source?: string
          stop_id?: string | null
          used_at?: string
        }
        Update: {
          confidence?: number | null
          id?: string
          original_time?: string
          plan_id?: string
          profile_id?: string | null
          reason?: string | null
          snapped_time?: string
          source?: string
          stop_id?: string | null
          used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_snap_suggestion_logs_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_snap_suggestion_logs_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_snap_suggestion_logs_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_snap_suggestion_logs_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_snap_suggestion_logs_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snap_suggestion_logs_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "floq_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snap_suggestion_logs_stop_id_fkey"
            columns: ["stop_id"]
            isOneToOne: false
            referencedRelation: "plan_stops"
            referencedColumns: ["id"]
          },
        ]
      }
      social_clusters: {
        Row: {
          centroid: unknown
          first_seen_at: string
          id: string
          last_seen_at: string
          member_hash: string
          member_ids: string[]
          size: number
          state: Database["public"]["Enums"]["cluster_state"]
          venue_id: string | null
        }
        Insert: {
          centroid: unknown
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          member_hash: string
          member_ids: string[]
          size: number
          state?: Database["public"]["Enums"]["cluster_state"]
          venue_id?: string | null
        }
        Update: {
          centroid?: unknown
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          member_hash?: string
          member_ids?: string[]
          size?: number
          state?: Database["public"]["Enums"]["cluster_state"]
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_clusters_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "social_clusters_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "social_clusters_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "social_clusters_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "social_clusters_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
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
      stop_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_pinned: boolean | null
          parent_id: string | null
          stop_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          parent_id?: string | null
          stop_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          parent_id?: string | null
          stop_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stop_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "stop_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stop_comments_stop_id_fkey"
            columns: ["stop_id"]
            isOneToOne: false
            referencedRelation: "plan_stops"
            referencedColumns: ["id"]
          },
        ]
      }
      stop_votes: {
        Row: {
          created_at: string | null
          id: string
          stop_id: string
          updated_at: string | null
          user_id: string
          vote_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          stop_id: string
          updated_at?: string | null
          user_id: string
          vote_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          stop_id?: string
          updated_at?: string | null
          user_id?: string
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stop_votes_stop_id_fkey"
            columns: ["stop_id"]
            isOneToOne: false
            referencedRelation: "plan_stops"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_log: {
        Row: {
          created_at: string | null
          id: number
          kind: string
          lat: number
          lng: number
          profile_id: string | null
          ts: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          kind: string
          lat: number
          lng: number
          profile_id?: string | null
          ts?: string
        }
        Update: {
          created_at?: string | null
          id?: number
          kind?: string
          lat?: number
          lng?: number
          profile_id?: string | null
          ts?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_sync_log_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_sync_log_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_sync_log_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_sync_log_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_sync_log_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_queue: {
        Row: {
          created_at: string | null
          id: string
          payload: Json
          processed_at: string | null
          profile_id: string | null
          status: string
          task: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          payload?: Json
          processed_at?: string | null
          profile_id?: string | null
          status?: string
          task: string
        }
        Update: {
          created_at?: string | null
          id?: string
          payload?: Json
          processed_at?: string | null
          profile_id?: string | null
          status?: string
          task?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_task_queue_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_task_queue_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_task_queue_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_task_queue_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_task_queue_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          code: string
          earned_at: string | null
          profile_id: string | null
          progress: number | null
        }
        Insert: {
          code: string
          earned_at?: string | null
          profile_id?: string | null
          progress?: number | null
        }
        Update: {
          code?: string
          earned_at?: string | null
          profile_id?: string | null
          progress?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_achievements_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_achievements_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_user_achievements_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_achievements_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_achievements_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_code_fkey"
            columns: ["code"]
            isOneToOne: false
            referencedRelation: "achievement_catalogue"
            referencedColumns: ["code"]
          },
        ]
      }
      user_action_limits: {
        Row: {
          action_type: string
          count: number
          created_at: string
          id: string
          profile_id: string
          target_profile_id: string | null
          updated_at: string
          window_start: string
        }
        Insert: {
          action_type: string
          count?: number
          created_at?: string
          id?: string
          profile_id: string
          target_profile_id?: string | null
          updated_at?: string
          window_start?: string
        }
        Update: {
          action_type?: string
          count?: number
          created_at?: string
          id?: string
          profile_id?: string
          target_profile_id?: string | null
          updated_at?: string
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_action_limits_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_action_limits_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "user_action_limits_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_action_limits_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_action_limits_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_action_limits_target_profile_id_fkey"
            columns: ["target_profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_action_limits_target_profile_id_fkey"
            columns: ["target_profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "user_action_limits_target_profile_id_fkey"
            columns: ["target_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_action_limits_target_profile_id_fkey"
            columns: ["target_profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_action_limits_target_profile_id_fkey"
            columns: ["target_profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_action_log: {
        Row: {
          action: string
          happened_at: string
          profile_id: string | null
        }
        Insert: {
          action: string
          happened_at?: string
          profile_id?: string | null
        }
        Update: {
          action?: string
          happened_at?: string
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_action_log_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_action_log_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_user_action_log_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_action_log_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_action_log_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_encounter: {
        Row: {
          created_at: string | null
          distance_m: number | null
          first_seen: string
          id: number
          last_seen: string
          profile_id: string | null
          user_a: string
          user_b: string
          venue_id: string | null
        }
        Insert: {
          created_at?: string | null
          distance_m?: number | null
          first_seen: string
          id?: number
          last_seen: string
          profile_id?: string | null
          user_a: string
          user_b: string
          venue_id?: string | null
        }
        Update: {
          created_at?: string | null
          distance_m?: number | null
          first_seen?: string
          id?: number
          last_seen?: string
          profile_id?: string | null
          user_a?: string
          user_b?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_encounter_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_encounter_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_user_encounter_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_encounter_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_encounter_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorites: {
        Row: {
          created_at: string
          description: string | null
          image_url: string | null
          item_id: string
          item_type: string
          profile_id: string | null
          title: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          image_url?: string | null
          item_id: string
          item_type: string
          profile_id?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          image_url?: string | null
          item_id?: string
          item_type?: string
          profile_id?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_favorites_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_favorites_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_user_favorites_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_favorites_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_favorites_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
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
          profile_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          floq_id: string
          last_activity_viewed_at?: string
          last_chat_viewed_at?: string
          last_plans_viewed_at?: string
          profile_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          floq_id?: string
          last_activity_viewed_at?: string
          last_chat_viewed_at?: string
          last_plans_viewed_at?: string
          profile_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_tracking_floq"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "business_floq_detail_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_tracking_floq"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floq_peek_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_tracking_floq"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floq_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_tracking_floq"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_tracking_floq"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floqs_discovery_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_tracking_floq"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "my_floqs_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_tracking_floq"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "v_public_floqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_floq_activity_tracking_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_floq_activity_tracking_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_user_floq_activity_tracking_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_floq_activity_tracking_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_floq_activity_tracking_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
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
          profile_id: string | null
          read_at: string | null
          subtitle: string | null
          title: string
        }
        Insert: {
          created_at?: string
          floq_id?: string | null
          id?: string
          kind: string
          message_id?: string | null
          plan_id?: string | null
          profile_id?: string | null
          read_at?: string | null
          subtitle?: string | null
          title: string
        }
        Update: {
          created_at?: string
          floq_id?: string | null
          id?: string
          kind?: string
          message_id?: string | null
          plan_id?: string | null
          profile_id?: string | null
          read_at?: string | null
          subtitle?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_notifications_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_notifications_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_user_notifications_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_notifications_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_notifications_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notifications_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "business_floq_detail_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notifications_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floq_peek_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notifications_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floq_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notifications_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notifications_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floqs_discovery_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notifications_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "my_floqs_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notifications_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "v_public_floqs"
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
            foreignKeyName: "user_notifications_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "v_chat_message"
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
      user_onboarding_progress: {
        Row: {
          avatar_url: string | null
          completed_at: string | null
          completed_steps: number[]
          created_at: string
          current_step: number
          id: string
          onboarding_version: Database["public"]["Enums"]["onboarding_version_enum"]
          profile_data: Json | null
          profile_id: string | null
          selected_vibe: string | null
          started_at: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          completed_at?: string | null
          completed_steps?: number[]
          created_at?: string
          current_step?: number
          id?: string
          onboarding_version?: Database["public"]["Enums"]["onboarding_version_enum"]
          profile_data?: Json | null
          profile_id?: string | null
          selected_vibe?: string | null
          started_at?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          completed_at?: string | null
          completed_steps?: number[]
          created_at?: string
          current_step?: number
          id?: string
          onboarding_version?: Database["public"]["Enums"]["onboarding_version_enum"]
          profile_data?: Json | null
          profile_id?: string | null
          selected_vibe?: string | null
          started_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_onboarding_progress_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_onboarding_progress_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_user_onboarding_progress_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_onboarding_progress_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_onboarding_progress_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_online_status: {
        Row: {
          created_at: string
          heartbeat_at: string
          is_online: boolean
          last_seen: string
          profile_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          heartbeat_at?: string
          is_online?: boolean
          last_seen?: string
          profile_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          heartbeat_at?: string
          is_online?: boolean
          last_seen?: string
          profile_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          both_streak_weeks: number | null
          checkin_streak: number | null
          created_at: string | null
          declined_plan_types: Json | null
          energy_streak_weeks: number | null
          favorite_locations: string[] | null
          feedback_sentiment: Json | null
          field_enabled: boolean
          onboarding_completed_at: string | null
          onboarding_version: string | null
          prefer_smart_suggestions: boolean
          preferred_vibe: string | null
          profile_id: string | null
          social_streak_weeks: number | null
          updated_at: string | null
          vibe_color: string | null
          vibe_detection_enabled: boolean | null
          vibe_strength: number | null
        }
        Insert: {
          both_streak_weeks?: number | null
          checkin_streak?: number | null
          created_at?: string | null
          declined_plan_types?: Json | null
          energy_streak_weeks?: number | null
          favorite_locations?: string[] | null
          feedback_sentiment?: Json | null
          field_enabled?: boolean
          onboarding_completed_at?: string | null
          onboarding_version?: string | null
          prefer_smart_suggestions?: boolean
          preferred_vibe?: string | null
          profile_id?: string | null
          social_streak_weeks?: number | null
          updated_at?: string | null
          vibe_color?: string | null
          vibe_detection_enabled?: boolean | null
          vibe_strength?: number | null
        }
        Update: {
          both_streak_weeks?: number | null
          checkin_streak?: number | null
          created_at?: string | null
          declined_plan_types?: Json | null
          energy_streak_weeks?: number | null
          favorite_locations?: string[] | null
          feedback_sentiment?: Json | null
          field_enabled?: boolean
          onboarding_completed_at?: string | null
          onboarding_version?: string | null
          prefer_smart_suggestions?: boolean
          preferred_vibe?: string | null
          profile_id?: string | null
          social_streak_weeks?: number | null
          updated_at?: string | null
          vibe_color?: string | null
          vibe_detection_enabled?: boolean | null
          vibe_strength?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_preferences_profile_id"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_preferences_profile_id"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_user_preferences_profile_id"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_preferences_profile_id"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_preferences_profile_id"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_push_tokens: {
        Row: {
          badge_count: number
          device_id: string
          last_seen_at: string
          platform: string
          profile_id: string | null
          token: string
        }
        Insert: {
          badge_count?: number
          device_id: string
          last_seen_at?: string
          platform: string
          profile_id?: string | null
          token: string
        }
        Update: {
          badge_count?: number
          device_id?: string
          last_seen_at?: string
          platform?: string
          profile_id?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_push_tokens_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_push_tokens_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_user_push_tokens_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_push_tokens_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_push_tokens_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          available_until: string | null
          created_at: string
          field_enabled: boolean
          field_ripples: boolean | null
          field_trails: boolean | null
          notification_preferences: Json | null
          preferred_welcome_template:
            | Database["public"]["Enums"]["welcome_template_enum"]
            | null
          privacy_settings: Json | null
          profile_id: string | null
          theme_preferences: Json | null
          updated_at: string
        }
        Insert: {
          available_until?: string | null
          created_at?: string
          field_enabled?: boolean
          field_ripples?: boolean | null
          field_trails?: boolean | null
          notification_preferences?: Json | null
          preferred_welcome_template?:
            | Database["public"]["Enums"]["welcome_template_enum"]
            | null
          privacy_settings?: Json | null
          profile_id?: string | null
          theme_preferences?: Json | null
          updated_at?: string
        }
        Update: {
          available_until?: string | null
          created_at?: string
          field_enabled?: boolean
          field_ripples?: boolean | null
          field_trails?: boolean | null
          notification_preferences?: Json | null
          preferred_welcome_template?:
            | Database["public"]["Enums"]["welcome_template_enum"]
            | null
          privacy_settings?: Json | null
          profile_id?: string | null
          theme_preferences?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_settings_profile_id"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_settings_profile_id"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_user_settings_profile_id"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_settings_profile_id"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_settings_profile_id"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_tastes: {
        Row: {
          dietary: string[] | null
          disliked_cuisines: string[] | null
          disliked_tags: string[] | null
          distance_max_m: number | null
          model_updated_at: string | null
          model_weights: Json | null
          open_now_only: boolean | null
          preferred_cuisines: string[] | null
          preferred_tags: string[] | null
          price_max: number | null
          price_min: number | null
          profile_id: string
          updated_at: string | null
          vibe_preference: string[] | null
        }
        Insert: {
          dietary?: string[] | null
          disliked_cuisines?: string[] | null
          disliked_tags?: string[] | null
          distance_max_m?: number | null
          model_updated_at?: string | null
          model_weights?: Json | null
          open_now_only?: boolean | null
          preferred_cuisines?: string[] | null
          preferred_tags?: string[] | null
          price_max?: number | null
          price_min?: number | null
          profile_id: string
          updated_at?: string | null
          vibe_preference?: string[] | null
        }
        Update: {
          dietary?: string[] | null
          disliked_cuisines?: string[] | null
          disliked_tags?: string[] | null
          distance_max_m?: number | null
          model_updated_at?: string | null
          model_weights?: Json | null
          open_now_only?: boolean | null
          preferred_cuisines?: string[] | null
          preferred_tags?: string[] | null
          price_max?: number | null
          price_min?: number | null
          profile_id?: string
          updated_at?: string | null
          vibe_preference?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "user_tastes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_tastes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "user_tastes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_tastes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_tastes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_venue_interactions: {
        Row: {
          created_at: string
          id: string
          interaction_count: number
          interaction_type: string
          last_interaction_at: string
          profile_id: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interaction_count?: number
          interaction_type: string
          last_interaction_at?: string
          profile_id: string
          venue_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interaction_count?: number
          interaction_type?: string
          last_interaction_at?: string
          profile_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_venue_interactions_fk_profile"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_venue_interactions_fk_profile"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "user_venue_interactions_fk_profile"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_venue_interactions_fk_profile"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_venue_interactions_fk_profile"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_venue_interactions_fk_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "user_venue_interactions_fk_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "user_venue_interactions_fk_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "user_venue_interactions_fk_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "user_venue_interactions_fk_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_venue_interactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_venue_interactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "user_venue_interactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_venue_interactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_venue_interactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_venue_interactions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "user_venue_interactions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "user_venue_interactions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "user_venue_interactions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "user_venue_interactions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      user_venue_stats: {
        Row: {
          dislikes: number | null
          last_interaction: string | null
          likes: number | null
          profile_id: string
          venue_id: string
          visits: number | null
        }
        Insert: {
          dislikes?: number | null
          last_interaction?: string | null
          likes?: number | null
          profile_id: string
          venue_id: string
          visits?: number | null
        }
        Update: {
          dislikes?: number | null
          last_interaction?: string | null
          likes?: number | null
          profile_id?: string
          venue_id?: string
          visits?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_venue_stats_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_venue_stats_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "user_venue_stats_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_venue_stats_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_venue_stats_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_venue_stats_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "user_venue_stats_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "user_venue_stats_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "user_venue_stats_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "user_venue_stats_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      user_vibe_states: {
        Row: {
          active: boolean | null
          gh5: string | null
          location: unknown | null
          profile_id: string
          started_at: string
          vibe_h: number | null
          vibe_l: number | null
          vibe_s: number | null
          vibe_tag: Database["public"]["Enums"]["vibe_enum"]
          visible_to: string | null
        }
        Insert: {
          active?: boolean | null
          gh5?: string | null
          location?: unknown | null
          profile_id: string
          started_at?: string
          vibe_h?: number | null
          vibe_l?: number | null
          vibe_s?: number | null
          vibe_tag: Database["public"]["Enums"]["vibe_enum"]
          visible_to?: string | null
        }
        Update: {
          active?: boolean | null
          gh5?: string | null
          location?: unknown | null
          profile_id?: string
          started_at?: string
          vibe_h?: number | null
          vibe_l?: number | null
          vibe_s?: number | null
          vibe_tag?: Database["public"]["Enums"]["vibe_enum"]
          visible_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_vibe_states_profile_id"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_vibe_states_profile_id"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_user_vibe_states_profile_id"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_vibe_states_profile_id"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_vibe_states_profile_id"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_watchlist: {
        Row: {
          created_at: string
          plan_id: string
          profile_id: string | null
        }
        Insert: {
          created_at?: string
          plan_id: string
          profile_id?: string | null
        }
        Update: {
          created_at?: string
          plan_id?: string
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_watchlist_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_watchlist_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_user_watchlist_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_watchlist_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_watchlist_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_watchlist_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "floq_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_aliases: {
        Row: {
          created_at: string
          provider: string
          provider_id: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          provider: string
          provider_id: string
          venue_id: string
        }
        Update: {
          created_at?: string
          provider?: string
          provider_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_aliases_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_aliases_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_aliases_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_aliases_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_aliases_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_boundaries: {
        Row: {
          boundary_geom: unknown
          boundary_type: string
          confidence_score: number
          created_at: string
          id: string
          venue_id: string
        }
        Insert: {
          boundary_geom: unknown
          boundary_type: string
          confidence_score?: number
          created_at?: string
          id?: string
          venue_id: string
        }
        Update: {
          boundary_geom?: unknown
          boundary_type?: string
          confidence_score?: number
          created_at?: string
          id?: string
          venue_id?: string
        }
        Relationships: []
      }
      venue_bumps: {
        Row: {
          created_at: string | null
          profile_id: string
          venue_id: string
        }
        Insert: {
          created_at?: string | null
          profile_id: string
          venue_id: string
        }
        Update: {
          created_at?: string | null
          profile_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_bumps_fk_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_bumps_fk_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_bumps_fk_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_bumps_fk_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_bumps_fk_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_bumps_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_bumps_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "venue_bumps_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_bumps_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_bumps_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_bumps_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_bumps_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_bumps_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_bumps_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_bumps_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_category_map: {
        Row: {
          canonical: Database["public"]["Enums"]["canonical_tag"]
          created_at: string
          provider: string
          raw: string
        }
        Insert: {
          canonical: Database["public"]["Enums"]["canonical_tag"]
          created_at?: string
          provider: string
          raw: string
        }
        Update: {
          canonical?: Database["public"]["Enums"]["canonical_tag"]
          created_at?: string
          provider?: string
          raw?: string
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
          profile_id: string | null
          venue_count: number | null
        }
        Insert: {
          active_hours?: unknown | null
          boundary?: unknown | null
          cluster_type: Database["public"]["Enums"]["cluster_type_enum"]
          created_at?: string | null
          id?: string
          name: string
          profile_id?: string | null
          venue_count?: number | null
        }
        Update: {
          active_hours?: unknown | null
          boundary?: unknown | null
          cluster_type?: Database["public"]["Enums"]["cluster_type_enum"]
          created_at?: string | null
          id?: string
          name?: string
          profile_id?: string | null
          venue_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_venue_clusters_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_venue_clusters_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_venue_clusters_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_venue_clusters_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_venue_clusters_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_discoveries: {
        Row: {
          day_key: string
          discovered_at: string | null
          id: number
          profile_id: string | null
          venue_id: string | null
        }
        Insert: {
          day_key: string
          discovered_at?: string | null
          id?: number
          profile_id?: string | null
          venue_id?: string | null
        }
        Update: {
          day_key?: string
          discovered_at?: string | null
          id?: number
          profile_id?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venue_discoveries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_discoveries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "venue_discoveries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_discoveries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_discoveries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_discoveries_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_discoveries_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_discoveries_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_discoveries_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_discoveries_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_feed_posts: {
        Row: {
          content_type: string
          created_at: string
          expires_at: string
          id: string
          location: unknown
          mood_tags: string[] | null
          profile_id: string | null
          reaction_count: number | null
          storage_path: string | null
          text_content: string | null
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
          profile_id?: string | null
          reaction_count?: number | null
          storage_path?: string | null
          text_content?: string | null
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
          profile_id?: string | null
          reaction_count?: number | null
          storage_path?: string | null
          text_content?: string | null
          venue_id?: string
          vibe?: Database["public"]["Enums"]["vibe_enum"]
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_venue_feed_posts_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_venue_feed_posts_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_venue_feed_posts_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_venue_feed_posts_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_venue_feed_posts_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_feed_posts_fk_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_feed_posts_fk_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_feed_posts_fk_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_feed_posts_fk_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_feed_posts_fk_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_feed_posts_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_feed_posts_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_feed_posts_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_feed_posts_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_feed_posts_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_hours: {
        Row: {
          close: string
          dow: number
          open: string
          venue_id: string
        }
        Insert: {
          close: string
          dow: number
          open: string
          venue_id: string
        }
        Update: {
          close?: string
          dow?: number
          open?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_hours_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_hours_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_hours_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_hours_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_hours_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_import_runs: {
        Row: {
          caller: string | null
          id: string
          params: Json
          started_at: string
          status: string
        }
        Insert: {
          caller?: string | null
          id?: string
          params: Json
          started_at?: string
          status?: string
        }
        Update: {
          caller?: string | null
          id?: string
          params?: Json
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      venue_interactions: {
        Row: {
          context: Json | null
          created_at: string
          id: string
          interaction_type: string
          profile_id: string
          venue_id: string
          weight: number
        }
        Insert: {
          context?: Json | null
          created_at?: string
          id?: string
          interaction_type: string
          profile_id: string
          venue_id: string
          weight?: number
        }
        Update: {
          context?: Json | null
          created_at?: string
          id?: string
          interaction_type?: string
          profile_id?: string
          venue_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "venue_interactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_interactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "venue_interactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_interactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_interactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_interactions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_interactions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_interactions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_interactions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_interactions_venue_id_fkey"
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
          profile_id: string | null
          session_duration: unknown | null
          venue_id: string
          vibe: Database["public"]["Enums"]["vibe_enum"]
        }
        Insert: {
          checked_in?: string | null
          checked_in_at?: string
          expires_at?: string
          last_heartbeat?: string
          profile_id?: string | null
          session_duration?: unknown | null
          venue_id: string
          vibe: Database["public"]["Enums"]["vibe_enum"]
        }
        Update: {
          checked_in?: string | null
          checked_in_at?: string
          expires_at?: string
          last_heartbeat?: string
          profile_id?: string | null
          session_duration?: unknown | null
          venue_id?: string
          vibe?: Database["public"]["Enums"]["vibe_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "fk_venue_live_presence_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_venue_live_presence_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_venue_live_presence_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_venue_live_presence_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_venue_live_presence_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_live_presence_venue_fk"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_live_presence_venue_fk"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_live_presence_venue_fk"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_live_presence_venue_fk"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_live_presence_venue_fk"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_live_presence_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_live_presence_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_live_presence_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_live_presence_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_live_presence_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_metrics_daily: {
        Row: {
          avg_dwell_min: number
          day_date: string
          unique_visitors: number
          venue_id: string
          visits: number
        }
        Insert: {
          avg_dwell_min?: number
          day_date: string
          unique_visitors?: number
          venue_id: string
          visits?: number
        }
        Update: {
          avg_dwell_min?: number
          day_date?: string
          unique_visitors?: number
          venue_id?: string
          visits?: number
        }
        Relationships: [
          {
            foreignKeyName: "venue_metrics_daily_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_metrics_daily_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_metrics_daily_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_metrics_daily_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_metrics_daily_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_presence_snapshot: {
        Row: {
          dominant_vibe: Database["public"]["Enums"]["vibe_enum"] | null
          people_now: number
          updated_at: string
          venue_id: string
        }
        Insert: {
          dominant_vibe?: Database["public"]["Enums"]["vibe_enum"] | null
          people_now: number
          updated_at?: string
          venue_id: string
        }
        Update: {
          dominant_vibe?: Database["public"]["Enums"]["vibe_enum"] | null
          people_now?: number
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_presence_snapshot_venue_fk"
            columns: ["venue_id"]
            isOneToOne: true
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_presence_snapshot_venue_fk"
            columns: ["venue_id"]
            isOneToOne: true
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_presence_snapshot_venue_fk"
            columns: ["venue_id"]
            isOneToOne: true
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_presence_snapshot_venue_fk"
            columns: ["venue_id"]
            isOneToOne: true
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_presence_snapshot_venue_fk"
            columns: ["venue_id"]
            isOneToOne: true
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_signatures: {
        Row: {
          confidence_score: number
          created_at: string
          id: string
          last_verified: string
          signal_identifier: string
          signal_strength: number | null
          signal_type: string
          venue_id: string
        }
        Insert: {
          confidence_score?: number
          created_at?: string
          id?: string
          last_verified?: string
          signal_identifier: string
          signal_strength?: number | null
          signal_type: string
          venue_id: string
        }
        Update: {
          confidence_score?: number
          created_at?: string
          id?: string
          last_verified?: string
          signal_identifier?: string
          signal_strength?: number | null
          signal_type?: string
          venue_id?: string
        }
        Relationships: []
      }
      venue_stays: {
        Row: {
          arrived_at: string
          created_at: string | null
          departed_at: string | null
          distance_m: number | null
          id: number
          profile_id: string | null
          venue_id: string
        }
        Insert: {
          arrived_at: string
          created_at?: string | null
          departed_at?: string | null
          distance_m?: number | null
          id?: number
          profile_id?: string | null
          venue_id: string
        }
        Update: {
          arrived_at?: string
          created_at?: string | null
          departed_at?: string | null
          distance_m?: number | null
          id?: number
          profile_id?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_venue_stays_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_venue_stays_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_venue_stays_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_venue_stays_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_venue_stays_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_venue_stays_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue_stays_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue_stays_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue_stays_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue_stays_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_stays_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_stays_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_stays_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_stays_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_stays_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_visits: {
        Row: {
          arrived_at: string
          day_key: string
          departed_at: string | null
          distance_m: number | null
          id: number
          left_at: string | null
          profile_id: string | null
          source: string | null
          venue_id: string
          visit_ts: unknown | null
        }
        Insert: {
          arrived_at: string
          day_key: string
          departed_at?: string | null
          distance_m?: number | null
          id?: never
          left_at?: string | null
          profile_id?: string | null
          source?: string | null
          venue_id: string
          visit_ts?: unknown | null
        }
        Update: {
          arrived_at?: string
          day_key?: string
          departed_at?: string | null
          distance_m?: number | null
          id?: never
          left_at?: string | null
          profile_id?: string | null
          source?: string | null
          venue_id?: string
          visit_ts?: unknown | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_venue_visits_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_venue_visits_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_venue_visits_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_venue_visits_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_venue_visits_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          address: string | null
          canonical_tags: Database["public"]["Enums"]["canonical_tag"][] | null
          categories: string[] | null
          created_at: string | null
          cuisines: string[] | null
          description: string | null
          embedding: string | null
          external_id: string | null
          geohash5: string | null
          geom: unknown | null
          hours: Json | null
          id: string
          lat: number
          live_count: number
          lng: number
          location: unknown | null
          name: string
          photo_url: string | null
          popularity: number
          popularity_hourly: number[] | null
          price_level: number | null
          price_tier: Database["public"]["Enums"]["price_enum"] | null
          profile_id: string | null
          provider: string
          provider_id: string
          radius_m: number | null
          rating: number | null
          rating_count: number | null
          slug: string | null
          source: string | null
          tags: string[] | null
          updated_at: string | null
          vibe: string | null
          vibe_score: number | null
        }
        Insert: {
          address?: string | null
          canonical_tags?: Database["public"]["Enums"]["canonical_tag"][] | null
          categories?: string[] | null
          created_at?: string | null
          cuisines?: string[] | null
          description?: string | null
          embedding?: string | null
          external_id?: string | null
          geohash5?: string | null
          geom?: unknown | null
          hours?: Json | null
          id?: string
          lat: number
          live_count?: number
          lng: number
          location?: unknown | null
          name: string
          photo_url?: string | null
          popularity?: number
          popularity_hourly?: number[] | null
          price_level?: number | null
          price_tier?: Database["public"]["Enums"]["price_enum"] | null
          profile_id?: string | null
          provider: string
          provider_id: string
          radius_m?: number | null
          rating?: number | null
          rating_count?: number | null
          slug?: string | null
          source?: string | null
          tags?: string[] | null
          updated_at?: string | null
          vibe?: string | null
          vibe_score?: number | null
        }
        Update: {
          address?: string | null
          canonical_tags?: Database["public"]["Enums"]["canonical_tag"][] | null
          categories?: string[] | null
          created_at?: string | null
          cuisines?: string[] | null
          description?: string | null
          embedding?: string | null
          external_id?: string | null
          geohash5?: string | null
          geom?: unknown | null
          hours?: Json | null
          id?: string
          lat?: number
          live_count?: number
          lng?: number
          location?: unknown | null
          name?: string
          photo_url?: string | null
          popularity?: number
          popularity_hourly?: number[] | null
          price_level?: number | null
          price_tier?: Database["public"]["Enums"]["price_enum"] | null
          profile_id?: string | null
          provider?: string
          provider_id?: string
          radius_m?: number | null
          rating?: number | null
          rating_count?: number | null
          slug?: string | null
          source?: string | null
          tags?: string[] | null
          updated_at?: string | null
          vibe?: string | null
          vibe_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_venues_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_venues_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_venues_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_venues_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_venues_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      venues_near_me: {
        Row: {
          category: string | null
          distance_m: number
          last_updated: string
          lat: number
          lng: number
          name: string
          profile_id: string | null
          venue_id: string
          vibe_score: number
        }
        Insert: {
          category?: string | null
          distance_m: number
          last_updated?: string
          lat: number
          lng: number
          name: string
          profile_id?: string | null
          venue_id: string
          vibe_score?: number
        }
        Update: {
          category?: string | null
          distance_m?: number
          last_updated?: string
          lat?: number
          lng?: number
          name?: string
          profile_id?: string | null
          venue_id?: string
          vibe_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_venues_near_me_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_venues_near_me_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_venues_near_me_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_venues_near_me_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_venues_near_me_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venues_near_me_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venues_near_me_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venues_near_me_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venues_near_me_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venues_near_me_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venues_sync_errors: {
        Row: {
          created_at: string | null
          external_id: string | null
          id: string
          lat: number | null
          lng: number | null
          payload: Json
          reason: string
          source: string
        }
        Insert: {
          created_at?: string | null
          external_id?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          payload: Json
          reason: string
          source: string
        }
        Update: {
          created_at?: string | null
          external_id?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          payload?: Json
          reason?: string
          source?: string
        }
        Relationships: []
      }
      vibe_clusters_checksum: {
        Row: {
          checksum: string
          id: number
          profile_id: string | null
        }
        Insert: {
          checksum: string
          id?: number
          profile_id?: string | null
        }
        Update: {
          checksum?: string
          id?: number
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_vibe_clusters_checksum_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_vibe_clusters_checksum_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_vibe_clusters_checksum_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_vibe_clusters_checksum_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_vibe_clusters_checksum_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vibe_clusters_history: {
        Row: {
          gh6: string
          profile_id: string | null
          snapshot_at: string
          total: number
        }
        Insert: {
          gh6: string
          profile_id?: string | null
          snapshot_at?: string
          total: number
        }
        Update: {
          gh6?: string
          profile_id?: string | null
          snapshot_at?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_vibe_clusters_history_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_vibe_clusters_history_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_vibe_clusters_history_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_vibe_clusters_history_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_vibe_clusters_history_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vibe_similarity: {
        Row: {
          profile_id: string | null
          score: number
          vibe_high: Database["public"]["Enums"]["vibe_enum"]
          vibe_low: Database["public"]["Enums"]["vibe_enum"]
        }
        Insert: {
          profile_id?: string | null
          score: number
          vibe_high: Database["public"]["Enums"]["vibe_enum"]
          vibe_low: Database["public"]["Enums"]["vibe_enum"]
        }
        Update: {
          profile_id?: string | null
          score?: number
          vibe_high?: Database["public"]["Enums"]["vibe_enum"]
          vibe_low?: Database["public"]["Enums"]["vibe_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "fk_vibe_similarity_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_vibe_similarity_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_vibe_similarity_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_vibe_similarity_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_vibe_similarity_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vibe_system_metrics: {
        Row: {
          created_at: string
          id: string
          measured_at: string
          measurement_type: string
          metrics: Json
          profile_id: string | null
          session_id: string | null
          system_version: string
        }
        Insert: {
          created_at?: string
          id?: string
          measured_at?: string
          measurement_type: string
          metrics: Json
          profile_id?: string | null
          session_id?: string | null
          system_version?: string
        }
        Update: {
          created_at?: string
          id?: string
          measured_at?: string
          measurement_type?: string
          metrics?: Json
          profile_id?: string | null
          session_id?: string | null
          system_version?: string
        }
        Relationships: []
      }
      vibe_user_learning: {
        Row: {
          confidence: number
          context_data: Json
          context_similarity: number | null
          corrected_vibe: Database["public"]["Enums"]["vibe_enum"]
          correction_data: Json
          correction_strength: number | null
          created_at: string
          id: string
          location_context: Json | null
          original_vibe: Database["public"]["Enums"]["vibe_enum"]
          profile_id: string
          sensor_context: Json | null
          temporal_context: Json | null
          user_confidence: number | null
        }
        Insert: {
          confidence: number
          context_data: Json
          context_similarity?: number | null
          corrected_vibe: Database["public"]["Enums"]["vibe_enum"]
          correction_data: Json
          correction_strength?: number | null
          created_at?: string
          id?: string
          location_context?: Json | null
          original_vibe: Database["public"]["Enums"]["vibe_enum"]
          profile_id: string
          sensor_context?: Json | null
          temporal_context?: Json | null
          user_confidence?: number | null
        }
        Update: {
          confidence?: number
          context_data?: Json
          context_similarity?: number | null
          corrected_vibe?: Database["public"]["Enums"]["vibe_enum"]
          correction_data?: Json
          correction_strength?: number | null
          created_at?: string
          id?: string
          location_context?: Json | null
          original_vibe?: Database["public"]["Enums"]["vibe_enum"]
          profile_id?: string
          sensor_context?: Json | null
          temporal_context?: Json | null
          user_confidence?: number | null
        }
        Relationships: []
      }
      vibes_log: {
        Row: {
          location: unknown
          profile_id: string | null
          ts: string
          venue_id: string | null
          vibe: Database["public"]["Enums"]["vibe_enum"]
        }
        Insert: {
          location: unknown
          profile_id?: string | null
          ts?: string
          venue_id?: string | null
          vibe: Database["public"]["Enums"]["vibe_enum"]
        }
        Update: {
          location?: unknown
          profile_id?: string | null
          ts?: string
          venue_id?: string | null
          vibe?: Database["public"]["Enums"]["vibe_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "fk_vibes_log_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_vibes_log_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_vibes_log_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_vibes_log_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_vibes_log_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vibes_now: {
        Row: {
          broadcast_radius: number | null
          expires_at: string | null
          geo: unknown | null
          geohash6: string | null
          gh5: string | null
          h3_7: string | null
          h3_idx: number | null
          location: unknown
          profile_id: string | null
          updated_at: string | null
          venue_id: string | null
          vibe: Database["public"]["Enums"]["vibe_enum"]
          vibe_h: number | null
          vibe_l: number | null
          vibe_s: number | null
          visibility: string | null
        }
        Insert: {
          broadcast_radius?: number | null
          expires_at?: string | null
          geo?: unknown | null
          geohash6?: string | null
          gh5?: string | null
          h3_7?: string | null
          h3_idx?: number | null
          location: unknown
          profile_id?: string | null
          updated_at?: string | null
          venue_id?: string | null
          vibe: Database["public"]["Enums"]["vibe_enum"]
          vibe_h?: number | null
          vibe_l?: number | null
          vibe_s?: number | null
          visibility?: string | null
        }
        Update: {
          broadcast_radius?: number | null
          expires_at?: string | null
          geo?: unknown | null
          geohash6?: string | null
          gh5?: string | null
          h3_7?: string | null
          h3_idx?: number | null
          location?: unknown
          profile_id?: string | null
          updated_at?: string | null
          venue_id?: string | null
          vibe?: Database["public"]["Enums"]["vibe_enum"]
          vibe_h?: number | null
          vibe_l?: number | null
          vibe_s?: number | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_vibes_now_profile_id"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_vibes_now_profile_id"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_vibes_now_profile_id"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_vibes_now_profile_id"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_vibes_now_profile_id"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vibes_now_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "vibes_now_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "vibes_now_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "vibes_now_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
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
      weather_cache: {
        Row: {
          fetched_at: string
          geohash6: string
          payload: Json
        }
        Insert: {
          fetched_at?: string
          geohash6: string
          payload: Json
        }
        Update: {
          fetched_at?: string
          geohash6?: string
          payload?: Json
        }
        Relationships: []
      }
      weekly_ai_suggestion_cooldowns: {
        Row: {
          created_at: string
          last_regenerated_at: string
          profile_id: string | null
        }
        Insert: {
          created_at?: string
          last_regenerated_at?: string
          profile_id?: string | null
        }
        Update: {
          created_at?: string
          last_regenerated_at?: string
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_weekly_ai_suggestion_cooldowns_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_weekly_ai_suggestion_cooldowns_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_weekly_ai_suggestion_cooldowns_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_weekly_ai_suggestion_cooldowns_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_weekly_ai_suggestion_cooldowns_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_ai_suggestions: {
        Row: {
          created_at: string | null
          json: Json | null
          profile_id: string | null
          week_ending: string
        }
        Insert: {
          created_at?: string | null
          json?: Json | null
          profile_id?: string | null
          week_ending: string
        }
        Update: {
          created_at?: string | null
          json?: Json | null
          profile_id?: string | null
          week_ending?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_weekly_ai_suggestions_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_weekly_ai_suggestions_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_weekly_ai_suggestions_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_weekly_ai_suggestions_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_weekly_ai_suggestions_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      _va_unique_provider_id: {
        Row: {
          provider_id: string | null
          venue_id: string | null
        }
        Relationships: []
      }
      business_floq_detail_view: {
        Row: {
          distance_m: number | null
          ends_at: string | null
          floq_type: string | null
          friend_inside_count: number | null
          friend_member_count: number | null
          id: string | null
          is_business: boolean | null
          is_member: boolean | null
          live_count: number | null
          member_count: number | null
          name: string | null
          org_id: string | null
          org_name: string | null
          starts_at: string | null
          status: string | null
          visibility: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_floqs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "business_orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      floq_participants_roster: {
        Row: {
          avatar_url: string | null
          display_name: string | null
          floq_id: string | null
          is_friend: boolean | null
          joined_at: string | null
          last_read_message_at: string | null
          profile_id: string | null
          role: string | null
          unread: number | null
        }
        Relationships: [
          {
            foreignKeyName: "floq_participants_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "business_floq_detail_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_participants_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floq_peek_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_participants_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floq_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_participants_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_participants_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floqs_discovery_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_participants_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "my_floqs_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_participants_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "v_public_floqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "floq_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      floq_peek_view: {
        Row: {
          distance_m: number | null
          ends_at: string | null
          floq_type: string | null
          friend_inside_count: number | null
          friend_member_count: number | null
          id: string | null
          is_business: boolean | null
          is_member: boolean | null
          last_activity_at: string | null
          live_count: number | null
          member_count: number | null
          name: string | null
          starts_at: string | null
          status: string | null
          visibility: string | null
        }
        Relationships: []
      }
      floq_sessions: {
        Row: {
          centroid: unknown | null
          created_at: string | null
          created_by: string | null
          ends_at: string | null
          id: string | null
          live_radius_m: number | null
          name: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["floq_session_status"] | null
          updated_at: string | null
          venue_id: string | null
        }
        Insert: {
          centroid?: unknown | null
          created_at?: string | null
          created_by?: string | null
          ends_at?: string | null
          id?: string | null
          live_radius_m?: number | null
          name?: never
          started_at?: string | null
          status?: never
          updated_at?: string | null
          venue_id?: never
        }
        Update: {
          centroid?: unknown | null
          created_at?: string | null
          created_by?: string | null
          ends_at?: string | null
          id?: string | null
          live_radius_m?: number | null
          name?: never
          started_at?: string | null
          status?: never
          updated_at?: string | null
          venue_id?: never
        }
        Relationships: [
          {
            foreignKeyName: "floqs_creator_id_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floqs_creator_id_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "floqs_creator_id_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floqs_creator_id_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floqs_creator_id_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      floqs_discovery_view: {
        Row: {
          distance_m: number | null
          ends_at: string | null
          floq_type: string | null
          friend_inside_count: number | null
          friend_member_count: number | null
          id: string | null
          is_business: boolean | null
          is_member: boolean | null
          last_activity_at: string | null
          live_count: number | null
          member_count: number | null
          name: string | null
          starts_at: string | null
          status: string | null
          visibility: string | null
        }
        Relationships: []
      }
      friendships_v: {
        Row: {
          created_at: string | null
          friend_state: Database["public"]["Enums"]["friend_state"] | null
          is_close: boolean | null
          profile_high: string | null
          profile_low: string | null
          responded_at: string | null
        }
        Insert: {
          created_at?: string | null
          friend_state?: Database["public"]["Enums"]["friend_state"] | null
          is_close?: boolean | null
          profile_high?: string | null
          profile_low?: string | null
          responded_at?: string | null
        }
        Update: {
          created_at?: string | null
          friend_state?: Database["public"]["Enums"]["friend_state"] | null
          is_close?: boolean | null
          profile_high?: string | null
          profile_low?: string | null
          responded_at?: string | null
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
          avatar_url: string | null
          checkins_30d: number | null
          display_name: string | null
          id: string | null
        }
        Relationships: []
      }
      mv_ripples_recent: {
        Row: {
          centroid: unknown | null
          created_at: string | null
          expires_at: string | null
          id: string | null
          lat: number | null
          lng: number | null
          p1: string | null
          p2: string | null
          venue_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ripple_signals_p1_fkey"
            columns: ["p1"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ripple_signals_p1_fkey"
            columns: ["p1"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "ripple_signals_p1_fkey"
            columns: ["p1"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ripple_signals_p1_fkey"
            columns: ["p1"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ripple_signals_p1_fkey"
            columns: ["p1"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ripple_signals_p2_fkey"
            columns: ["p2"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ripple_signals_p2_fkey"
            columns: ["p2"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "ripple_signals_p2_fkey"
            columns: ["p2"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ripple_signals_p2_fkey"
            columns: ["p2"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ripple_signals_p2_fkey"
            columns: ["p2"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ripple_signals_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "ripple_signals_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "ripple_signals_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "ripple_signals_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "ripple_signals_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_trending_venues: {
        Row: {
          last_seen_at: string | null
          people_now: number | null
          trend_score: number | null
          venue_id: string | null
          visits_15m: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_waves_recent: {
        Row: {
          centroid: unknown | null
          id: string | null
          last_seen_at: string | null
          lat: number | null
          lng: number | null
          member_ids: string[] | null
          size: number | null
          venue_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_clusters_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "social_clusters_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "social_clusters_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "social_clusters_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "social_clusters_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      my_floqs_view: {
        Row: {
          ends_at: string | null
          first_joined_at: string | null
          floq_type: string | null
          id: string | null
          member_count: number | null
          my_unread: number | null
          name: string | null
          starts_at: string | null
          status: string | null
        }
        Relationships: []
      }
      presence_view: {
        Row: {
          avatar_url: string | null
          display_name: string | null
          lat: number | null
          lng: number | null
          profile_id: string | null
          updated_at: string | null
          vibe: Database["public"]["Enums"]["vibe_enum"] | null
        }
        Relationships: []
      }
      proximity_performance_stats: {
        Row: {
          avg_confidence: number | null
          records_last_24h: number | null
          records_last_hour: number | null
          table_name: string | null
          total_records: number | null
          unique_profiles_a: number | null
          unique_profiles_b: number | null
        }
        Relationships: []
      }
      proximity_stats_daily: {
        Row: {
          avg_confidence: number | null
          enter_events: number | null
          event_date: string | null
          exit_events: number | null
          max_confidence: number | null
          profile_id_a: string | null
          sustain_events: number | null
          total_events: number | null
          unique_contacts: number | null
        }
        Relationships: [
          {
            foreignKeyName: "proximity_events_profile_id_a_fkey"
            columns: ["profile_id_a"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proximity_events_profile_id_a_fkey"
            columns: ["profile_id_a"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "proximity_events_profile_id_a_fkey"
            columns: ["profile_id_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proximity_events_profile_id_a_fkey"
            columns: ["profile_id_a"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proximity_events_profile_id_a_fkey"
            columns: ["profile_id_a"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_floq_unread_counts: {
        Row: {
          floq_id: string | null
          profile_id: string | null
          unread: number | null
        }
        Relationships: [
          {
            foreignKeyName: "floq_messages_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "business_floq_detail_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_messages_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floq_peek_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_messages_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floq_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_messages_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_messages_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floqs_discovery_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_messages_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "my_floqs_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_messages_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "v_public_floqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "floq_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_active_users: {
        Row: {
          lat: number | null
          lng: number | null
          profile_id: string | null
          updated_at: string | null
          vibe: Database["public"]["Enums"]["vibe_enum"] | null
        }
        Insert: {
          lat?: never
          lng?: never
          profile_id?: string | null
          updated_at?: string | null
          vibe?: Database["public"]["Enums"]["vibe_enum"] | null
        }
        Update: {
          lat?: never
          lng?: never
          profile_id?: string | null
          updated_at?: string | null
          vibe?: Database["public"]["Enums"]["vibe_enum"] | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_vibes_now_profile_id"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_vibes_now_profile_id"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_vibes_now_profile_id"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_vibes_now_profile_id"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_vibes_now_profile_id"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_chat_message: {
        Row: {
          body: string | null
          created_at: string | null
          delivery_state: string | null
          emoji: string | null
          floq_id: string | null
          id: string | null
          mentions: Json | null
          sender_id: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "floq_messages_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "business_floq_detail_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_messages_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floq_peek_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_messages_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floq_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_messages_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_messages_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floqs_discovery_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_messages_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "my_floqs_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_messages_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "v_public_floqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "floq_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_cron_job_last_run: {
        Row: {
          active: boolean | null
          jobid: number | null
          jobname: string | null
          last_end: string | null
          last_start: string | null
          return_message: string | null
          schedule: string | null
          status: string | null
        }
        Relationships: []
      }
      v_crossed_paths: {
        Row: {
          created_at: string | null
          encounter_date: string | null
          id: number | null
          profile_id: string | null
          profile_id_norm: string | null
          ts: string | null
          user_a: string | null
          user_b: string | null
          venue_id: string | null
        }
        Insert: {
          created_at?: string | null
          encounter_date?: string | null
          id?: number | null
          profile_id?: string | null
          profile_id_norm?: string | null
          ts?: string | null
          user_a?: string | null
          user_b?: string | null
          venue_id?: string | null
        }
        Update: {
          created_at?: string | null
          encounter_date?: string | null
          id?: number | null
          profile_id?: string | null
          profile_id_norm?: string | null
          ts?: string | null
          user_a?: string | null
          user_b?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_crossed_paths_profile_id"
            columns: ["profile_id_norm"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_crossed_paths_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_crossed_paths_profile_id"
            columns: ["profile_id_norm"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_crossed_paths_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_crossed_paths_profile_id"
            columns: ["profile_id_norm"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_crossed_paths_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_crossed_paths_profile_id"
            columns: ["profile_id_norm"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_crossed_paths_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_crossed_paths_profile_id"
            columns: ["profile_id_norm"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_crossed_paths_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_discover_profiles: {
        Row: {
          avatar_url: string | null
          display_name: string | null
          id: string | null
          req_status: string | null
          username: string | null
        }
        Relationships: []
      }
      v_dm_message_reactions_summary: {
        Row: {
          emoji: string | null
          first_reaction_at: string | null
          latest_reaction_at: string | null
          message_id: string | null
          reaction_count: number | null
          reactor_details: Json[] | null
          reactor_profile_ids: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "dm_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "direct_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "v_dm_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "v_dm_messages_expanded"
            referencedColumns: ["id"]
          },
        ]
      }
      v_dm_messages: {
        Row: {
          content: string | null
          created_at: string | null
          id: string | null
          message_type: Database["public"]["Enums"]["dm_msg_type"] | null
          profile_id: string | null
          reactions: Json | null
          reply_to: string | null
          reply_to_id: string | null
          reply_to_msg: Json | null
          status: string | null
          thread_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "direct_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "v_dm_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "v_dm_messages_expanded"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "direct_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "v_dm_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "v_dm_messages_expanded"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "direct_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_direct_messages_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_direct_messages_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_direct_messages_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_direct_messages_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_direct_messages_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_dm_messages_expanded: {
        Row: {
          content: string | null
          created_at: string | null
          id: string | null
          profile_id: string | null
          reactions: Json | null
          reply_to: string | null
          reply_to_msg: Json | null
          thread_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "direct_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "v_dm_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "v_dm_messages_expanded"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "direct_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_direct_messages_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_direct_messages_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_direct_messages_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_direct_messages_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_direct_messages_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_encounter_heat: {
        Row: {
          geom: unknown | null
          hits: number | null
          last_seen: string | null
          venue_id: string | null
        }
        Relationships: []
      }
      v_floq_participants: {
        Row: {
          floq_id: string | null
          joined_at: string | null
          last_read_message_at: string | null
          profile_id: string | null
          profile_id_norm: string | null
          role: string | null
        }
        Insert: {
          floq_id?: string | null
          joined_at?: string | null
          last_read_message_at?: string | null
          profile_id?: string | null
          profile_id_norm?: string | null
          role?: string | null
        }
        Update: {
          floq_id?: string | null
          joined_at?: string | null
          last_read_message_at?: string | null
          profile_id?: string | null
          profile_id_norm?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "floq_participants_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "business_floq_detail_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_participants_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floq_peek_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_participants_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floq_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_participants_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_participants_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "floqs_discovery_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_participants_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "my_floqs_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_participants_floq_id_fkey"
            columns: ["floq_id"]
            isOneToOne: false
            referencedRelation: "v_public_floqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_participants_profile_id_fkey"
            columns: ["profile_id_norm"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "floq_participants_profile_id_fkey"
            columns: ["profile_id_norm"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "floq_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_participants_profile_id_fkey"
            columns: ["profile_id_norm"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_participants_profile_id_fkey"
            columns: ["profile_id_norm"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floq_participants_profile_id_fkey"
            columns: ["profile_id_norm"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_friend_ids: {
        Row: {
          current_profile_id: string | null
          is_close: boolean | null
          other_profile_id: string | null
          responded_at: string | null
        }
        Insert: {
          current_profile_id?: string | null
          is_close?: boolean | null
          other_profile_id?: string | null
          responded_at?: string | null
        }
        Update: {
          current_profile_id?: string | null
          is_close?: boolean | null
          other_profile_id?: string | null
          responded_at?: string | null
        }
        Relationships: []
      }
      v_friend_last_seen: {
        Row: {
          current_profile_id: string | null
          friend_state: Database["public"]["Enums"]["friend_state"] | null
          last_seen_at: string | null
          other_profile_id: string | null
        }
        Relationships: []
      }
      v_friend_requests: {
        Row: {
          created_at: string | null
          id: string | null
          me: string | null
          requester_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          me?: string | null
          requester_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          me?: string | null
          requester_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_friend_requests_other"
            columns: ["me"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_friend_requests_other"
            columns: ["me"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_friend_requests_other"
            columns: ["me"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_friend_requests_other"
            columns: ["me"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_friend_requests_other"
            columns: ["me"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_friend_requests_profile_id"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_friend_requests_profile_id"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_friend_requests_profile_id"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_friend_requests_profile_id"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_friend_requests_profile_id"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_friend_sparkline: {
        Row: {
          current_profile_id: string | null
          day: string | null
          other_profile_id: string | null
          shared_hours: number | null
        }
        Relationships: []
      }
      v_friend_visits: {
        Row: {
          current_profile_id: string | null
          day: string | null
          other_profile_id: string | null
          shared_hours: number | null
        }
        Relationships: []
      }
      v_friends_flat: {
        Row: {
          created_at: string | null
          friend_state: Database["public"]["Enums"]["friend_state"] | null
          is_close: boolean | null
          profile_high: string | null
          profile_low: string | null
          responded_at: string | null
        }
        Insert: {
          created_at?: string | null
          friend_state?: Database["public"]["Enums"]["friend_state"] | null
          is_close?: boolean | null
          profile_high?: never
          profile_low?: never
          responded_at?: string | null
        }
        Update: {
          created_at?: string | null
          friend_state?: Database["public"]["Enums"]["friend_state"] | null
          is_close?: boolean | null
          profile_high?: never
          profile_low?: never
          responded_at?: string | null
        }
        Relationships: []
      }
      v_friends_with_presence: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          friend_id: string | null
          friend_state: string | null
          is_incoming_request: boolean | null
          is_outgoing_request: boolean | null
          online: boolean | null
          responded_at: string | null
          started_at: string | null
          username: string | null
          vibe_tag: string | null
        }
        Relationships: []
      }
      v_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          custom_status: string | null
          display_name: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string | null
          interests: string[] | null
          last_name: string | null
          live_accuracy: Database["public"]["Enums"]["acc_enum"] | null
          live_auto_when: string[] | null
          live_muted_until: string | null
          live_scope: Database["public"]["Enums"]["scope_enum"] | null
          live_smart_flags: Json | null
          profile_created: boolean | null
          profile_id: string | null
          push_token: string | null
          updated_at: string | null
          username: string | null
          vibe_preference: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          custom_status?: string | null
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string | null
          interests?: string[] | null
          last_name?: string | null
          live_accuracy?: Database["public"]["Enums"]["acc_enum"] | null
          live_auto_when?: string[] | null
          live_muted_until?: string | null
          live_scope?: Database["public"]["Enums"]["scope_enum"] | null
          live_smart_flags?: Json | null
          profile_created?: boolean | null
          profile_id?: string | null
          push_token?: string | null
          updated_at?: string | null
          username?: string | null
          vibe_preference?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          custom_status?: string | null
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string | null
          interests?: string[] | null
          last_name?: string | null
          live_accuracy?: Database["public"]["Enums"]["acc_enum"] | null
          live_auto_when?: string[] | null
          live_muted_until?: string | null
          live_scope?: Database["public"]["Enums"]["scope_enum"] | null
          live_smart_flags?: Json | null
          profile_created?: boolean | null
          profile_id?: string | null
          push_token?: string | null
          updated_at?: string | null
          username?: string | null
          vibe_preference?: string | null
        }
        Relationships: []
      }
      v_public_floqs: {
        Row: {
          activity_score: number | null
          archived_at: string | null
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
          id: string | null
          last_activity_at: string | null
          location: unknown | null
          max_participants: number | null
          name: string | null
          parent_flock_id: string | null
          pinned_note: string | null
          primary_vibe: Database["public"]["Enums"]["vibe_enum"] | null
          profile_id: string | null
          radius_m: number | null
          recurrence_pattern: Json | null
          starts_at: string | null
          title: string | null
          type: string | null
          updated_at: string | null
          vibe_tag: Database["public"]["Enums"]["vibe_enum"] | null
          visibility: string | null
          walkable_zone: unknown | null
        }
        Insert: {
          activity_score?: number | null
          archived_at?: string | null
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
          id?: string | null
          last_activity_at?: string | null
          location?: unknown | null
          max_participants?: number | null
          name?: string | null
          parent_flock_id?: string | null
          pinned_note?: string | null
          primary_vibe?: Database["public"]["Enums"]["vibe_enum"] | null
          profile_id?: string | null
          radius_m?: number | null
          recurrence_pattern?: Json | null
          starts_at?: string | null
          title?: string | null
          type?: string | null
          updated_at?: string | null
          vibe_tag?: Database["public"]["Enums"]["vibe_enum"] | null
          visibility?: string | null
          walkable_zone?: unknown | null
        }
        Update: {
          activity_score?: number | null
          archived_at?: string | null
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
          id?: string | null
          last_activity_at?: string | null
          location?: unknown | null
          max_participants?: number | null
          name?: string | null
          parent_flock_id?: string | null
          pinned_note?: string | null
          primary_vibe?: Database["public"]["Enums"]["vibe_enum"] | null
          profile_id?: string | null
          radius_m?: number | null
          recurrence_pattern?: Json | null
          starts_at?: string | null
          title?: string | null
          type?: string | null
          updated_at?: string | null
          vibe_tag?: Database["public"]["Enums"]["vibe_enum"] | null
          visibility?: string | null
          walkable_zone?: unknown | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_floqs_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floqs_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_floqs_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floqs_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_floqs_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floqs_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floqs_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "floqs_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floqs_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floqs_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floqs_parent_flock_id_fkey"
            columns: ["parent_flock_id"]
            isOneToOne: false
            referencedRelation: "business_floq_detail_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floqs_parent_flock_id_fkey"
            columns: ["parent_flock_id"]
            isOneToOne: false
            referencedRelation: "floq_peek_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floqs_parent_flock_id_fkey"
            columns: ["parent_flock_id"]
            isOneToOne: false
            referencedRelation: "floq_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floqs_parent_flock_id_fkey"
            columns: ["parent_flock_id"]
            isOneToOne: false
            referencedRelation: "floqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floqs_parent_flock_id_fkey"
            columns: ["parent_flock_id"]
            isOneToOne: false
            referencedRelation: "floqs_discovery_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floqs_parent_flock_id_fkey"
            columns: ["parent_flock_id"]
            isOneToOne: false
            referencedRelation: "my_floqs_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floqs_parent_flock_id_fkey"
            columns: ["parent_flock_id"]
            isOneToOne: false
            referencedRelation: "v_public_floqs"
            referencedColumns: ["id"]
          },
        ]
      }
      v_signal_friend_visits_30d: {
        Row: {
          friend_visits_30d: number | null
          venue_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      v_signal_hour_heat: {
        Row: {
          hour_heat: number | null
          venue_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      v_signal_vibe: {
        Row: {
          venue_id: string | null
          vibe_signal: number | null
        }
        Insert: {
          venue_id?: string | null
          vibe_signal?: never
        }
        Update: {
          venue_id?: string | null
          vibe_signal?: never
        }
        Relationships: []
      }
      v_time_in_venue_daily: {
        Row: {
          day: string | null
          seconds_in_venue: number | null
          unique_visitors: number | null
          venue_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_venue_stays_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue_stays_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue_stays_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue_stays_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue_stays_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_stays_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_stays_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_stays_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_stays_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_stays_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      v_today_venue_discoveries: {
        Row: {
          discovered_at: string | null
          profile_id: string | null
          venue_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_venue_visits_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_venue_visits_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_venue_visits_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_venue_visits_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_venue_visits_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      v_trending_venues: {
        Row: {
          last_seen_at: string | null
          people_now: number | null
          trend_score: number | null
          venue_id: string | null
          visits_15m: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      v_trending_venues_enriched: {
        Row: {
          canonical_tags: Database["public"]["Enums"]["canonical_tag"][] | null
          categories: string[] | null
          last_seen_at: string | null
          live_count: number | null
          name: string | null
          people_now: number | null
          photo_url: string | null
          provider: string | null
          trend_score: number | null
          venue_id: string | null
          vibe_score: number | null
          vibe_tag: string | null
          visits_15m: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      v_user_plans: {
        Row: {
          ends_at: string | null
          owner: Json | null
          plan_id: string | null
          profile_id: string | null
          role: Database["public"]["Enums"]["plan_role_enum"] | null
          starts_at: string | null
          status: Database["public"]["Enums"]["plan_status_enum"] | null
          title: string | null
          vibe_tag: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_plan_participants_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_participants_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_plan_participants_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_participants_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_participants_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_participants_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "floq_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      v_user_vibe_states: {
        Row: {
          active: boolean | null
          gh5: string | null
          location: unknown | null
          profile_id: string | null
          profile_id_norm: string | null
          started_at: string | null
          vibe_h: number | null
          vibe_l: number | null
          vibe_s: number | null
          vibe_tag: Database["public"]["Enums"]["vibe_enum"] | null
          visible_to: string | null
        }
        Insert: {
          active?: boolean | null
          gh5?: string | null
          location?: unknown | null
          profile_id?: string | null
          profile_id_norm?: string | null
          started_at?: string | null
          vibe_h?: number | null
          vibe_l?: number | null
          vibe_s?: number | null
          vibe_tag?: Database["public"]["Enums"]["vibe_enum"] | null
          visible_to?: string | null
        }
        Update: {
          active?: boolean | null
          gh5?: string | null
          location?: unknown | null
          profile_id?: string | null
          profile_id_norm?: string | null
          started_at?: string | null
          vibe_h?: number | null
          vibe_l?: number | null
          vibe_s?: number | null
          vibe_tag?: Database["public"]["Enums"]["vibe_enum"] | null
          visible_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_vibe_states_profile_id"
            columns: ["profile_id_norm"]
            isOneToOne: true
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_vibe_states_profile_id"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_vibe_states_profile_id"
            columns: ["profile_id_norm"]
            isOneToOne: true
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_user_vibe_states_profile_id"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_user_vibe_states_profile_id"
            columns: ["profile_id_norm"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_vibe_states_profile_id"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_vibe_states_profile_id"
            columns: ["profile_id_norm"]
            isOneToOne: true
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_vibe_states_profile_id"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_vibe_states_profile_id"
            columns: ["profile_id_norm"]
            isOneToOne: true
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_vibe_states_profile_id"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_venue_open_state: {
        Row: {
          hours_today: string[] | null
          open_now: boolean | null
          tzid: string | null
          venue_id: string | null
        }
        Relationships: []
      }
      v_venue_people_now: {
        Row: {
          last_seen_at: string | null
          people_now: number | null
          venue_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      v_venue_popularity_7d: {
        Row: {
          avg_dwell_min_7d: number | null
          popularity_score_7d: number | null
          venue_id: string | null
          visits_7d: number | null
        }
        Relationships: [
          {
            foreignKeyName: "venue_metrics_daily_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_metrics_daily_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_metrics_daily_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_metrics_daily_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_metrics_daily_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      v_venue_rec_scores: {
        Row: {
          address: string | null
          friend_signal: number | null
          hour_signal: number | null
          name: string | null
          photo_url: string | null
          popularity_signal: number | null
          total_score: number | null
          venue_id: string | null
          vibe_signal: number | null
        }
        Relationships: []
      }
      v_venue_visits: {
        Row: {
          arrived_at: string | null
          day_key: string | null
          departed_at: string | null
          distance_m: number | null
          id: number | null
          left_at: string | null
          profile_id: string | null
          profile_id_norm: string | null
          source: string | null
          venue_id: string | null
          visited_at: string | null
        }
        Insert: {
          arrived_at?: string | null
          day_key?: string | null
          departed_at?: string | null
          distance_m?: number | null
          id?: number | null
          left_at?: string | null
          profile_id?: string | null
          profile_id_norm?: string | null
          source?: string | null
          venue_id?: string | null
          visited_at?: string | null
        }
        Update: {
          arrived_at?: string | null
          day_key?: string | null
          departed_at?: string | null
          distance_m?: number | null
          id?: number | null
          left_at?: string | null
          profile_id?: string | null
          profile_id_norm?: string | null
          source?: string | null
          venue_id?: string | null
          visited_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_venue_visits_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_venue_visits_profile_id"
            columns: ["profile_id_norm"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_venue_visits_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_venue_visits_profile_id"
            columns: ["profile_id_norm"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_venue_visits_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_venue_visits_profile_id"
            columns: ["profile_id_norm"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_venue_visits_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_venue_visits_profile_id"
            columns: ["profile_id_norm"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_venue_visits_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_venue_visits_profile_id"
            columns: ["profile_id_norm"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      v_visits_source: {
        Row: {
          arrived_at: string | null
          departed_at: string | null
          profile_id: string | null
          venue_id: string | null
          visited_at: string | null
        }
        Insert: {
          arrived_at?: never
          departed_at?: never
          profile_id?: string | null
          venue_id?: string | null
          visited_at?: never
        }
        Update: {
          arrived_at?: never
          departed_at?: never
          profile_id?: string | null
          venue_id?: string | null
          visited_at?: never
        }
        Relationships: [
          {
            foreignKeyName: "fk_venue_visits_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_venue_visits_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "presence_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_venue_visits_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_venue_visits_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_discover_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_venue_visits_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue_visits_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_deals: {
        Row: {
          ends_at: string | null
          id: string | null
          starts_at: string | null
          subtitle: string | null
          title: string | null
          venue_id: string | null
        }
        Relationships: []
      }
      venue_detection_stats: {
        Row: {
          avg_confidence: number | null
          last_detection: string | null
          signal_types_count: number | null
          total_signatures: number | null
          venue_id: string | null
        }
        Relationships: []
      }
      venue_hourly_presence: {
        Row: {
          hour_ts: string | null
          users: number | null
          venue_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "presence_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_signal_vibe"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "presence_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_open_state"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "presence_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "v_venue_rec_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "presence_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_social_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "presence_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_signature_performance_stats: {
        Row: {
          avg_confidence: number | null
          table_name: string | null
          total_records: number | null
          unique_signal_types: number | null
          unique_venues: number | null
          updated_last_24h: number | null
        }
        Relationships: []
      }
      venue_social_metrics: {
        Row: {
          now_users: number | null
          refreshed_at: string | null
          venue_id: string | null
          visits_7d: number | null
        }
        Relationships: []
      }
      vibe_cluster_momentum: {
        Row: {
          centroid: unknown | null
          gh6: string | null
          total_now: number | null
          vibe_counts: Json | null
          vibe_mode: string | null
        }
        Relationships: []
      }
      vibe_clusters: {
        Row: {
          centroid: unknown | null
          gh6: string | null
          total_now: number | null
          vibe_counts: Json | null
          vibe_mode: string | null
        }
        Insert: {
          centroid?: never
          gh6?: string | null
          total_now?: number | null
          vibe_counts?: Json | null
          vibe_mode?: never
        }
        Update: {
          centroid?: never
          gh6?: string | null
          total_now?: number | null
          vibe_counts?: Json | null
          vibe_mode?: never
        }
        Relationships: []
      }
    }
    Functions: {
      _create_policy: {
        Args: {
          p_cmd: string
          p_pol_name: string
          p_schema: string
          p_table: string
        }
        Returns: undefined
      }
      _enable_rls_if_table: {
        Args: { p_schema: string; p_table: string }
        Returns: undefined
      }
      _ensure_profile_id: {
        Args: { tname: string }
        Returns: undefined
      }
      _norm_text: {
        Args: { t: string }
        Returns: string
      }
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
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
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
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
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _text_array_union: {
        Args: { a: string[]; b: string[] }
        Returns: string[]
      }
      accept_friend_request: {
        Args: { _friend: string }
        Returns: Json
      }
      accept_friend_request_atomic: {
        Args:
          | { p_accepter_id: string; p_requester_id: string }
          | { requester_id: string }
        Returns: Json
      }
      add_plan_stop_with_order: {
        Args: {
          p_description?: string
          p_duration_minutes?: number
          p_end_time?: string
          p_estimated_cost?: number
          p_plan_id: string
          p_start_time?: string
          p_title: string
          p_venue_id?: string
        }
        Returns: string
      }
      addauth: {
        Args: { "": string }
        Returns: boolean
      }
      addgeometrycolumn: {
        Args:
          | {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
          | {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
          | {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
        Returns: string
      }
      analyze_co_location_events: {
        Args:
          | {
              days_back?: number
              min_overlap_minutes?: number
              profile_a_id: string
              profile_b_id: string
            }
          | {
              profile_a_id: string
              profile_b_id: string
              radius_m?: number
              time_window: string
            }
        Returns: {
          distance_m: number
          duration_minutes: number
          end_time: string
          start_time: string
          venue_id: string
        }[]
      }
      analyze_dm_performance: {
        Args: Record<PropertyKey, never>
        Returns: {
          description: string
          metric_name: string
          metric_value: number
        }[]
      }
      analyze_shared_floq_participation: {
        Args:
          | { days_back?: number; profile_a_id: string; profile_b_id: string }
          | { profile_a_id: string; profile_b_id: string; time_window: string }
        Returns: {
          most_recent_shared: string
          shared_floqs_count: number
          total_overlap_score: number
        }[]
      }
      analyze_shared_plan_participation: {
        Args:
          | { days_back?: number; profile_a_id: string; profile_b_id: string }
          | { profile_a_id: string; profile_b_id: string; time_window: string }
        Returns: {
          activity_type: string
          created_at: string
          plan_id: string
          plan_status: string
          plan_title: string
        }[]
      }
      analyze_time_sync_patterns: {
        Args: { days_back?: number; profile_a_id: string; profile_b_id: string }
        Returns: {
          peak_sync_hours: number[]
          sync_consistency: number
          sync_score: number
        }[]
      }
      analyze_venue_overlap_patterns: {
        Args:
          | { days_back?: number; profile_a_id: string; profile_b_id: string }
          | { profile_a_id: string; profile_b_id: string; time_window: string }
        Returns: {
          overlap_score: number
          profile_a_visits: number
          profile_b_visits: number
          venue_id: string
        }[]
      }
      are_friends: {
        Args: { user_a: string; user_b: string }
        Returns: boolean
      }
      arr_to_tsv: {
        Args: { "": unknown }
        Returns: unknown
      }
      assert_plan_is_draft: {
        Args: { _plan_id: string }
        Returns: undefined
      }
      attempt_claim_username: {
        Args: { desired: string }
        Returns: boolean
      }
      award_achievement_optimized: {
        Args: { _code: string; _increment: number; _user: string }
        Returns: Json
      }
      award_if_goal_met: {
        Args: { _code: string; _increment: number; _user: string }
        Returns: boolean
      }
      backfill_spatial_indexes_batch: {
        Args: { p_batch_size?: number; p_table_name: string }
        Returns: Json
      }
      batch_location_update_v2: {
        Args: { p_locations: Json; p_priority?: string }
        Returns: Json
      }
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
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
      build_daily_afterglow: {
        Args: { _day: string }
        Returns: Json
      }
      build_daily_recap: {
        Args: { d: string; uid: string }
        Returns: Json
      }
      bulk_upsert_relationships: {
        Args: { relationship_pairs: Json }
        Returns: number
      }
      bump_interaction: {
        Args: { p_profile_id: string; p_type: string; p_venue_id: string }
        Returns: undefined
      }
      bytea: {
        Args: { "": unknown } | { "": unknown }
        Returns: string
      }
      calculate_distance_meters: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      calculate_floq_activity_score: {
        Args: {
          p_decay_hours?: number
          p_event_type: Database["public"]["Enums"]["flock_event_type_enum"]
          p_floq_id: string
          p_proximity_boost?: number
        }
        Returns: Json
      }
      calculate_relationship_strength: {
        Args: { days_since_last_interaction: number; interaction_count: number }
        Returns: number
      }
      call_weekly_ai_suggestion: {
        Args: { p_profile_id: string }
        Returns: undefined
      }
      can_read_floq_plan: {
        Args: { p_plan_id: string }
        Returns: boolean
      }
      can_user_access_floq: {
        Args: { p_floq_id: string; p_user_id: string }
        Returns: boolean
      }
      canonicalize_venue_enum: {
        Args: { p_name: string; p_provider: string; p_raw: string[] }
        Returns: Database["public"]["Enums"]["canonical_tag"][]
      }
      check_floq_admin_role: {
        Args: { p_floq_id: string; p_profile_id?: string }
        Returns: boolean
      }
      check_floq_admin_role_safe: {
        Args: { p_floq_id: string; p_profile_id?: string }
        Returns: boolean
      }
      check_floq_visibility: {
        Args: { p_floq_id: string }
        Returns: string
      }
      check_rate_limit: {
        Args: {
          action_type: string
          max_attempts?: number
          window_minutes?: number
        }
        Returns: boolean
      }
      check_rate_limit_v2: {
        Args: {
          p_action_type: string
          p_profile_id: string
          p_target_profile_id?: string
        }
        Returns: Json
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
      cleanup_expired_friend_suggestions: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_expired_live_positions: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_expired_presence: {
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
      cleanup_field_tiles: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_inactive_floqs: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      cleanup_location_metrics: {
        Args: { p_days_to_keep?: number }
        Returns: Json
      }
      cleanup_old_proximity_events: {
        Args: { p_days_to_keep?: number }
        Returns: number
      }
      cleanup_old_rate_limits: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_old_transit_cache: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_old_vibe_metrics: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_vibes: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_vibes_logs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_stale_presence: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      clear_demo_presence: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      clear_user_vibe: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cluster_precision: {
        Args: { p?: number }
        Returns: number
      }
      count_unseen_notifications: {
        Args: { p_profile_id: string }
        Returns: number
      }
      count_unseen_plan_events: {
        Args: { uid: string }
        Returns: {
          plan_id: string
          unseen: number
        }[]
      }
      create_floq: {
        Args: {
          p_ends_at: string
          p_flock_type: string
          p_invitees: string[]
          p_lat: number
          p_lng: number
          p_starts_at: string
          p_title: string
          p_vibe: Database["public"]["Enums"]["vibe_enum"]
          p_visibility: string
        }
        Returns: string
      }
      create_friend_suggestion: {
        Args:
          | {
              p_confidence_level: string
              p_score: number
              p_signals_summary: Json
              p_suggested_friend_id: string
              p_suggestion_reason: string
              p_target_profile_id: string
            }
          | {
              p_confidence_level: string
              p_score: number
              p_signals_summary: Json
              p_suggested_profile_id: string
              p_suggestion_reason: string
              p_target_profile_id: string
            }
        Returns: string
      }
      create_group_plan_with_floq: {
        Args: {
          p_description?: string
          p_ends_at?: string
          p_floq_description?: string
          p_floq_title?: string
          p_starts_at?: string
          p_title: string
        }
        Returns: {
          floq_id: string
          plan_id: string
        }[]
      }
      create_or_get_thread: {
        Args: { p_user_a: string; p_user_b: string }
        Returns: string
      }
      create_or_replace_cron_job: {
        Args: { command: string; job_name: string; schedule: string }
        Returns: undefined
      }
      create_place_banner: {
        Args: {
          _cta_type?: string
          _headline: string
          _metadata?: Json
          _ttl_secs?: number
          _venue_id: string
        }
        Returns: string
      }
      cross_path_scan: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      current_profile_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      delete_floq: {
        Args: { p_floq_id: string }
        Returns: Json
      }
      detect_crossed_paths: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      disablelongtransactions: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      drop_and_recreate_policies: {
        Args: Record<PropertyKey, never>
        Returns: {
          action: string
          policy_name: string
          status: string
          table_name: string
        }[]
      }
      dropgeometrycolumn: {
        Args:
          | {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
          | { column_name: string; schema_name: string; table_name: string }
          | { column_name: string; table_name: string }
        Returns: string
      }
      dropgeometrytable: {
        Args:
          | { catalog_name: string; schema_name: string; table_name: string }
          | { schema_name: string; table_name: string }
          | { table_name: string }
        Returns: string
      }
      emit_event_notification: {
        Args: { p_kind: string; p_payload: Json; p_profile_id: string }
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
      enqueue_afterglow_cron: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      ensure_location_partition: {
        Args: { _yyyymm: string }
        Returns: undefined
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
          radius_m: number
          vibe: string
        }[]
      }
      export_afterglow_data: {
        Args: {
          p_end_date?: string
          p_profile_id?: string
          p_start_date?: string
        }
        Returns: Json
      }
      fetch_floq_messages: {
        Args: { p_before?: string; p_floq: string; p_limit?: number }
        Returns: {
          body: string
          created_at: string
          emoji: string
          floq_id: string
          id: string
          sender_id: string
          status: string
        }[]
      }
      finalize_plan: {
        Args: { _creator: string; _plan_id: string; _selections: Json }
        Returns: Json
      }
      find_duplicate_venue: {
        Args: {
          p_addr_min_sim?: number
          p_address?: string
          p_lat: number
          p_lng: number
          p_name: string
          p_name_min_sim?: number
          p_radius_m?: number
        }
        Returns: {
          addr_sim: number
          decision: string
          dist_m: number
          match_venue_id: string
          name_sim: number
        }[]
      }
      find_or_create_dm: {
        Args: { a: string; b: string; p_use_demo?: boolean }
        Returns: string
      }
      finish_plan: {
        Args: { p_plan_id: string; p_profile_id: string }
        Returns: Json
      }
      fix_problematic_function: {
        Args: { func_name: string }
        Returns: string
      }
      floq_status: {
        Args: {
          p_archived_at: string
          p_ends_at: string
          p_flock_type: Database["public"]["Enums"]["flock_type_enum"]
          p_starts_at: string
        }
        Returns: string
      }
      fn_emit_notification: {
        Args: { p_kind: string; p_payload?: Json; p_profile_id: string }
        Returns: undefined
      }
      fn_floq_participant_count: {
        Args: { f_id: string }
        Returns: number
      }
      fn_friend_ids: {
        Args: { only_close?: boolean; viewer: string }
        Returns: {
          friend_id: string
        }[]
      }
      fn_is_host_floq: {
        Args: { f_id: string; who: string }
        Returns: boolean
      }
      fn_is_participant_floq: {
        Args: { f_id: string; who: string }
        Returns: boolean
      }
      friend_count: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      friend_ids_for: {
        Args: { p_profile: string }
        Returns: string[]
      }
      friend_pair: {
        Args: { a: string; b: string }
        Returns: {
          ua: string
          ub: string
        }[]
      }
      friends_nearby: {
        Args: { radius_km: number; user_lat: number; user_lng: number }
        Returns: {
          avatar_url: string
          display_name: string
          distance_m: number
          lat: number
          lng: number
          profile_id: string
        }[]
      }
      friends_recent_at_venue: {
        Args: { p_days?: number; p_venue_id: string }
        Returns: {
          arrived_at: string
          arrived_local_wall: string
          departed_at: string
          departed_local_wall: string
          friend_name: string
          friend_profile_id: string
          venue_tz: string
        }[]
      }
      gbt_bit_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_bool_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_bool_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_bpchar_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_bytea_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_cash_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_cash_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_date_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_date_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_enum_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_enum_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_float4_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_float4_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_float8_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_float8_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_inet_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_int2_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_int2_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_int4_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_int4_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_int8_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_int8_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_intv_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_intv_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_intv_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_macad_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_macad_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_macad8_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_macad8_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_numeric_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_oid_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_oid_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_text_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_time_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_time_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_timetz_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_ts_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_ts_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_tstz_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_uuid_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_uuid_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_var_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_var_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey_var_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey_var_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey16_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey16_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey2_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey2_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey32_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey32_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey4_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey4_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey8_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey8_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      gc_vibes_now: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      gen_pk_profile_statements: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      gen_plan_share_slug: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      gen_share_slug: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_daily_afterglow_sql: {
        Args: { p_date: string; p_profile_id: string }
        Returns: Json
      }
      generate_drop_statements: {
        Args: Record<PropertyKey, never>
        Returns: {
          drop_statement: string
        }[]
      }
      generate_floq_suggestions: {
        Args: {
          p_limit?: number
          p_profile_id: string
          p_user_lat: number
          p_user_lng: number
        }
        Returns: {
          confidence_score: number
          distance_meters: number
          floq_id: string
          participant_count: number
          primary_vibe: Database["public"]["Enums"]["vibe_enum"]
          reasoning: Json
          title: string
        }[]
      }
      generate_friend_suggestions: {
        Args: {
          p_limit?: number
          p_profile_id: string
          p_user_lat: number
          p_user_lng: number
        }
        Returns: {
          confidence_score: number
          display_name: string
          friend_id: string
          mutual_friends: number
          reasoning: Json
          resonance_score: number
        }[]
      }
      generate_function_replacement_scripts: {
        Args: Record<PropertyKey, never>
        Returns: {
          create_statement: string
          drop_statement: string
          function_id: number
        }[]
      }
      generate_function_rewrites: {
        Args: { target_schema?: string }
        Returns: {
          function_name: string
          rewritten_sql: string
        }[]
      }
      generate_personal_insights: {
        Args: { p_profile_id?: string }
        Returns: Json
      }
      generate_replacement_sql: {
        Args: Record<PropertyKey, never>
        Returns: {
          create_statement: string
          drop_statement: string
          function_name: string
          function_number: number
        }[]
      }
      generate_replacement_sql_v2: {
        Args: Record<PropertyKey, never>
        Returns: {
          create_statement: string
          drop_statement: string
          function_fullname: string
          function_number: number
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
        Args: { _codes?: string[]; _profile_id?: string }
        Returns: Json
      }
      get_achievement_stats: {
        Args: { target_profile_id?: string }
        Returns: Json
      }
      get_achievement_system_health: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_active_floqs_with_members: {
        Args: {
          p_flock_type?: string
          p_limit?: number
          p_offset?: number
          p_user_lat?: number
          p_user_lng?: number
        }
        Returns: {
          boost_count: number
          creator_id: string
          description: string
          distance_meters: number
          ends_at: string
          flock_type: string
          id: string
          members: Json
          name: string
          participant_count: number
          primary_vibe: Database["public"]["Enums"]["vibe_enum"]
          starts_at: string
          starts_in_min: number
          title: string
          type: string
          vibe_tag: Database["public"]["Enums"]["vibe_enum"]
        }[]
      }
      get_afterglow_daily_trends: {
        Args: { p_profile_id?: string }
        Returns: {
          day: string
          energy_score: number
          rolling_energy_7d: number
          rolling_social_7d: number
          social_intensity: number
          total_moments: number
        }[]
      }
      get_afterglow_location_insights: {
        Args: { p_days_back?: number; p_profile_id?: string }
        Returns: Json
      }
      get_afterglow_monthly_trends: {
        Args: { p_months_back?: number; p_profile_id?: string }
        Returns: Json
      }
      get_afterglow_weekly_patterns: {
        Args: { p_profile_id?: string; p_weeks_back?: number }
        Returns: Json
      }
      get_afterglow_weekly_trends: {
        Args: { p_profile_id?: string }
        Returns: {
          avg_energy: number
          avg_social: number
          day_count: number
          energy_trend: string
          social_trend: string
          week_start: string
        }[]
      }
      get_afterglow_with_moments: {
        Args: { p_afterglow_id: string; p_profile_id?: string }
        Returns: Json
      }
      get_archive_stats: {
        Args: { p_profile_id?: string }
        Returns: Json
      }
      get_auto_checkin_metrics: {
        Args: { d: string; uid: string }
        Returns: Json
      }
      get_cluster_venues: {
        Args:
          | {
              cursor_id?: string
              cursor_popularity?: number
              limit_rows?: number
              max_lat: number
              max_lng: number
              min_lat: number
              min_lng: number
            }
          | {
              p_lat: number
              p_limit?: number
              p_lng: number
              p_radius_m?: number
            }
        Returns: {
          category: string
          external_id: string
          id: string
          lat: number
          live_count: number
          lng: number
          name: string
          popularity: number
          source: string
          vibe: string
          vibe_score: number
        }[]
      }
      get_common_venues: {
        Args: { me_id: string; target_id: string }
        Returns: {
          category: string
          name: string
          overlap_visits: number
          venue_id: string
        }[]
      }
      get_compat_clusters: {
        Args: {
          limit_n?: number
          radius_m?: number
          u_lat: number
          u_lng: number
          u_vibe: Database["public"]["Enums"]["vibe_enum"]
        }
        Returns: {
          centroid: unknown
          distance_m: number
          dom_vibe: Database["public"]["Enums"]["vibe_enum"]
          gh6: string
          user_count: number
          vibe_match: number
        }[]
      }
      get_crossed_paths_stats: {
        Args: { me_id: string; target_id: string }
        Returns: {
          countweek: number
          distance: number
          lastat: string
          lastvenue: string
        }[]
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_dashboard_checkins: {
        Args: { p_days?: number }
        Returns: Json
      }
      get_dashboard_friends: {
        Args: { p_days?: number }
        Returns: Json
      }
      get_dashboard_overview: {
        Args: { p_days?: number }
        Returns: Json
      }
      get_dashboard_plans: {
        Args: { p_days?: number }
        Returns: Json
      }
      get_dashboard_users: {
        Args: { p_days?: number }
        Returns: Json
      }
      get_dashboard_vibes: {
        Args: { p_days?: number }
        Returns: Json
      }
      get_dm_reactions_by_thread: {
        Args: { p_thread_id: string }
        Returns: {
          emoji: string
          message_id: string
          profile_id: string
          reacted_at: string
        }[]
      }
      get_enhanced_vibe_clusters: {
        Args: {
          p_bounds?: unknown
          p_min_users?: number
          p_vibe_filter?: Database["public"]["Enums"]["vibe_enum"]
        }
        Returns: {
          center_lat: number
          center_lng: number
          cluster_id: string
          created_at: string
          diversity_score: number
          dominant_vibe: Database["public"]["Enums"]["vibe_enum"]
          intensity: number
          momentum_score: number
          prediction_confidence: number
          social_density: number
          stability_index: number
          temporal_trend: string
          user_count: number
          vibe_coherence: number
          vibe_distribution: Json
        }[]
      }
      get_field_state_at: {
        Args: { p_ts: string }
        Returns: Json
      }
      get_field_tiles_optimized_v2: {
        Args: {
          p_bbox_lat_max: number
          p_bbox_lat_min: number
          p_bbox_lng_max: number
          p_bbox_lng_min: number
          p_zoom_level?: number
        }
        Returns: Json
      }
      get_floq_full_details: {
        Args: { p_floq_id: string }
        Returns: {
          activity_visibility: Database["public"]["Enums"]["activity_visibility_enum"]
          boost_count: number
          creator_id: string
          description: string
          ends_at: string
          flock_type: Database["public"]["Enums"]["flock_type_enum"]
          id: string
          join_approval_required: boolean
          mention_permissions: Database["public"]["Enums"]["mention_permissions_enum"]
          notifications_enabled: boolean
          participant_count: number
          participants: Json
          pending_invites: Json
          primary_vibe: Database["public"]["Enums"]["vibe_enum"]
          starts_at: string
          title: string
          visibility: string
          welcome_message: string
        }[]
      }
      get_floq_participant_counts: {
        Args: { floq_ids: string[] }
        Returns: {
          floq_id: string
          participant_count: number
        }[]
      }
      get_floq_participants: {
        Args: { p_floq_id: string; p_limit?: number }
        Returns: {
          avatar_url: string
          profile_id: string
        }[]
      }
      get_floq_plans_enhanced: {
        Args: { p_profile_id: string }
        Returns: {
          created_at: string
          creator_id: string
          description: string
          ends_at: string
          floq_id: string
          id: string
          participant_count: number
          starts_at: string
          status: Database["public"]["Enums"]["plan_status_enum"]
          title: string
          updated_at: string
          user_rsvp_status: Database["public"]["Enums"]["rsvp_status_enum"]
        }[]
      }
      get_floq_visibility_safe: {
        Args: { p_floq_id: string }
        Returns: string
      }
      get_friend_feed: {
        Args: { _limit?: number; _since?: string; _uid?: string }
        Returns: {
          floq_id: string
          floq_title: string
          friend_avatar_url: string
          friend_display_name: string
          friend_id: string
          friend_username: string
          joined_at: string
          primary_vibe: Database["public"]["Enums"]["vibe_enum"]
          role: string
        }[]
      }
      get_friend_suggestion_candidates: {
        Args:
          | {
              limit_count?: number
              min_interactions?: number
              target_profile_id: string
            }
          | { limit_count?: number; target_profile_id: string }
        Returns: {
          interaction_score: number
          profile_id: string
        }[]
      }
      get_friend_trail: {
        Args: {
          friend_profile_id: string
          hours_back?: number
          point_limit?: number
        }
        Returns: {
          captured_at: string
          lat: number
          lng: number
        }[]
      }
      get_friend_visit_stats: {
        Args: { p_venue: string; p_viewer: string }
        Returns: {
          friend_count: number
          friend_list: Json
        }[]
      }
      get_friends_list: {
        Args: { _uid?: string }
        Returns: {
          avatar_url: string
          bio: string
          display_name: string
          friend_id: string
          friend_since: string
          username: string
        }[]
      }
      get_friends_with_presence: {
        Args: Record<PropertyKey, never>
        Returns: {
          avatar_url: string
          display_name: string
          friend_profile_id: string
          is_live: boolean
          last_seen: string
          location: unknown
          username: string
          vibe: Database["public"]["Enums"]["vibe_enum"]
        }[]
      }
      get_friends_with_profile: {
        Args: Record<PropertyKey, never>
        Returns: {
          avatar_url: string
          bio: string
          display_name: string
          friend_id: string
          friend_since: string
          friendship_created_at: string
          friendship_id: string
          username: string
        }[]
      }
      get_hotspot_time_series: {
        Args: { p_cluster_id: string; p_hours_back?: number }
        Returns: {
          avg_intensity: number
          dominant_vibe: Database["public"]["Enums"]["vibe_enum"]
          hour_bucket: string
          user_count: number
        }[]
      }
      get_leaderboard_rank: {
        Args: { p_profile_id: string }
        Returns: Json
      }
      get_live_activity: {
        Args: { p_lat: number; p_lng: number; p_radius_km: number }
        Returns: {
          people_now: number
          venue_id: string
          vibe_tag: Database["public"]["Enums"]["vibe_enum"]
        }[]
      }
      get_location_system_health: {
        Args: { p_minutes_back?: number }
        Returns: Json
      }
      get_location_track: {
        Args: {
          p_end_time?: string
          p_limit?: number
          p_profile_id: string
          p_start_time?: string
        }
        Returns: {
          accuracy: number
          captured_at: string
          lat: number
          lng: number
          venue_id: string
        }[]
      }
      get_message_reactions: {
        Args: { ids: string[] }
        Returns: {
          cnt: number
          emoji: string
          message_id: string
        }[]
      }
      get_nearby_floqs: {
        Args: {
          p_lat: number
          p_limit?: number
          p_lng: number
          p_primary_vibe?: Database["public"]["Enums"]["vibe_enum"]
          p_radius_m?: number
        }
        Returns: {
          address: string
          creator_avatar: string
          creator_name: string
          description: string
          distance_m: number
          ends_at: string
          id: string
          is_joined: boolean
          is_private: boolean
          max_participants: number
          participant_count: number
          primary_vibe: Database["public"]["Enums"]["vibe_enum"]
          starts_at: string
          title: string
        }[]
      }
      get_nearby_live_positions: {
        Args: {
          p_latitude: number
          p_limit?: number
          p_longitude: number
          p_radius_m?: number
        }
        Returns: {
          accuracy: number
          distance_m: number
          last_updated: string
          latitude: number
          longitude: number
          profile_id: string
          vibe: string
        }[]
      }
      get_nearby_presence: {
        Args: { radius_meters?: number; user_lat: number; user_lng: number }
        Returns: {
          distance_meters: number
          profile_id: string
          updated_at: string
          vibe: Database["public"]["Enums"]["vibe_enum"]
        }[]
      }
      get_nearby_users_v2: {
        Args: {
          p_geohash6_prefix?: string
          p_h3_ring_ids?: number[]
          p_lat: number
          p_limit?: number
          p_lng: number
          p_radius_meters?: number
        }
        Returns: Json
      }
      get_nearby_users_with_proximity: {
        Args: {
          radius_meters?: number
          user_lat: number
          user_lng: number
          user_profile_id?: string
        }
        Returns: {
          avatar_url: string
          display_name: string
          distance_meters: number
          last_seen: string
          profile_id: string
          proximity_score: number
          recent_proximity_events: number
          username: string
        }[]
      }
      get_nearby_venues: {
        Args: {
          p_all_tags?: string[]
          p_any_tags?: string[]
          p_lat: number
          p_limit?: number
          p_lng: number
          p_radius_m: number
        }
        Returns: {
          canonical_tags: string[]
          categories: string[]
          distance_m: number
          id: string
          lat: number
          live_count: number
          lng: number
          name: string
          photo_url: string
          provider: string
          vibe_score: number
          vibe_tag: string
        }[]
      }
      get_nearest_venue: {
        Args: { p_lat: number; p_lng: number; p_radius?: number }
        Returns: {
          distance_m: number
          venue_id: string
        }[]
      }
      get_or_create_dm_thread: {
        Args: { p_profile_a: string; p_profile_b: string }
        Returns: string
      }
      get_pending_friend_requests: {
        Args: { _uid?: string }
        Returns: {
          avatar_url: string
          display_name: string
          requested_at: string
          requester_id: string
          username: string
        }[]
      }
      get_personalized_recs: {
        Args: {
          p_ab?: string
          p_lat: number
          p_limit?: number
          p_lng: number
          p_log?: boolean
          p_now?: string
          p_profile_id: string
          p_radius_m?: number
          p_tags?: string[]
          p_tz?: string
          p_vibe?: string
        }
        Returns: {
          dist_m: number
          name: string
          reason: string
          score: number
          venue_id: string
        }[]
      }
      get_personalized_recs_verbose: {
        Args: {
          p_ab?: string
          p_lat: number
          p_limit?: number
          p_lng: number
          p_log?: boolean
          p_now?: string
          p_profile_id: string
          p_radius_m?: number
          p_tags?: string[]
          p_tz?: string
          p_vibe?: string
        }
        Returns: {
          address: string
          badges: string[]
          categories: string[]
          components: Json
          dist_m: number
          external_id: string
          geohash5: string
          lat: number
          lng: number
          name: string
          photo_url: string
          popularity: number
          price_tier: Database["public"]["Enums"]["price_enum"]
          provider: string
          provider_id: string
          rating: number
          reason: string
          score: number
          venue_id: string
          walk_min: number
          weights: Json
        }[]
      }
      get_personalized_venue_score: {
        Args: {
          p_base_score?: number
          p_profile_id: string
          p_venue_id: string
        }
        Returns: number
      }
      get_plan_metadata: {
        Args: { p_plan_id: string }
        Returns: {
          confirmed_stops: number
          estimated_cost_per_person: number
          participant_count: number
          total_duration_minutes: number
          total_stops: number
        }[]
      }
      get_plan_suggestions: {
        Args: { limit_n?: number; me_id: string; target_id: string }
        Returns: {
          estimated_duration: string
          id: string
          title: string
          venue_type: string
          vibe: string
        }[]
      }
      get_plan_summary: {
        Args: { p_plan_id: string }
        Returns: {
          created_at: string
          plan_id: string
          summary: string
          summary_mode: string
        }[]
      }
      get_profile_stats: {
        Args: { metres?: number; seconds?: number; target_profile_id: string }
        Returns: Json
      }
      get_proj4_from_srid: {
        Args: { "": number }
        Returns: string
      }
      get_social_suggestions: {
        Args: {
          p_activity?: string
          p_group_size?: number
          p_lat: number
          p_limit?: number
          p_lng: number
          p_profile_id?: string
          p_radius_km?: number
          p_vibe?: string
        }
        Returns: Json
      }
      get_social_suggestions_by_loc: {
        Args: {
          p_activity?: string
          p_group_size?: number
          p_lat: number
          p_limit?: number
          p_lng: number
          p_profile_id?: string
          p_radius_km?: number
          p_vibe?: string
        }
        Returns: Json
      }
      get_social_suggestions_by_profile: {
        Args: {
          p_activity?: string
          p_group_size?: number
          p_lat?: number
          p_limit?: number
          p_lng?: number
          p_profile_id?: string
          p_radius_km?: number
          p_vibe?: string
        }
        Returns: Json
      }
      get_trending_venues: {
        Args: {
          p_lat: number
          p_limit: number
          p_lng: number
          p_radius_m: number
        }
        Returns: {
          distance_m: number
          name: string
          people_now: number
          trend_score: number
          venue_id: string
          vibe_tag: string
        }[]
      }
      get_trending_venues_enriched: {
        Args: {
          p_all_tags?: string[]
          p_any_tags?: string[]
          p_lat: number
          p_limit?: number
          p_lng: number
          p_radius_m: number
        }
        Returns: {
          canonical_tags: string[]
          categories: string[]
          distance_m: number
          last_seen_at: string
          live_count: number
          name: string
          people_now: number
          photo_url: string
          provider: string
          trend_score: number
          venue_id: string
          vibe_score: number
          vibe_tag: string
          visits_15m: number
        }[]
      }
      get_unread_counts: {
        Args: { p_profile: string }
        Returns: {
          cnt: number
          kind: string
        }[]
      }
      get_user_accessible_plans: {
        Args: Record<PropertyKey, never>
        Returns: {
          archived_at: string
          current_stop_id: string
          execution_started_at: string
          id: string
          participant_count: number
          planned_at: string
          status: Database["public"]["Enums"]["plan_status_enum"]
          stops_count: number
          title: string
          vibe_tag: string
        }[]
      }
      get_user_by_username: {
        Args: { lookup_username: string }
        Returns: {
          avatar_url: string
          bio: string
          display_name: string
          id: string
          username: string
        }[]
      }
      get_user_geofences: {
        Args: { user_profile_id: string }
        Returns: {
          center_lat: number
          center_lng: number
          id: string
          name: string
          polygon_coordinates: Json
          privacy_level: string
          radius_meters: number
          type: string
        }[]
      }
      get_user_location: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      get_user_plans_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          plan_count: number
          status_name: string
        }[]
      }
      get_user_vibe_insights: {
        Args: { p_days_back?: number; p_profile_id?: string }
        Returns: {
          accuracy_trend: number
          consistency_score: number
          learning_velocity: number
          most_corrected_from: Database["public"]["Enums"]["vibe_enum"]
          most_corrected_to: Database["public"]["Enums"]["vibe_enum"]
          top_locations: Json
          total_corrections: number
        }[]
      }
      get_venue_timezone: {
        Args: { p_venue_id: string }
        Returns: string
      }
      get_venues_in_bbox: {
        Args:
          | { east: number; north: number; south: number; west: number }
          | { east: number; north: number; south: number; west: number }
        Returns: {
          address: string
          categories: string[]
          created_at: string
          external_id: string
          id: string
          lat: number
          live_count: number
          lng: number
          name: string
          photo_url: string
          popularity: number
          rating: number
          source: string
          updated_at: string
          vibe: string
          vibe_score: number
        }[]
      }
      get_venues_open_status: {
        Args: { p_venue_ids: string[] }
        Returns: {
          next_close_ts: string
          next_open_ts: string
          open_now: boolean
          status_text: string
          tzid: string
          venue_id: string
        }[]
      }
      get_vibe_breakdown: {
        Args: { me_id: string; target_id: string }
        Returns: {
          overall: number
          socialpattern: number
          timerhythm: number
          venuedna: number
        }[]
      }
      get_vibe_clusters: {
        Args: {
          max_lat: number
          max_lng: number
          min_lat: number
          min_lng: number
          p_precision?: number
        }
        Returns: {
          centroid: unknown
          gh6: string
          member_count: number
          total: number
          vibe_counts: Json
          vibe_mode: string
        }[]
      }
      get_visible_floqs_with_members: {
        Args: {
          p_lat: number
          p_limit?: number
          p_lng: number
          p_offset?: number
          p_radius_km?: number
        }
        Returns: {
          boost_count: number
          creator_id: string
          description: string
          distance_m: number
          ends_at: string
          flock_type: string
          id: string
          members: Json
          participant_count: number
          primary_vibe: string
          starts_at: string
          starts_in_min: number
          title: string
          vibe_tag: string
        }[]
      }
      get_visible_friend_presence: {
        Args: { p_viewer: string }
        Returns: {
          lat: number
          lng: number
          profile_id: string
          updated_at: string
          vibe: string
        }[]
      }
      get_walkable_floqs: {
        Args: { lat: number; lng: number; metres?: number }
        Returns: {
          distance_m: number
          floq_id: string
          primary_vibe: Database["public"]["Enums"]["vibe_enum"]
          title: string
        }[]
      }
      get_yearly_stats: {
        Args: { uid: string; yyyy: number }
        Returns: {
          total_minutes: number
          total_venues: number
          year: number
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
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      identify_problematic_policies: {
        Args: Record<PropertyKey, never>
        Returns: {
          check_clause: string
          command: string
          issue_description: string
          policy_name: string
          schema_name: string
          table_name: string
          using_clause: string
        }[]
      }
      import_venues: {
        Args: {
          p_categories?: string[]
          p_lat: number
          p_limit?: number
          p_lng: number
          p_radius_m?: number
          p_source: string
        }
        Returns: number
      }
      increment_rate_limit_v2: {
        Args: {
          p_action_type: string
          p_profile_id: string
          p_target_profile_id?: string
        }
        Returns: boolean
      }
      ingest_place_feed: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      invite_friends: {
        Args: { p_plan_id: string; p_profile_ids: string[] }
        Returns: Json
      }
      is_floq_participant: {
        Args: { p_floq_id: string; p_user_id: string }
        Returns: boolean
      }
      is_floq_public: {
        Args: { p_floq_id: string }
        Returns: boolean
      }
      is_friend: {
        Args: { p_other: string; p_viewer: string }
        Returns: boolean
      }
      is_live_now: {
        Args: { uid: string }
        Returns: boolean
      }
      is_open_at: {
        Args: { hours: Json; ts: string; tz: string }
        Returns: boolean
      }
      is_point_in_geofence: {
        Args: { geofence_id: string; lat: number; lng: number }
        Returns: boolean
      }
      is_thread_member: {
        Args: { tid: string }
        Returns: boolean
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      join_floq: {
        Args: { p_floq_id: string; p_profile_id?: string; p_use_demo?: boolean }
        Returns: Json
      }
      join_or_leave_plan: {
        Args: { p_join: boolean; p_plan_id: string }
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
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
      }
      leave_floq: {
        Args: { p_floq_id: string; p_profile_id?: string; p_use_demo?: boolean }
        Returns: Json
      }
      log_dedupe_candidates: {
        Args: {
          p_addr_min_sim?: number
          p_address?: string
          p_lat: number
          p_limit?: number
          p_lng: number
          p_name: string
          p_name_min_sim?: number
          p_provider: string
          p_provider_id: string
          p_radius_m?: number
          p_run_id: string
        }
        Returns: number
      }
      log_invite_decline: {
        Args: { p_plan_id: string; p_profile_id: string }
        Returns: undefined
      }
      log_pulse_event: {
        Args: {
          p_event_type: Database["public"]["Enums"]["pulse_event_type"]
          p_floq_id?: string
          p_meta?: Json
          p_people_count?: number
          p_profile_id?: string
          p_venue_id?: string
          p_vibe_tag?: Database["public"]["Enums"]["vibe_tag"]
        }
        Returns: undefined
      }
      log_security_event: {
        Args: { details?: Json; event_type: string; severity?: string }
        Returns: undefined
      }
      longtransactionsenabled: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      make_hexagon: {
        Args: { ctr: unknown; sz: number }
        Returns: unknown
      }
      mark_afterglow_stale: {
        Args: { p_profile_id: string }
        Returns: undefined
      }
      mark_notifications_read: {
        Args: { mark_all_for_user?: boolean; notification_ids?: string[] }
        Returns: number
      }
      mark_read: {
        Args: {
          p_surface: Database["public"]["Enums"]["chat_surface_enum"]
          p_thread_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      mark_thread_read: {
        Args: { p_profile_id: string; p_surface: string; p_thread_id: string }
        Returns: undefined
      }
      mark_thread_read_enhanced: {
        Args: { p_profile_id: string; p_thread_id: string }
        Returns: undefined
      }
      match_locations_batch: {
        Args: { _since: string }
        Returns: number
      }
      match_unmatched_pings: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      merge_venue_visits: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      merge_visits_into_stays: {
        Args: { _lookback?: unknown }
        Returns: number
      }
      migrate_rls_policies_profile_id_to_profile_id: {
        Args: Record<PropertyKey, never>
        Returns: {
          policy_name: string
          status: string
          table_name: string
        }[]
      }
      norm_pair: {
        Args: { a: string; b: string }
        Returns: {
          high: string
          low: string
        }[]
      }
      normalise_place_feed: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      path: {
        Args: { "": unknown }
        Returns: unknown
      }
      people_crossed_paths_today: {
        Args: { in_me?: string; proximity_meters?: number }
        Returns: {
          avatar_url: string
          display_name: string
          distance_meters: number
          last_seen_at: string
          overlap_duration_minutes: number
          profile_id: string
          username: string
        }[]
      }
      pg_get_tabledef: {
        Args: { obj: unknown }
        Returns: string
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
      pill_keys_to_canonical_tags: {
        Args: { p_keys: string[] }
        Returns: Database["public"]["Enums"]["canonical_tag"][]
      }
      point: {
        Args: { "": unknown }
        Returns: unknown
      }
      polygon: {
        Args: { "": unknown }
        Returns: unknown
      }
      populate_field_tiles: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
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
          coord_dimension: number
          geomname: string
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
        Args: {
          include_self?: boolean
          lat: number
          lng: number
          radius_m: number
        }
        Returns: {
          avatar_url: string
          display_name: string
          lat: number
          lng: number
          profile_id: string
          updated_at: string
          vibe: Database["public"]["Enums"]["vibe_enum"]
        }[]
      }
      print_pk_profile_statements: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      process_function_definition: {
        Args: { function_oid: unknown }
        Returns: string
      }
      publish_cluster_deltas: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      publish_hotspots: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      publish_hotspots_json: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      publish_presence_counts: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      purge_stale_presence: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      push_sender_ping: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      rank_nearby_people: {
        Args: { p_lat: number; p_limit?: number; p_lng: number }
        Returns: {
          meters: number
          profile_id: string
          synthetic_id: string
          vibe: string
        }[]
      }
      react_to_message: {
        Args: { p_emoji: string; p_message_id: string; p_user_id: string }
        Returns: Json
      }
      refresh_field_tiles: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_field_tiles_smart_v2: {
        Args: {
          p_bbox_lat_max?: number
          p_bbox_lat_min?: number
          p_bbox_lng_max?: number
          p_bbox_lng_min?: number
        }
        Returns: Json
      }
      refresh_field_tiles_v2: {
        Args: {
          p_bbox_lat_max?: number
          p_bbox_lat_min?: number
          p_bbox_lng_max?: number
          p_bbox_lng_min?: number
          p_hex_size_meters?: number
        }
        Returns: Json
      }
      refresh_friend_last_points: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_friend_last_seen: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_friend_sparkline: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_leaderboard_cache: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_mv_trending_venues: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_proximity_stats: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_time_in_venue: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_v_friend_visits: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_venue_hourly_presence: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_venue_metrics: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_venue_metrics_daily: {
        Args: { p_end?: string; p_start?: string }
        Returns: undefined
      }
      refresh_venue_social_metrics: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_vibe_cluster_momentum: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_vibe_clusters_with_metrics: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      remove_friend: {
        Args: { _friend: string }
        Returns: Json
      }
      reorder_plan_stops: {
        Args: { p_plan_id: string; p_stop_orders: Json }
        Returns: undefined
      }
      reset_badge: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      rewrite_profile_id_to_profile_id: {
        Args: { dry_run?: boolean; target_schema?: string }
        Returns: {
          function_name: string
          schema_name: string
          status: string
        }[]
      }
      rpc_floq_session_create: {
        Args: {
          in_invite_profiles?: string[]
          in_lat?: number
          in_lng?: number
          in_primary_vibe: Database["public"]["Enums"]["vibe_enum"]
          in_radius_m?: number
          in_title?: string
          in_visibility?: string
        }
        Returns: string
      }
      rpc_live_floqs_near: {
        Args: {
          center_lat: number
          center_lng: number
          radius_m?: number
          vis_filters?: string[]
        }
        Returns: {
          distance_m: number
          ends_at: string
          id: string
          name: string
          participants: number
          status: Database["public"]["Enums"]["floq_session_status"]
        }[]
      }
      rpc_my_live_floqs: {
        Args: Record<PropertyKey, never>
        Returns: {
          ends_at: string
          id: string
          is_creator: boolean
          name: string
          participants: number
          status: Database["public"]["Enums"]["floq_session_status"]
        }[]
      }
      rpc_presence_beacon: {
        Args: {
          in_accuracy_m?: number
          in_lat: number
          in_lng: number
          in_status?: string
          in_venue_id?: string
          in_vibe?: Database["public"]["Enums"]["vibe_enum"]
        }
        Returns: undefined
      }
      rpc_presence_otw: {
        Args: {
          in_accuracy_m?: number
          in_lat: number
          in_lng: number
          in_venue_id?: string
        }
        Returns: string
      }
      rpc_ripples_near: {
        Args: {
          center_lat: number
          center_lng: number
          friends_only?: boolean
          only_close_friends?: boolean
          radius_m?: number
          recent_minutes?: number
        }
        Returns: {
          both_friends: boolean
          centroid_lat: number
          centroid_lng: number
          distance_m: number
          expires_at: string
          includes_friend: boolean
          ripple_id: string
          venue_id: string
        }[]
      }
      rpc_session_checkin: {
        Args: {
          in_checkin: Database["public"]["Enums"]["checkin_status"]
          in_floq_id: string
        }
        Returns: undefined
      }
      rpc_session_end: {
        Args: { in_floq_id: string }
        Returns: undefined
      }
      rpc_session_extend: {
        Args: { add_minutes?: number; in_floq_id: string }
        Returns: string
      }
      rpc_session_feed_list: {
        Args: { in_before?: string; in_floq_id: string; in_limit?: number }
        Returns: {
          author_profile_id: string
          created_at: string
          duration_sec: number
          id: string
          kind: Database["public"]["Enums"]["floq_feed_kind"]
          storage_key: string
          text_content: string
        }[]
      }
      rpc_session_join: {
        Args: {
          in_checkin?: Database["public"]["Enums"]["checkin_status"]
          in_floq_id: string
        }
        Returns: undefined
      }
      rpc_session_post: {
        Args: {
          in_duration_sec?: number
          in_floq_id: string
          in_kind: Database["public"]["Enums"]["floq_feed_kind"]
          in_storage_key?: string
          in_text?: string
        }
        Returns: string
      }
      rpc_wave_ripple_overview: {
        Args: {
          center_lat: number
          center_lng: number
          only_close_friends?: boolean
          radius_m?: number
          recent_ripple_minutes?: number
          recent_wave_minutes?: number
        }
        Returns: {
          ripples_total: number
          ripples_with_friends: number
          waves_total: number
          waves_with_friends: number
        }[]
      }
      rpc_waves_near: {
        Args: {
          center_lat: number
          center_lng: number
          friends_only?: boolean
          min_size?: number
          only_close_friends?: boolean
          radius_m?: number
          recent_minutes?: number
        }
        Returns: {
          centroid_lat: number
          centroid_lng: number
          cluster_id: string
          distance_m: number
          friends_in_cluster: number
          last_seen_at: string
          size: number
          venue_id: string
        }[]
      }
      search_afterglows: {
        Args: {
          p_dominant_vibe?: string
          p_end_date?: string
          p_is_pinned?: boolean
          p_limit?: number
          p_max_energy?: number
          p_min_energy?: number
          p_offset?: number
          p_profile_id?: string
          p_search_query?: string
          p_start_date?: string
          p_tags?: string[]
        }
        Returns: {
          created_at: string
          crossed_paths_count: number
          date: string
          dominant_vibe: string
          energy_score: number
          id: string
          is_pinned: boolean
          moments_count: number
          search_rank: number
          social_intensity: number
          summary_text: string
          total_floqs: number
          total_venues: number
          vibe_path: string[]
        }[]
      }
      search_direct_threads: {
        Args: { p_query: string; p_uid: string }
        Returns: {
          friend_avatar_url: string
          friend_display_name: string
          friend_profile_id: string
          friend_username: string
          last_message_at: string
          last_message_content: string
          match_score: number
          match_type: string
          my_unread_count: number
          thread_id: string
        }[]
      }
      search_direct_threads_enhanced: {
        Args: { p_limit?: number; p_profile_id: string; p_query?: string }
        Returns: {
          is_online: boolean
          last_message_at: string
          last_message_content: string
          other_avatar_url: string
          other_display_name: string
          other_profile_id: string
          other_username: string
          thread_id: string
          unread_count: number
        }[]
      }
      search_everything: {
        Args: { limit_count?: number; query: string }
        Returns: {
          distance_m: number
          id: string
          kind: string
          label: string
          similarity: number
          starts_at: string
          sublabel: string
        }[]
      }
      search_floqs: {
        Args: {
          _viewer_id?: string
          p_lat?: number
          p_limit?: number
          p_lng?: number
          p_offset?: number
          p_query?: string
          p_radius_km?: number
          p_time_from?: string
          p_time_to?: string
          p_vibe_ids?: Database["public"]["Enums"]["vibe_enum"][]
          p_visibilities?: string[]
        }
        Returns: {
          distance_m: number
          ends_at: string
          id: string
          participant_count: number
          primary_vibe: Database["public"]["Enums"]["vibe_enum"]
          starts_at: string
          title: string
          user_joined_floq_id: string
        }[]
      }
      search_profiles: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          avatar_url: string
          display_name: string
          id: string
          username: string
        }[]
      }
      search_profiles_with_status: {
        Args: { p_limit?: number; p_query: string; p_viewer_id?: string }
        Returns: {
          avatar_url: string
          created_at: string
          display_name: string
          id: string
          req_status: Database["public"]["Enums"]["friend_req_status"]
          username: string
        }[]
      }
      search_users: {
        Args: { search_query: string }
        Returns: {
          avatar_url: string
          created_at: string
          display_name: string
          id: string
          username: string
        }[]
      }
      send_dm_message: {
        Args: {
          p_body?: string
          p_media?: Json
          p_reply_to?: string
          p_sender_id: string
          p_thread_id: string
          p_type?: Database["public"]["Enums"]["dm_msg_type"]
        }
        Returns: {
          content: string | null
          created_at: string | null
          id: string
          message_type: Database["public"]["Enums"]["dm_msg_type"]
          metadata: Json | null
          profile_id: string
          reply_to: string | null
          reply_to_id: string | null
          status: string
          thread_id: string
        }[]
      }
      send_dm_message_uuid: {
        Args: {
          p_body: string
          p_media?: Json
          p_reply_to?: string
          p_sender_id: string
          p_thread_id: string
          p_type?: Database["public"]["Enums"]["dm_msg_type"]
        }
        Returns: {
          content: string | null
          created_at: string | null
          id: string
          message_type: Database["public"]["Enums"]["dm_msg_type"]
          metadata: Json | null
          profile_id: string
          reply_to: string | null
          reply_to_id: string | null
          status: string
          thread_id: string
        }
      }
      send_friend_request: {
        Args: { _target: string }
        Returns: Json
      }
      send_friend_request_with_rate_limit: {
        Args:
          | { p_from_profile: string; p_to_profile: string }
          | { p_target_profile_id: string }
        Returns: Json
      }
      send_message: {
        Args: {
          p_body?: string
          p_media_meta?: Json
          p_reply_to_id?: string
          p_sender_id: string
          p_surface: Database["public"]["Enums"]["chat_surface_enum"]
          p_thread_id: string
        }
        Returns: {
          body: string | null
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          message_type: string
          metadata: Json | null
          profile_id: string
          reply_to_id: string | null
          sender_id: string
          status: string
          surface: Database["public"]["Enums"]["chat_surface_enum"]
          thread_id: string
        }
      }
      send_pending_push: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      set_live_share: {
        Args: { _friend: string; _on?: boolean }
        Returns: undefined
      }
      set_live_share_bulk: {
        Args: {
          _auto_when?: Database["public"]["Enums"]["auto_when_enum"][]
          _friend_ids: string[]
          _on: boolean
        }
        Returns: undefined
      }
      set_my_last_loc: {
        Args: { lat: number; lon: number }
        Returns: undefined
      }
      set_participant_role: {
        Args: { p_floq_id: string; p_new_role: string; p_profile_id: string }
        Returns: undefined
      }
      set_user_vibe: {
        Args:
          | {
              lat?: number
              lng?: number
              new_vibe: Database["public"]["Enums"]["vibe_enum"]
            }
          | { lat?: number; lng?: number; new_vibe: string }
        Returns: {
          active: boolean | null
          gh5: string | null
          location: unknown | null
          profile_id: string
          started_at: string
          vibe_h: number | null
          vibe_l: number | null
          vibe_s: number | null
          vibe_tag: Database["public"]["Enums"]["vibe_enum"]
          visible_to: string | null
        }
      }
      set_venue_embedding: {
        Args: { p: string; p_venue_id: string }
        Returns: undefined
      }
      should_log_presence: {
        Args: { p_loc: unknown; p_now?: string; p_user: string }
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
      slug_to_id: {
        Args: { t: Database["public"]["Enums"]["mention_target"]; tag: string }
        Returns: string
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
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
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
        Returns: string
      }
      st_asgml: {
        Args:
          | { "": string }
          | {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
          | {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
          | {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
          | { geom: unknown; maxdecimaldigits?: number; options?: number }
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
        Args: { format?: string; geom: unknown }
        Returns: string
      }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg: {
        Args:
          | { "": string }
          | { geog: unknown; maxdecimaldigits?: number; rel?: number }
          | { geom: unknown; maxdecimaldigits?: number; rel?: number }
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
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
          | {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
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
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer: {
        Args:
          | { geom: unknown; options?: string; radius: number }
          | { geom: unknown; quadsegs: number; radius: number }
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
        Args: { box: unknown; geom: unknown }
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
      st_clusterwithin_garray_app: {
        Args: { geoms: unknown[]; maxdist: number }
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
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
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
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
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
          | { dm?: number; dx: number; dy: number; dz?: number; geom: unknown }
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
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
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
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
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
        Args:
          | { cell_i: number; cell_j: number; origin?: unknown; size: number }
          | { center: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
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
        Args: { flags?: number; geom: unknown }
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
        Args: { font?: Json; letters: string }
        Returns: unknown
      }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
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
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
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
        Args: { distance: number; line: unknown; params?: string }
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
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
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
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
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
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
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
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
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
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
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
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_transform: {
        Args:
          | { from_proj: string; geom: unknown; to_proj: string }
          | { from_proj: string; geom: unknown; to_srid: number }
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
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
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
        Args: { geom: unknown; move: number; wrap: number }
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
      store_push_token: {
        Args: { p_device_id: string; p_platform: string; p_token: string }
        Returns: undefined
      }
      suggest_friends: {
        Args: { p_limit?: number; p_profile_id: string }
        Returns: {
          avatar_url: string
          display_name: string
          id: string
          shared_tags: number
          username: string
        }[]
      }
      text: {
        Args: { "": unknown }
        Returns: string
      }
      toggle_close_friend: {
        Args: { _flag: boolean; _other_user: string }
        Returns: undefined
      }
      toggle_dm_reaction: {
        Args: { p_emoji: string; p_message_id: string; p_profile_id: string }
        Returns: Json
      }
      toggle_venue_bump: {
        Args: { p_venue: string }
        Returns: number
      }
      track_interaction: {
        Args: {
          p_context?: Json
          p_profile_id: string
          p_type: string
          p_venue_id: string
          p_weight?: number
        }
        Returns: undefined
      }
      trim_weather_cache: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      unaccent: {
        Args: { "": string }
        Returns: string
      }
      unaccent_init: {
        Args: { "": unknown }
        Returns: unknown
      }
      unlockrows: {
        Args: { "": string }
        Returns: number
      }
      update_circuit_breaker_state: {
        Args: {
          p_failure_count?: number
          p_metadata?: Json
          p_state: string
          p_success_count?: number
        }
        Returns: undefined
      }
      update_last_read_at: {
        Args: { thread_id_param: string; user_id_param: string }
        Returns: undefined
      }
      update_last_read_message: {
        Args: { p_floq_id: string }
        Returns: undefined
      }
      update_proximity_stats: {
        Args: {
          p_confidence?: number
          p_distance_meters: number
          p_duration_minutes?: number
          p_profile_id_a: string
          p_profile_id_b: string
        }
        Returns: undefined
      }
      update_suggestion_metrics: {
        Args: {
          p_action: string
          p_profile_id: string
          p_suggestion_id?: string
          p_suggestion_type: Database["public"]["Enums"]["suggestion_type_enum"]
        }
        Returns: Json
      }
      update_user_activity_tracking: {
        Args: { p_floq_id: string; p_section?: string }
        Returns: undefined
      }
      update_user_preferences_from_feedback: {
        Args: { p_moment: string; p_profile_id: string; p_vibe: string }
        Returns: undefined
      }
      update_username: {
        Args: { p_username: string }
        Returns: Json
      }
      update_venue_live_counts: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_venue_popularity: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_venue_vibe_scores: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      upsert_friendship: {
        Args:
          | {
              _action?: Database["public"]["Enums"]["friend_state"]
              _other: string
            }
          | {
              _is_close?: boolean
              _new_state: Database["public"]["Enums"]["friend_state"]
              _other_user: string
            }
        Returns: Database["public"]["Enums"]["friend_state"]
      }
      upsert_friendship_analysis: {
        Args:
          | {
              p_confidence_level: string
              p_overall_score: number
              p_profile_a: string
              p_profile_b: string
              p_relationship_type: string
              p_signals_data: Json
            }
          | {
              p_confidence_level: string
              p_overall_score: number
              p_profile_a: string
              p_profile_b: string
              p_relationship_type: string
              p_signals_data: Json
            }
        Returns: string
      }
      upsert_live_position: {
        Args: {
          p_accuracy?: number
          p_latitude: number
          p_longitude: number
          p_profile_id: string
          p_vibe?: string
          p_visibility?: string
        }
        Returns: string
      }
      upsert_merge_venue: {
        Args:
          | { p: Json }
          | {
              p: Json
              p_addr_min_sim?: number
              p_name_min_sim?: number
              p_radius_m?: number
              p_run_id?: string
            }
        Returns: {
          action: string
          addr_sim: number
          dist_m: number
          matched_venue_id: string
          name_sim: number
          venue_id: string
        }[]
      }
      upsert_online_status: {
        Args: { p_is_online?: boolean }
        Returns: undefined
      }
      upsert_presence: {
        Args: {
          p_lat: number
          p_lng: number
          p_vibe: string
          p_visibility?: string
        }
        Returns: undefined
      }
      upsert_presence__old5: {
        Args: {
          p_lat: number
          p_lng: number
          p_venue_id?: string
          p_vibe?: Database["public"]["Enums"]["vibe_enum"]
          p_visibility?: string
        }
        Returns: undefined
      }
      upsert_presence_realtime_v2: {
        Args: {
          p_accuracy?: number
          p_h3_idx?: number
          p_lat: number
          p_lng: number
          p_vibe?: string
        }
        Returns: Json
      }
      upsert_presence_realtime_v2_text: {
        Args: {
          p_accuracy?: number
          p_h3_idx_text?: string
          p_lat: number
          p_lng: number
          p_vibe?: string
        }
        Returns: Json
      }
      upsert_user_tastes: {
        Args: { p_json: Json; p_profile_id: string }
        Returns: undefined
      }
      upsert_venue_presence_smart: {
        Args: {
          _heartbeat_ts?: string
          _profile_id: string
          _venue_id: string
          _vibe: Database["public"]["Enums"]["vibe_enum"]
        }
        Returns: boolean
      }
      upsert_vibes_now_smart: {
        Args: {
          _location: unknown
          _profile_id: string
          _venue_id?: string
          _vibe: Database["public"]["Enums"]["vibe_enum"]
          _visibility?: string
        }
        Returns: boolean
      }
      user_can_access_plan: {
        Args: { p_plan_id: string }
        Returns: boolean
      }
      user_can_access_plan_simple: {
        Args: { p_plan: string }
        Returns: boolean
      }
      user_can_invite_to_plan: {
        Args: { p_plan_id: string }
        Returns: boolean
      }
      user_can_manage_plan: {
        Args: { p_plan_id: string }
        Returns: boolean
      }
      user_has_plan_access: {
        Args: { p_plan_id: string }
        Returns: boolean
      }
      user_in_floq: {
        Args: { p_floq: string }
        Returns: boolean
      }
      user_in_floq_or_creator: {
        Args: { p_plan_id: string; p_user_id?: string }
        Returns: boolean
      }
      user_is_floq_participant: {
        Args: { p_floq_id: string; p_profile_id?: string }
        Returns: boolean
      }
      user_is_member_of_floq: {
        Args: { _floq_id: string }
        Returns: boolean
      }
      user_is_plan_participant: {
        Args: { p_plan_id: string }
        Returns: boolean
      }
      username_available: {
        Args: { u: string }
        Returns: boolean
      }
      validate_and_sanitize_text: {
        Args: { input_text: string; max_length?: number }
        Returns: string
      }
      validate_stop_times: {
        Args: { p_plan_id: string }
        Returns: undefined
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      venue_details: {
        Args: { p_venue_id: string }
        Returns: {
          description: string
          geom: unknown
          id: string
          lat: number
          live_count: number
          lng: number
          name: string
          popularity: number
          vibe: string
          vibe_score: number
        }[]
      }
      venues_near_me: {
        Args: { radius_km?: number; user_lat: number; user_lng: number }
        Returns: {
          distance_m: number
          id: string
          lat: number
          live_count: number
          lng: number
          name: string
          source: string
          vibe: string
        }[]
      }
      venues_within_radius: {
        Args: {
          p_categories?: string[]
          p_lat: number
          p_limit?: number
          p_lng: number
          p_price_tier_max?: Database["public"]["Enums"]["price_enum"]
          p_profile_id?: string
          p_radius_m?: number
          p_vibe?: string
        }
        Returns: {
          address: string
          categories: string[]
          description: string
          distance_m: number
          live_count: number
          name: string
          personalized_score: number
          photo_url: string
          price_tier: Database["public"]["Enums"]["price_enum"]
          rating: number
          venue_id: string
        }[]
      }
      verify_profile_id_rewrite: {
        Args: { target_schema?: string }
        Returns: {
          function_name: string
          issue: string
          kind: string
          schema_name: string
        }[]
      }
      vibe_similarity: {
        Args: {
          a: Database["public"]["Enums"]["vibe_enum"]
          b: Database["public"]["Enums"]["vibe_enum"]
        }
        Returns: number
      }
      view_active_ripples_stub: {
        Args: {
          center_lat: number
          center_lng: number
          radius_m?: number
          viewer_profile_id: string
        }
        Returns: {
          centroid_lat: number
          centroid_lng: number
          created_at: string
          expires_at: string
          venue_id: string
        }[]
      }
      view_nearby_waves_stub: {
        Args: {
          center_lat: number
          center_lng: number
          radius_m?: number
          viewer_profile_id: string
        }
        Returns: {
          centroid_lat: number
          centroid_lng: number
          last_seen_at: string
          size: number
          venue_id: string
        }[]
      }
      walkable_floqs: {
        Args: { p_lat: number; p_lng: number; p_metres?: number }
        Returns: {
          distance_meters: number
          id: string
          participant_count: number
          primary_vibe: Database["public"]["Enums"]["vibe_enum"]
          starts_at: string
          title: string
        }[]
      }
    }
    Enums: {
      acc_enum: "exact" | "street" | "area"
      achievement_family:
        | "social"
        | "location"
        | "vibe"
        | "activity"
        | "milestone"
        | "special"
      activity_visibility_enum: "public" | "members_only"
      afterglow_moment_type:
        | "floq_joined"
        | "floq_left"
        | "vibe_change"
        | "location_arrived"
        | "location_left"
        | "crossed_paths"
        | "plan_started"
        | "plan_ended"
        | "peak_energy"
        | "social_boost"
        | "solo_moment"
      auto_when_enum: "always" | "in_floq" | "at_venue" | "walking"
      canonical_tag:
        | "outdoor"
        | "patio"
        | "rooftop"
        | "waterfront"
        | "park"
        | "beach"
        | "cozy"
        | "lounge"
        | "speakeasy"
        | "board_games"
        | "cinema"
        | "arcade"
        | "bowling"
        | "live_music"
        | "music_venue"
        | "dance_club"
        | "night_club"
        | "karaoke"
        | "sports_bar"
        | "bar"
        | "pub"
        | "brewery"
        | "winery"
        | "cafe"
        | "coffee"
        | "brunch"
        | "bakery"
        | "restaurant"
        | "games"
        | "communal_seating"
        | "group_friendly"
        | "date_spot"
        | "open_air_event"
      chat_surface_enum: "dm" | "floq" | "plan"
      checkin_status: "idle" | "otw" | "here"
      cluster_state: "forming" | "stable" | "cooldown"
      cluster_type_enum:
        | "nightlife"
        | "cafe"
        | "park"
        | "transit"
        | "creative"
        | "wellness"
      dm_msg_type: "text" | "image" | "voice" | "file"
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
      floq_feed_kind: "photo" | "audio" | "text" | "vibe"
      floq_participant_role_enum: "creator" | "admin" | "member"
      floq_session_status: "live" | "ending" | "ended" | "cancelled"
      friend_req_status:
        | "none"
        | "pending_out"
        | "pending_in"
        | "friends"
        | "blocked"
      friend_state: "pending" | "accepted" | "blocked" | "close"
      invitation_status: "pending" | "accepted" | "declined"
      invite_status: "pending" | "accepted" | "declined"
      location_request_status: "pending" | "approved" | "denied" | "expired"
      mention_permissions_enum: "all" | "co-admins" | "host"
      mention_target: "user" | "venue" | "plan"
      onboarding_version_enum: "v1" | "v2"
      plan_mode: "draft" | "finalized" | "executing" | "completed"
      plan_mode_enum: "draft" | "finalized" | "done"
      plan_role_enum: "participant" | "organizer"
      plan_status_enum:
        | "draft"
        | "active"
        | "closed"
        | "cancelled"
        | "finalized"
        | "executing"
        | "completed"
        | "invited"
      price_enum: "$" | "$$" | "$$$" | "$$$$"
      pulse_event_type:
        | "check_in"
        | "check_out"
        | "vibe_join"
        | "vibe_leave"
        | "floq_join"
        | "floq_leave"
      rsvp_status_enum: "attending" | "maybe" | "not_attending" | "pending"
      scope_enum: "friends" | "mutuals" | "none"
      suggestion_status_enum: "pending" | "accepted" | "dismissed" | "expired"
      suggestion_type_enum:
        | "merge_flocks"
        | "invite_user"
        | "recommend_venue"
        | "schedule_activity"
        | "change_vibe"
      summary_mode: "finalized" | "afterglow"
      surface_enum: "dm" | "floq" | "plan"
      travel_mode_enum: "walking" | "driving" | "transit"
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
        | "energetic"
        | "excited"
        | "focused"
      vibe_tag:
        | "social"
        | "hype"
        | "energetic"
        | "curious"
        | "mindful"
        | "creative"
        | "competitive"
        | "chill"
        | "steady"
        | "solo"
        | "focused"
        | "romantic"
        | "cozy"
        | "lux"
        | "weird"
        | "down"
        | "flowing"
        | "exploring"
        | "open"
        | "supportive"
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
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      extension: {
        Args: { name: string }
        Returns: string
      }
      filename: {
        Args: { name: string }
        Returns: string
      }
      foldername: {
        Args: { name: string }
        Returns: string[]
      }
      get_size_by_bucket: {
        Args: Record<PropertyKey, never>
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          start_after?: string
        }
        Returns: {
          id: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
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
    Enums: {
      acc_enum: ["exact", "street", "area"],
      achievement_family: [
        "social",
        "location",
        "vibe",
        "activity",
        "milestone",
        "special",
      ],
      activity_visibility_enum: ["public", "members_only"],
      afterglow_moment_type: [
        "floq_joined",
        "floq_left",
        "vibe_change",
        "location_arrived",
        "location_left",
        "crossed_paths",
        "plan_started",
        "plan_ended",
        "peak_energy",
        "social_boost",
        "solo_moment",
      ],
      auto_when_enum: ["always", "in_floq", "at_venue", "walking"],
      canonical_tag: [
        "outdoor",
        "patio",
        "rooftop",
        "waterfront",
        "park",
        "beach",
        "cozy",
        "lounge",
        "speakeasy",
        "board_games",
        "cinema",
        "arcade",
        "bowling",
        "live_music",
        "music_venue",
        "dance_club",
        "night_club",
        "karaoke",
        "sports_bar",
        "bar",
        "pub",
        "brewery",
        "winery",
        "cafe",
        "coffee",
        "brunch",
        "bakery",
        "restaurant",
        "games",
        "communal_seating",
        "group_friendly",
        "date_spot",
        "open_air_event",
      ],
      chat_surface_enum: ["dm", "floq", "plan"],
      checkin_status: ["idle", "otw", "here"],
      cluster_state: ["forming", "stable", "cooldown"],
      cluster_type_enum: [
        "nightlife",
        "cafe",
        "park",
        "transit",
        "creative",
        "wellness",
      ],
      dm_msg_type: ["text", "image", "voice", "file"],
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
      floq_feed_kind: ["photo", "audio", "text", "vibe"],
      floq_participant_role_enum: ["creator", "admin", "member"],
      floq_session_status: ["live", "ending", "ended", "cancelled"],
      friend_req_status: [
        "none",
        "pending_out",
        "pending_in",
        "friends",
        "blocked",
      ],
      friend_state: ["pending", "accepted", "blocked", "close"],
      invitation_status: ["pending", "accepted", "declined"],
      invite_status: ["pending", "accepted", "declined"],
      location_request_status: ["pending", "approved", "denied", "expired"],
      mention_permissions_enum: ["all", "co-admins", "host"],
      mention_target: ["user", "venue", "plan"],
      onboarding_version_enum: ["v1", "v2"],
      plan_mode: ["draft", "finalized", "executing", "completed"],
      plan_mode_enum: ["draft", "finalized", "done"],
      plan_role_enum: ["participant", "organizer"],
      plan_status_enum: [
        "draft",
        "active",
        "closed",
        "cancelled",
        "finalized",
        "executing",
        "completed",
        "invited",
      ],
      price_enum: ["$", "$$", "$$$", "$$$$"],
      pulse_event_type: [
        "check_in",
        "check_out",
        "vibe_join",
        "vibe_leave",
        "floq_join",
        "floq_leave",
      ],
      rsvp_status_enum: ["attending", "maybe", "not_attending", "pending"],
      scope_enum: ["friends", "mutuals", "none"],
      suggestion_status_enum: ["pending", "accepted", "dismissed", "expired"],
      suggestion_type_enum: [
        "merge_flocks",
        "invite_user",
        "recommend_venue",
        "schedule_activity",
        "change_vibe",
      ],
      summary_mode: ["finalized", "afterglow"],
      surface_enum: ["dm", "floq", "plan"],
      travel_mode_enum: ["walking", "driving", "transit"],
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
        "energetic",
        "excited",
        "focused",
      ],
      vibe_tag: [
        "social",
        "hype",
        "energetic",
        "curious",
        "mindful",
        "creative",
        "competitive",
        "chill",
        "steady",
        "solo",
        "focused",
        "romantic",
        "cozy",
        "lux",
        "weird",
        "down",
        "flowing",
        "exploring",
        "open",
        "supportive",
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
  storage: {
    Enums: {},
  },
} as const
