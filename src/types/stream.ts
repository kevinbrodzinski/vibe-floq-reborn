export type SmartFilter = 'all' | 'unread' | 'rally' | 'photos' | 'plans' | 'wings';

export type SmartItem = {
  id: string;
  kind: 'rally' | 'moment' | 'plan' | 'message' | 'wings_poll' | 'wings_time' | 'wings_meet' | 'venue_suggestion';
  ts: string;
  priority: number;
  unread: boolean;
  title?: string;
  body?: string;
  media?: { thumb_url: string }[];
  rally?: { venue: string; at: string; counts: { going: number; maybe: number; noreply: number }; scope?: 'field' | 'floq' };
  plan?: { title: string; at: string; status: 'locked' | 'building' | 'tentative' };
  meta?: { card_kind?: string; payload?: any; confidence?: number; [key: string]: any };
};