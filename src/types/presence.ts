export type LngLat = { lng: number; lat: number };

export type PresenceKind = 'friend' | 'self' | 'venue';

export type PresencePayload = {
  kind: PresenceKind;
  id: string;
  name?: string;
  lngLat?: LngLat;
  color?: string;
  
  // Optional presence signals for friend/self
  energy01?: number;
  direction?: "up" | "flat" | "down";
  etaMin?: number;
  distanceM?: number;
  venueName?: string;
  openNow?: boolean;

  // Optional visuals
  avatarUrl?: string;

  // For venue cards
  category?: string;
  rating?: number;
  userRatings?: number;
  
  // Raw properties if needed
  properties?: Record<string, any>;
};

export type Friend = {
  id: string;
  name?: string;
  lat?: number;
  lng?: number;
  tier?: 'bestie' | 'friend';
};

export type ConvergePeer = {
  id?: string;
  lngLat?: LngLat;
  energy01?: number;
  direction?: 'up' | 'down' | 'flat';
};

export type ConvergeInputs = {
  peer: ConvergePeer;
  anchor?: LngLat | null;
};

export type VenueCandidate = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category?: string;
  openNow?: boolean; // undefined => unknown
  crowd?: number;
};

export type RankedPoint = {
  id: string;
  name: string;
  lng: number;
  lat: number;
  category?: string;
  match: number; // 0..1
  eta: { meMin: number; friendMin: number };
};