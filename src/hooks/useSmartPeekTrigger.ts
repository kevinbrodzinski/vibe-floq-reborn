import { useMemo } from 'react';
import { useJoinIntent } from './useJoinIntent';
import { openFloqPeek } from '@/lib/peek';
import type { FloqCardItem } from '@/components/floqs/cards/FloqCard';

interface SmartPeekOptions {
  userBehavior?: 'curious' | 'decisive' | 'social';
  friendsInside?: number;
  compatibility?: number;
  previousInteraction?: boolean;
}

export function useSmartPeekTrigger(floqId: string, item: FloqCardItem, options: SmartPeekOptions = {}) {
  const { stage } = useJoinIntent(floqId);
  const {
    userBehavior = 'curious',
    friendsInside = item.friends_in || 0,
    compatibility = 0.5,
    previousInteraction = false
  } = options;

  const smartStage = useMemo(() => {
    // Auto-advance logic based on context
    if (stage === 'commit') return 'commit';
    
    // If user has friends inside and high compatibility, skip to considering
    if (friendsInside >= 2 && compatibility > 0.7) {
      return 'consider';
    }
    
    // If user previously interacted with this floq, start at considering
    if (previousInteraction && stage !== 'watch') {
      return 'consider';
    }
    
    // Social users with friends inside start at considering
    if (userBehavior === 'social' && friendsInside > 0) {
      return 'consider';
    }
    
    // Decisive users with decent compatibility jump to considering
    if (userBehavior === 'decisive' && compatibility > 0.6) {
      return 'consider';
    }
    
    // Default to watching for discovery
    return 'watch';
  }, [stage, friendsInside, compatibility, previousInteraction, userBehavior]);

  const triggerSmartPeek = () => {
    openFloqPeek(floqId, smartStage);
  };

  return {
    smartStage,
    triggerSmartPeek,
    shouldAutoAdvance: smartStage !== 'watch'
  };
}