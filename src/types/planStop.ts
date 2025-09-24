export interface PlanStop {
  id: string;
  title: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  estimated_cost_per_person?: number;
  venue_id?: string; /* uuid */
  lat?: number;
  lng?: number;
  order_index: number;
  plan_id: string;
  created_at: string;
  updated_at: string;
}

export interface PlanStopVote {
  id: string;
  stop_id: string;
  voter_id: string;
  vote_type: 'love' | 'like' | 'neutral' | 'dislike' | 'veto';
  emoji_reaction?: string;
  comment?: string;
  created_at: string;
}