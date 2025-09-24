// Venue type extraction utility for consistent venue categorization
import type { VenueIntelligence } from '@/types/venues';

export function extractVenueType(
  vi?: VenueIntelligence | null
): string {
  if (!vi) return 'general';
  
  const t =
    (vi as any).placeData?.category ||
    (vi as any).placeData?.type ||
    (vi as any).vibeProfile?.primaryVibe || // fallback heuristic
    'general';
    
  return String(t).toLowerCase();
}