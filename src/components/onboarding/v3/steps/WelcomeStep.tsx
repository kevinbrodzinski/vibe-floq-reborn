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
    <OnboardingShell machine={machine} nextLabel="Get Started">
      <div className="relative mt-2 rounded-2xl">
        <AuroraBackground />
        <div className="relative space-y-6">
          <div className="flex justify-start">
            <GlassCard className="inline-flex items-center gap-2 px-3 py-2">
              <span className="inline-block h-2 w-2 rounded-full bg-violet-400" />
              <span className="text-sm text-white/90">
                <LiveCounter /> people joining now
              </span>
            </GlassCard>
          </div>

          <FieldPreview />
        </div>
      </div>

      <div className="mt-8 text-center text-sm text-white/50">
        Already have an account? <span className="underline decoration-white/30 underline-offset-4 cursor-pointer">Sign in</span>
      </div>
    </OnboardingShell>
  );
}
