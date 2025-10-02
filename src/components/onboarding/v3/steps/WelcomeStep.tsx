import { OnboardingShell } from '../OnboardingShell';
import { LiveCounter } from '../shared/LiveCounter';
import { FieldPreview } from '../partials/FieldPreview';
import { SoundToggle } from '../components/SoundToggle';
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
      machine={{ ...machine, goNext: handleNext }}
      overline="BETA"
      title="FLOQ"
      subtitle={tagline}
      headerVariant="hero"
      showProgress={false}
      pager={{ index: 0, count: 7 }}
      nextLabel="Get Started"
      backLabel=""
    >
      <div className="relative space-y-7">
        {/* Live counter chip */}
        <div className="mx-auto inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.10]">
          <span className="inline-block h-2 w-2 rounded-full bg-[var(--accent-violet-400)]" />
          <span className="text-sm text-white/90">
            <LiveCounter /> people joining now
          </span>
        </div>

        {/* OPEN canvas (no card) */}
        <div className="mt-2">
          <FieldPreview />
        </div>

        <div className="text-center text-sm text-white/65 pt-2">
          Already have an account?{' '}
          <a href="/auth" className="underline decoration-white/30 underline-offset-4">
            Sign in
          </a>
        </div>

        <SoundToggle />
      </div>
    </OnboardingShell>
  );
}
