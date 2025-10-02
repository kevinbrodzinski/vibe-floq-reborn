import { ReactNode, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FINAL_STEP_INDEX } from '@/constants/onboarding';
import type { OnboardingMachine } from '@/hooks/useOnboardingMachine';

type Props = {
  machine: OnboardingMachine;
  children: ReactNode;
  title?: string;
  subtitle?: string;
  overline?: string;
  headerVariant?: 'hero' | 'section';
  showProgress?: boolean;
  pager?: { index: number; count: number } | null;
  onComplete?: () => void;
  nextLabel?: string;
  backLabel?: string;
  disableNav?: boolean;
  verticalAlign?: 'top' | 'center' | 'distribute';
};

export function OnboardingShell({ 
  machine, 
  children, 
  title,
  subtitle,
  overline,
  headerVariant = 'section',
  showProgress = true,
  pager = null,
  onComplete, 
  nextLabel, 
  backLabel,
  disableNav = false,
  verticalAlign = 'center'
}: Props) {
  const { stepIndex, canGoBack, canGoNext, isAdvancing, goNext, goBack, markComplete } = machine;
  const atFinal = stepIndex === FINAL_STEP_INDEX;
  const lastBeforeFinal = stepIndex === FINAL_STEP_INDEX - 1;
  const denom = Math.max(FINAL_STEP_INDEX, 1);
  const progressPercent = Math.round((stepIndex / denom) * 100);

  async function handleNext() {
    if (lastBeforeFinal) {
      await markComplete();
      onComplete?.();
    } else {
      await goNext();
    }
  }

  // Keyboard navigation (Enter to advance)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !isAdvancing && canGoNext) {
        handleNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isAdvancing, canGoNext]);

  // Layout classes derived from verticalAlign prop
  const layout =
    verticalAlign === 'top'
      ? 'grid-rows-[auto,1fr,auto]'
      : verticalAlign === 'distribute'
      ? 'grid-rows-[1fr,auto,1fr]'
      : 'grid-rows-[auto,1fr,auto]'; // center

  return (
    <div
      className={[
        // Use "svh" to avoid URL bar shrinking vh on mobile
        'min-h-[100svh] bg-background text-foreground',
        // Grid: header / main / footer slots
        'grid', layout,
        // Safe-area padding on iOS
        'pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]',
      ].join(' ')}
    >
      {/* HEADER (progress + titles) */}
      <div className="mx-auto w-full max-w-xl px-6">
        {showProgress && (
          <div className="mb-5 mt-8">
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
                aria-label="Onboarding progress"
              />
            </div>
          </div>
        )}
        {(overline || title || subtitle) && (
          <header className={headerVariant === 'hero' ? 'mb-10 text-center' : 'mb-6'}>
            {overline && <div className="text-xs tracking-[0.22em] text-white/60 mb-2">{overline}</div>}
            {title && (
              <h1 className={headerVariant === 'hero'
                ? 'text-[44px] font-extralight tracking-[0.05em] leading-[1.08] bg-clip-text text-transparent bg-[linear-gradient(90deg,var(--accent-violet-400),#D16FFF)]'
                : 'text-2xl font-semibold text-white'}>
                {title}
              </h1>
            )}
            {subtitle && (
              <p className={headerVariant === 'hero' ? 'text-lg text-white/70 mt-4' : 'text-sm text-white/70 mt-1'}>
                {subtitle}
              </p>
            )}
            {headerVariant === 'section' && (
              <div className="mt-3 h-1 w-20 rounded-full bg-white/10">
                <div className="h-1 w-10 rounded-full bg-[var(--accent-violet-400)]" />
              </div>
            )}
          </header>
        )}
      </div>

      {/* MAIN (content) */}
      <main className={[
        'mx-auto w-full max-w-xl px-6',
        // When centered or distributed, center the payload block
        verticalAlign !== 'top' ? 'grid place-content-center' : '',
      ].join(' ')}>
        {children}
      </main>

      {/* FOOTER (pager + sticky nav if enabled) */}
      <footer className="mx-auto w-full max-w-xl px-6 pb-4">
        {!disableNav && (
          <div className="mb-2 flex items-center justify-between">
            <Button variant="ghost" onClick={goBack} disabled={!canGoBack || isAdvancing}>
              {backLabel ?? 'Back'}
            </Button>
            {!atFinal && canGoNext && (
              <Button onClick={handleNext} disabled={isAdvancing} className="rounded-full px-6">
                {lastBeforeFinal ? (nextLabel ?? 'Complete') : (nextLabel ?? 'Next')}
              </Button>
            )}
          </div>
        )}
        {pager && (
          <div className="flex items-center justify-center gap-2">
            {Array.from({ length: pager.count }).map((_, i) => (
              <div
                key={i}
                className={i === pager.index
                  ? 'h-2 w-9 rounded-full bg-[var(--accent-violet-400)] shadow-[0_0_14px_rgba(124,103,234,0.65)]'
                  : 'h-2 w-2 rounded-full bg-white/18'}
              />
            ))}
          </div>
        )}
      </footer>

      {/* Debug info (dev only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-2 right-2 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
          Step: {stepIndex}/{FINAL_STEP_INDEX}
        </div>
      )}
    </div>
  );
}
