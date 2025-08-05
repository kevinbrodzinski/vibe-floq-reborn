// Type overrides for generated Supabase types
import type { Json } from '@/integrations/supabase/types';

declare module '@/integrations/supabase/types' {
  interface ProximityEventRecord {
    ml_features?: Json;
    profile_id_a?: string;
    profile_id_b?: string;
    distance_meters?: number;
    confidence?: number;
  }
  
  interface LocationPoint {
    accuracy?: number;
  }
}