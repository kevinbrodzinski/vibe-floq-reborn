
import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Always call this instead of supabase.channel().
 * Works in both supabase-js v2 and v1.
 */
export const rtChannel = <T = any>(
  client: SupabaseClient,
  name: string,
) => {
  // v2 prototype
  if (typeof (client as any).channel === 'function') {
    return (client as any).channel<T>(name)
  }
  // v1 fallback
  return (client as any).realtime.channel<T>(name)
}
