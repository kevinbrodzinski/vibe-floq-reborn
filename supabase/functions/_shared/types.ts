// Shared types for collaborative planning edge functions

export interface SubmitVoteRequest {
  plan_id: string;
  stop_id: string;
  vote_type: 'love' | 'like' | 'neutral' | 'dislike' | 'veto';
  emoji_reaction?: string;
  comment?: string;
}

export interface SuggestVenuesRequest {
  plan_id: string;
  budget_range?: { min: number; max: number };
  radius_km?: number;
}

export interface FinalizePlanRequest {
  plan_id: string;
  force_finalize?: boolean;
}

export interface InviteExternalFriendsRequest {
  plan_id: string;
  emails: string[];
  message?: string;
}

export interface SyncPlanChangesRequest {
  plan_id: string;
  changes: {
    type: 'reorder_stops' | 'update_stop' | 'presence_update';
    data: any;
  };
}

export interface ReorderStopsData {
  stop_order: string[];
}

export interface UpdateStopData {
  stop_id: string;
  updates: {
    title?: string;
    description?: string;
    start_time?: string;
    end_time?: string;
    estimated_cost_per_person?: number;
  };
}

export interface PresenceUpdateData {
  user_id: string;
  cursor_position?: { x: number; y: number };
  editing_field?: string;
  last_seen: string;
}