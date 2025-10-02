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
  disableNav = false
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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="mx-auto w-full max-w-xl px-6 pt-8 flex-1">
        {/* Progress */}
        {showProgress && (
          <div className="mb-5">
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
                aria-label="Onboarding progress"
              />
            </div>
          </div>
        )}

        {/* Header */}
        {(overline || title || subtitle) && (
          <header className={headerVariant === 'hero' ? 'mb-10 text-center' : 'mb-6'}>
            {overline && (
              <div className="text-xs tracking-[0.22em] text-white/60 mb-2">{overline}</div>
            )}
            {title && (
              <h1 className={headerVariant === 'hero'
                ? 'text-[44px] md:text-6xl font-light tracking-[0.05em] leading-[1.08] bg-clip-text text-transparent bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(240,240,255,0.95))]'
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

        {/* Content */}
        <div className={headerVariant === 'hero' ? 'mx-auto w-full max-w-md' : ''}>
          {children}
        </div>
      </div>

      {/* Sticky nav */}
      {!disableNav && (
        <div className="px-6 pb-6">
          <div className="mx-auto w-full max-w-xl flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={goBack} 
              disabled={!canGoBack || isAdvancing}
            >
              {backLabel ?? 'Back'}
            </Button>
            {!atFinal && canGoNext && (
              <Button 
                onClick={handleNext} 
                disabled={isAdvancing} 
                className={[
                  'relative rounded-full before:pointer-events-none before:absolute before:inset-0 before:rounded-full before:shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]',
                  headerVariant === 'hero' 
                    ? 'px-7 h-14 text-base shadow-[0_18px_54px_rgba(124,103,234,0.48)]' 
                    : 'px-6 shadow-[0_12px_40px_rgba(124,103,234,0.35)]'
                ].join(' ')}
              >
                {lastBeforeFinal ? (nextLabel ?? 'Complete') : (nextLabel ?? 'Next')}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Pager dots (optional) */}
      {pager && (
        <div className="pb-3">
          <div className="mx-auto w-full max-w-xl flex items-center justify-center gap-2">
            {Array.from({ length: pager.count }).map((_, i) => (
              <div
                key={i}
                className={[
                  'h-2 rounded-full transition-all',
                  i === pager.index 
                    ? 'w-9 bg-[var(--accent-violet-400)] shadow-[0_0_14px_rgba(124,103,234,0.65)]'
                    : 'w-2 bg-white/18'
                ].join(' ')}
              />
            ))}
          </div>
        </div>
      )}

      {/* Debug info (dev only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-2 right-2 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
          Step: {stepIndex}/{FINAL_STEP_INDEX}
        </div>
      )}
    </div>
  );
}
