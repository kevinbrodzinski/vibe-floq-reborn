import { create } from 'zustand';
import { Achievement } from '@/hooks/useAchievements';

interface AchievementToastEvent {
  id: string;
  achievement: Achievement;
  timestamp: number;
  dismissed?: boolean;
}

interface AchievementToastStore {
  events: AchievementToastEvent[];
  pushAchievementEvent: (achievement: Achievement) => void;
  dismissEvent: (id: string) => void;
  clearExpiredEvents: () => void;
}

// Throttling logic to prevent cascade effects
const TOAST_THROTTLE_WINDOW = 5000; // 5 seconds
const MAX_TOASTS_PER_WINDOW = 3;

export const useAchievementToastStore = create<AchievementToastStore>((set, get) => ({
  events: [],
  
  pushAchievementEvent: (achievement: Achievement) => {
    const now = Date.now();
    const { events } = get();
    
    // Check for throttling
    const recentEvents = events.filter(
      event => now - event.timestamp < TOAST_THROTTLE_WINDOW && !event.dismissed
    );
    
    if (recentEvents.length >= MAX_TOASTS_PER_WINDOW) {
      console.log('Achievement toast throttled - too many recent events');
      return;
    }
    
    // Check for duplicate recent achievement
    const isDuplicate = recentEvents.some(
      event => event.achievement.code === achievement.code
    );
    
    if (isDuplicate) {
      console.log('Achievement toast skipped - duplicate achievement');
      return;
    }
    
    const newEvent: AchievementToastEvent = {
      id: `achievement-${achievement.code}-${now}`,
      achievement,
      timestamp: now,
    };
    
    set(state => ({
      events: [newEvent, ...state.events].slice(0, 10) // Keep max 10 events
    }));
  },
  
  dismissEvent: (id: string) => {
    set(state => ({
      events: state.events.map(event =>
        event.id === id ? { ...event, dismissed: true } : event
      )
    }));
  },
  
  clearExpiredEvents: () => {
    const now = Date.now();
    const EXPIRE_TIME = 60000; // 1 minute
    
    set(state => ({
      events: state.events.filter(
        event => now - event.timestamp < EXPIRE_TIME
      )
    }));
  },
}));