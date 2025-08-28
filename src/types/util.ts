// Type utilities for cleaning up complex Supabase types
export type Simplify<T> = { [K in keyof T]: T[K] } & {}
export type Json = string | number | boolean | null | { [k: string]: Json } | Json[]

// Database type aliases for cleaner code
import type { Database } from '@/integrations/supabase/types'

export type Row<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type Insert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type Update<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']