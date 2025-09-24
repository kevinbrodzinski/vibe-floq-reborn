// Enhanced error types for better error handling
export class DiscoveryError extends Error {
  constructor(
    message: string,
    public code: 'NETWORK_ERROR' | 'VALIDATION_ERROR' | 'AUTH_ERROR' | 'UNKNOWN_ERROR',
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'DiscoveryError';
  }
}

export interface DiscoveryFilters {
  radius: number;
  vibe: string;
  activityType: string;
  timeOfDay: string;
  groupSize: number;
  budget: string;
  duration: string;
}

export interface SmartRecommendation {
  id: string;
  title: string;
  type: 'venue' | 'floq';
  distance: number;
  vibe: string;
  participants?: number;
  maxParticipants?: number;
  startTime?: string;
  endTime?: string;
  status: 'open' | 'invite_only' | 'upcoming' | 'active' | 'full' | 'private';
  price?: '$' | '$$' | '$$$' | '$$$$';
  rating?: number;
  description?: string;
  location?: string;
  host?: {
    name: string;
    avatar?: string;
  };
  tags?: string[];
  isFavorite?: boolean;
  isWatching?: boolean;
  isRSVPd?: boolean;
  spotsLeft?: number;
  venueType?: string;
  atmosphere?: string;
  address?: string;
  categories?: string[];
  photo_url?: string;
  live_count?: number;
  score?: number; // For weighted scoring
}

// People Discovery Stack interfaces
export interface VibeBreakdown {
  overall: number;          // 0-100
  venueDNA: number;         // 0-100  
  timeRhythm: number;       // 0-100
  socialPattern: number;    // 0-100
}

export interface CrossStat {
  countWeek: number;
  lastVenue: string;
  lastAt: string;
  distance?: number; // meters from current location
}

export interface CommonVenue {
  venue_id: string; /* uuid */
  name: string;
  category: string;
  overlap_visits: number;
}

export interface PlanSuggestion {
  id: string;
  title: string;
  vibe: string;
  venue_type?: string;
  estimated_duration: string;
}