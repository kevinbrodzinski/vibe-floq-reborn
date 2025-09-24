// Unified intelligence types to prevent client/server payload mismatches

export type IntelligenceMode =
  | 'afterglow'
  | 'daily'
  | 'weekly'
  | 'plan'
  | 'floq-match'
  | 'shared-activity-suggestions';

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
}

export interface IntelligenceRequest {
  mode: IntelligenceMode;
  [key: string]: any; // Allow additional mode-specific fields
}