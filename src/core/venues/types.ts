import type { Vibe } from '@/lib/vibes';

export type VenueType =
  | 'nightclub' | 'bar' | 'coffee' | 'restaurant' | 'gym' | 'park'
  | 'office' | 'school' | 'museum' | 'theater' | 'music_venue' | 'stadium'
  | 'hotel' | 'store' | 'transit' | 'home' | 'general';

export type Provider = 'google' | 'foursquare' | 'gps' | 'cache';

export type VenueClass = {
  type: VenueType;
  energyBase: number;          // 0..1 coarse energy
  name?: string;
  provider: Provider;
  distanceM?: number;
  lat?: number; 
  lng?: number;
  categories?: string[];       // raw categories (DEV only)
  vibesHint?: Partial<Record<Vibe, number>>;
  confidence01: number;
};

export type ProviderResult = {
  ok: boolean;
  name?: string;
  lat?: number; 
  lng?: number;
  distanceM?: number;
  types?: string[];
  categories?: string[];
  rating?: number;  // 0..5 if present
  userRatings?: number;
  openNow?: boolean;
  provider: Provider;
  etag?: string;    // cache validators
};

export type VenueTypeResult = {
  venueType: VenueType;
  confidence: number;            // 0..1
  reasons: string[];             // why we picked it
  matchedTokens: string[];       // which tokens matched
};