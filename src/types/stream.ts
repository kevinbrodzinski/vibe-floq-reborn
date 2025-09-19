export type SmartFilter = 'all' | 'unread' | 'rally' | 'photos' | 'plans' | 'wings';

export type SmartItem = {
  id: string;
  kind: 'message' | 'moment' | 'plan' | 'wings_poll' | 'wings_time' | 'wings_meet' | 'rally';
  created_at: string;
  score: number;
  meta: any;
};