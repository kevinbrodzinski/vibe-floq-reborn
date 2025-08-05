import type { Database as SupabaseDatabase } from '@/integrations/supabase/types'

// Re-export the Database type
export type Database = SupabaseDatabase;

// Export plan stop row type
export type PlanStopRow = Database['public']['Tables']['plan_stops']['Row'] & {
  venue?: Database['public']['Tables']['venues']['Row'];
};

// Export daily afterglow row type  
export type DailyAfterglowRow = Database['public']['Tables']['daily_afterglow']['Row'];

// Export JSON types
export type JsonArray = any[];
export type JsonObject = { [key: string]: any };

// Export additional types
export type UnreadCounts = {
  floq_id: string;
  profile_id: string;
  unread_total: number;
};