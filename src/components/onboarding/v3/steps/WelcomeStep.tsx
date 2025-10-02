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
      headerVariant="hero"
      showProgress={false}
      pager={{ index: 0, count: 7 }}
      disableNav
    >
      {/* Full-height layout with even distribution */}
      <div className="min-h-[calc(100vh-140px)] mx-auto w-full max-w-md px-2 flex flex-col justify-between gap-8">
        
        {/* Top stack: overline + FLOQ + subtitle */}
        <header className="text-center space-y-3">
          <div className="text-xs tracking-[0.22em] text-white/60">BETA</div>
          
          {/* Gradient, thinner FLOQ */}
          <h1 className="text-[44px] font-extralight tracking-[0.05em] leading-[1.08] bg-clip-text text-transparent bg-[linear-gradient(90deg,var(--accent-violet-400),#D16FFF)]">
            FLOQ
          </h1>
          
          <p className="text-lg text-white/70">{tagline}</p>
        </header>

        {/* Middle: live chip + open canvas */}
        <section className="space-y-6">
          <div className="mx-auto inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.10]">
            <span className="inline-block h-2 w-2 rounded-full bg-[var(--accent-violet-400)]" />
            <span className="text-sm text-white/90">
              <LiveCounter /> people joining now
            </span>
          </div>

          {/* Open canvas – no frame */}
          <FieldPreview />
        </section>

        {/* Bottom: centered CTA ABOVE sign-in */}
        <footer className="space-y-4">
          <div className="flex justify-center">
            <Button
              className="rounded-full h-14 px-7 text-base shadow-[0_18px_54px_rgba(124,103,234,0.48)] before:pointer-events-none before:absolute before:inset-0 before:rounded-full before:shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] relative"
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
