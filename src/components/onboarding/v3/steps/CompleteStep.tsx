import { OnboardingShell } from '../OnboardingShell';
import { GlassCard } from '../shared/GlassCard';
import { Button } from '@/components/ui/button';
import type { OnboardingMachine } from '@/hooks/useOnboardingMachine';

type Props = {
  machine: OnboardingMachine;
  onComplete: () => void;
};

export function CompleteStep({ machine, onComplete }: Props) {
  return (
    <OnboardingShell
      machine={machine}
      onComplete={onComplete}
      nextLabel="Start my journey"
    >
      <GlassCard className="p-6 bg-gradient-to-br from-violet-700/50 to-indigo-700/40">
        <div className="text-xs tracking-widest text-white/70 mb-1">THE CONNECTOR</div>
        <h2 className="text-2xl font-semibold mb-2 text-white">Level 1 • Potential unlocked</h2>
        <p className="text-white/80 mb-4">You naturally bring people together.</p>
        <ul className="space-y-1 text-sm text-white/90">
          <li>◆ Bridge different friend groups</li>
          <li>◆ Create spontaneous moments</li>
          <li>◆ Sense social energy</li>
        </ul>

        <div className="mt-5">
          <div className="text-sm text-white/80 mb-2">First mission</div>
          <div className="text-sm text-white/70">Create your first convergence</div>
        </div>
      </GlassCard>
    </OnboardingShell>
  );
}
