import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Achievement catalogue cache to avoid repeated DB calls for toast notifications
const ACHIEVEMENT_MAP: Record<string, { name: string; description: string; icon: string }> = {
  first_friend: { name: 'Social Butterfly', description: 'Add your first friend', icon: 'UserPlus' },
  explorer: { name: 'Explorer', description: 'Check in at 3 unique venues', icon: 'MapPin' },
  social_vibe_master: { name: 'Social Vibe Master', description: 'Spend 2 hours in Social vibe', icon: 'Heart' },
};

export type AchievementEvent = 'friend_added' | 'vibe_logged' | 'venue_checkin';

// Debouncing for vibe events to prevent spam
const vibeEventDebounce = new Map<string, number>();
const VIBE_DEBOUNCE_MS = 10_000; // 10 seconds between vibe events

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

    switch (event) {
      case 'friend_added':
        await maybeAward(user.id, 'first_friend', 1);
        break;

      case 'vibe_logged':
        if (payload.vibe === 'social' && payload.duration_sec > 0) {
          // Debounce vibe events to prevent spam
          const debounceKey = `${user.id}-vibe-${payload.vibe}`;
          const lastEvent = vibeEventDebounce.get(debounceKey) || 0;
          const now = Date.now();
          
          if (now - lastEvent < VIBE_DEBOUNCE_MS) {
            console.debug('Vibe event debounced');
            return;
          }
          
          vibeEventDebounce.set(debounceKey, now);
          await maybeAward(user.id, 'social_vibe_master', payload.duration_sec);
        }
        break;

      case 'venue_checkin':
        if (payload.venue_id) {
          await maybeAward(user.id, 'explorer', 1);
        }
        break;
    }
  } catch (error) {
    console.error('Achievement event error:', error);
    // Don't rethrow - achievements should never break app flow
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

async function maybeAward(userId: string, code: string, increment: number) {
  try {
    const { data: wasEarned, error } = await supabase.rpc('award_if_goal_met', {
      _user: userId,
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