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
  price?: string;
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