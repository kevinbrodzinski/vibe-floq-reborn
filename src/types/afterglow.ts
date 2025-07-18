export interface AfterglowMoment {
  id?: string;
  timestamp: string;
  title: string;
  description?: string;
  color: string;
  moment_type: string;
  metadata: Record<string, any>;
  daily_afterglow_id?: string;
}

export interface DailyAfterglowData {
  id: string;
  user_id: string;
  date: string;
  vibe_path: string[];
  emotion_journey: any[];
  peak_vibe_time?: string;
  dominant_vibe?: string;
  total_venues: number;
  total_floqs: number;
  crossed_paths_count: number;
  energy_score: number;
  social_intensity: number;
  summary_text: string;
  moments: string[]; // Simple array of moment strings for now
  is_pinned: boolean;
  created_at: string;
  regenerated_at?: string;
  ai_summary?: string;
  ai_summary_generated_at?: string;
}