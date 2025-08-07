// Generated from Supabase schema
// Auto-generated types - do not edit manually

export type Database = {
  public: {
    Tables: {
      friend_suggestions: {
        Row: {
          id: string;
          target_profile_id: string;
          suggested_profile_id: string;
          score: number;
          confidence_level: string;
          suggestion_reason: string;
          signals_summary: any;
          status: string;
          created_at: string;
          responded_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          target_profile_id: string;
          suggested_profile_id: string;
          score: number;
          confidence_level: string;
          suggestion_reason: string;
          signals_summary: any;
          status: string;
          created_at?: string;
          responded_at: string;
          expires_at: string;
        };
        Update: {
          id?: string;
          target_profile_id?: string;
          suggested_profile_id?: string;
          score?: number;
          confidence_level?: string;
          suggestion_reason?: string;
          signals_summary?: any;
          status?: string;
          created_at?: string;
          responded_at?: string;
          expires_at?: string;
        };
      };
      user_settings: {
        Row: {
          available_until: string;
          notification_preferences: any;
          privacy_settings: any;
          theme_preferences: any;
          created_at: string;
          updated_at: string;
          preferred_welcome_template: string;
          field_enabled: boolean;
          field_ripples: boolean;
          field_trails: boolean;
          profile_id: string;
        };
        Insert: {
          available_until: string;
          notification_preferences: any;
          privacy_settings: any;
          theme_preferences: any;
          created_at?: string;
          updated_at?: string;
          preferred_welcome_template: string;
          field_enabled: boolean;
          field_ripples: boolean;
          field_trails: boolean;
          profile_id: string;
        };
        Update: {
          available_until?: string;
          notification_preferences?: any;
          privacy_settings?: any;
          theme_preferences?: any;
          created_at?: string;
          updated_at?: string;
          preferred_welcome_template?: string;
          field_enabled?: boolean;
          field_ripples?: boolean;
          field_trails?: boolean;
          profile_id?: string;
        };
      };
      raw_locations: {
        Row: {
          id: number;
          captured_at: string;
          geom: string;
          accuracy_m: number;
          geohash5: string;
          acc: number;
          profile_id: string;
        };
        Insert: {
          id?: number;
          captured_at: string;
          geom: string;
          accuracy_m: number;
          geohash5: string;
          acc: number;
          profile_id: string;
        };
        Update: {
          id?: number;
          captured_at?: string;
          geom?: string;
          accuracy_m?: number;
          geohash5?: string;
          acc?: number;
          profile_id?: string;
        };
      };
      afterglow_share_links: {
        Row: {
          id: string;
          daily_afterglow_id: string;
          slug: string;
          og_image_url: string;
          created_at: string;
          profile_id: string;
        };
        Insert: {
          id?: string;
          daily_afterglow_id: string;
          slug: string;
          og_image_url: string;
          created_at?: string;
          profile_id: string;
        };
        Update: {
          id?: string;
          daily_afterglow_id?: string;
          slug?: string;
          og_image_url?: string;
          created_at?: string;
          profile_id?: string;
        };
      };
      v_friends_with_presence: {
        Row: {
          friend_id: string;
          display_name: string;
          username: string;
          avatar_url: string;
          started_at: string;
          vibe_tag: string;
          online: boolean;
          friend_state: string;
          created_at: string;
          responded_at: string;
          is_outgoing_request: boolean;
          is_incoming_request: boolean;
        };
        Insert: {
          friend_id: string;
          display_name: string;
          username: string;
          avatar_url: string;
          started_at: string;
          vibe_tag: string;
          online: boolean;
          friend_state: string;
          created_at?: string;
          responded_at: string;
          is_outgoing_request: boolean;
          is_incoming_request: boolean;
        };
        Update: {
          friend_id?: string;
          display_name?: string;
          username?: string;
          avatar_url?: string;
          started_at?: string;
          vibe_tag?: string;
          online?: boolean;
          friend_state?: string;
          created_at?: string;
          responded_at?: string;
          is_outgoing_request?: boolean;
          is_incoming_request?: boolean;
        };
      };
      plan_drafts: {
        Row: {
          id: string;
          plan_id: string;
          draft_data: any;
          version: number;
          last_saved_at: string;
          created_at: string;
          profile_id: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          draft_data: any;
          version: number;
          last_saved_at: string;
          created_at?: string;
          profile_id: string;
        };
        Update: {
          id?: string;
          plan_id?: string;
          draft_data?: any;
          version?: number;
          last_saved_at?: string;
          created_at?: string;
          profile_id?: string;
        };
      };
      friend_last_points: {
        Row: {
          geom: string;
          accuracy_m: number;
          captured_at: string;
          updated_at: string;
          profile_id: string;
        };
        Insert: {
          geom: string;
          accuracy_m: number;
          captured_at: string;
          updated_at?: string;
          profile_id: string;
        };
        Update: {
          geom?: string;
          accuracy_m?: number;
          captured_at?: string;
          updated_at?: string;
          profile_id?: string;
        };
      };
      spatial_ref_sys: {
        Row: {
          srid: number;
          auth_name: string;
          auth_srid: number;
          srtext: string;
          proj4text: string;
        };
        Insert: {
          srid: number;
          auth_name: string;
          auth_srid: number;
          srtext: string;
          proj4text: string;
        };
        Update: {
          srid?: number;
          auth_name?: string;
          auth_srid?: number;
          srtext?: string;
          proj4text?: string;
        };
      };
      v_floq_participants: {
        Row: {
          floq_id: string;
          role: string;
          joined_at: string;
          profile_id: string;
          last_read_message_at: string;
          profile_id_norm: string;
        };
        Insert: {
          floq_id: string;
          role: string;
          joined_at: string;
          profile_id: string;
          last_read_message_at: string;
          profile_id_norm: string;
        };
        Update: {
          floq_id?: string;
          role?: string;
          joined_at?: string;
          profile_id?: string;
          last_read_message_at?: string;
          profile_id_norm?: string;
        };
      };
      floq_ignored: {
        Row: {
          floq_id: string;
          ignored_at: string;
          profile_id: string;
        };
        Insert: {
          floq_id: string;
          ignored_at: string;
          profile_id: string;
        };
        Update: {
          floq_id?: string;
          ignored_at?: string;
          profile_id?: string;
        };
      };
      geofence_data: {
        Row: {
          id: string;
          geofence_id: string;
          center_lat: number;
          center_lng: number;
          radius_meters: number;
          polygon_coordinates: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          geofence_id: string;
          center_lat: number;
          center_lng: number;
          radius_meters: number;
          polygon_coordinates: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          geofence_id?: string;
          center_lat?: number;
          center_lng?: number;
          radius_meters?: number;
          polygon_coordinates?: any;
          created_at?: string;
        };
      };
      plan_feedback: {
        Row: {
          id: string;
          plan_id: string;
          vibe_rating: number;
          favorite_moment: string;
          would_repeat: boolean;
          created_at: string;
          profile_id: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          vibe_rating: number;
          favorite_moment: string;
          would_repeat: boolean;
          created_at?: string;
          profile_id: string;
        };
        Update: {
          id?: string;
          plan_id?: string;
          vibe_rating?: number;
          favorite_moment?: string;
          would_repeat?: boolean;
          created_at?: string;
          profile_id?: string;
        };
      };
      refresh_metrics: {
        Row: {
          id: string;
          view_name: string;
          started_at: string;
          duration_ms: number;
          created_at: string;
          profile_id: string;
        };
        Insert: {
          id?: string;
          view_name: string;
          started_at: string;
          duration_ms: number;
          created_at?: string;
          profile_id: string;
        };
        Update: {
          id?: string;
          view_name?: string;
          started_at?: string;
          duration_ms?: number;
          created_at?: string;
          profile_id?: string;
        };
      };
      proximity_stats: {
        Row: {
          id: string;
          profile_id_a: string;
          profile_id_b: string;
          total_encounters: number;
          total_duration_minutes: number;
          average_distance_meters: number;
          last_encounter: string;
          confidence_score: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id_a: string;
          profile_id_b: string;
          total_encounters: number;
          total_duration_minutes: number;
          average_distance_meters: number;
          last_encounter: string;
          confidence_score: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id_a?: string;
          profile_id_b?: string;
          total_encounters?: number;
          total_duration_minutes?: number;
          average_distance_meters?: number;
          last_encounter?: string;
          confidence_score?: number;
          updated_at?: string;
        };
      };
      raw_locations_staging: {
        Row: {
          captured_at: string;
          lat: number;
          lng: number;
          acc: number;
          profile_id: string;
        };
        Insert: {
          captured_at: string;
          lat: number;
          lng: number;
          acc: number;
          profile_id: string;
        };
        Update: {
          captured_at?: string;
          lat?: number;
          lng?: number;
          acc?: number;
          profile_id?: string;
        };
      };
      v_friend_ids: {
        Row: {
          current_profile_id: string;
          other_profile_id: string;
          is_close: boolean;
          responded_at: string;
        };
        Insert: {
          current_profile_id: string;
          other_profile_id: string;
          is_close: boolean;
          responded_at: string;
        };
        Update: {
          current_profile_id?: string;
          other_profile_id?: string;
          is_close?: boolean;
          responded_at?: string;
        };
      };
      flock_relationships: {
        Row: {
          id: string;
          user_a_id: string;
          user_b_id: string;
          relationship_strength: number;
          last_interaction_at: string;
          interaction_count: number;
          created_at: string;
          updated_at: string;
          profile_id: string;
        };
        Insert: {
          id?: string;
          user_a_id: string;
          user_b_id: string;
          relationship_strength: number;
          last_interaction_at: string;
          interaction_count: number;
          created_at?: string;
          updated_at?: string;
          profile_id: string;
        };
        Update: {
          id?: string;
          user_a_id?: string;
          user_b_id?: string;
          relationship_strength?: number;
          last_interaction_at?: string;
          interaction_count?: number;
          created_at?: string;
          updated_at?: string;
          profile_id?: string;
        };
      };
      presence: {
        Row: {
          profile_id: string;
          venue_id: string;
          vibe: string;
          location: string;
          accuracy_m: number;
          updated_at: string;
          started_at: string;
          vibe_tag: string;
          lat: number;
          lng: number;
          geohash6: string;
          h3_idx: number;
        };
        Insert: {
          profile_id: string;
          venue_id: string;
          vibe: string;
          location: string;
          accuracy_m: number;
          updated_at?: string;
          started_at: string;
          vibe_tag: string;
          lat: number;
          lng: number;
          geohash6: string;
          h3_idx: number;
        };
        Update: {
          profile_id?: string;
          venue_id?: string;
          vibe?: string;
          location?: string;
          accuracy_m?: number;
          updated_at?: string;
          started_at?: string;
          vibe_tag?: string;
          lat?: number;
          lng?: number;
          geohash6?: string;
          h3_idx?: number;
        };
      };
      direct_threads: {
        Row: {
          id: string;
          member_a: string;
          member_b: string;
          created_at: string;
          last_message_at: string;
          last_read_at_a: string;
          last_read_at_b: string;
          unread_a: number;
          unread_b: number;
          profile_id: string;
          member_a_profile_id: string;
          member_b_profile_id: string;
        };
        Insert: {
          id?: string;
          member_a: string;
          member_b: string;
          created_at?: string;
          last_message_at: string;
          last_read_at_a: string;
          last_read_at_b: string;
          unread_a: number;
          unread_b: number;
          profile_id: string;
          member_a_profile_id: string;
          member_b_profile_id: string;
        };
        Update: {
          id?: string;
          member_a?: string;
          member_b?: string;
          created_at?: string;
          last_message_at?: string;
          last_read_at_a?: string;
          last_read_at_b?: string;
          unread_a?: number;
          unread_b?: number;
          profile_id?: string;
          member_a_profile_id?: string;
          member_b_profile_id?: string;
        };
      };
      location_metrics: {
        Row: {
          id: string;
          profile_id: string;
          metric_name: string;
          metric_value: number;
          metadata: any;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          metric_name: string;
          metric_value: number;
          metadata: any;
          recorded_at: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          metric_name?: string;
          metric_value?: number;
          metadata?: any;
          recorded_at?: string;
        };
      };
      dm_message_reactions: {
        Row: {
          message_id: string;
          profile_id: string;
          emoji: string;
          reacted_at: string;
        };
        Insert: {
          message_id: string;
          profile_id: string;
          emoji: string;
          reacted_at: string;
        };
        Update: {
          message_id?: string;
          profile_id?: string;
          emoji?: string;
          reacted_at?: string;
        };
      };
      friend_requests: {
        Row: {
          other_profile_id: string;
          status: string;
          created_at: string;
          responded_at: string;
          id: string;
          profile_id: string;
        };
        Insert: {
          other_profile_id: string;
          status: string;
          created_at?: string;
          responded_at: string;
          id?: string;
          profile_id: string;
        };
        Update: {
          other_profile_id?: string;
          status?: string;
          created_at?: string;
          responded_at?: string;
          id?: string;
          profile_id?: string;
        };
      };
      v_today_venue_discoveries: {
        Row: {
          profile_id: string;
          venue_id: string;
          discovered_at: string;
        };
        Insert: {
          profile_id: string;
          venue_id: string;
          discovered_at: string;
        };
        Update: {
          profile_id?: string;
          venue_id?: string;
          discovered_at?: string;
        };
      };
      vibe_clusters_history: {
        Row: {
          gh6: string;
          total: number;
          snapshot_at: string;
          profile_id: string;
        };
        Insert: {
          gh6: string;
          total: number;
          snapshot_at: string;
          profile_id: string;
        };
        Update: {
          gh6?: string;
          total?: number;
          snapshot_at?: string;
          profile_id?: string;
        };
      };
      afterglow_venues: {
        Row: {
          moment_id: string;
          venue_id: string;
          name: string;
          lat: number;
          lng: number;
          venue_type: string;
          created_at: string;
          profile_id: string;
        };
        Insert: {
          moment_id: string;
          venue_id: string;
          name: string;
          lat: number;
          lng: number;
          venue_type: string;
          created_at?: string;
          profile_id: string;
        };
        Update: {
          moment_id?: string;
          venue_id?: string;
          name?: string;
          lat?: number;
          lng?: number;
          venue_type?: string;
          created_at?: string;
          profile_id?: string;
        };
      };
      location_vibe_patterns: {
        Row: {
          id: string;
          venue_id: string;
          location_hash: string;
          location: string;
          vibe: string;
          confidence: number;
          accuracy: number;
          frequency: number;
          location_context: any;
          temporal_patterns: any;
          first_detected_at: string;
          last_updated_at: string;
          created_at: string;
          profile_id: string;
        };
        Insert: {
          id?: string;
          venue_id: string;
          location_hash: string;
          location: string;
          vibe: string;
          confidence: number;
          accuracy: number;
          frequency: number;
          location_context: any;
          temporal_patterns: any;
          first_detected_at: string;
          last_updated_at: string;
          created_at?: string;
          profile_id: string;
        };
        Update: {
          id?: string;
          venue_id?: string;
          location_hash?: string;
          location?: string;
          vibe?: string;
          confidence?: number;
          accuracy?: number;
          frequency?: number;
          location_context?: any;
          temporal_patterns?: any;
          first_detected_at?: string;
          last_updated_at?: string;
          created_at?: string;
          profile_id?: string;
        };
      };
      event_notifications: {
        Row: {
          id: string;
          kind: string;
          payload: any;
          created_at: string;
          seen_at: string;
          accepted_at: string;
          profile_id: string;
        };
        Insert: {
          id?: string;
          kind: string;
          payload: any;
          created_at?: string;
          seen_at: string;
          accepted_at: string;
          profile_id: string;
        };
        Update: {
          id?: string;
          kind?: string;
          payload?: any;
          created_at?: string;
          seen_at?: string;
          accepted_at?: string;
          profile_id?: string;
        };
      };
      crossed_paths: {
        Row: {
          id: number;
          user_a: string;
          user_b: string;
          venue_id: string;
          ts: string;
          encounter_date: string;
          created_at: string;
          profile_id: string;
        };
        Insert: {
          id?: number;
          user_a: string;
          user_b: string;
          venue_id: string;
          ts: string;
          encounter_date: string;
          created_at?: string;
          profile_id: string;
        };
        Update: {
          id?: number;
          user_a?: string;
          user_b?: string;
          venue_id?: string;
          ts?: string;
          encounter_date?: string;
          created_at?: string;
          profile_id?: string;
        };
      };
      plan_participants: {
        Row: {
          plan_id: string;
          joined_at: string;
          rsvp_status: string;
          invite_type: string;
          reminded_at: string;
          id: string;
          role: string;
          is_guest: boolean;
          guest_name: string;
          guest_email: string;
          guest_phone: string;
          notes: string;
          invited_at: string;
          responded_at: string;
          profile_id: string;
        };
        Insert: {
          plan_id: string;
          joined_at: string;
          rsvp_status: string;
          invite_type: string;
          reminded_at: string;
          id?: string;
          role: string;
          is_guest: boolean;
          guest_name: string;
          guest_email: string;
          guest_phone: string;
          notes: string;
          invited_at: string;
          responded_at: string;
          profile_id: string;
        };
        Update: {
          plan_id?: string;
          joined_at?: string;
          rsvp_status?: string;
          invite_type?: string;
          reminded_at?: string;
          id?: string;
          role?: string;
          is_guest?: boolean;
          guest_name?: string;
          guest_email?: string;
          guest_phone?: string;
          notes?: string;
          invited_at?: string;
          responded_at?: string;
          profile_id?: string;
        };
      };
      floq_activity: {
        Row: {
          id: string;
          floq_id: string;
          plan_id: string;
          guest_name: string;
          kind: string;
          content: string;
          created_at: string;
          profile_id: string;
        };
        Insert: {
          id?: string;
          floq_id: string;
          plan_id: string;
          guest_name: string;
          kind: string;
          content: string;
          created_at?: string;
          profile_id: string;
        };
        Update: {
          id?: string;
          floq_id?: string;
          plan_id?: string;
          guest_name?: string;
          kind?: string;
          content?: string;
          created_at?: string;
          profile_id?: string;
        };
      };
      live_positions: {
        Row: {
          id: string;
          profile_id: string;
          latitude: number;
          longitude: number;
          accuracy: number;
          vibe: string;
          visibility: string;
          last_updated: string;
          expires_at: string;
          created_at: string;
          geog: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          latitude: number;
          longitude: number;
          accuracy: number;
          vibe: string;
          visibility: string;
          last_updated: string;
          expires_at: string;
          created_at?: string;
          geog: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          latitude?: number;
          longitude?: number;
          accuracy?: number;
          vibe?: string;
          visibility?: string;
          last_updated?: string;
          expires_at?: string;
          created_at?: string;
          geog?: string;
        };
      };
      floq_message_reactions: {
        Row: {
          id: string;
          message_id: string;
          emoji: string;
          created_at: string;
          profile_id: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          emoji: string;
          created_at?: string;
          profile_id: string;
        };
        Update: {
          id?: string;
          message_id?: string;
          emoji?: string;
          created_at?: string;
          profile_id?: string;
        };
      };
      plan_votes: {
        Row: {
          id: string;
          plan_id: string;
          stop_id: string;
          vote_type: string;
          emoji_reaction: string;
          comment: string;
          created_at: string;
          updated_at: string;
          guest_name: string;
          profile_id: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          stop_id: string;
          vote_type: string;
          emoji_reaction: string;
          comment: string;
          created_at?: string;
          updated_at?: string;
          guest_name: string;
          profile_id: string;
        };
        Update: {
          id?: string;
          plan_id?: string;
          stop_id?: string;
          vote_type?: string;
          emoji_reaction?: string;
          comment?: string;
          created_at?: string;
          updated_at?: string;
          guest_name?: string;
          profile_id?: string;
        };
      };
      daily_afterglow: {
        Row: {
          id: string;
          date: string;
          dominant_vibe: string;
          vibe_path: any[];
          peak_vibe_time: string;
          energy_score: number;
          social_intensity: number;
          crossed_paths_count: number;
          total_floqs: number;
          total_venues: number;
          emotion_journey: any;
          moments: any;
          summary_text: string;
          is_pinned: boolean;
          created_at: string;
          regenerated_at: string;
          ai_summary: string;
          ai_summary_generated_at: string;
          is_public: boolean;
          is_stale: boolean;
          profile_id: string;
        };
        Insert: {
          id?: string;
          date: string;
          dominant_vibe: string;
          vibe_path: any[];
          peak_vibe_time: string;
          energy_score: number;
          social_intensity: number;
          crossed_paths_count: number;
          total_floqs: number;
          total_venues: number;
          emotion_journey: any;
          moments: any;
          summary_text: string;
          is_pinned: boolean;
          created_at?: string;
          regenerated_at: string;
          ai_summary: string;
          ai_summary_generated_at: string;
          is_public: boolean;
          is_stale: boolean;
          profile_id: string;
        };
        Update: {
          id?: string;
          date?: string;
          dominant_vibe?: string;
          vibe_path?: any[];
          peak_vibe_time?: string;
          energy_score?: number;
          social_intensity?: number;
          crossed_paths_count?: number;
          total_floqs?: number;
          total_venues?: number;
          emotion_journey?: any;
          moments?: any;
          summary_text?: string;
          is_pinned?: boolean;
          created_at?: string;
          regenerated_at?: string;
          ai_summary?: string;
          ai_summary_generated_at?: string;
          is_public?: boolean;
          is_stale?: boolean;
          profile_id?: string;
        };
      };
      plan_activities: {
        Row: {
          id: string;
          plan_id: string;
          activity_type: string;
          entity_id: string;
          entity_type: string;
          metadata: any;
          created_at: string;
          profile_id: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          activity_type: string;
          entity_id: string;
          entity_type: string;
          metadata: any;
          created_at?: string;
          profile_id: string;
        };
        Update: {
          id?: string;
          plan_id?: string;
          activity_type?: string;
          entity_id?: string;
          entity_type?: string;
          metadata?: any;
          created_at?: string;
          profile_id?: string;
        };
      };
      chat_messages: {
        Row: {
          id: string;
          surface: string;
          thread_id: string;
          sender_id: string;
          body: string;
          reply_to_id: string;
          created_at: string;
          edited_at: string;
          deleted_at: string;
          metadata: any;
          profile_id: string;
          message_type: string;
          status: string;
        };
        Insert: {
          id?: string;
          surface: string;
          thread_id: string;
          sender_id: string;
          body: string;
          reply_to_id: string;
          created_at?: string;
          edited_at: string;
          deleted_at: string;
          metadata: any;
          profile_id: string;
          message_type: string;
          status: string;
        };
        Update: {
          id?: string;
          surface?: string;
          thread_id?: string;
          sender_id?: string;
          body?: string;
          reply_to_id?: string;
          created_at?: string;
          edited_at?: string;
          deleted_at?: string;
          metadata?: any;
          profile_id?: string;
          message_type?: string;
          status?: string;
        };
      };
      venues_sync_errors: {
        Row: {
          id: string;
          source: string;
          external_id: string;
          lat: number;
          lng: number;
          reason: string;
          payload: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          source: string;
          external_id: string;
          lat: number;
          lng: number;
          reason: string;
          payload: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          source?: string;
          external_id?: string;
          lat?: number;
          lng?: number;
          reason?: string;
          payload?: any;
          created_at?: string;
        };
      };
      sync_log: {
        Row: {
          id: number;
          kind: string;
          lat: number;
          lng: number;
          ts: string;
          profile_id: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          kind: string;
          lat: number;
          lng: number;
          ts: string;
          profile_id: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          kind?: string;
          lat?: number;
          lng?: number;
          ts?: string;
          profile_id?: string;
          created_at?: string;
        };
      };
      presence_view: {
        Row: {
          profile_id: string;
          display_name: string;
          avatar_url: string;
          lat: number;
          lng: number;
          vibe: string;
          updated_at: string;
        };
        Insert: {
          profile_id: string;
          display_name: string;
          avatar_url: string;
          lat: number;
          lng: number;
          vibe: string;
          updated_at?: string;
        };
        Update: {
          profile_id?: string;
          display_name?: string;
          avatar_url?: string;
          lat?: number;
          lng?: number;
          vibe?: string;
          updated_at?: string;
        };
      };
      shared_location_pins: {
        Row: {
          id: string;
          owner_id: string;
          viewer_id: string;
          geom: string;
          expires_at: string;
          created_at: string;
          profile_id: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          viewer_id: string;
          geom: string;
          expires_at: string;
          created_at?: string;
          profile_id: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          viewer_id?: string;
          geom?: string;
          expires_at?: string;
          created_at?: string;
          profile_id?: string;
        };
      };
      user_preferences: {
        Row: {
          preferred_vibe: string;
          vibe_color: string;
          vibe_strength: number;
          checkin_streak: number;
          favorite_locations: any[];
          feedback_sentiment: any;
          created_at: string;
          updated_at: string;
          declined_plan_types: any;
          prefer_smart_suggestions: boolean;
          vibe_detection_enabled: boolean;
          energy_streak_weeks: number;
          social_streak_weeks: number;
          both_streak_weeks: number;
          onboarding_version: string;
          onboarding_completed_at: string;
          field_enabled: boolean;
          profile_id: string;
        };
        Insert: {
          preferred_vibe: string;
          vibe_color: string;
          vibe_strength: number;
          checkin_streak: number;
          favorite_locations: any[];
          feedback_sentiment: any;
          created_at?: string;
          updated_at?: string;
          declined_plan_types: any;
          prefer_smart_suggestions: boolean;
          vibe_detection_enabled: boolean;
          energy_streak_weeks: number;
          social_streak_weeks: number;
          both_streak_weeks: number;
          onboarding_version: string;
          onboarding_completed_at: string;
          field_enabled: boolean;
          profile_id: string;
        };
        Update: {
          preferred_vibe?: string;
          vibe_color?: string;
          vibe_strength?: number;
          checkin_streak?: number;
          favorite_locations?: any[];
          feedback_sentiment?: any;
          created_at?: string;
          updated_at?: string;
          declined_plan_types?: any;
          prefer_smart_suggestions?: boolean;
          vibe_detection_enabled?: boolean;
          energy_streak_weeks?: number;
          social_streak_weeks?: number;
          both_streak_weeks?: number;
          onboarding_version?: string;
          onboarding_completed_at?: string;
          field_enabled?: boolean;
          profile_id?: string;
        };
      };
      venue_detection_stats: {
        Row: {
          venue_id: string;
          total_signatures: number;
          avg_confidence: number;
          last_detection: string;
          signal_types_count: number;
        };
        Insert: {
          venue_id: string;
          total_signatures: number;
          avg_confidence: number;
          last_detection: string;
          signal_types_count: number;
        };
        Update: {
          venue_id?: string;
          total_signatures?: number;
          avg_confidence?: number;
          last_detection?: string;
          signal_types_count?: number;
        };
      };
      notification_queue: {
        Row: {
          id: string;
          event_type: string;
          payload: any;
          status: string;
          created_at: string;
          processed_at: string;
          profile_id: string;
        };
        Insert: {
          id?: string;
          event_type: string;
          payload: any;
          status: string;
          created_at?: string;
          processed_at: string;
          profile_id: string;
        };
        Update: {
          id?: string;
          event_type?: string;
          payload?: any;
          status?: string;
          created_at?: string;
          processed_at?: string;
          profile_id?: string;
        };
      };
      user_achievements: {
        Row: {
          code: string;
          progress: number;
          earned_at: string;
          profile_id: string;
        };
        Insert: {
          code: string;
          progress: number;
          earned_at: string;
          profile_id: string;
        };
        Update: {
          code?: string;
          progress?: number;
          earned_at?: string;
          profile_id?: string;
        };
      };
      user_onboarding_progress: {
        Row: {
          id: string;
          onboarding_version: string;
          current_step: number;
          selected_vibe: string;
          profile_data: any;
          avatar_url: string;
          started_at: string;
          updated_at: string;
          completed_at: string;
          created_at: string;
          completed_steps: any[];
          profile_id: string;
        };
        Insert: {
          id?: string;
          onboarding_version: string;
          current_step: number;
          selected_vibe: string;
          profile_data: any;
          avatar_url: string;
          started_at: string;
          updated_at?: string;
          completed_at: string;
          created_at?: string;
          completed_steps: any[];
          profile_id: string;
        };
        Update: {
          id?: string;
          onboarding_version?: string;
          current_step?: number;
          selected_vibe?: string;
          profile_data?: any;
          avatar_url?: string;
          started_at?: string;
          updated_at?: string;
          completed_at?: string;
          created_at?: string;
          completed_steps?: any[];
          profile_id?: string;
        };
      };
      vibe_similarity: {
        Row: {
          vibe_low: string;
          vibe_high: string;
          score: number;
          profile_id: string;
        };
        Insert: {
          vibe_low: string;
          vibe_high: string;
          score: number;
          profile_id: string;
        };
        Update: {
          vibe_low?: string;
          vibe_high?: string;
          score?: number;
          profile_id?: string;
        };
      };
      floq_message_mentions: {
        Row: {
          message_id: string;
          target_type: string;
          target_id: string;
          start_idx: number;
          end_idx: number;
          created_at: string;
          profile_id: string;
        };
        Insert: {
          message_id: string;
          target_type: string;
          target_id: string;
          start_idx: number;
          end_idx: number;
          created_at?: string;
          profile_id: string;
        };
        Update: {
          message_id?: string;
          target_type?: string;
          target_id?: string;
          start_idx?: number;
          end_idx?: number;
          created_at?: string;
          profile_id?: string;
        };
      };
      friend_trails: {
        Row: {
          ts: string;
          lat: number;
          lng: number;
          profile_id: string;
        };
        Insert: {
          ts: string;
          lat: number;
          lng: number;
          profile_id: string;
        };
        Update: {
          ts?: string;
          lat?: number;
          lng?: number;
          profile_id?: string;
        };
      };
      plan_share_links: {
        Row: {
          id: string;
          plan_id: string;
          slug: string;
          created_at: string;
          created_by: string;
          click_count: number;
          last_accessed_at: string;
          profile_id: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          slug: string;
          created_at?: string;
          created_by: string;
          click_count: number;
          last_accessed_at: string;
          profile_id: string;
        };
        Update: {
          id?: string;
          plan_id?: string;
          slug?: string;
          created_at?: string;
          created_by?: string;
          click_count?: number;
          last_accessed_at?: string;
          profile_id?: string;
        };
      };
      plan_floqs: {
        Row: {
          plan_id: string;
          floq_id: string;
          auto_disband: boolean;
          created_at: string;
          profile_id: string;
        };
        Insert: {
          plan_id: string;
          floq_id: string;
          auto_disband: boolean;
          created_at?: string;
          profile_id: string;
        };
        Update: {
          plan_id?: string;
          floq_id?: string;
          auto_disband?: boolean;
          created_at?: string;
          profile_id?: string;
        };
      };
      friend_share_pref: {
        Row: {
          other_profile_id: string;
          is_live: boolean;
          updated_at: string;
          ends_at: string;
          profile_id: string;
          auto_when: any[];
          target_profile_id: string;
        };
        Insert: {
          other_profile_id: string;
          is_live: boolean;
          updated_at?: string;
          ends_at: string;
          profile_id: string;
          auto_when: any[];
          target_profile_id: string;
        };
        Update: {
          other_profile_id?: string;
          is_live?: boolean;
          updated_at?: string;
          ends_at?: string;
          profile_id?: string;
          auto_when?: any[];
          target_profile_id?: string;
        };
      };
      user_watchlist: {
        Row: {
          plan_id: string;
          created_at: string;
          profile_id: string;
        };
        Insert: {
          plan_id: string;
          created_at?: string;
          profile_id: string;
        };
        Update: {
          plan_id?: string;
          created_at?: string;
          profile_id?: string;
        };
      };
      geometry_columns: {
        Row: {
          f_table_catalog: string;
          f_table_schema: string;
          f_table_name: string;
          f_geometry_column: string;
          coord_dimension: number;
          srid: number;
          type: string;
        };
        Insert: {
          f_table_catalog: string;
          f_table_schema: string;
          f_table_name: string;
          f_geometry_column: string;
          coord_dimension: number;
          srid: number;
          type: string;
        };
        Update: {
          f_table_catalog?: string;
          f_table_schema?: string;
          f_table_name?: string;
          f_geometry_column?: string;
          coord_dimension?: number;
          srid?: number;
          type?: string;
        };
      };
      user_action_log: {
        Row: {
          action: string;
          happened_at: string;
          profile_id: string;
        };
        Insert: {
          action: string;
          happened_at: string;
          profile_id: string;
        };
        Update: {
          action?: string;
          happened_at?: string;
          profile_id?: string;
        };
      };
      v_active_users: {
        Row: {
          profile_id: string;
          lat: number;
          lng: number;
          vibe: string;
          updated_at: string;
        };
        Insert: {
          profile_id: string;
          lat: number;
          lng: number;
          vibe: string;
          updated_at?: string;
        };
        Update: {
          profile_id?: string;
          lat?: number;
          lng?: number;
          vibe?: string;
          updated_at?: string;
        };
      };
      venue_feed_posts: {
        Row: {
          id: string;
          venue_id: string;
          content_type: string;
          storage_path: string;
          text_content: string;
          vibe: string;
          mood_tags: any[];
          location: string;
          created_at: string;
          expires_at: string;
          view_count: number;
          reaction_count: number;
          profile_id: string;
        };
        Insert: {
          id?: string;
          venue_id: string;
          content_type: string;
          storage_path: string;
          text_content: string;
          vibe: string;
          mood_tags: any[];
          location: string;
          created_at?: string;
          expires_at: string;
          view_count: number;
          reaction_count: number;
          profile_id: string;
        };
        Update: {
          id?: string;
          venue_id?: string;
          content_type?: string;
          storage_path?: string;
          text_content?: string;
          vibe?: string;
          mood_tags?: any[];
          location?: string;
          created_at?: string;
          expires_at?: string;
          view_count?: number;
          reaction_count?: number;
          profile_id?: string;
        };
      };
      reserved_usernames: {
        Row: {
          name: string;
          profile_id: string;
        };
        Insert: {
          name: string;
          profile_id: string;
        };
        Update: {
          name?: string;
          profile_id?: string;
        };
      };
      v_discover_profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string;
          avatar_url: string;
          req_status: string;
        };
        Insert: {
          id?: string;
          username: string;
          display_name: string;
          avatar_url: string;
          req_status: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string;
          avatar_url?: string;
          req_status?: string;
        };
      };
      afterglow_collections: {
        Row: {
          id: string;
          name: string;
          description: string;
          color: string;
          created_at: string;
          updated_at: string;
          profile_id: string;
        };
        Insert: {
          id?: string;
          name: string;
          description: string;
          color: string;
          created_at?: string;
          updated_at?: string;
          profile_id: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          color?: string;
          created_at?: string;
          updated_at?: string;
          profile_id?: string;
        };
      };
      circuit_breaker_state: {
        Row: {
          id: string;
          state: string;
          failure_count: number;
          success_count: number;
          last_failure_time: string;
          next_attempt_time: string;
          metadata: any;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          state: string;
          failure_count: number;
          success_count: number;
          last_failure_time: string;
          next_attempt_time: string;
          metadata: any;
          recorded_at: string;
        };
        Update: {
          id?: string;
          state?: string;
          failure_count?: number;
          success_count?: number;
          last_failure_time?: string;
          next_attempt_time?: string;
          metadata?: any;
          recorded_at?: string;
        };
      };
      auto_checkin_attempts: {
        Row: {
          id: string;
          profile_id: string;
          venue_id: string;
          attempted_at: string;
          success: boolean;
          detection_method: string;
          confidence_score: number;
          error_reason: string;
          location_lat: number;
          location_lng: number;
          location_accuracy: number;
        };
        Insert: {
          id?: string;
          profile_id: string;
          venue_id: string;
          attempted_at: string;
          success: boolean;
          detection_method: string;
          confidence_score: number;
          error_reason: string;
          location_lat: number;
          location_lng: number;
          location_accuracy: number;
        };
        Update: {
          id?: string;
          profile_id?: string;
          venue_id?: string;
          attempted_at?: string;
          success?: boolean;
          detection_method?: string;
          confidence_score?: number;
          error_reason?: string;
          location_lat?: number;
          location_lng?: number;
          location_accuracy?: number;
        };
      };
      v_profiles: {
        Row: {
          id: string;
          profile_id: string;
          username: string;
          display_name: string;
          full_name: string;
          first_name: string;
          last_name: string;
          email: string;
          avatar_url: string;
          bio: string;
          interests: any[];
          custom_status: string;
          vibe_preference: string;
          live_scope: string;
          live_accuracy: string;
          live_auto_when: any[];
          live_muted_until: string;
          live_smart_flags: any;
          profile_created: boolean;
          push_token: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          username: string;
          display_name: string;
          full_name: string;
          first_name: string;
          last_name: string;
          email: string;
          avatar_url: string;
          bio: string;
          interests: any[];
          custom_status: string;
          vibe_preference: string;
          live_scope: string;
          live_accuracy: string;
          live_auto_when: any[];
          live_muted_until: string;
          live_smart_flags: any;
          profile_created: boolean;
          push_token: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          username?: string;
          display_name?: string;
          full_name?: string;
          first_name?: string;
          last_name?: string;
          email?: string;
          avatar_url?: string;
          bio?: string;
          interests?: any[];
          custom_status?: string;
          vibe_preference?: string;
          live_scope?: string;
          live_accuracy?: string;
          live_auto_when?: any[];
          live_muted_until?: string;
          live_smart_flags?: any;
          profile_created?: boolean;
          push_token?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      leaderboard_cache: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string;
          checkins_30d: number;
        };
        Insert: {
          id?: string;
          display_name: string;
          avatar_url: string;
          checkins_30d: number;
        };
        Update: {
          id?: string;
          display_name?: string;
          avatar_url?: string;
          checkins_30d?: number;
        };
      };
      v_friend_visits: {
        Row: {
          venue_id: string;
          friend_pairs: any;
        };
        Insert: {
          venue_id: string;
          friend_pairs: any;
        };
        Update: {
          venue_id?: string;
          friend_pairs?: any;
        };
      };
      v_encounter_heat: {
        Row: {
          venue_id: string;
          hits: number;
          last_seen: string;
          geom: string;
        };
        Insert: {
          venue_id: string;
          hits: number;
          last_seen: string;
          geom: string;
        };
        Update: {
          venue_id?: string;
          hits?: number;
          last_seen?: string;
          geom?: string;
        };
      };
      plan_comments: {
        Row: {
          id: string;
          plan_id: string;
          stop_id: string;
          content: string;
          mentioned_users: any[];
          reply_to_id: string;
          created_at: string;
          updated_at: string;
          profile_id: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          stop_id: string;
          content: string;
          mentioned_users: any[];
          reply_to_id: string;
          created_at?: string;
          updated_at?: string;
          profile_id: string;
        };
        Update: {
          id?: string;
          plan_id?: string;
          stop_id?: string;
          content?: string;
          mentioned_users?: any[];
          reply_to_id?: string;
          created_at?: string;
          updated_at?: string;
          profile_id?: string;
        };
      };
      location_requests: {
        Row: {
          id: string;
          requester_id: string;
          target_id: string;
          message: string;
          status: string;
          created_at: string;
          expires_at: string;
          response_location: string;
          responded_at: string;
        };
        Insert: {
          id?: string;
          requester_id: string;
          target_id: string;
          message: string;
          status: string;
          created_at?: string;
          expires_at: string;
          response_location: string;
          responded_at: string;
        };
        Update: {
          id?: string;
          requester_id?: string;
          target_id?: string;
          message?: string;
          status?: string;
          created_at?: string;
          expires_at?: string;
          response_location?: string;
          responded_at?: string;
        };
      };
      ping_requests: {
        Row: {
          id: string;
          requester_id: string;
          target_id: string;
          requested_at: string;
          status: string;
          responded_at: string;
          profile_id: string;
        };
        Insert: {
          id?: string;
          requester_id: string;
          target_id: string;
          requested_at: string;
          status: string;
          responded_at: string;
          profile_id: string;
        };
        Update: {
          id?: string;
          requester_id?: string;
          target_id?: string;
          requested_at?: string;
          status?: string;
          responded_at?: string;
          profile_id?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string;
          created_at: string;
          username: string;
          bio: string;
          interests: any[];
          custom_status: string;
          first_name: string;
          last_name: string;
          push_token: string;
          full_name: string;
          email: string;
          vibe_preference: string;
          profile_created: boolean;
          profile_id: string;
          updated_at: string;
          live_muted_until: string;
          live_scope: string;
          live_auto_when: any[];
          live_accuracy: string;
          live_smart_flags: any;
          is_searchable: boolean;
          search_vec: string;
        };
        Insert: {
          id?: string;
          display_name: string;
          avatar_url: string;
          created_at?: string;
          username: string;
          bio: string;
          interests: any[];
          custom_status: string;
          first_name: string;
          last_name: string;
          push_token: string;
          full_name: string;
          email: string;
          vibe_preference: string;
          profile_created: boolean;
          profile_id: string;
          updated_at?: string;
          live_muted_until: string;
          live_scope: string;
          live_auto_when: any[];
          live_accuracy: string;
          live_smart_flags: any;
          is_searchable: boolean;
          search_vec: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          avatar_url?: string;
          created_at?: string;
          username?: string;
          bio?: string;
          interests?: any[];
          custom_status?: string;
          first_name?: string;
          last_name?: string;
          push_token?: string;
          full_name?: string;
          email?: string;
          vibe_preference?: string;
          profile_created?: boolean;
          profile_id?: string;
          updated_at?: string;
          live_muted_until?: string;
          live_scope?: string;
          live_auto_when?: any[];
          live_accuracy?: string;
          live_smart_flags?: any;
          is_searchable?: boolean;
          search_vec?: string;
        };
      };
      user_venue_interactions: {
        Row: {
          id: string;
          profile_id: string;
          venue_id: string;
          interaction_type: string;
          interaction_count: number;
          last_interaction_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          venue_id: string;
          interaction_type: string;
          interaction_count: number;
          last_interaction_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          venue_id?: string;
          interaction_type?: string;
          interaction_count?: number;
          last_interaction_at?: string;
          created_at?: string;
        };
      };
      vibe_clusters_checksum: {
        Row: {
          id: number;
          checksum: string;
          profile_id: string;
        };
        Insert: {
          id?: number;
          checksum: string;
          profile_id: string;
        };
        Update: {
          id?: number;
          checksum?: string;
          profile_id?: string;
        };
      };
      event_areas: {
        Row: {
          id: string;
          name: string;
          lat: number;
          lng: number;
          radius_m: number;
          vibe: string;
          starts_at: string;
          ends_at: string;
          shape: string;
          profile_id: string;
        };
        Insert: {
          id?: string;
          name: string;
          lat: number;
          lng: number;
          radius_m: number;
          vibe: string;
          starts_at: string;
          ends_at: string;
          shape: string;
          profile_id: string;
        };
        Update: {
          id?: string;
          name?: string;
          lat?: number;
          lng?: number;
          radius_m?: number;
          vibe?: string;
          starts_at?: string;
          ends_at?: string;
          shape?: string;
          profile_id?: string;
        };
      };
      snap_suggestion_logs: {
        Row: {
          id: string;
          plan_id: string;
          stop_id: string;
          used_at: string;
          original_time: string;
          snapped_time: string;
          confidence: number;
          reason: string;
          source: string;
          profile_id: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          stop_id: string;
          used_at: string;
          original_time: string;
          snapped_time: string;
          confidence: number;
          reason: string;
          source: string;
          profile_id: string;
        };
        Update: {
          id?: string;
          plan_id?: string;
          stop_id?: string;
          used_at?: string;
          original_time?: string;
          snapped_time?: string;
          confidence?: number;
          reason?: string;
          source?: string;
          profile_id?: string;
        };
      };
      weekly_ai_suggestions: {
        Row: {
          week_ending: string;
          json: any;
          created_at: string;
          profile_id: string;
        };
        Insert: {
          week_ending: string;
          json: any;
          created_at?: string;
          profile_id: string;
        };
        Update: {
          week_ending?: string;
          json?: any;
          created_at?: string;
          profile_id?: string;
        };
      };
      venue_clusters: {
        Row: {
          id: string;
          name: string;
          boundary: string;
          cluster_type: string;
          venue_count: number;
          active_hours: string;
          created_at: string;
          profile_id: string;
        };
        Insert: {
          id?: string;
          name: string;
          boundary: string;
          cluster_type: string;
          venue_count: number;
          active_hours: string;
          created_at?: string;
          profile_id: string;
        };
        Update: {
          id?: string;
          name?: string;
          boundary?: string;
          cluster_type?: string;
          venue_count?: number;
          active_hours?: string;
          created_at?: string;
          profile_id?: string;
        };
      };
      venue_presence_snapshot: {
        Row: {
          venue_id: string;
          people_now: number;
          dominant_vibe: string;
          updated_at: string;
        };
        Insert: {
          venue_id: string;
          people_now: number;
          dominant_vibe: string;
          updated_at?: string;
        };
        Update: {
          venue_id?: string;
          people_now?: number;
          dominant_vibe?: string;
          updated_at?: string;
        };
      };
      plan_check_ins: {
        Row: {
          id: string;
          plan_id: string;
          stop_id: string;
          participant_id: string;
          checked_in_at: string;
          checked_out_at: string;
          location: string;
          created_at: string;
          device_id: string;
          geo_hash: string;
          profile_id: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          stop_id: string;
          participant_id: string;
          checked_in_at: string;
          checked_out_at: string;
          location: string;
          created_at?: string;
          device_id: string;
          geo_hash: string;
          profile_id: string;
        };
        Update: {
          id?: string;
          plan_id?: string;
          stop_id?: string;
          participant_id?: string;
          checked_in_at?: string;
          checked_out_at?: string;
          location?: string;
          created_at?: string;
          device_id?: string;
          geo_hash?: string;
          profile_id?: string;
        };
      };
      user_action_limits: {
        Row: {
          id: string;
          profile_id: string;
          action_type: string;
          count: number;
          window_start: string;
          target_profile_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          action_type: string;
          count: number;
          window_start: string;
          target_profile_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          action_type?: string;
          count?: number;
          window_start?: string;
          target_profile_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      achievements: {
        Row: {
          id: string;
          achievement_type: string;
          earned_at: string;
          metadata: any;
          profile_id: string;
        };
        Insert: {
          id?: string;
          achievement_type: string;
          earned_at: string;
          metadata: any;
          profile_id: string;
        };
        Update: {
          id?: string;
          achievement_type?: string;
          earned_at?: string;
          metadata?: any;
          profile_id?: string;
        };
      };
      afterglow_moments: {
        Row: {
          id: string;
          daily_afterglow_id: string;
          moment_type: string;
          timestamp: string;
          title: string;
          description: string;
          color: string;
          metadata: any;
          created_at: string;
          location_geom: string;
          profile_id: string;
        };
        Insert: {
          id?: string;
          daily_afterglow_id: string;
          moment_type: string;
          timestamp: string;
          title: string;
          description: string;
          color: string;
          metadata: any;
          created_at?: string;
          location_geom: string;
          profile_id: string;
        };
        Update: {
          id?: string;
          daily_afterglow_id?: string;
          moment_type?: string;
          timestamp?: string;
          title?: string;
          description?: string;
          color?: string;
          metadata?: any;
          created_at?: string;
          location_geom?: string;
          profile_id?: string;
        };
      };
      plan_ai_summaries: {
        Row: {
          plan_id: string;
          summary_md: string;
          suggestions: any;
          status: string;
          error_message: string;
          created_at: string;
          updated_at: string;
          profile_id: string;
        };
        Insert: {
          plan_id: string;
          summary_md: string;
          suggestions: any;
          status: string;
          error_message: string;
          created_at?: string;
          updated_at?: string;
          profile_id: string;
        };
        Update: {
          plan_id?: string;
          summary_md?: string;
          suggestions?: any;
          status?: string;
          error_message?: string;
          created_at?: string;
          updated_at?: string;
          profile_id?: string;
        };
      };
      location_performance_metrics: {
        Row: {
          id: string;
          operation_type: string;
          duration_ms: number;
          success: boolean;
          error_message: string;
          metadata: any;
          recorded_at: string;
          profile_id: string;
        };
        Insert: {
          id?: string;
          operation_type: string;
          duration_ms: number;
          success: boolean;
          error_message: string;
          metadata: any;
          recorded_at: string;
          profile_id: string;
        };
        Update: {
          id?: string;
          operation_type?: string;
          duration_ms?: number;
          success?: boolean;
          error_message?: string;
          metadata?: any;
          recorded_at?: string;
          profile_id?: string;
        };
      };
      floq_plans: {
        Row: {
          id: string;
          floq_id: string;
          creator_id: string;
          title: string;
          description: string;
          planned_at: string;
          end_at: string;
          location: string;
          max_participants: number;
          status: string;
          created_at: string;
          updated_at: string;
          budget_per_person: number;
          total_budget: number;
          vibe_tags: any[];
          collaboration_status: string;
          start_time: string;
          end_time: string;
          duration_hours: number;
          archived_at: string;
          current_stop_id: string;
          execution_started_at: string;
          vibe_tag: string;
          plan_mode: string;
          locked_at: string;
          finalized_by: string;
          plan_summary: string;
          finished_at: string;
          profile_id: string;
        };
        Insert: {
          id?: string;
          floq_id: string;
          creator_id: string;
          title: string;
          description: string;
          planned_at: string;
          end_at: string;
          location: string;
          max_participants: number;
          status: string;
          created_at?: string;
          updated_at?: string;
          budget_per_person: number;
          total_budget: number;
          vibe_tags: any[];
          collaboration_status: string;
          start_time: string;
          end_time: string;
          duration_hours: number;
          archived_at: string;
          current_stop_id: string;
          execution_started_at: string;
          vibe_tag: string;
          plan_mode: string;
          locked_at: string;
          finalized_by: string;
          plan_summary: string;
          finished_at: string;
          profile_id: string;
        };
        Update: {
          id?: string;
          floq_id?: string;
          creator_id?: string;
          title?: string;
          description?: string;
          planned_at?: string;
          end_at?: string;
          location?: string;
          max_participants?: number;
          status?: string;
          created_at?: string;
          updated_at?: string;
          budget_per_person?: number;
          total_budget?: number;
          vibe_tags?: any[];
          collaboration_status?: string;
          start_time?: string;
          end_time?: string;
          duration_hours?: number;
          archived_at?: string;
          current_stop_id?: string;
          execution_started_at?: string;
          vibe_tag?: string;
          plan_mode?: string;
          locked_at?: string;
          finalized_by?: string;
          plan_summary?: string;
          finished_at?: string;
          profile_id?: string;
        };
      };
      user_push_tokens: {
        Row: {
          device_id: string;
          token: string;
          platform: string;
          last_seen_at: string;
          badge_count: number;
          profile_id: string;
        };
        Insert: {
          device_id: string;
          token: string;
          platform: string;
          last_seen_at: string;
          badge_count: number;
          profile_id: string;
        };
        Update: {
          device_id?: string;
          token?: string;
          platform?: string;
          last_seen_at?: string;
          badge_count?: number;
          profile_id?: string;
        };
      };
      v_user_plans: {
        Row: {
          profile_id: string;
          plan_id: string;
          title: string;
          starts_at: string;
          ends_at: string;
          vibe_tag: string;
          status: string;
          role: string;
          owner: any;
        };
        Insert: {
          profile_id: string;
          plan_id: string;
          title: string;
          starts_at: string;
          ends_at: string;
          vibe_tag: string;
          status: string;
          role: string;
          owner: any;
        };
        Update: {
          profile_id?: string;
          plan_id?: string;
          title?: string;
          starts_at?: string;
          ends_at?: string;
          vibe_tag?: string;
          status?: string;
          role?: string;
          owner?: any;
        };
      };
      proximity_performance_stats: {
        Row: {
          table_name: string;
          total_records: number;
          records_last_24h: number;
          records_last_hour: number;
          avg_confidence: number;
          unique_profiles_a: number;
          unique_profiles_b: number;
        };
        Insert: {
          table_name: string;
          total_records: number;
          records_last_24h: number;
          records_last_hour: number;
          avg_confidence: number;
          unique_profiles_a: number;
          unique_profiles_b: number;
        };
        Update: {
          table_name?: string;
          total_records?: number;
          records_last_24h?: number;
          records_last_hour?: number;
          avg_confidence?: number;
          unique_profiles_a?: number;
          unique_profiles_b?: number;
        };
      };
      plan_invites: {
        Row: {
          plan_id: string;
          status: string;
          inserted_at: string;
          updated_at: string;
          profile_id: string;
        };
        Insert: {
          plan_id: string;
          status: string;
          inserted_at: string;
          updated_at?: string;
          profile_id: string;
        };
        Update: {
          plan_id?: string;
          status?: string;
          inserted_at?: string;
          updated_at?: string;
          profile_id?: string;
        };
      };
      edge_invocation_logs: {
        Row: {
          id: string;
          function_name: string;
          status: string;
          duration_ms: number;
          error_message: string;
          metadata: any;
          created_at: string;
          profile_id: string;
        };
        Insert: {
          id?: string;
          function_name: string;
          status: string;
          duration_ms: number;
          error_message: string;
          metadata: any;
          created_at?: string;
          profile_id: string;
        };
        Update: {
          id?: string;
          function_name?: string;
          status?: string;
          duration_ms?: number;
          error_message?: string;
          metadata?: any;
          created_at?: string;
          profile_id?: string;
        };
      };
      function_rewrite_log: {
        Row: {
          id: number;
          schema_name: string;
          function_name: string;
          original_definition: string;
          new_definition: string;
          rewritten_at: string;
        };
        Insert: {
          id?: number;
          schema_name: string;
          function_name: string;
          original_definition: string;
          new_definition: string;
          rewritten_at: string;
        };
        Update: {
          id?: number;
          schema_name?: string;
          function_name?: string;
          original_definition?: string;
          new_definition?: string;
          rewritten_at?: string;
        };
      };
      v_trending_venues: {
        Row: {
          venue_id: string;
          people_now: number;
          visits_15m: number;
          trend_score: number;
          last_seen_at: string;
        };
        Insert: {
          venue_id: string;
          people_now: number;
          visits_15m: number;
          trend_score: number;
          last_seen_at: string;
        };
        Update: {
          venue_id?: string;
          people_now?: number;
          visits_15m?: number;
          trend_score?: number;
          last_seen_at?: string;
        };
      };
      afterglow_favorites: {
        Row: {
          id: string;
          daily_afterglow_id: string;
          created_at: string;
          profile_id: string;
        };
        Insert: {
          id?: string;
          daily_afterglow_id: string;
          created_at?: string;
          profile_id: string;
        };
        Update: {
          id?: string;
          daily_afterglow_id?: string;
          created_at?: string;
          profile_id?: string;
        };
      };
      flock_auto_suggestions: {
        Row: {
          id: string;
          suggestion_type: string;
          target_floq_id: string;
          suggested_users: any[];
          confidence_score: number;
          reasoning_data: any;
          status: string;
          expires_at: string;
          created_at: string;
          updated_at: string;
          profile_id: string;
        };
        Insert: {
          id?: string;
          suggestion_type: string;
          target_floq_id: string;
          suggested_users: any[];
          confidence_score: number;
          reasoning_data: any;
          status: string;
          expires_at: string;
          created_at?: string;
          updated_at?: string;
          profile_id: string;
        };
        Update: {
          id?: string;
          suggestion_type?: string;
          target_floq_id?: string;
          suggested_users?: any[];
          confidence_score?: number;
          reasoning_data?: any;
          status?: string;
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
          profile_id?: string;
        };
      };
      venue_stays: {
        Row: {
          id: number;
          venue_id: string;
          arrived_at: string;
          departed_at: string;
          distance_m: number;
          created_at: string;
          profile_id: string;
        };
        Insert: {
          id?: number;
          venue_id: string;
          arrived_at: string;
          departed_at: string;
          distance_m: number;
          created_at?: string;
          profile_id: string;
        };
        Update: {
          id?: number;
          venue_id?: string;
          arrived_at?: string;
          departed_at?: string;
          distance_m?: number;
          created_at?: string;
          profile_id?: string;
        };
      };
      field_tiles: {
        Row: {
          tile_id: string;
          crowd_count: number;
          avg_vibe: any;
          active_floq_ids: any[];
          updated_at: string;
          profile_id: string;
          h3_7: string;
        };
        Insert: {
          tile_id: string;
          crowd_count: number;
          avg_vibe: any;
          active_floq_ids: any[];
          updated_at?: string;
          profile_id: string;
          h3_7: string;
        };
        Update: {
          tile_id?: string;
          crowd_count?: number;
          avg_vibe?: any;
          active_floq_ids?: any[];
          updated_at?: string;
          profile_id?: string;
          h3_7?: string;
        };
      };
      v_venue_people_now: {
        Row: {
          venue_id: string;
          people_now: number;
          last_seen_at: string;
        };
        Insert: {
          venue_id: string;
          people_now: number;
          last_seen_at: string;
        };
        Update: {
          venue_id?: string;
          people_now?: number;
          last_seen_at?: string;
        };
      };
      plan_transit_cache: {
        Row: {
          id: string;
          plan_id: string;
          from_stop_id: string;
          to_stop_id: string;
          transit_data: any;
          duration_seconds: number;
          distance_meters: number;
          created_at: string;
          updated_at: string;
          from_geom: string;
          to_geom: string;
          profile_id: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          from_stop_id: string;
          to_stop_id: string;
          transit_data: any;
          duration_seconds: number;
          distance_meters: number;
          created_at?: string;
          updated_at?: string;
          from_geom: string;
          to_geom: string;
          profile_id: string;
        };
        Update: {
          id?: string;
          plan_id?: string;
          from_stop_id?: string;
          to_stop_id?: string;
          transit_data?: any;
          duration_seconds?: number;
          distance_meters?: number;
          created_at?: string;
          updated_at?: string;
          from_geom?: string;
          to_geom?: string;
          profile_id?: string;
        };
      };
      v_friends_flat: {
        Row: {
          profile_low: string;
          profile_high: string;
          friend_state: string;
          created_at: string;
          responded_at: string;
          is_close: boolean;
        };
        Insert: {
          profile_low: string;
          profile_high: string;
          friend_state: string;
          created_at?: string;
          responded_at: string;
          is_close: boolean;
        };
        Update: {
          profile_low?: string;
          profile_high?: string;
          friend_state?: string;
          created_at?: string;
          responded_at?: string;
          is_close?: boolean;
        };
      };
      v_public_floqs: {
        Row: {
          id: string;
          creator_id: string;
          title: string;
          location: string;
          catchment_area: string;
          walkable_zone: string;
          primary_vibe: string;
          starts_at: string;
          ends_at: string;
          max_participants: number;
          visibility: string;
          created_at: string;
          geo: string;
          radius_m: number;
          name: string;
          type: string;
          vibe_tag: string;
          expires_at: string;
          updated_at: string;
          flock_type: string;
          parent_flock_id: string;
          recurrence_pattern: any;
          flock_tags: any[];
          auto_created: boolean;
          activity_score: number;
          last_activity_at: string;
          deleted_at: string;
          description: string;
          pinned_note: string;
          archived_at: string;
          profile_id: string;
        };
        Insert: {
          id?: string;
          creator_id: string;
          title: string;
          location: string;
          catchment_area: string;
          walkable_zone: string;
          primary_vibe: string;
          starts_at: string;
          ends_at: string;
          max_participants: number;
          visibility: string;
          created_at?: string;
          geo: string;
          radius_m: number;
          name: string;
          type: string;
          vibe_tag: string;
          expires_at: string;
          updated_at?: string;
          flock_type: string;
          parent_flock_id: string;
          recurrence_pattern: any;
          flock_tags: any[];
          auto_created: boolean;
          activity_score: number;
          last_activity_at: string;
          deleted_at: string;
          description: string;
          pinned_note: string;
          archived_at: string;
          profile_id: string;
        };
        Update: {
          id?: string;
          creator_id?: string;
          title?: string;
          location?: string;
          catchment_area?: string;
          walkable_zone?: string;
          primary_vibe?: string;
          starts_at?: string;
          ends_at?: string;
          max_participants?: number;
          visibility?: string;
          created_at?: string;
          geo?: string;
          radius_m?: number;
          name?: string;
          type?: string;
          vibe_tag?: string;
          expires_at?: string;
          updated_at?: string;
          flock_type?: string;
          parent_flock_id?: string;
          recurrence_pattern?: any;
          flock_tags?: any[];
          auto_created?: boolean;
          activity_score?: number;
          last_activity_at?: string;
          deleted_at?: string;
          description?: string;
          pinned_note?: string;
          archived_at?: string;
          profile_id?: string;
        };
      };
      floq_participants: {
        Row: {
          floq_id: string;
          role: string;
          joined_at: string;
          profile_id: string;
          last_read_message_at: string;
        };
        Insert: {
          floq_id: string;
          role: string;
          joined_at: string;
          profile_id: string;
          last_read_message_at: string;
        };
        Update: {
          floq_id?: string;
          role?: string;
          joined_at?: string;
          profile_id?: string;
          last_read_message_at?: string;
        };
      };
      geography_columns: {
        Row: {
          f_table_catalog: string;
          f_table_schema: string;
          f_table_name: string;
          f_geography_column: string;
          coord_dimension: number;
          srid: number;
          type: string;
        };
        Insert: {
          f_table_catalog: string;
          f_table_schema: string;
          f_table_name: string;
          f_geography_column: string;
          coord_dimension: number;
          srid: number;
          type: string;
        };
        Update: {
          f_table_catalog?: string;
          f_table_schema?: string;
          f_table_name?: string;
          f_geography_column?: string;
          coord_dimension?: number;
          srid?: number;
          type?: string;
        };
      };
      v_chat_message: {
        Row: {
          id: string;
          floq_id: string;
          sender_id: string;
          body: string;
          emoji: string;
          created_at: string;
          status: string;
          delivery_state: string;
          mentions: any;
        };
        Insert: {
          id?: string;
          floq_id: string;
          sender_id: string;
          body: string;
          emoji: string;
          created_at?: string;
          status: string;
          delivery_state: string;
          mentions: any;
        };
        Update: {
          id?: string;
          floq_id?: string;
          sender_id?: string;
          body?: string;
          emoji?: string;
          created_at?: string;
          status?: string;
          delivery_state?: string;
          mentions?: any;
        };
      };
      proximity_events: {
        Row: {
          id: string;
          profile_id_a: string;
          profile_id_b: string;
          event_ts: string;
          event_type: string;
          distance_meters: number;
          confidence: number;
          location_accuracy_meters: number;
          venue_id: string;
          vibe_context: any;
          venue_context: string;
          accuracy_score: number;
          ml_features: any;
        };
        Insert: {
          id?: string;
          profile_id_a: string;
          profile_id_b: string;
          event_ts: string;
          event_type: string;
          distance_meters: number;
          confidence: number;
          location_accuracy_meters: number;
          venue_id: string;
          vibe_context: any;
          venue_context: string;
          accuracy_score: number;
          ml_features: any;
        };
        Update: {
          id?: string;
          profile_id_a?: string;
          profile_id_b?: string;
          event_ts?: string;
          event_type?: string;
          distance_meters?: number;
          confidence?: number;
          location_accuracy_meters?: number;
          venue_id?: string;
          vibe_context?: any;
          venue_context?: string;
          accuracy_score?: number;
          ml_features?: any;
        };
      };
      vibe_clusters: {
        Row: {
          gh6: string;
          centroid: string;
          total_now: number;
          vibe_counts: any;
          vibe_mode: string;
        };
        Insert: {
          gh6: string;
          centroid: string;
          total_now: number;
          vibe_counts: any;
          vibe_mode: string;
        };
        Update: {
          gh6?: string;
          centroid?: string;
          total_now?: number;
          vibe_counts?: any;
          vibe_mode?: string;
        };
      };
      vibe_user_learning: {
        Row: {
          id: string;
          correction_data: any;
          context_data: any;
          original_vibe: string;
          corrected_vibe: string;
          confidence: number;
          location_context: any;
          sensor_context: any;
          temporal_context: any;
          correction_strength: number;
          context_similarity: number;
          user_confidence: number;
          created_at: string;
          profile_id: string;
        };
        Insert: {
          id?: string;
          correction_data: any;
          context_data: any;
          original_vibe: string;
          corrected_vibe: string;
          confidence: number;
          location_context: any;
          sensor_context: any;
          temporal_context: any;
          correction_strength: number;
          context_similarity: number;
          user_confidence: number;
          created_at?: string;
          profile_id: string;
        };
        Update: {
          id?: string;
          correction_data?: any;
          context_data?: any;
          original_vibe?: string;
          corrected_vibe?: string;
          confidence?: number;
          location_context?: any;
          sensor_context?: any;
          temporal_context?: any;
          correction_strength?: number;
          context_similarity?: number;
          user_confidence?: number;
          created_at?: string;
          profile_id?: string;
        };
      };
      eta_shares: {
        Row: {
          id: string;
          sharer_id: string;
          other_profile_id: string;
          eta_minutes: number;
          distance_meters: number;
          travel_mode: string;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          sharer_id: string;
          other_profile_id: string;
          eta_minutes: number;
          distance_meters: number;
          travel_mode: string;
          created_at?: string;
          expires_at: string;
        };
        Update: {
          id?: string;
          sharer_id?: string;
          other_profile_id?: string;
          eta_minutes?: number;
          distance_meters?: number;
          travel_mode?: string;
          created_at?: string;
          expires_at?: string;
        };
      };
      location_system_health: {
        Row: {
          id: string;
          component_name: string;
          metric_name: string;
          metric_value: number;
          metadata: any;
          recorded_at: string;
          profile_id: string;
        };
        Insert: {
          id?: string;
          component_name: string;
          metric_name: string;
          metric_value: number;
          metadata: any;
          recorded_at: string;
          profile_id: string;
        };
        Update: {
          id?: string;
          component_name?: string;
          metric_name?: string;
          metric_value?: number;
          metadata?: any;
          recorded_at?: string;
          profile_id?: string;
        };
      };
      floqs: {
        Row: {
          id: string;
          creator_id: string;
          title: string;
          location: string;
          catchment_area: string;
          walkable_zone: string;
          primary_vibe: string;
          starts_at: string;
          ends_at: string;
          max_participants: number;
          visibility: string;
          created_at: string;
          geo: string;
          radius_m: number;
          name: string;
          type: string;
          vibe_tag: string;
          expires_at: string;
          updated_at: string;
          flock_type: string;
          parent_flock_id: string;
          recurrence_pattern: any;
          flock_tags: any[];
          auto_created: boolean;
          activity_score: number;
          last_activity_at: string;
          deleted_at: string;
          description: string;
          pinned_note: string;
          archived_at: string;
          profile_id: string;
          h3_7: string;
        };
        Insert: {
          id?: string;
          creator_id: string;
          title: string;
          location: string;
          catchment_area: string;
          walkable_zone: string;
          primary_vibe: string;
          starts_at: string;
          ends_at: string;
          max_participants: number;
          visibility: string;
          created_at?: string;
          geo: string;
          radius_m: number;
          name: string;
          type: string;
          vibe_tag: string;
          expires_at: string;
          updated_at?: string;
          flock_type: string;
          parent_flock_id: string;
          recurrence_pattern: any;
          flock_tags: any[];
          auto_created: boolean;
          activity_score: number;
          last_activity_at: string;
          deleted_at: string;
          description: string;
          pinned_note: string;
          archived_at: string;
          profile_id: string;
          h3_7: string;
        };
        Update: {
          id?: string;
          creator_id?: string;
          title?: string;
          location?: string;
          catchment_area?: string;
          walkable_zone?: string;
          primary_vibe?: string;
          starts_at?: string;
          ends_at?: string;
          max_participants?: number;
          visibility?: string;
          created_at?: string;
          geo?: string;
          radius_m?: number;
          name?: string;
          type?: string;
          vibe_tag?: string;
          expires_at?: string;
          updated_at?: string;
          flock_type?: string;
          parent_flock_id?: string;
          recurrence_pattern?: any;
          flock_tags?: any[];
          auto_created?: boolean;
          activity_score?: number;
          last_activity_at?: string;
          deleted_at?: string;
          description?: string;
          pinned_note?: string;
          archived_at?: string;
          profile_id?: string;
          h3_7?: string;
        };
      };
      proximity_stats_daily: {
        Row: {
          profile_id_a: string;
          event_date: string;
          total_events: number;
          unique_contacts: number;
          enter_events: number;
          exit_events: number;
          sustain_events: number;
          avg_confidence: number;
          max_confidence: number;
        };
        Insert: {
          profile_id_a: string;
          event_date: string;
          total_events: number;
          unique_contacts: number;
          enter_events: number;
          exit_events: number;
          sustain_events: number;
          avg_confidence: number;
          max_confidence: number;
        };
        Update: {
          profile_id_a?: string;
          event_date?: string;
          total_events?: number;
          unique_contacts?: number;
          enter_events?: number;
          exit_events?: number;
          sustain_events?: number;
          avg_confidence?: number;
          max_confidence?: number;
        };
      };
      user_floq_unread_counts: {
        Row: {
          profile_id: string;
          floq_id: string;
          unread: number;
        };
        Insert: {
          profile_id: string;
          floq_id: string;
          unread: number;
        };
        Update: {
          profile_id?: string;
          floq_id?: string;
          unread?: number;
        };
      };
      geofences: {
        Row: {
          id: string;
          profile_id: string;
          name: string;
          type: string;
          privacy_level: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          name: string;
          type: string;
          privacy_level: string;
          is_active: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          name?: string;
          type?: string;
          privacy_level?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      vibe_cluster_momentum: {
        Row: {
          gh6: string;
          centroid: string;
          total_now: number;
          vibe_counts: any;
          vibe_mode: string;
        };
        Insert: {
          gh6: string;
          centroid: string;
          total_now: number;
          vibe_counts: any;
          vibe_mode: string;
        };
        Update: {
          gh6?: string;
          centroid?: string;
          total_now?: number;
          vibe_counts?: any;
          vibe_mode?: string;
        };
      };
      v_venue_visits: {
        Row: {
          id: number;
          venue_id: string;
          arrived_at: string;
          departed_at: string;
          distance_m: number;
          day_key: string;
          profile_id: string;
          left_at: string;
          source: string;
          profile_id_norm: string;
          visited_at: string;
        };
        Insert: {
          id?: number;
          venue_id: string;
          arrived_at: string;
          departed_at: string;
          distance_m: number;
          day_key: string;
          profile_id: string;
          left_at: string;
          source: string;
          profile_id_norm: string;
          visited_at: string;
        };
        Update: {
          id?: number;
          venue_id?: string;
          arrived_at?: string;
          departed_at?: string;
          distance_m?: number;
          day_key?: string;
          profile_id?: string;
          left_at?: string;
          source?: string;
          profile_id_norm?: string;
          visited_at?: string;
        };
      };
      vibe_system_metrics: {
        Row: {
          id: string;
          system_version: string;
          measurement_type: string;
          metrics: any;
          session_id: string;
          measured_at: string;
          created_at: string;
          profile_id: string;
        };
        Insert: {
          id?: string;
          system_version: string;
          measurement_type: string;
          metrics: any;
          session_id: string;
          measured_at: string;
          created_at?: string;
          profile_id: string;
        };
        Update: {
          id?: string;
          system_version?: string;
          measurement_type?: string;
          metrics?: any;
          session_id?: string;
          measured_at?: string;
          created_at?: string;
          profile_id?: string;
        };
      };
      plan_stop_comments: {
        Row: {
          id: string;
          plan_id: string;
          stop_id: string;
          guest_id: string;
          text: string;
          created_at: string;
          updated_at: string;
          profile_id: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          stop_id: string;
          guest_id: string;
          text: string;
          created_at?: string;
          updated_at?: string;
          profile_id: string;
        };
        Update: {
          id?: string;
          plan_id?: string;
          stop_id?: string;
          guest_id?: string;
          text?: string;
          created_at?: string;
          updated_at?: string;
          profile_id?: string;
        };
      };
      field_tiles_v2: {
        Row: {
          tile_id: string;
          hex_geom: string;
          center_lat: number;
          center_lng: number;
          crowd_count: number;
          avg_vibe: any;
          vibe_mix: any;
          active_profile_ids: any[];
          last_activity: string;
          updated_at: string;
        };
        Insert: {
          tile_id: string;
          hex_geom: string;
          center_lat: number;
          center_lng: number;
          crowd_count: number;
          avg_vibe: any;
          vibe_mix: any;
          active_profile_ids: any[];
          last_activity: string;
          updated_at?: string;
        };
        Update: {
          tile_id?: string;
          hex_geom?: string;
          center_lat?: number;
          center_lng?: number;
          crowd_count?: number;
          avg_vibe?: any;
          vibe_mix?: any;
          active_profile_ids?: any[];
          last_activity?: string;
          updated_at?: string;
        };
      };
      afterglow_collection_items: {
        Row: {
          id: string;
          collection_id: string;
          daily_afterglow_id: string;
          added_at: string;
          profile_id: string;
        };
        Insert: {
          id?: string;
          collection_id: string;
          daily_afterglow_id: string;
          added_at: string;
          profile_id: string;
        };
        Update: {
          id?: string;
          collection_id?: string;
          daily_afterglow_id?: string;
          added_at?: string;
          profile_id?: string;
        };
      };
      daily_recap_cache: {
        Row: {
          day: string;
          payload: any;
          created_at: string;
          profile_id: string;
        };
        Insert: {
          day: string;
          payload: any;
          created_at?: string;
          profile_id: string;
        };
        Update: {
          day?: string;
          payload?: any;
          created_at?: string;
          profile_id?: string;
        };
      };
      floq_mention_cooldown: {
        Row: {
          floq_id: string;
          last_mention_at: string;
          profile_id: string;
        };
        Insert: {
          floq_id: string;
          last_mention_at: string;
          profile_id: string;
        };
        Update: {
          floq_id?: string;
          last_mention_at?: string;
          profile_id?: string;
        };
      };
      weather_cache: {
        Row: {
          geohash6: string;
          fetched_at: string;
          payload: any;
        };
        Insert: {
          geohash6: string;
          fetched_at: string;
          payload: any;
        };
        Update: {
          geohash6?: string;
          fetched_at?: string;
          payload?: any;
        };
      };
      friendships: {
        Row: {
          user_high: string;
          created_at: string;
          user_low: string;
          friend_state: string;
          responded_at: string;
          is_close: boolean;
        };
        Insert: {
          user_high: string;
          created_at?: string;
          user_low: string;
          friend_state: string;
          responded_at: string;
          is_close: boolean;
        };
        Update: {
          user_high?: string;
          created_at?: string;
          user_low?: string;
          friend_state?: string;
          responded_at?: string;
          is_close?: boolean;
        };
      };
      presence_log: {
        Row: {
          profile_id: string;
          location: string;
          ts: string;
          vibe: string;
        };
        Insert: {
          profile_id: string;
          location: string;
          ts: string;
          vibe: string;
        };
        Update: {
          profile_id?: string;
          location?: string;
          ts?: string;
          vibe?: string;
        };
      };
      pulse_events: {
        Row: {
          id: number;
          created_at: string;
          event_type: string;
          profile_id: string;
          floq_id: string;
          venue_id: string;
          vibe_tag: string;
          people_count: number;
          meta: any;
        };
        Insert: {
          id?: number;
          created_at?: string;
          event_type: string;
          profile_id: string;
          floq_id: string;
          venue_id: string;
          vibe_tag: string;
          people_count: number;
          meta: any;
        };
        Update: {
          id?: number;
          created_at?: string;
          event_type?: string;
          profile_id?: string;
          floq_id?: string;
          venue_id?: string;
          vibe_tag?: string;
          people_count?: number;
          meta?: any;
        };
      };
      afterglow_people: {
        Row: {
          moment_id: string;
          person_id: string;
          interaction_strength: number;
          shared_moments_count: number;
          created_at: string;
          profile_id: string;
        };
        Insert: {
          moment_id: string;
          person_id: string;
          interaction_strength: number;
          shared_moments_count: number;
          created_at?: string;
          profile_id: string;
        };
        Update: {
          moment_id?: string;
          person_id?: string;
          interaction_strength?: number;
          shared_moments_count?: number;
          created_at?: string;
          profile_id?: string;
        };
      };
      venue_discoveries: {
        Row: {
          id: number;
          profile_id: string;
          venue_id: string;
          discovered_at: string;
          day_key: string;
        };
        Insert: {
          id?: number;
          profile_id: string;
          venue_id: string;
          discovered_at: string;
          day_key: string;
        };
        Update: {
          id?: number;
          profile_id?: string;
          venue_id?: string;
          discovered_at?: string;
          day_key?: string;
        };
      };
      task_queue: {
        Row: {
          id: string;
          task: string;
          payload: any;
          created_at: string;
          processed_at: string;
          status: string;
          profile_id: string;
        };
        Insert: {
          id?: string;
          task: string;
          payload: any;
          created_at?: string;
          processed_at: string;
          status: string;
          profile_id: string;
        };
        Update: {
          id?: string;
          task?: string;
          payload?: any;
          created_at?: string;
          processed_at?: string;
          status?: string;
          profile_id?: string;
        };
      };
      user_encounter: {
        Row: {
          id: number;
          user_a: string;
          user_b: string;
          first_seen: string;
          last_seen: string;
          venue_id: string;
          created_at: string;
          distance_m: number;
          profile_id: string;
        };
        Insert: {
          id?: number;
          user_a: string;
          user_b: string;
          first_seen: string;
          last_seen: string;
          venue_id: string;
          created_at?: string;
          distance_m: number;
          profile_id: string;
        };
        Update: {
          id?: number;
          user_a?: string;
          user_b?: string;
          first_seen?: string;
          last_seen?: string;
          venue_id?: string;
          created_at?: string;
          distance_m?: number;
          profile_id?: string;
        };
      };
      flock_history: {
        Row: {
          id: string;
          floq_id: string;
          event_type: string;
          previous_vibe: string;
          new_vibe: string;
          metadata: any;
          created_at: string;
          profile_id: string;
        };
        Insert: {
          id?: string;
          floq_id: string;
          event_type: string;
          previous_vibe: string;
          new_vibe: string;
          metadata: any;
          created_at?: string;
          profile_id: string;
        };
        Update: {
          id?: string;
          floq_id?: string;
          event_type?: string;
          previous_vibe?: string;
          new_vibe?: string;
          metadata?: any;
          created_at?: string;
          profile_id?: string;
        };
      };
      friendship_analysis: {
        Row: {
          user_low: string;
          user_high: string;
          overall_score: number;
          confidence_level: string;
          signals_data: any;
          relationship_type: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_low: string;
          user_high: string;
          overall_score: number;
          confidence_level: string;
          signals_data: any;
          relationship_type: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_low?: string;
          user_high?: string;
          overall_score?: number;
          confidence_level?: string;
          signals_data?: any;
          relationship_type?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      venue_signature_performance_stats: {
        Row: {
          table_name: string;
          total_records: number;
          updated_last_24h: number;
          avg_confidence: number;
          unique_venues: number;
          unique_signal_types: number;
        };
        Insert: {
          table_name: string;
          total_records: number;
          updated_last_24h: number;
          avg_confidence: number;
          unique_venues: number;
          unique_signal_types: number;
        };
        Update: {
          table_name?: string;
          total_records?: number;
          updated_last_24h?: number;
          avg_confidence?: number;
          unique_venues?: number;
          unique_signal_types?: number;
        };
      };
      v_user_vibe_states: {
        Row: {
          vibe_tag: string;
          started_at: string;
          location: string;
          active: boolean;
          visible_to: string;
          gh5: string;
          vibe_h: number;
          vibe_s: number;
          vibe_l: number;
          profile_id: string;
          profile_id_norm: string;
        };
        Insert: {
          vibe_tag: string;
          started_at: string;
          location: string;
          active: boolean;
          visible_to: string;
          gh5: string;
          vibe_h: number;
          vibe_s: number;
          vibe_l: number;
          profile_id: string;
          profile_id_norm: string;
        };
        Update: {
          vibe_tag?: string;
          started_at?: string;
          location?: string;
          active?: boolean;
          visible_to?: string;
          gh5?: string;
          vibe_h?: number;
          vibe_s?: number;
          vibe_l?: number;
          profile_id?: string;
          profile_id_norm?: string;
        };
      };
      plan_summaries: {
        Row: {
          id: string;
          plan_id: string;
          mode: string;
          summary: string;
          generated_at: string;
          created_at: string;
          profile_id: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          mode: string;
          summary: string;
          generated_at: string;
          created_at?: string;
          profile_id: string;
        };
        Update: {
          id?: string;
          plan_id?: string;
          mode?: string;
          summary?: string;
          generated_at?: string;
          created_at?: string;
          profile_id?: string;
        };
      };
      direct_messages: {
        Row: {
          id: string;
          thread_id: string;
          content: string;
          created_at: string;
          metadata: any;
          profile_id: string;
          reply_to_id: string;
          message_type: string;
          status: string;
        };
        Insert: {
          id?: string;
          thread_id: string;
          content: string;
          created_at?: string;
          metadata: any;
          profile_id: string;
          reply_to_id: string;
          message_type: string;
          status: string;
        };
        Update: {
          id?: string;
          thread_id?: string;
          content?: string;
          created_at?: string;
          metadata?: any;
          profile_id?: string;
          reply_to_id?: string;
          message_type?: string;
          status?: string;
        };
      };
      rate_limit_config: {
        Row: {
          id: string;
          action_type: string;
          max_count: number;
          window_duration_minutes: number;
          per_target: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          action_type: string;
          max_count: number;
          window_duration_minutes: number;
          per_target: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          action_type?: string;
          max_count?: number;
          window_duration_minutes?: number;
          per_target?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      floq_afterglow: {
        Row: {
          id: string;
          floq_id: string;
          date: string;
          join_time: string;
          leave_time: string;
          duration_minutes: number;
          vibe_at_join: string;
          vibe_at_leave: string;
          vibe_changes: any;
          people_seen: any[];
          chat_highlights: any;
          location_name: string;
          peak_moment_text: string;
          created_at: string;
          profile_id: string;
        };
        Insert: {
          id?: string;
          floq_id: string;
          date: string;
          join_time: string;
          leave_time: string;
          duration_minutes: number;
          vibe_at_join: string;
          vibe_at_leave: string;
          vibe_changes: any;
          people_seen: any[];
          chat_highlights: any;
          location_name: string;
          peak_moment_text: string;
          created_at?: string;
          profile_id: string;
        };
        Update: {
          id?: string;
          floq_id?: string;
          date?: string;
          join_time?: string;
          leave_time?: string;
          duration_minutes?: number;
          vibe_at_join?: string;
          vibe_at_leave?: string;
          vibe_changes?: any;
          people_seen?: any[];
          chat_highlights?: any;
          location_name?: string;
          peak_moment_text?: string;
          created_at?: string;
          profile_id?: string;
        };
      };
      v_friend_last_seen: {
        Row: {
          current_profile_id: string;
          other_profile_id: string;
          last_seen_at: string;
          friend_state: string;
        };
        Insert: {
          current_profile_id: string;
          other_profile_id: string;
          last_seen_at: string;
          friend_state: string;
        };
        Update: {
          current_profile_id?: string;
          other_profile_id?: string;
          last_seen_at?: string;
          friend_state?: string;
        };
      };
      user_online_status: {
        Row: {
          profile_id: string;
          is_online: boolean;
          last_seen: string;
          heartbeat_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          profile_id: string;
          is_online: boolean;
          last_seen: string;
          heartbeat_at: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          profile_id?: string;
          is_online?: boolean;
          last_seen?: string;
          heartbeat_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      venues_near_me: {
        Row: {
          venue_id: string;
          distance_m: number;
          name: string;
          category: string;
          lat: number;
          lng: number;
          vibe_score: number;
          last_updated: string;
          profile_id: string;
        };
        Insert: {
          venue_id: string;
          distance_m: number;
          name: string;
          category: string;
          lat: number;
          lng: number;
          vibe_score: number;
          last_updated: string;
          profile_id: string;
        };
        Update: {
          venue_id?: string;
          distance_m?: number;
          name?: string;
          category?: string;
          lat?: number;
          lng?: number;
          vibe_score?: number;
          last_updated?: string;
          profile_id?: string;
        };
      };
      friendships_v: {
        Row: {
          profile_low: string;
          profile_high: string;
          friend_state: string;
          created_at: string;
          responded_at: string;
          is_close: boolean;
        };
        Insert: {
          profile_low: string;
          profile_high: string;
          friend_state: string;
          created_at?: string;
          responded_at: string;
          is_close: boolean;
        };
        Update: {
          profile_low?: string;
          profile_high?: string;
          friend_state?: string;
          created_at?: string;
          responded_at?: string;
          is_close?: boolean;
        };
      };
      venue_signatures: {
        Row: {
          id: string;
          venue_id: string;
          signal_type: string;
          signal_identifier: string;
          signal_strength: number;
          confidence_score: number;
          last_verified: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          venue_id: string;
          signal_type: string;
          signal_identifier: string;
          signal_strength: number;
          confidence_score: number;
          last_verified: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          venue_id?: string;
          signal_type?: string;
          signal_identifier?: string;
          signal_strength?: number;
          confidence_score?: number;
          last_verified?: string;
          created_at?: string;
        };
      };
      plan_stops: {
        Row: {
          id: string;
          plan_id: string;
          venue_id: string;
          title: string;
          description: string;
          start_time: string;
          end_time: string;
          estimated_cost_per_person: number;
          stop_order: number;
          location: string;
          address: string;
          stop_type: string;
          created_by: string;
          created_at: string;
          updated_at: string;
          duration_minutes: number;
          sort_order: number;
          estimated_duration_minutes: number;
          profile_id: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          venue_id: string;
          title: string;
          description: string;
          start_time: string;
          end_time: string;
          estimated_cost_per_person: number;
          stop_order: number;
          location: string;
          address: string;
          stop_type: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          duration_minutes: number;
          sort_order: number;
          estimated_duration_minutes: number;
          profile_id: string;
        };
        Update: {
          id?: string;
          plan_id?: string;
          venue_id?: string;
          title?: string;
          description?: string;
          start_time?: string;
          end_time?: string;
          estimated_cost_per_person?: number;
          stop_order?: number;
          location?: string;
          address?: string;
          stop_type?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          duration_minutes?: number;
          sort_order?: number;
          estimated_duration_minutes?: number;
          profile_id?: string;
        };
      };
      user_vibe_states: {
        Row: {
          vibe_tag: string;
          started_at: string;
          location: string;
          active: boolean;
          visible_to: string;
          gh5: string;
          vibe_h: number;
          vibe_s: number;
          vibe_l: number;
          profile_id: string;
        };
        Insert: {
          vibe_tag: string;
          started_at: string;
          location: string;
          active: boolean;
          visible_to: string;
          gh5: string;
          vibe_h: number;
          vibe_s: number;
          vibe_l: number;
          profile_id: string;
        };
        Update: {
          vibe_tag?: string;
          started_at?: string;
          location?: string;
          active?: boolean;
          visible_to?: string;
          gh5?: string;
          vibe_h?: number;
          vibe_s?: number;
          vibe_l?: number;
          profile_id?: string;
        };
      };
      app_user_notification: {
        Row: {
          id: number;
          payload: any;
          created_at: string;
          profile_id: string;
        };
        Insert: {
          id?: number;
          payload: any;
          created_at?: string;
          profile_id: string;
        };
        Update: {
          id?: number;
          payload?: any;
          created_at?: string;
          profile_id?: string;
        };
      };
      proximity_system_logs: {
        Row: {
          id: number;
          log_date: string;
          total_events_24h: number;
          unique_users_24h: number;
          avg_confidence: number;
          venue_signatures_count: number;
          active_geofences_count: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          log_date: string;
          total_events_24h: number;
          unique_users_24h: number;
          avg_confidence: number;
          venue_signatures_count: number;
          active_geofences_count: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          log_date?: string;
          total_events_24h?: number;
          unique_users_24h?: number;
          avg_confidence?: number;
          venue_signatures_count?: number;
          active_geofences_count?: number;
          created_at?: string;
        };
      };
      venue_bumps: {
        Row: {
          venue_id: string;
          profile_id: string;
          created_at: string;
        };
        Insert: {
          venue_id: string;
          profile_id: string;
          created_at?: string;
        };
        Update: {
          venue_id?: string;
          profile_id?: string;
          created_at?: string;
        };
      };
      venue_boundaries: {
        Row: {
          id: string;
          venue_id: string;
          boundary_type: string;
          boundary_geom: string;
          confidence_score: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          venue_id: string;
          boundary_type: string;
          boundary_geom: string;
          confidence_score: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          venue_id?: string;
          boundary_type?: string;
          boundary_geom?: string;
          confidence_score?: number;
          created_at?: string;
        };
      };
      floq_messages: {
        Row: {
          id: string;
          floq_id: string;
          sender_id: string;
          body: string;
          emoji: string;
          created_at: string;
          status: string;
          delivery_state: string;
          reply_to_id: string;
          profile_id: string;
        };
        Insert: {
          id?: string;
          floq_id: string;
          sender_id: string;
          body: string;
          emoji: string;
          created_at?: string;
          status: string;
          delivery_state: string;
          reply_to_id: string;
          profile_id: string;
        };
        Update: {
          id?: string;
          floq_id?: string;
          sender_id?: string;
          body?: string;
          emoji?: string;
          created_at?: string;
          status?: string;
          delivery_state?: string;
          reply_to_id?: string;
          profile_id?: string;
        };
      };
      place_banners: {
        Row: {
          id: string;
          venue_id: string;
          headline: string;
          expires_at: string;
          cta_type: string;
          metadata: any;
          created_at: string;
          channel: string;
          profile_id: string;
        };
        Insert: {
          id?: string;
          venue_id: string;
          headline: string;
          expires_at: string;
          cta_type: string;
          metadata: any;
          created_at?: string;
          channel: string;
          profile_id: string;
        };
        Update: {
          id?: string;
          venue_id?: string;
          headline?: string;
          expires_at?: string;
          cta_type?: string;
          metadata?: any;
          created_at?: string;
          channel?: string;
          profile_id?: string;
        };
      };
      plan_stop_votes: {
        Row: {
          id: string;
          plan_id: string;
          stop_id: string;
          guest_id: string;
          vote_type: string;
          emoji_reaction: string;
          created_at: string;
          updated_at: string;
          profile_id: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          stop_id: string;
          guest_id: string;
          vote_type: string;
          emoji_reaction: string;
          created_at?: string;
          updated_at?: string;
          profile_id: string;
        };
        Update: {
          id?: string;
          plan_id?: string;
          stop_id?: string;
          guest_id?: string;
          vote_type?: string;
          emoji_reaction?: string;
          created_at?: string;
          updated_at?: string;
          profile_id?: string;
        };
      };
      function_replacements: {
        Row: {
          schema_name: string;
          function_name: string;
          original_definition: string;
          modified_definition: string;
        };
        Insert: {
          schema_name: string;
          function_name: string;
          original_definition: string;
          modified_definition: string;
        };
        Update: {
          schema_name?: string;
          function_name?: string;
          original_definition?: string;
          modified_definition?: string;
        };
      };
      vibes_log: {
        Row: {
          ts: string;
          location: string;
          venue_id: string;
          vibe: string;
          profile_id: string;
        };
        Insert: {
          ts: string;
          location: string;
          venue_id: string;
          vibe: string;
          profile_id: string;
        };
        Update: {
          ts?: string;
          location?: string;
          venue_id?: string;
          vibe?: string;
          profile_id?: string;
        };
      };
      venue_live_presence: {
        Row: {
          venue_id: string;
          vibe: string;
          checked_in_at: string;
          last_heartbeat: string;
          expires_at: string;
          session_duration: string;
          checked_in: string;
          profile_id: string;
        };
        Insert: {
          venue_id: string;
          vibe: string;
          checked_in_at: string;
          last_heartbeat: string;
          expires_at: string;
          session_duration: string;
          checked_in: string;
          profile_id: string;
        };
        Update: {
          venue_id?: string;
          vibe?: string;
          checked_in_at?: string;
          last_heartbeat?: string;
          expires_at?: string;
          session_duration?: string;
          checked_in?: string;
          profile_id?: string;
        };
      };
      location_history: {
        Row: {
          id: string;
          profile_id: string;
          latitude: number;
          longitude: number;
          accuracy: number;
          recorded_at: string;
          created_at: string;
          geog: string;
          geohash6: string;
          h3_idx: number;
        };
        Insert: {
          id?: string;
          profile_id: string;
          latitude: number;
          longitude: number;
          accuracy: number;
          recorded_at: string;
          created_at?: string;
          geog: string;
          geohash6: string;
          h3_idx: number;
        };
        Update: {
          id?: string;
          profile_id?: string;
          latitude?: number;
          longitude?: number;
          accuracy?: number;
          recorded_at?: string;
          created_at?: string;
          geog?: string;
          geohash6?: string;
          h3_idx?: number;
        };
      };
      v_crossed_paths: {
        Row: {
          id: number;
          user_a: string;
          user_b: string;
          venue_id: string;
          ts: string;
          encounter_date: string;
          created_at: string;
          profile_id: string;
          profile_id_norm: string;
        };
        Insert: {
          id?: number;
          user_a: string;
          user_b: string;
          venue_id: string;
          ts: string;
          encounter_date: string;
          created_at?: string;
          profile_id: string;
          profile_id_norm: string;
        };
        Update: {
          id?: number;
          user_a?: string;
          user_b?: string;
          venue_id?: string;
          ts?: string;
          encounter_date?: string;
          created_at?: string;
          profile_id?: string;
          profile_id_norm?: string;
        };
      };
      floq_boosts: {
        Row: {
          id: string;
          floq_id: string;
          boost_type: string;
          created_at: string;
          expires_at: string;
          profile_id: string;
        };
        Insert: {
          id?: string;
          floq_id: string;
          boost_type: string;
          created_at?: string;
          expires_at: string;
          profile_id: string;
        };
        Update: {
          id?: string;
          floq_id?: string;
          boost_type?: string;
          created_at?: string;
          expires_at?: string;
          profile_id?: string;
        };
      };
      achievement_catalogue: {
        Row: {
          code: string;
          family: string;
          name: string;
          description: string;
          icon: string;
          goal: number;
          metadata: any;
          profile_id: string;
        };
        Insert: {
          code: string;
          family: string;
          name: string;
          description: string;
          icon: string;
          goal: number;
          metadata: any;
          profile_id: string;
        };
        Update: {
          code?: string;
          family?: string;
          name?: string;
          description?: string;
          icon?: string;
          goal?: number;
          metadata?: any;
          profile_id?: string;
        };
      };
      venue_visits: {
        Row: {
          id: number;
          venue_id: string;
          arrived_at: string;
          departed_at: string;
          distance_m: number;
          day_key: string;
          profile_id: string;
          left_at: string;
          source: string;
        };
        Insert: {
          id?: number;
          venue_id: string;
          arrived_at: string;
          departed_at: string;
          distance_m: number;
          day_key: string;
          profile_id: string;
          left_at: string;
          source: string;
        };
        Update: {
          id?: number;
          venue_id?: string;
          arrived_at?: string;
          departed_at?: string;
          distance_m?: number;
          day_key?: string;
          profile_id?: string;
          left_at?: string;
          source?: string;
        };
      };
      plan_invitations: {
        Row: {
          id: string;
          plan_id: string;
          inviter_id: string;
          invitee_email: string;
          invitation_type: string;
          status: string;
          invited_at: string;
          responded_at: string;
          token: string;
          expires_at: string;
          archived: boolean;
          profile_id: string;
          invitee_profile_id: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          inviter_id: string;
          invitee_email: string;
          invitation_type: string;
          status: string;
          invited_at: string;
          responded_at: string;
          token: string;
          expires_at: string;
          archived: boolean;
          profile_id: string;
          invitee_profile_id: string;
        };
        Update: {
          id?: string;
          plan_id?: string;
          inviter_id?: string;
          invitee_email?: string;
          invitation_type?: string;
          status?: string;
          invited_at?: string;
          responded_at?: string;
          token?: string;
          expires_at?: string;
          archived?: boolean;
          profile_id?: string;
          invitee_profile_id?: string;
        };
      };
      dm_media: {
        Row: {
          id: string;
          thread_id: string;
          message_id: string;
          uploader_id: string;
          object_path: string;
          mime_type: string;
          width: number;
          height: number;
          meta: any;
          created_at: string;
          uploader_profile_id: string;
        };
        Insert: {
          id?: string;
          thread_id: string;
          message_id: string;
          uploader_id: string;
          object_path: string;
          mime_type: string;
          width: number;
          height: number;
          meta: any;
          created_at?: string;
          uploader_profile_id: string;
        };
        Update: {
          id?: string;
          thread_id?: string;
          message_id?: string;
          uploader_id?: string;
          object_path?: string;
          mime_type?: string;
          width?: number;
          height?: number;
          meta?: any;
          created_at?: string;
          uploader_profile_id?: string;
        };
      };
      weekly_ai_suggestion_cooldowns: {
        Row: {
          last_regenerated_at: string;
          created_at: string;
          profile_id: string;
        };
        Insert: {
          last_regenerated_at: string;
          created_at?: string;
          profile_id: string;
        };
        Update: {
          last_regenerated_at?: string;
          created_at?: string;
          profile_id?: string;
        };
      };
      v_friend_requests: {
        Row: {
          id: string;
          requester_id: string;
          me: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          requester_id: string;
          me: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          requester_id?: string;
          me?: string;
          created_at?: string;
        };
      };
      user_favorites: {
        Row: {
          item_id: string;
          item_type: string;
          created_at: string;
          title: string;
          description: string;
          image_url: string;
          profile_id: string;
        };
        Insert: {
          item_id: string;
          item_type: string;
          created_at?: string;
          title: string;
          description: string;
          image_url: string;
          profile_id: string;
        };
        Update: {
          item_id?: string;
          item_type?: string;
          created_at?: string;
          title?: string;
          description?: string;
          image_url?: string;
          profile_id?: string;
        };
      };
      floq_settings: {
        Row: {
          floq_id: string;
          notifications_enabled: boolean;
          mention_permissions: string;
          join_approval_required: boolean;
          activity_visibility: string;
          welcome_message: string;
          updated_at: string;
          profile_id: string;
        };
        Insert: {
          floq_id: string;
          notifications_enabled: boolean;
          mention_permissions: string;
          join_approval_required: boolean;
          activity_visibility: string;
          welcome_message: string;
          updated_at?: string;
          profile_id: string;
        };
        Update: {
          floq_id?: string;
          notifications_enabled?: boolean;
          mention_permissions?: string;
          join_approval_required?: boolean;
          activity_visibility?: string;
          welcome_message?: string;
          updated_at?: string;
          profile_id?: string;
        };
      };
      place_details: {
        Row: {
          place_id: string;
          data: any;
          fetched_at: string;
          profile_id: string;
        };
        Insert: {
          place_id: string;
          data: any;
          fetched_at: string;
          profile_id: string;
        };
        Update: {
          place_id?: string;
          data?: any;
          fetched_at?: string;
          profile_id?: string;
        };
      };
      chat_message_reactions: {
        Row: {
          message_id: string;
          reactor_id: string;
          emoji: string;
          reacted_at: string;
        };
        Insert: {
          message_id: string;
          reactor_id: string;
          emoji: string;
          reacted_at: string;
        };
        Update: {
          message_id?: string;
          reactor_id?: string;
          emoji?: string;
          reacted_at?: string;
        };
      };
      vibes_now: {
        Row: {
          vibe: string;
          location: string;
          broadcast_radius: number;
          visibility: string;
          updated_at: string;
          expires_at: string;
          geo: string;
          venue_id: string;
          geohash6: string;
          gh5: string;
          vibe_h: number;
          vibe_s: number;
          vibe_l: number;
          profile_id: string;
          h3_7: string;
          h3_idx: number;
        };
        Insert: {
          vibe: string;
          location: string;
          broadcast_radius: number;
          visibility: string;
          updated_at?: string;
          expires_at: string;
          geo: string;
          venue_id: string;
          geohash6: string;
          gh5: string;
          vibe_h: number;
          vibe_s: number;
          vibe_l: number;
          profile_id: string;
          h3_7: string;
          h3_idx: number;
        };
        Update: {
          vibe?: string;
          location?: string;
          broadcast_radius?: number;
          visibility?: string;
          updated_at?: string;
          expires_at?: string;
          geo?: string;
          venue_id?: string;
          geohash6?: string;
          gh5?: string;
          vibe_h?: number;
          vibe_s?: number;
          vibe_l?: number;
          profile_id?: string;
          h3_7?: string;
          h3_idx?: number;
        };
      };
      rename_user_id_to_profile_id_log: {
        Row: {
          id: number;
          object_type: string;
          schema_name: string;
          object_name: string;
          column_name: string;
          original_definition: string;
          new_definition: string;
          status: string;
          error_message: string;
          executed_at: string;
        };
        Insert: {
          id?: number;
          object_type: string;
          schema_name: string;
          object_name: string;
          column_name: string;
          original_definition: string;
          new_definition: string;
          status: string;
          error_message: string;
          executed_at: string;
        };
        Update: {
          id?: number;
          object_type?: string;
          schema_name?: string;
          object_name?: string;
          column_name?: string;
          original_definition?: string;
          new_definition?: string;
          status?: string;
          error_message?: string;
          executed_at?: string;
        };
      };
      user_notifications: {
        Row: {
          id: string;
          kind: string;
          title: string;
          subtitle: string;
          floq_id: string;
          message_id: string;
          plan_id: string;
          read_at: string;
          created_at: string;
          profile_id: string;
        };
        Insert: {
          id?: string;
          kind: string;
          title: string;
          subtitle: string;
          floq_id: string;
          message_id: string;
          plan_id: string;
          read_at: string;
          created_at?: string;
          profile_id: string;
        };
        Update: {
          id?: string;
          kind?: string;
          title?: string;
          subtitle?: string;
          floq_id?: string;
          message_id?: string;
          plan_id?: string;
          read_at?: string;
          created_at?: string;
          profile_id?: string;
        };
      };
      venues: {
        Row: {
          id: string;
          name: string;
          lat: number;
          lng: number;
          vibe: string;
          source: string;
          created_at: string;
          description: string;
          radius_m: number;
          slug: string;
          provider: string;
          provider_id: string;
          address: string;
          categories: any[];
          rating: number;
          photo_url: string;
          updated_at: string;
          geom: string;
          geohash5: string;
          external_id: string;
          popularity: number;
          vibe_score: number;
          live_count: number;
          profile_id: string;
          location: string;
          price_tier: string;
        };
        Insert: {
          id?: string;
          name: string;
          lat: number;
          lng: number;
          vibe: string;
          source: string;
          created_at?: string;
          description: string;
          radius_m: number;
          slug: string;
          provider: string;
          provider_id: string;
          address: string;
          categories: any[];
          rating: number;
          photo_url: string;
          updated_at?: string;
          geom: string;
          geohash5: string;
          external_id: string;
          popularity: number;
          vibe_score: number;
          live_count: number;
          profile_id: string;
          location: string;
          price_tier: string;
        };
        Update: {
          id?: string;
          name?: string;
          lat?: number;
          lng?: number;
          vibe?: string;
          source?: string;
          created_at?: string;
          description?: string;
          radius_m?: number;
          slug?: string;
          provider?: string;
          provider_id?: string;
          address?: string;
          categories?: any[];
          rating?: number;
          photo_url?: string;
          updated_at?: string;
          geom?: string;
          geohash5?: string;
          external_id?: string;
          popularity?: number;
          vibe_score?: number;
          live_count?: number;
          profile_id?: string;
          location?: string;
          price_tier?: string;
        };
      };
      user_floq_activity_tracking: {
        Row: {
          floq_id: string;
          last_chat_viewed_at: string;
          last_activity_viewed_at: string;
          last_plans_viewed_at: string;
          created_at: string;
          updated_at: string;
          profile_id: string;
        };
        Insert: {
          floq_id: string;
          last_chat_viewed_at: string;
          last_activity_viewed_at: string;
          last_plans_viewed_at: string;
          created_at?: string;
          updated_at?: string;
          profile_id: string;
        };
        Update: {
          floq_id?: string;
          last_chat_viewed_at?: string;
          last_activity_viewed_at?: string;
          last_plans_viewed_at?: string;
          created_at?: string;
          updated_at?: string;
          profile_id?: string;
        };
      };
      security_audit_log: {
        Row: {
          id: string;
          profile_id: string;
          event_type: string;
          details: any;
          severity: string;
          ip_address: string;
          user_agent: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          event_type: string;
          details: any;
          severity: string;
          ip_address: string;
          user_agent: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          event_type?: string;
          details?: any;
          severity?: string;
          ip_address?: string;
          user_agent?: string;
          created_at?: string;
        };
      };
      v_friend_sparkline: {
        Row: {
          profile_id: string;
          other_profile_id: string;
          recent_vibes: any[];
          last_seen_at: string;
        };
        Insert: {
          profile_id: string;
          other_profile_id: string;
          recent_vibes: any[];
          last_seen_at: string;
        };
        Update: {
          profile_id?: string;
          other_profile_id?: string;
          recent_vibes?: any[];
          last_seen_at?: string;
        };
      };
      floq_invitations: {
        Row: {
          id: string;
          floq_id: string;
          inviter_id: string;
          invitee_id: string;
          status: string;
          created_at: string;
          responded_at: string;
          profile_id: string;
        };
        Insert: {
          id?: string;
          floq_id: string;
          inviter_id: string;
          invitee_id: string;
          status: string;
          created_at?: string;
          responded_at: string;
          profile_id: string;
        };
        Update: {
          id?: string;
          floq_id?: string;
          inviter_id?: string;
          invitee_id?: string;
          status?: string;
          created_at?: string;
          responded_at?: string;
          profile_id?: string;
        };
      };
      plan_afterglow: {
        Row: {
          id: string;
          plan_id: string;
          date: string;
          group_vibe_arc: any;
          shared_moments: any;
          my_contribution: string;
          group_energy_peak: string;
          ending_sentiment: string;
          would_repeat_score: number;
          created_at: string;
          profile_id: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          date: string;
          group_vibe_arc: any;
          shared_moments: any;
          my_contribution: string;
          group_energy_peak: string;
          ending_sentiment: string;
          would_repeat_score: number;
          created_at?: string;
          profile_id: string;
        };
        Update: {
          id?: string;
          plan_id?: string;
          date?: string;
          group_vibe_arc?: any;
          shared_moments?: any;
          my_contribution?: string;
          group_energy_peak?: string;
          ending_sentiment?: string;
          would_repeat_score?: number;
          created_at?: string;
          profile_id?: string;
        };
      };
    };
    Views: {
      v_friends_with_presence: {
        Row: {
          friend_id: string;
          display_name: string;
          username: string;
          avatar_url: string;
          started_at: string;
          vibe_tag: string;
          online: boolean;
          friend_state: string;
          created_at: string;
          responded_at: string;
          is_outgoing_request: boolean;
          is_incoming_request: boolean;
        };
      };
      v_floq_participants: {
        Row: {
          floq_id: string;
          role: string;
          joined_at: string;
          profile_id: string;
          last_read_message_at: string;
          profile_id_norm: string;
        };
      };
      v_friend_ids: {
        Row: {
          current_profile_id: string;
          other_profile_id: string;
          is_close: boolean;
          responded_at: string;
        };
      };
      v_today_venue_discoveries: {
        Row: {
          profile_id: string;
          venue_id: string;
          discovered_at: string;
        };
      };
      v_active_users: {
        Row: {
          profile_id: string;
          lat: number;
          lng: number;
          vibe: string;
          updated_at: string;
        };
      };
      v_discover_profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string;
          avatar_url: string;
          req_status: string;
        };
      };
      v_profiles: {
        Row: {
          id: string;
          profile_id: string;
          username: string;
          display_name: string;
          full_name: string;
          first_name: string;
          last_name: string;
          email: string;
          avatar_url: string;
          bio: string;
          interests: any[];
          custom_status: string;
          vibe_preference: string;
          live_scope: string;
          live_accuracy: string;
          live_auto_when: any[];
          live_muted_until: string;
          live_smart_flags: any;
          profile_created: boolean;
          push_token: string;
          created_at: string;
          updated_at: string;
        };
      };
      v_friend_visits: {
        Row: {
          venue_id: string;
          friend_pairs: any;
        };
      };
      v_encounter_heat: {
        Row: {
          venue_id: string;
          hits: number;
          last_seen: string;
          geom: string;
        };
      };
      v_user_plans: {
        Row: {
          profile_id: string;
          plan_id: string;
          title: string;
          starts_at: string;
          ends_at: string;
          vibe_tag: string;
          status: string;
          role: string;
          owner: any;
        };
      };
      v_trending_venues: {
        Row: {
          venue_id: string;
          people_now: number;
          visits_15m: number;
          trend_score: number;
          last_seen_at: string;
        };
      };
      v_venue_people_now: {
        Row: {
          venue_id: string;
          people_now: number;
          last_seen_at: string;
        };
      };
      v_friends_flat: {
        Row: {
          profile_low: string;
          profile_high: string;
          friend_state: string;
          created_at: string;
          responded_at: string;
          is_close: boolean;
        };
      };
      v_public_floqs: {
        Row: {
          id: string;
          creator_id: string;
          title: string;
          location: string;
          catchment_area: string;
          walkable_zone: string;
          primary_vibe: string;
          starts_at: string;
          ends_at: string;
          max_participants: number;
          visibility: string;
          created_at: string;
          geo: string;
          radius_m: number;
          name: string;
          type: string;
          vibe_tag: string;
          expires_at: string;
          updated_at: string;
          flock_type: string;
          parent_flock_id: string;
          recurrence_pattern: any;
          flock_tags: any[];
          auto_created: boolean;
          activity_score: number;
          last_activity_at: string;
          deleted_at: string;
          description: string;
          pinned_note: string;
          archived_at: string;
          profile_id: string;
        };
      };
      v_chat_message: {
        Row: {
          id: string;
          floq_id: string;
          sender_id: string;
          body: string;
          emoji: string;
          created_at: string;
          status: string;
          delivery_state: string;
          mentions: any;
        };
      };
      v_venue_visits: {
        Row: {
          id: number;
          venue_id: string;
          arrived_at: string;
          departed_at: string;
          distance_m: number;
          day_key: string;
          profile_id: string;
          left_at: string;
          source: string;
          profile_id_norm: string;
          visited_at: string;
        };
      };
      v_user_vibe_states: {
        Row: {
          vibe_tag: string;
          started_at: string;
          location: string;
          active: boolean;
          visible_to: string;
          gh5: string;
          vibe_h: number;
          vibe_s: number;
          vibe_l: number;
          profile_id: string;
          profile_id_norm: string;
        };
      };
      v_friend_last_seen: {
        Row: {
          current_profile_id: string;
          other_profile_id: string;
          last_seen_at: string;
          friend_state: string;
        };
      };
      v_crossed_paths: {
        Row: {
          id: number;
          user_a: string;
          user_b: string;
          venue_id: string;
          ts: string;
          encounter_date: string;
          created_at: string;
          profile_id: string;
          profile_id_norm: string;
        };
      };
      v_friend_requests: {
        Row: {
          id: string;
          requester_id: string;
          me: string;
          created_at: string;
        };
      };
      v_friend_sparkline: {
        Row: {
          profile_id: string;
          other_profile_id: string;
          recent_vibes: any[];
          last_seen_at: string;
        };
      };
    };
  };
};

