// Unified intelligence types to prevent client/server payload mismatches

export type IntelligenceMode =
  | 'afterglow'
  | 'daily'
  | 'weekly'
  | 'plan'
  | 'floq-match'
  | 'shared-activity-suggestions'
  | 'personal-insights'
  | 'activity-suggestions'
  | 'friend-matching';

export interface IntelligencePayload {
  // Common parameters
  prompt?: string;
  temperature?: number;
  max_tokens?: number;
  
  // Mode-specific parameters
  profile_id?: string;
  plan_id?: string;
  floq_id?: string;
  date?: string;
  afterglow_id?: string;
  plan_mode?: 'finalized' | 'afterglow';
  lat?: number;
  lng?: number;
  context?: Record<string, unknown>;
  time_range?: string;
}

export interface IntelligenceRequest {
  mode: IntelligenceMode;
  [key: string]: any; // Allow additional mode-specific fields
}

// Strongly typed AI edge function responses
export type AiInsightsResponse = import('@/types/insights').PersonalInsights;
export type AiActivityResponse = { suggestions: import('@/types/recommendations').SmartActivitySuggestion[] };
export type AiFriendsResponse = { suggestions: import('@/types/recommendations').IntelligentFriendSuggestion[] };

// Intelligence input contract for validation
export type IntelligenceInput =
  | { 
      mode: 'personal-insights'; 
      profile_id: string; 
      time_range: import('@/types/insights').TimeRange; 
      temperature: number; 
      max_tokens: number;
    }
  | { 
      mode: 'activity-suggestions'; 
      profile_id: string; 
      lat: number; 
      lng: number; 
      context: { 
        type: import('@/types/recommendations').ContextType; 
        groupSize: number; 
        timeContext: import('@/types/recommendations').TimeCtx; 
        vibe?: string | null; 
        timestamp: string;
      }; 
      temperature: number; 
      max_tokens: number;
    }
  | { 
      mode: 'friend-matching'; 
      profile_id: string; 
      context: { 
        lat?: number | null; 
        lng?: number | null; 
        limit: number; 
        timestamp: string;
      }; 
      temperature: number; 
      max_tokens: number;
    };