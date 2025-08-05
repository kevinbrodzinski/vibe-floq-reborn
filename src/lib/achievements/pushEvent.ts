import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Achievement catalogue cache to avoid repeated DB calls for toast notifications
const ACHIEVEMENT_MAP: Record<string, { name: string; description: string; icon: string }> = {
  first_friend: { name: 'Social Butterfly', description: 'Add your first friend', icon: 'UserPlus' },
  explorer: { name: 'Explorer', description: 'Check in at 3 unique venues', icon: 'MapPin' },
  social_vibe_master: { name: 'Social Vibe Master', description: 'Spend 2 hours in Social vibe', icon: 'Heart' },
};

export type AchievementEvent = 'friend_added' | 'vibe_logged' | 'venue_checkin';

// Debouncing for vibe events to prevent spam with localStorage persistence
const VIBE_DEBOUNCE_MS = 10_000; // 10 seconds between vibe events
const DEBOUNCE_STORAGE_KEY = 'achievement_debounce';

// Offline queue for failed requests
const OFFLINE_QUEUE_KEY = 'achievement_offline_queue';
interface QueuedEvent {
  event: AchievementEvent;
  payload: Record<string, any>;
  timestamp: number;
  retryCount: number;
}

// Load debounce state from localStorage
function loadDebounceState(): Map<string, number> {
  try {
    const stored = localStorage.getItem(DEBOUNCE_STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      return new Map(Object.entries(data).map(([k, v]) => [k, v as number]));
    }
  } catch (error) {
    console.warn('Failed to load debounce state:', error);
  }
  return new Map();
}

// Save debounce state to localStorage
function saveDebounceState(debounceMap: Map<string, number>) {
  try {
    const data = Object.fromEntries(debounceMap);
    localStorage.setItem(DEBOUNCE_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save debounce state:', error);
  }
}

// Load offline queue from localStorage
function loadOfflineQueue(): QueuedEvent[] {
  try {
    const stored = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn('Failed to load offline queue:', error);
    return [];
  }
}

// Save offline queue to localStorage
function saveOfflineQueue(queue: QueuedEvent[]) {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.warn('Failed to save offline queue:', error);
  }
}

const vibeEventDebounce = loadDebounceState();

export async function pushAchievementEvent(
  event: AchievementEvent,
  payload: Record<string, any> = {}
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('Achievement event ignored: user not authenticated');
      return;
    }

    // Validate payload for each event type
    if (!validateEventPayload(event, payload)) {
      console.warn(`Invalid payload for ${event}:`, payload);
      return;
    }

    // Process offline queue first
    await processOfflineQueue();

    switch (event) {
      case 'friend_added':
        await maybeAwardWithRetry(user.id, 'first_friend', 1, event, payload);
        break;

      case 'vibe_logged':
        if (payload.vibe === 'social' && payload.duration_sec > 0) {
          // Debounce vibe events to prevent spam with persistent state
          const debounceKey = `${user.id}-vibe-${payload.vibe}`;
          const lastEvent = vibeEventDebounce.get(debounceKey) || 0;
          const now = Date.now();
          
          if (now - lastEvent < VIBE_DEBOUNCE_MS) {
            console.debug('Vibe event debounced');
            return;
          }
          
          vibeEventDebounce.set(debounceKey, now);
          saveDebounceState(vibeEventDebounce);
          
          await maybeAwardWithRetry(user.id, 'social_vibe_master', payload.duration_sec, event, payload);
        }
        break;

      case 'venue_checkin':
        if (payload.venue_id) {
          await maybeAwardWithRetry(user.id, 'explorer', 1, event, payload);
        }
        break;
    }
  } catch (error) {
    console.error('Achievement event error:', error);
    // Don't rethrow - achievements should never break app flow
  }
}

// Process any queued offline events
async function processOfflineQueue() {
  const queue = loadOfflineQueue();
  if (queue.length === 0) return;

  const processedQueue: QueuedEvent[] = [];
  
  for (const queuedEvent of queue) {
    try {
      // Retry event if not too old (max 24 hours) and hasn't exceeded retry limit
      const isNotTooOld = Date.now() - queuedEvent.timestamp < 24 * 60 * 60 * 1000;
      const hasRetriesLeft = queuedEvent.retryCount < 3;
      
      if (isNotTooOld && hasRetriesLeft) {
        await pushAchievementEvent(queuedEvent.event, queuedEvent.payload);
        console.debug('Processed queued achievement event:', queuedEvent.event);
      }
    } catch (error) {
      // If still failing, re-queue with incremented retry count
      queuedEvent.retryCount++;
      if (queuedEvent.retryCount < 3) {
        processedQueue.push(queuedEvent);
      }
    }
  }
  
  saveOfflineQueue(processedQueue);
}

// Enhanced award function with offline support
async function maybeAwardWithRetry(
  profileId: string, 
  code: string, 
  increment: number, 
  event: AchievementEvent,
  payload: Record<string, any>
) {
  try {
    // Try edge function first (production approach)
    if (typeof window !== 'undefined' && navigator.onLine) {
      try {
        const response = await supabase.functions.invoke('award-achievement', {
          body: { code, increment }
        });
        
        if (response.error) throw response.error;
        
        const result = response.data;
        
        // Show toast notification for newly earned achievements
        if (result.achievement_earned === true) {
          const achievement = ACHIEVEMENT_MAP[code];
          if (achievement) {
            toast({
              title: '🎉 Achievement unlocked!',
              description: achievement.name,
            });
          }
        }
        
        return;
      } catch (edgeFunctionError) {
        console.warn('Edge function failed, falling back to direct RPC:', edgeFunctionError);
      }
    }

    // Fallback to direct RPC call
    await maybeAward(profileId, code, increment);
    
  } catch (error) {
    console.error('Achievement award failed, queuing for retry:', error);
    
    // Queue for offline retry
    const queue = loadOfflineQueue();
    queue.push({
      event,
      payload,
      timestamp: Date.now(),
      retryCount: 0
    });
    saveOfflineQueue(queue);
  }
}

function validateEventPayload(event: AchievementEvent, payload: Record<string, any>): boolean {
  switch (event) {
    case 'friend_added':
      return true; // No additional payload required
    case 'vibe_logged':
      return payload.vibe && typeof payload.duration_sec === 'number' && payload.duration_sec > 0;
    case 'venue_checkin':
      return !!payload.venue_id;
    default:
      return false;
  }
}

async function maybeAward(profileId: string, code: string, increment: number) {
  try {
    const { data: wasEarned, error } = await supabase.rpc('award_if_goal_met', {
      _user: profileId,
      _code: code,
      _increment: increment,
    });

    if (error) {
      console.error('Achievement award error:', error);
      return;
    }

    // Show toast notification for newly earned achievements
    if (wasEarned === true) {
      const achievement = ACHIEVEMENT_MAP[code];
      if (achievement) {
        toast({
          title: '🎉 Achievement unlocked!',
          description: achievement.name,
        });
      }
    }
  } catch (error) {
    console.error('Achievement award error:', error);
  }
}