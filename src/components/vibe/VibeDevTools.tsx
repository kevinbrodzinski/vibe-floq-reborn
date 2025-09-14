import * as React from 'react';
import clsx from 'clsx';
import { Button } from '@/components/ui/button';
import { VIBES, type Vibe } from '@/lib/vibes';

export function VibeDevTools({ className }: { className?: string }) {
  // Vite / SSR safe dev check
  const isDev = typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'development';
  if (!isDev) return null;

  const [output, setOutput] = React.useState<string>('');

  const forceTick = async () => {
    try {
      const engine = (typeof window !== 'undefined' ? (window as any).floq?.vibeEngine : null);
      if (engine?.forceUpdate) {
        await engine.forceUpdate();
        setOutput(`Forced tick @ ${new Date().toLocaleTimeString()}`);
      } else {
        setOutput('No forceUpdate handle (skipping). Add the useVibeEngine dev hook.');
      }
    } catch (e: any) {
      setOutput('Force tick failed: ' + (e?.message ?? e));
    }
  };

  const injectCorrection = async (target: Vibe) => {
    try {
      // Prefer the real current prediction if exposed globally
      const reading = (typeof window !== 'undefined' ? (window as any).floq?.vibeReading : null) as
        | { vector: Record<Vibe, number>; components: Record<string, number>; vibe: Vibe }
        | null;

      // Fall back to a sane mock if not present
      const predicted =
        reading?.vibe ??
        // pick the first vibe as a deterministic fallback
        (VIBES[0] as Vibe);

      const componentScores =
        reading?.components ?? {
          circadian: 0.6,
          movement: 0.4,
          venueEnergy: 0.5,
          deviceUsage: 0.3,
          weather: 0.7,
        };

      // Delta learner (bounded, local, safe)
      const { learnFromCorrection } = await import('@/core/vibe/learning/PersonalWeightStore');
      learnFromCorrection({
        predicted,
        target,
        componentScores,
        eta: 0.02,
      });

      setOutput(`Injected correction: ${predicted} → ${target}`);
    } catch (e: any) {
      setOutput('Inject failed: ' + (e?.message ?? e));
    }
  };

  const printDeltas = async () => {
    try {
      const { loadPersonalDelta } = await import('@/core/vibe/learning/PersonalWeightStore');
      const delta = loadPersonalDelta();

      // Pretty print only non-trivial deltas
      const lines: string[] = [];
      Object.entries(delta).forEach(([component, vibemap]) => {
        const entries = Object.entries(vibemap as Record<string, number>).filter(
          ([, v]) => Math.abs(v) > 0.01
        );
        if (entries.length) {
          lines.push(`${component}: ${JSON.stringify(Object.fromEntries(entries), null, 2)}`);
        }
      });

      setOutput(lines.length ? lines.join('\n') : 'No significant deltas (|Δ| ≤ 0.01).');
      // Also keep a full print in console
      // eslint-disable-next-line no-console
      console.log('[Personal deltas]', delta);
    } catch (e: any) {
      setOutput('Print failed: ' + (e?.message ?? e));
    }
  };

  const resetLearning = () => {
    try {
      // Our delta learner is stored here
      localStorage.removeItem('vibe:personal:delta:v1');
      // If you also kept a separate corrections store, clear it:
      localStorage.removeItem('vibe:corrections:v1');
      setOutput('Learning reset. Refresh to re-center.');
    } catch (e: any) {
      setOutput('Reset failed: ' + (e?.message ?? e));
    }
  };

  const decayDeltas = async () => {
    try {
      const { decayPersonalDelta } = await import('@/core/vibe/learning/PersonalWeightStore');
      decayPersonalDelta(0.995);
      setOutput('Applied 0.5% decay to all deltas.');
    } catch (e: any) {
      setOutput('Decay failed: ' + (e?.message ?? e));
    }
  };

  return (
    <div
      className={clsx(
        'fixed bottom-4 right-4 z-[9999] max-w-sm rounded-lg bg-black/90 p-4 text-white shadow-lg',
        'backdrop-blur-md border border-white/10',
        className
      )}
    >
      <div className="mb-2 font-mono text-xs tracking-wider opacity-80">VIBE DEV TOOLS</div>

      <div className="grid grid-cols-2 gap-2">
        <Button size="sm" variant="ghost" onClick={forceTick}>
          Force Tick
        </Button>
        <Button size="sm" variant="ghost" onClick={printDeltas}>
          Print Deltas
        </Button>
        <Button size="sm" variant="ghost" onClick={decayDeltas}>
          Decay 0.5%
        </Button>
        <Button size="sm" variant="destructive" onClick={resetLearning}>
          Reset Learning
        </Button>
      </div>

      <div className="mt-3 text-xs opacity-80">Quick Inject:</div>
      <div className="mt-1 grid grid-cols-4 gap-1">
        {VIBES.slice(0, 8).map((vibe) => (
          <Button
            key={vibe}
            size="sm"
            variant="ghost"
            className="p-1 text-xs"
            onClick={() => injectCorrection(vibe)}
          >
            {vibe}
          </Button>
        ))}
      </div>

      {!!output && (
        <pre className="mt-2 max-h-36 overflow-auto rounded bg-black/60 p-2 text-xs">
          {output}
        </pre>
      )}
    </div>
  );
}
