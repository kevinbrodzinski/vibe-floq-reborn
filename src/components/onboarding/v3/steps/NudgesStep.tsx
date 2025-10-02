import { useMemo, useState } from 'react';
import { OnboardingShell } from '../OnboardingShell';
import { GlassCard } from '../shared/GlassCard';
import { Button } from '@/components/ui/button';
import type { OnboardingMachine } from '@/hooks/useOnboardingMachine';

type Mode = 'friends' | 'pattern';

type Friend = { id: string; name: string; initials: string };

function AvatarRow({ friends }: { friends: Friend[] }) {
  return (
    <div className="flex -space-x-2">
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

function PatternCard({
  title, badge, description, highlight, actionText, tone = 'purple', onAction,
}: {
  title: string;
  badge?: string;
  description: string;
  highlight?: string;
  actionText: string;
  tone?: 'purple'|'blue';
  onAction: () => void;
}) {
  return (
    <GlassCard className="p-4 border-l-4"
      style={{ borderLeftColor: tone === 'purple' ? 'rgba(168,85,247,0.7)' : 'rgba(59,130,246,0.7)' }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="font-medium text-white">{title}</div>
        {badge && <div className="text-xs text-emerald-400">{badge}</div>}
      </div>
      <div className="text-sm text-white/80">{description}</div>
      {highlight && <div className="text-sm text-rose-400 mt-1">{highlight}</div>}
      <div className="mt-3">
        <Button size="sm" className="bg-violet-700" onClick={onAction}>{actionText}</Button>
      </div>
    </GlassCard>
  );
}

type Props = {
  machine: OnboardingMachine;
};

export function NudgesStep({ machine }: Props) {
  const [mode, setMode] = useState<Mode>('friends');
  const friends = useMemo<Friend[]>(() => ([
    { id: '1', name: 'Sarah', initials: 'S' },
    { id: '2', name: 'Tom',   initials: 'T' },
    { id: '3', name: 'Alex',  initials: 'A' },
    { id: '4', name: 'Kai',   initials: 'K' },
    { id: '5', name: 'Maya',  initials: 'M' },
    { id: '6', name: 'Zoe',   initials: 'Z' },
    { id: '7', name: 'Leo',   initials: 'L' },
    { id: '8', name: 'Noa',   initials: 'N' },
  ]), []);

  function handleFriendsDone() {
    setMode('pattern');
  }

  if (mode === 'friends') {
    return (
      <OnboardingShell
        machine={machine}
        nextLabel="Skip for now"
      >
        <div className="space-y-4">
          <div className="text-white/70">We'll check who's already here</div>

          <GlassCard className="p-4">
            <div className="mb-3 font-medium text-white">Phone Contacts</div>
            <div className="flex items-center justify-between">
              <AvatarRow friends={friends} />
              <Button className="bg-emerald-600" onClick={handleFriendsDone}>Add all friends</Button>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="mb-1 font-medium text-white">Instagram</div>
            <div className="text-sm text-white/70">Import your social graph</div>
            <div className="mt-3">
              <Button variant="ghost" className="text-white/80">Connect</Button>
            </div>
          </GlassCard>
        </div>
      </OnboardingShell>
    );
  }

  // mode === 'pattern'
  return (
    <OnboardingShell
      machine={machine}
      nextLabel="Fix this now"
    >
      <div className="space-y-4">
        {/* Alert banner */}
        <GlassCard className="p-3 bg-rose-500/10 border-rose-300/20">
          <div className="text-sm font-medium text-rose-300">PATTERN DETECTED</div>
        </GlassCard>

        {/* Missed Thursdays row of dots */}
        <GlassCard className="p-4">
          <div className="text-sm text-white/80 mb-2">YOUR MISSED THURSDAYS</div>
          <div className="flex gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-3 w-3 rounded-full bg-rose-400" />
            ))}
          </div>
          <div className="text-xs text-white/60 mt-2">8 weeks straight without you</div>
        </GlassCard>

        {/* Cards */}
        <PatternCard
          title="Your Thursday Crew"
          badge="Tonight 7:30pm"
          description="Sarah, Tom, and Alex at Gran Blanco • Every Thursday. Same time. Same booth."
          highlight="Last week they stayed until 2am."
          actionText="Join tonight"
          tone="purple"
          onAction={() => machine.goNext()}
        />
        <PatternCard
          title="Weekend Beach Pattern"
          badge="LIVE"
          description="6 of your friends converge at Tower 26"
          actionText="Enable alerts"
          tone="blue"
          onAction={() => machine.goNext()}
        />

        <div className="text-center text-sm text-white/70">
          Your social life is happening. Ready to join?
        </div>
      </div>
    </OnboardingShell>
  );
}
