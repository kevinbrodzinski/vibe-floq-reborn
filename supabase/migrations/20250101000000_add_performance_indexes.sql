-- Performance Indexes Migration
-- Adds critical indexes for database performance optimization

BEGIN;

-- 1. Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles (username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles (created_at);

-- 2. Floqs table indexes
CREATE INDEX IF NOT EXISTS idx_floqs_creator_id ON public.floqs (creator_id);
CREATE INDEX IF NOT EXISTS idx_floqs_location ON public.floqs USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_floqs_created_at ON public.floqs (created_at);
CREATE INDEX IF NOT EXISTS idx_floqs_primary_vibe ON public.floqs (primary_vibe);

-- 3. Vibes_now table indexes (frequently queried for presence)
CREATE INDEX IF NOT EXISTS idx_vibes_now_profile_id ON public.vibes_now (profile_id);
CREATE INDEX IF NOT EXISTS idx_vibes_now_location ON public.vibes_now USING GIST (ST_Point(lat, lng));
CREATE INDEX IF NOT EXISTS idx_vibes_now_updated_at ON public.vibes_now (updated_at);
CREATE INDEX IF NOT EXISTS idx_vibes_now_vibe ON public.vibes_now (vibe);
CREATE INDEX IF NOT EXISTS idx_vibes_now_h3_7 ON public.vibes_now (h3_7);

-- 4. Location history indexes (for trajectory analysis)
CREATE INDEX IF NOT EXISTS idx_location_history_profile_id ON public.location_history (profile_id);
CREATE INDEX IF NOT EXISTS idx_location_history_recorded_at ON public.location_history (recorded_at);
CREATE INDEX IF NOT EXISTS idx_location_history_location ON public.location_history USING GIST (ST_Point(latitude, longitude));
CREATE INDEX IF NOT EXISTS idx_location_history_profile_time ON public.location_history (profile_id, recorded_at);

-- 5. Friendships indexes
CREATE INDEX IF NOT EXISTS idx_friendships_requester_id ON public.friendships (requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee_id ON public.friendships (addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON public.friendships (status);
CREATE INDEX IF NOT EXISTS idx_friendships_created_at ON public.friendships (created_at);

-- 6. Floq messages indexes
CREATE INDEX IF NOT EXISTS idx_floq_messages_floq_id ON public.floq_messages (floq_id);
CREATE INDEX IF NOT EXISTS idx_floq_messages_sender_id ON public.floq_messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_floq_messages_created_at ON public.floq_messages (created_at);
CREATE INDEX IF NOT EXISTS idx_floq_messages_floq_created ON public.floq_messages (floq_id, created_at);

-- 7. Venues indexes
CREATE INDEX IF NOT EXISTS idx_venues_location ON public.venues USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_venues_name ON public.venues (name);
CREATE INDEX IF NOT EXISTS idx_venues_rating ON public.venues (rating);
CREATE INDEX IF NOT EXISTS idx_venues_category ON public.venues (category);

-- 8. Presence events indexes
CREATE INDEX IF NOT EXISTS idx_presence_events_profile_id ON public.presence_events (profile_id);
CREATE INDEX IF NOT EXISTS idx_presence_events_created_at ON public.presence_events (created_at);
CREATE INDEX IF NOT EXISTS idx_presence_events_event_type ON public.presence_events (event_type);

-- 9. Flock relationships indexes
CREATE INDEX IF NOT EXISTS idx_flock_relationships_user_a ON public.flock_relationships (user_a_id);
CREATE INDEX IF NOT EXISTS idx_flock_relationships_user_b ON public.flock_relationships (user_b_id);
CREATE INDEX IF NOT EXISTS idx_flock_relationships_strength ON public.flock_relationships (relationship_strength);
CREATE INDEX IF NOT EXISTS idx_flock_relationships_interaction ON public.flock_relationships (last_interaction_at);

-- 10. Plan participants indexes
CREATE INDEX IF NOT EXISTS idx_plan_participants_plan_id ON public.plan_participants (plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_participants_profile_id ON public.plan_participants (profile_id);
CREATE INDEX IF NOT EXISTS idx_plan_participants_role ON public.plan_participants (role);

-- 11. Collaborative plans indexes
CREATE INDEX IF NOT EXISTS idx_collaborative_plans_created_by ON public.collaborative_plans (created_by);
CREATE INDEX IF NOT EXISTS idx_collaborative_plans_status ON public.collaborative_plans (status);
CREATE INDEX IF NOT EXISTS idx_collaborative_plans_start_date ON public.collaborative_plans (start_date);
CREATE INDEX IF NOT EXISTS idx_collaborative_plans_floq_id ON public.collaborative_plans (floq_id);

-- 12. Daily afterglow indexes
CREATE INDEX IF NOT EXISTS idx_daily_afterglow_user_id ON public.daily_afterglow (user_id);
CREATE INDEX IF NOT EXISTS idx_daily_afterglow_date ON public.daily_afterglow (date);
CREATE INDEX IF NOT EXISTS idx_daily_afterglow_user_date ON public.daily_afterglow (user_id, date);

-- 13. Floq afterglow indexes
CREATE INDEX IF NOT EXISTS idx_floq_afterglow_user_id ON public.floq_afterglow (user_id);
CREATE INDEX IF NOT EXISTS idx_floq_afterglow_floq_id ON public.floq_afterglow (floq_id);
CREATE INDEX IF NOT EXISTS idx_floq_afterglow_date ON public.floq_afterglow (date);

-- 14. Activity score processor indexes
CREATE INDEX IF NOT EXISTS idx_activity_events_floq_id ON public.activity_events (floq_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_profile_id ON public.activity_events (profile_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_event_type ON public.activity_events (event_type);
CREATE INDEX IF NOT EXISTS idx_activity_events_timestamp ON public.activity_events (timestamp);

-- 15. Ripple signals indexes
CREATE INDEX IF NOT EXISTS idx_ripple_signals_sender_id ON public.ripple_signals (sender_id);
CREATE INDEX IF NOT EXISTS idx_ripple_signals_created_at ON public.ripple_signals (created_at);
CREATE INDEX IF NOT EXISTS idx_ripple_signals_visibility ON public.ripple_signals (visibility);

-- 16. Social clusters indexes
CREATE INDEX IF NOT EXISTS idx_social_clusters_created_at ON public.social_clusters (created_at);
CREATE INDEX IF NOT EXISTS idx_social_clusters_cluster_type ON public.social_clusters (cluster_type);

-- 17. Venue metrics indexes
CREATE INDEX IF NOT EXISTS idx_venue_metrics_daily_venue_id ON public.venue_metrics_daily (venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_metrics_daily_date ON public.venue_metrics_daily (date);
CREATE INDEX IF NOT EXISTS idx_venue_metrics_daily_venue_date ON public.venue_metrics_daily (venue_id, date);

-- 18. Field tiles indexes
CREATE INDEX IF NOT EXISTS idx_field_tiles_h3_index ON public.field_tiles (h3_index);
CREATE INDEX IF NOT EXISTS idx_field_tiles_updated_at ON public.field_tiles (updated_at);
CREATE INDEX IF NOT EXISTS idx_field_tiles_v2_h3_index ON public.field_tiles_v2 (h3_index);
CREATE INDEX IF NOT EXISTS idx_field_tiles_v2_updated_at ON public.field_tiles_v2 (updated_at);

-- 19. Proximity system logs indexes
CREATE INDEX IF NOT EXISTS idx_proximity_system_logs_profile_id ON public.proximity_system_logs (profile_id);
CREATE INDEX IF NOT EXISTS idx_proximity_system_logs_created_at ON public.proximity_system_logs (created_at);

-- 20. Venue hours indexes
CREATE INDEX IF NOT EXISTS idx_venue_hours_venue_id ON public.venue_hours (venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_hours_day_of_week ON public.venue_hours (day_of_week);

-- Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_vibes_now_location_time ON public.vibes_now (updated_at, ST_Point(lat, lng));
CREATE INDEX IF NOT EXISTS idx_friendships_status_requester ON public.friendships (status, requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status_addressee ON public.friendships (status, addressee_id);
CREATE INDEX IF NOT EXISTS idx_floq_messages_floq_time ON public.floq_messages (floq_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_location_history_profile_time_desc ON public.location_history (profile_id, recorded_at DESC);

COMMIT;
