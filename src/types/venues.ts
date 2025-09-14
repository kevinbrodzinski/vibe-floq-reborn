import { z } from "zod";
import type { Vibe } from "@/lib/vibes";

// Enhanced venue classification with vibe prediction
export interface VenueVibeProfile {
  primaryVibe: Vibe;
  secondaryVibe?: Vibe;
  energyLevel: number; // 0-1 scale
  socialFactor: number; // 0-1 scale (solo-friendly vs social)
  timeOfDayPreferences: {
    morning: number;
    afternoon: number;
    evening: number;
    night: number;
  };
  confidence: number; // 0-1 scale
}

// Enhanced venue intelligence combining multiple data sources
export interface VenueIntelligence {
  venueId: string;
  name: string;
  location: {
    lat: number;
    lng: number;
  };
  category: string;
  vibeProfile: VenueVibeProfile;
  realTimeMetrics: {
    currentOccupancy: number; // 0-1 estimated
    averageSessionMinutes: number;
    dominantVibe: Vibe;
    energyTrend: 'rising' | 'stable' | 'declining';
  };
  placeData: {
    isOpen: boolean;
    priceLevel?: number;
    rating?: number;
    totalRatings?: number;
    photos?: string[];
  };
  lastUpdated: number;
}

// Schema for enhanced place details with vibe-relevant fields
export const EnhancedPlaceDetailsSchema = z.object({
  id: z.string(),
  displayName: z.object({ text: z.string() }),
  formattedAddress: z.string(),
  types: z.array(z.string()).optional(),
  rating: z.number().optional(),
  userRatingCount: z.number().optional(),
  googleMapsUri: z.string().optional(),
  
  // Enhanced fields for vibe intelligence
  businessStatus: z.string().optional(),
  priceLevel: z.number().optional(),
  currentOpeningHours: z.object({
    openNow: z.boolean(),
    periods: z.array(z.object({
      open: z.object({
        day: z.number(),
        hour: z.number(),
        minute: z.number()
      }),
      close: z.object({
        day: z.number(),
        hour: z.number(),
        minute: z.number()
      }).optional()
    })).optional(),
    weekdayDescriptions: z.array(z.string()).optional()
  }).optional(),
  
  photos: z.array(z.object({
    name: z.string(),
    widthPx: z.number(),
    heightPx: z.number(),
    authorAttributions: z.array(z.object({
      displayName: z.string(),
      uri: z.string().optional(),
      photoUri: z.string().optional()
    })).optional()
  })).optional(),
  
  reviews: z.array(z.object({
    name: z.string(),
    relativePublishTimeDescription: z.string(),
    rating: z.number(),
    text: z.object({
      text: z.string(),
      languageCode: z.string().optional()
    }),
    originalText: z.object({
      text: z.string(),
      languageCode: z.string().optional()
    }).optional(),
    authorAttribution: z.object({
      displayName: z.string(),
      uri: z.string().optional(),
      photoUri: z.string().optional()
    }),
    publishTime: z.string().optional()
  })).optional(),
  
  // Location and geometry
  location: z.object({
    latitude: z.number(),
    longitude: z.number()
  }).optional(),
  
  // Additional vibe-relevant fields
  atmosphere: z.object({
    peaceful: z.boolean().optional(),
    romantic: z.boolean().optional(),
    upbeat: z.boolean().optional()
  }).optional(),
  
  goodFor: z.object({
    groups: z.boolean().optional(),
    children: z.boolean().optional(),
    couples: z.boolean().optional(),
    solo: z.boolean().optional()
  }).optional()
});

export type EnhancedPlaceDetails = z.infer<typeof EnhancedPlaceDetailsSchema>;

// Venue type to vibe mapping with time-of-day considerations
export const VENUE_VIBE_MAPPING: Record<string, VenueVibeProfile> = {
  nightclub: {
    primaryVibe: 'hype',
    secondaryVibe: 'social',
    energyLevel: 0.9,
    socialFactor: 0.95,
    timeOfDayPreferences: { morning: 0.1, afternoon: 0.2, evening: 0.7, night: 1.0 },
    confidence: 0.9
  },
  bar: {
    primaryVibe: 'social',
    secondaryVibe: 'chill',
    energyLevel: 0.7,
    socialFactor: 0.8,
    timeOfDayPreferences: { morning: 0.1, afternoon: 0.4, evening: 0.9, night: 0.8 },
    confidence: 0.8
  },
  coffee: {
    primaryVibe: 'focused',
    secondaryVibe: 'chill',
    energyLevel: 0.6,
    socialFactor: 0.4,
    timeOfDayPreferences: { morning: 1.0, afternoon: 0.8, evening: 0.3, night: 0.1 },
    confidence: 0.8
  },
  gym: {
    primaryVibe: 'energetic',
    secondaryVibe: 'focused',
    energyLevel: 0.8,
    socialFactor: 0.3,
    timeOfDayPreferences: { morning: 0.9, afternoon: 0.7, evening: 0.8, night: 0.4 },
    confidence: 0.9
  },
  park: {
    primaryVibe: 'chill',
    secondaryVibe: 'open',
    energyLevel: 0.4,
    socialFactor: 0.6,
    timeOfDayPreferences: { morning: 0.8, afternoon: 0.9, evening: 0.6, night: 0.3 },
    confidence: 0.7
  },
  restaurant: {
    primaryVibe: 'social',
    secondaryVibe: 'romantic',
    energyLevel: 0.6,
    socialFactor: 0.7,
    timeOfDayPreferences: { morning: 0.3, afternoon: 0.6, evening: 1.0, night: 0.7 },
    confidence: 0.7
  },
  office: {
    primaryVibe: 'focused',
    secondaryVibe: 'solo',
    energyLevel: 0.5,
    socialFactor: 0.2,
    timeOfDayPreferences: { morning: 0.9, afternoon: 1.0, evening: 0.3, night: 0.1 },
    confidence: 0.8
  },
  general: {
    primaryVibe: 'chill',
    energyLevel: 0.5,
    socialFactor: 0.5,
    timeOfDayPreferences: { morning: 0.5, afternoon: 0.6, evening: 0.6, night: 0.4 },
    confidence: 0.5
  }
};