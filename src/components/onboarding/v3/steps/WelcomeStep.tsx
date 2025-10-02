import { OnboardingShell } from '../OnboardingShell';
import { GlassCard } from '../shared/GlassCard';
import { AuroraBackground } from '../shared/AuroraBackground';
import { LiveCounter } from '../shared/LiveCounter';
import { FieldPreview } from '../partials/FieldPreview';
import type { OnboardingMachine } from '@/hooks/useOnboardingMachine';

type Props = {
  machine: OnboardingMachine;
};

export function WelcomeStep({ machine }: Props) {
  return (
    <OnboardingShell
      machine={machine}
      overline="BETA"
      title="FLOQ"
      subtitle="Your afternoon awaits"
      headerVariant="hero"
      nextLabel="Get Started"
      backLabel=""
    >
      <div className="space-y-6">
        <div className="flex justify-center">
          <GlassCard className="inline-flex items-center gap-2 px-3 py-2 rounded-full">
            <span className="inline-block h-2 w-2 rounded-full bg-[var(--accent-violet-400)]" />
            <span className="text-sm text-white/90">
              <LiveCounter /> people joining now
            </span>
          </GlassCard>
        </div>

        <div className="mt-2">
          <FieldPreview />
        </div>

        <div className="text-center text-sm text-white/60">
          Already have an account?{' '}
          <a href="/auth" className="underline decoration-white/30 underline-offset-4">
            Sign in
          </a>
        </div>
      </div>
    </OnboardingShell>
  );
}
