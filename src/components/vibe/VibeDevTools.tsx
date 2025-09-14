import * as React from 'react';
import clsx from 'clsx';
import { Button } from '@/components/ui/button';
import { VIBES, type Vibe } from '@/lib/vibes';
import type { WeatherSignal, WeatherCondition } from '@/core/vibe/types';

const CONDITIONS: WeatherCondition[] = [
  'Clear','Clouds','Rain','Drizzle','Thunderstorm','Snow',
  'Mist','Fog','Haze','Dust','Smoke','Sand','Ash','Squall','Tornado','unknown'
];

export function VibeDevTools() {
  const [output, setOutput] = React.useState<string>('');
  const [cond, setCond] = React.useState<WeatherCondition>('Clear');
  const [tempC, setTempC] = React.useState<number>(22);
  const [day, setDay] = React.useState<boolean>(true);

  if (import.meta.env.PROD) return null;

  // ——— Friends ———
  const forceTick = async () => {
    try {
      const engine = (typeof window !== 'undefined' ? (window as any).floq?.vibeEngine : null);
      if (engine?.forceUpdate) {
        await engine.forceUpdate();
        setOutput(`Forced tick @ ${new Date().toLocaleTimeString()}`);
      } else {
        setOutput('No forceUpdate handle. (Make sure useVibeEngine exposes it in dev.)');
      }
    } catch (e: any) {
      setOutput('Force tick failed: ' + (e?.message ?? String(e)));
    }
  };

  const injectCorrection = async (target: Vibe) => {
    try {
      // Prefer live reading if exposed
      const reading = (typeof window !== 'undefined' ? (window as any).floq?.vibeReading : null) as
        | { vector: Record<string, number>; components: Record<string, number>; vibe: Vibe }
        | null;

      const predicted: Vibe = reading?.vibe ?? (VIBES[0] as Vibe);
      const componentScores =
        reading?.components ?? {
          circadian: 0.6, movement: 0.4, venueEnergy: 0.5, deviceUsage: 0.3, weather: 0.7,
        };

      const { learnFromCorrection } = await import('@/core/vibe/learning/PersonalWeightStore');
      learnFromCorrection({ predicted, target, componentScores, eta: 0.02 });

      setOutput(`Injected correction: ${predicted} → ${target}`);
    } catch (e: any) {
      setOutput('Inject failed: ' + (e?.message ?? String(e)));
    }
  };

  const printDeltas = async () => {
    try {
      const { loadPersonalDelta } = await import('@/core/vibe/learning/PersonalWeightStore');
      const delta = loadPersonalDelta();

      const lines: string[] = [];
      Object.entries(delta).forEach(([component, vibemap]) => {
        const entries = Object.entries(vibemap as Record<string, number>)
          .filter(([, v]) => Math.abs(v) > 0.01);
        if (entries.length) {
          lines.push(`${component}:\n${JSON.stringify(Object.fromEntries(entries), null, 2)}`);
        }
      });

      setOutput(lines.length ? lines.join('\n') : 'No significant deltas (|Δ| ≤ 0.01).');
      // eslint-disable-next-line no-console
      console.log('[Personal deltas]', delta);
    } catch (e: any) {
      setOutput('Print failed: ' + (e?.message ?? String(e)));
    }
  };

  const decayDeltas = async () => {
    try {
      const { decayPersonalDelta } = await import('@/core/vibe/learning/PersonalWeightStore');
      decayPersonalDelta(0.995);
      setOutput('Applied 0.5% decay to all deltas.');
    } catch (e: any) {
      setOutput('Decay failed: ' + (e?.message ?? String(e)));
    }
  };

  const resetLearning = () => {
    try {
      localStorage.removeItem('vibe:personal:delta:v1');
      localStorage.removeItem('vibe:corrections:v1');
      setOutput('Learning reset. Refresh to re-center.');
    } catch (e: any) {
      setOutput('Reset failed: ' + (e?.message ?? String(e)));
    }
  };

  // ——— New: Download snapshots ———
  const downloadSnapshots = async () => {
    try {
      const { getRecentReadings } = await import('@/storage/vibeSnapshots');
      const rows = await getRecentReadings(100);
      const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `vibe-snapshots-${new Date().toISOString()}.json`;
      a.click();
      setOutput(`Downloaded ${rows.length} snapshots`);
    } catch (e: any) {
      setOutput('Download failed: ' + (e?.message ?? String(e)));
    }
  };

  // ——— New: Mock weather ———
  const applyMockWeather = async () => {
    try {
      (window as any).floq ??= {};
      const mw: Partial<WeatherSignal> = {
        condition: cond, tempC, isDaylight: day,
        // Allow WeatherCollector to compute offsets if omitted; or set small defaults:
        // energyOffset: undefined,
        // confidenceBoost: undefined,
      };
      (window as any).floq.mockWeather = mw;
      setOutput(`Mock weather ON: ${cond} ${tempC ?? ''}°C ${day ? '(day)' : '(night)'}`);
      await forceTick();
    } catch (e: any) {
      setOutput('Mock weather failed: ' + (e?.message ?? String(e)));
    }
  };

  const clearMockWeather = async () => {
    try {
      if ((window as any).floq?.mockWeather) delete (window as any).floq.mockWeather;
      setOutput('Mock weather cleared');
      await forceTick();
    } catch (e: any) {
      setOutput('Clear mock failed: ' + (e?.message ?? String(e)));
    }
  };

  return (
    <div
      className={clsx(
        'fixed bottom-4 right-4 p-4 bg-black/90 text-white rounded-lg space-y-3 z-[1000] max-w-sm',
        'shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md'
      )}
      style={{ border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="text-[11px] font-mono tracking-wide opacity-70">VIBE DEV TOOLS</div>

      <div className="grid grid-cols-2 gap-2">
        <Button size="sm" variant="ghost" onClick={forceTick}>Force Tick</Button>
        <Button size="sm" variant="ghost" onClick={printDeltas}>Print Deltas</Button>
        <Button size="sm" variant="ghost" onClick={decayDeltas}>Decay 0.5%</Button>
        <Button size="sm" variant="destructive" onClick={resetLearning}>Reset Learning</Button>
        <Button size="sm" variant="ghost" onClick={downloadSnapshots}>Download Snapshots</Button>
      </div>

      <div className="text-xs mt-1">Quick Inject</div>
      <div className="grid grid-cols-4 gap-1">
        {VIBES.slice(0, 8).map((vibe) => (
          <Button
            key={vibe}
            size="sm"
            variant="ghost"
            className="text-[11px] px-2 py-1"
            onClick={() => injectCorrection(vibe)}
          >
            {vibe}
          </Button>
        ))}
      </div>

      <div className="text-xs mt-2">Mock Weather</div>
      <div className="grid grid-cols-2 gap-2 items-center">
        <select
          className="bg-black/30 border border-white/10 rounded px-2 py-1 text-xs"
          value={cond}
          onChange={(e) => setCond(e.target.value as WeatherCondition)}
        >
          {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <label className="text-[11px] opacity-70">
          Temp&nbsp;
          <input
            type="number"
            className="bg-black/30 border border-white/10 rounded px-2 py-1 w-20 text-xs"
            value={Number.isFinite(tempC) ? tempC : ''}
            onChange={(e) => setTempC(Number(e.target.value))}
            placeholder="°C"
          />
        </label>

        <label className="text-[11px] flex items-center gap-2 col-span-2">
          <input type="checkbox" checked={day} onChange={(e) => setDay(e.target.checked)} />
          Daylight
        </label>

        <Button size="sm" variant="ghost" onClick={applyMockWeather}>Apply Mock</Button>
        <Button size="sm" variant="ghost" onClick={clearMockWeather}>Clear Mock</Button>
      </div>

      {output && (
        <pre
          className="text-xs mt-2 p-2 bg-black/50 rounded overflow-auto max-h-36"
          aria-live="polite"
        >
          {output}
        </pre>
      )}
    </div>
  );
}