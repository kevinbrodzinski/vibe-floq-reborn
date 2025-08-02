// Type extensions for Supabase RPC functions used in push notifications

import type { Database } from './database';

declare module '@supabase/supabase-js' {
  interface SupabaseClient<
    DatabaseGeneric = any,
    SchemaName = 'public',
    Schema = DatabaseGeneric[SchemaName]
  > {
    rpc(
      fn: 'store_push_token',
      args: {
        p_device_id: string;
        p_token: string;
        p_platform: string;
      }
    ): PostgrestFilterBuilder<any, any, any>;
    
    rpc(
      fn: 'reset_badge'
    ): PostgrestFilterBuilder<any, any, any>;
  }
}