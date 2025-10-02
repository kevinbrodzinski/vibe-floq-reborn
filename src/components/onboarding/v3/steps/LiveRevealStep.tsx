import { OnboardingShell } from '../OnboardingShell';
import { FieldPreview } from '../partials/FieldPreview';
import { GlassCard } from '../shared/GlassCard';
import type { OnboardingMachine } from '@/hooks/useOnboardingMachine';

function LiveBadge() {
  return (
    <div className="inline-flex items-center gap-2 text-xs text-white/70">
      <span className="inline-block h-2 w-2 rounded-full bg-[var(--accent-violet-400)] animate-pulse" />
      LIVE
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <GlassCard>
      <div className="flex items-center justify-between">
        <span className="text-white/70">{label}</span>
        <span className="text-2xl font-semibold text-[var(--accent-violet-400)] tabular-nums">{value}</span>
      </div>
    </GlassCard>
  );
}

type Props = {
  machine: OnboardingMachine;
};

export function LiveRevealStep({ machine }: Props) {
  return (
    <OnboardingShell
      machine={machine}
      title="YOUR CITY RIGHT NOW"
      headerVariant="section"
      nextLabel="Find Friends"
    >
      <div className="mx-auto w-full max-w-md space-y-6">
        <GlassCard className="p-3">
          <div className="mb-2">
            <LiveBadge />
          </div>
          <FieldPreview />
        </GlassCard>

        <div className="space-y-3">
          <StatCard label="Active in Venice Beach" value={47} />
          <StatCard label="Venues at peak energy" value={3} />
          <StatCard label="Convergences forming" value={2} />
        </div>

        <div className="text-center text-sm text-white/60">
          Even without friends, you can see the social pulse
        </div>
      </div>
    </OnboardingShell>
  );
}
