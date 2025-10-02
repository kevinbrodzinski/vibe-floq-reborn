import { useRef } from 'react';

type Ach = 'speed_runner' | 'party_animal' | 'lone_wolf' | 'quick_learner';
type Seen = Partial<Record<Ach, boolean>>;

export function useOnboardingAchievements() {
  const seen = useRef<Seen>({});

  function maybeUnlock(key: Ach, show: (title: string, desc: string) => void) {
    if (seen.current[key]) return;
    seen.current[key] = true;
    
    const copy: Record<Ach, { t: string; d: string }> = {
      speed_runner: { t: 'Achievement Unlocked', d: 'Completed onboarding in under 2 minutes' },
      party_animal: { t: 'Party Animal', d: 'You picked high-energy vibes' },
      lone_wolf: { t: 'Lone Wolf', d: 'Rolling solo—respect' },
      quick_learner: { t: 'Quick Learner', d: 'You flew through setup' },
    };
    
    show(copy[key].t, copy[key].d);
  }

  return { maybeUnlock };
}
