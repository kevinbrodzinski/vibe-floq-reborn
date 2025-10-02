import { ReactNode } from 'react';
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
  backLabel 
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
          <header className={headerVariant === 'hero' ? 'mb-8 text-center' : 'mb-6'}>
            {overline && (
              <div className="text-xs tracking-[0.22em] text-white/60 mb-2">{overline}</div>
            )}
            {title && (
              <h1 className={headerVariant === 'hero'
                ? 'text-[44px] md:text-6xl font-semibold tracking-[0.02em] leading-[1.08]'
                : 'text-2xl font-semibold'}>
                {title}
              </h1>
            )}
            {subtitle && (
              <p className={headerVariant === 'hero' ? 'text-lg text-white/70 mt-3' : 'text-sm text-white/70 mt-1'}>
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
                'rounded-full px-6',
                headerVariant === 'hero' ? 'shadow-[0_12px_40px_rgba(124,103,234,0.35)]' : ''
              ].join(' ')}
            >
              {lastBeforeFinal ? (nextLabel ?? 'Complete') : (nextLabel ?? 'Next')}
            </Button>
          )}
        </div>
      </div>

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
                    ? 'w-8 bg-[var(--accent-violet-400)] shadow-[0_0_12px_rgba(124,103,234,0.65)]'
                    : 'w-2 bg-white/15'
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
