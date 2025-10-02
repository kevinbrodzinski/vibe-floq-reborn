import { useEffect, useState } from 'react';
import { OnboardingShell } from '../OnboardingShell';
import { GlassCard } from '../shared/GlassCard';
import { Button } from '@/components/ui/button';
import { haptic } from '@/lib/haptics';
import type { OnboardingMachine } from '@/hooks/useOnboardingMachine';
import type { Friend } from '@/lib/friends/adapter';

type Mode = 'idle' | 'success';

function AvatarRow({ friends }: { friends: Friend[] }) {
  return (
    <div className="flex justify-center -space-x-2">
      {friends.slice(0, 6).map((f) => (
        <div key={f.id} className="h-9 w-9 rounded-full bg-white/10 border border-white/15 grid place-items-center text-sm">
          {f.initials}
        </div>
      ))}
      {friends.length > 6 && (
        <div className="h-9 w-9 rounded-full bg-white/10 border border-white/15 grid place-items-center text-sm">
          +{friends.length - 6}
        </div>
      )}
    </div>
  );
}

type Props = {
  machine: OnboardingMachine;
};

export function NudgesStep({ machine }: Props) {
  const [mode, setMode] = useState<Mode>('idle');
  const [friends, setFriends] = useState<Friend[]>([]);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    void import('@/lib/friends/adapter').then(m => m.devFriendsAdapter.findExisting().then(setFriends));
  }, []);

  const doInstagram = async () => {
    haptic('medium');
    // In dev, use fixtures; in prod, would call real import
    if (process.env.NODE_ENV === 'development') {
      setFriends(await import('@/lib/friends/adapter').then(m => m.devFriendsAdapter.findExisting()));
    }
    setMode('success');
  };

  const skip = () => {
    machine.goNext();
  };

  const addAll = () => {
    haptic('medium');
    // Future: upsert friend links
    machine.goNext();
  };

  if (mode === 'idle') {
    return (
      <OnboardingShell
        machine={machine}
        title="FIND YOUR PEOPLE"
        headerVariant="section"
        showProgress={true}
        pager={{ index: 4, count: 7 }}
        nextLabel="Skip for now"
      >
        <div className="mx-auto w-full max-w-md space-y-4">
          <p className="text-white/70">We'll check who's already here</p>

          {/* Instagram card (PRIMARY) */}
          <GlassCard className="p-5 rounded-3xl border border-[var(--accent-violet-400)]/40">
            <div className="text-white font-medium">Instagram</div>
            <div className="text-sm text-white/70 mt-1">Import your social graph</div>
            <div className="mt-4">
              <Button className="rounded-full" onClick={doInstagram}>
                Connect
              </Button>
            </div>
          </GlassCard>

          {/* Skip for now card (SECONDARY) */}
          <GlassCard className="p-5 rounded-3xl border border-white/10">
            <div className="text-white font-medium">Skip for now</div>
            <div className="text-sm text-white/70 mt-1">Add friends later</div>
            <div className="mt-4">
              <Button variant="ghost" onClick={skip} className="text-white/80">
                Continue
              </Button>
            </div>
          </GlassCard>
        </div>
      </OnboardingShell>
    );
  }

  // mode === 'success'
  return (
    <OnboardingShell
      machine={machine}
      title="FIND YOUR PEOPLE"
      headerVariant="section"
      showProgress={true}
      pager={{ index: 4, count: 7 }}
      disableNav
    >
      <div className="mx-auto w-full max-w-md space-y-6">
        {/* Checkmark circle */}
        <div className="mx-auto h-16 w-16 rounded-full border border-[var(--accent-violet-400)]/40 grid place-items-center">
          <div className="h-6 w-6 rounded-full bg-[var(--accent-violet-400)]" />
        </div>

        <div className="text-center">
          <div className="text-white/90 text-lg">
            Found {Math.max(friends.length, 12)} friends!
          </div>
        </div>

        {/* Avatars row */}
        <AvatarRow friends={friends} />

        {/* Big green CTA */}
        <div className="pt-2">
          <Button
            className="w-full rounded-full h-12 bg-emerald-600 shadow-[0_12px_40px_rgba(16,185,129,0.35)]"
            onClick={addAll}
          >
            Add All Friends
          </Button>
        </div>
      </div>
    </OnboardingShell>
  );
}
