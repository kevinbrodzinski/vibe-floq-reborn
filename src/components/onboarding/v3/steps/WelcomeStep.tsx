import { OnboardingShell } from '../OnboardingShell';
import { LiveCounter } from '../shared/LiveCounter';
import { FieldPreview } from '../partials/FieldPreview';
import { SoundToggle } from '../components/SoundToggle';
import { Button } from '@/components/ui/button';
import { useTimeGreeting } from '@/hooks/useTimeGreeting';
import { haptic } from '@/lib/haptics';
import type { OnboardingMachine } from '@/hooks/useOnboardingMachine';

type Props = {
  machine: OnboardingMachine;
};

export function WelcomeStep({ machine }: Props) {
  const { tagline } = useTimeGreeting();

  const handleNext = async () => {
    haptic('medium');
    await machine.goNext();
  };

  return (
    <OnboardingShell
      machine={machine}
      overline="BETA"
      title="FLOQ"
      subtitle={tagline}
      headerVariant="hero"
      showProgress={false}
      pager={{ index: 0, count: 7 }}
      disableNav
      verticalAlign="distribute"
    >
      {/* Content with consistent spacing */}
      <div className="mx-auto w-full max-w-md space-y-12">

        {/* Live chip + open canvas */}
        <div className="space-y-6">
          <div className="mx-auto inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.10]">
            <span className="inline-block h-2 w-2 rounded-full bg-[var(--accent-violet-400)]" />
            <span className="text-sm text-white/90">
              <LiveCounter /> people joining now
            </span>
          </div>

          {/* Open canvas – no frame */}
          <FieldPreview />
        </div>

        {/* Bottom: centered CTA ABOVE sign-in */}
        <footer className="space-y-4">
          <div className="flex justify-center mt-8">
            <Button
              className="rounded-full h-11 px-12 w-full max-w-xs text-base shadow-[0_18px_54px_rgba(124,103,234,0.48)] before:pointer-events-none before:absolute before:inset-0 before:rounded-full before:shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] relative"
              onClick={handleNext}
            >
              Get Started
            </Button>
          </div>

          <div className="text-center text-sm text-white/65">
            Already have an account?{' '}
            <a href="/auth" className="underline decoration-white/30 underline-offset-4">
              Sign in
            </a>
          </div>
        </footer>
      </div>

      <SoundToggle />
    </OnboardingShell>
  );
}
