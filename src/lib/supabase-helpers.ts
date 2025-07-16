import { supabase } from "@/integrations/supabase/client";

// Type-safe Supabase query wrappers to handle the SelectQueryError issues

export const safeProfileUpdate = async (id: string, updates: { 
  avatar_url?: string | null;
  bio?: string;
  interests?: string[];
  custom_status?: string;
  display_name?: string;
}) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates as any)
    .eq('id', id as any)
    .select()
    .single();
    
  return { data, error };
};

export const safeUserSettingsQuery = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_settings')
    .select('available_until')
    .eq('user_id', userId as any)
    .maybeSingle();
    
  return { data, error };
};

export const safeVibesNowQuery = async (userId: string) => {
  const { data, error } = await supabase
    .from('vibes_now')
    .select('vibe, expires_at')
    .eq('user_id', userId as any)
    .maybeSingle();
    
  return { data, error };
};

export const safeGetUserByUsername = async (username: string) => {
  const { data, error } = await supabase.rpc('get_user_by_username', {
    lookup_username: username
  });
  
  return { data: data as any[], error };
};

// ======================================================
// PHASE 3B: INTELLIGENT ARCHIVE HELPERS
// ======================================================

export type Trend = 'improving' | 'declining' | 'stable';
export type ActivityRate = 'high' | 'medium' | 'low';

export interface SearchAfterglowsParams {
  searchQuery?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  minEnergy?: number | null;
  maxEnergy?: number | null;
  dominantVibe?: string | null;
  tags?: string[] | null;
  isPinned?: boolean | null;
  limit?: number;
  offset?: number;
}

export interface ExportParams {
  startDate?: string | null;
  endDate?: string | null;
}

export interface AfterglowSearchResult {
  id: string;
  date: string;
  energy_score: number;
  social_intensity: number;
  dominant_vibe: string;
  summary_text: string;
  total_venues: number;
  total_floqs: number;
  crossed_paths_count: number;
  vibe_path: string[];
  is_pinned: boolean;
  moments_count: number;
  created_at: string;
  search_rank: number;
}

export interface ArchiveStats {
  overview: {
    total_days: number;
    pinned_days: number;
    active_days: number;
    first_entry: string;
    latest_entry: string;
    total_moments: number;
  };
  energy_insights: {
    avg_energy_all_time: number;
    avg_energy_last_30: number;
    high_energy_days: number;
    energy_trend: Trend;
  };
  social_insights: {
    avg_social_all_time: number;
    avg_social_last_30: number;
    high_social_days: number;
    social_trend: Trend;
  };
  activity_summary: {
    total_venues_visited: number;
    total_floqs_joined: number;
    total_paths_crossed: number;
    most_common_vibe: string;
    vibe_distribution: Record<string, number>;
  };
  moments_insights: {
    total_moments: number;
    unique_moment_types: number;
    most_common_moment_type: string;
    avg_moments_per_day: number;
  };
  recent_activity: {
    days_logged_last_30: number;
    activity_rate_last_30: ActivityRate;
  };
}

export const searchAfterglows = async (params: SearchAfterglowsParams = {}): Promise<AfterglowSearchResult[]> => {
  const { data, error } = await supabase.rpc('search_afterglows', {
    p_search_query: params.searchQuery ?? null,
    p_start_date: params.startDate ?? null,
    p_end_date: params.endDate ?? null,
    p_min_energy: params.minEnergy ?? null,
    p_max_energy: params.maxEnergy ?? null,
    p_dominant_vibe: params.dominantVibe ?? null,
    p_tags: params.tags ?? null,
    p_is_pinned: params.isPinned ?? null,
    p_limit: params.limit ?? 20,
    p_offset: params.offset ?? 0
  });

  if (error) throw error;
  return data ?? [];
};

export const getArchiveStats = async (): Promise<ArchiveStats> => {
  const { data, error } = await supabase.rpc('get_archive_stats');
  
  if (error) throw error;
  return data;
};

export const exportAfterglowData = async (params: ExportParams = {}) => {
  const { data, error } = await supabase.rpc('export_afterglow_data', {
    p_start_date: params.startDate ?? null,
    p_end_date: params.endDate ?? null
  });

  if (error) throw error;
  return data;
};

// Favorites
export const addToFavorites = async (afterglowId: string) => {
  const { error } = await supabase
    .from('afterglow_favorites')
    .insert({ daily_afterglow_id: afterglowId });
  
  if (error) throw error;
};

export const removeFromFavorites = async (afterglowId: string) => {
  const { error } = await supabase
    .from('afterglow_favorites')
    .delete()
    .eq('daily_afterglow_id', afterglowId);
  
  if (error) throw error;
};

export const getFavorites = async () => {
  const { data, error } = await supabase
    .from('afterglow_favorites')
    .select(`
      id,
      created_at,
      daily_afterglow:daily_afterglow_id (
        id,
        date,
        energy_score,
        social_intensity,
        dominant_vibe,
        summary_text,
        is_pinned
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

// Collections
export interface Collection {
  id: string;
  name: string;
  description?: string;
  color?: string;
  created_at?: string;
  updated_at?: string;
  user_id: string;
  itemCount?: number;
}

export const createCollection = async (name: string, description?: string, color = '#3b82f6') => {
  const { data, error } = await supabase
    .from('afterglow_collections')
    .insert({ name, description, color })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getCollections = async (): Promise<Collection[]> => {
  const { data, error } = await supabase
    .from('afterglow_collections')
    .select(`
      id,
      name,
      description,
      color,
      created_at,
      updated_at,
      user_id,
      afterglow_collection_items(count)
    `)
    .order('updated_at', { ascending: false });
  
  if (error) throw error;
  
  // Transform the data to include itemCount
  const collections = data?.map(collection => ({
    ...collection,
    itemCount: collection.afterglow_collection_items?.[0]?.count || 0
  })) || [];
  
  return collections;
};

export const updateCollection = async (id: string, updates: Partial<Collection>) => {
  const { error } = await supabase
    .from('afterglow_collections')
    .update(updates)
    .eq('id', id);

  if (error) throw error;
};

export const deleteCollection = async (id: string) => {
  const { error } = await supabase
    .from('afterglow_collections')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const addToCollection = async (collectionId: string, afterglowId: string) => {
  const { error } = await supabase
    .from('afterglow_collection_items')
    .insert({ collection_id: collectionId, daily_afterglow_id: afterglowId });

  if (error) throw error;
};

export const removeFromCollection = async (collectionId: string, afterglowId: string) => {
  const { error } = await supabase
    .from('afterglow_collection_items')
    .delete()
    .eq('collection_id', collectionId)
    .eq('daily_afterglow_id', afterglowId);

  if (error) throw error;
};

export const getCollectionItems = async (collectionId: string) => {
  const { data, error } = await supabase
    .from('afterglow_collection_items')
    .select(`
      added_at,
      daily_afterglow:daily_afterglow_id (
        id,
        date,
        energy_score,
        social_intensity,
        dominant_vibe,
        summary_text,
        is_pinned
      )
    `)
    .eq('collection_id', collectionId)
    .order('added_at', { ascending: false });

  if (error) throw error;
  return data || [];
};