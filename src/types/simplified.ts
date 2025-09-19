// Simplified type aliases to reduce TypeScript compilation complexity
// This helps avoid timeouts caused by deep type inference in large generated files

import type { Database } from '@/integrations/supabase/types';

// Simplified Database shortcuts - reduces deep type traversal
export type SimpleProfile = {
  id: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  created_at?: string;
  [key: string]: any;
};

export type SimpleFloq = {
  id: string;
  name?: string;
  description?: string;
  privacy?: string;
  vibe?: string;
  created_at?: string;
  [key: string]: any;
};

// Type helper to avoid complex Database type lookups
export type AnyRow = { [key: string]: any };
export type AnyInsert = { [key: string]: any };
export type AnyUpdate = { [key: string]: any };

// Re-export essential types without complex inference
export type { Json } from '@/integrations/supabase/types';