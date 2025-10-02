import { useState } from 'react';
import { OnboardingShell } from '../OnboardingShell';
import { GlassCard } from '../shared/GlassCard';
import { Button } from '@/components/ui/button';
import { updatePrivacySettings, type PrivacyPreset, type PrivacyMatrix, type Precision } from '@/lib/preferences/updateUserPreferences';
import type { OnboardingMachine } from '@/hooks/useOnboardingMachine';

const PRESETS: Record<PrivacyPreset, PrivacyMatrix> = {
  strict:   { circle: 'realtime', friends: 'when_out', others: 'hidden' },
  balanced: { circle: 'realtime', friends: 'when_out', others: 'area_only' },
  open:     { circle: 'realtime', friends: 'realtime', others: 'area_only' },
};

function Tier({
  title, people, value, options, onChange,
}: {
  title: string; people: string; value: string;
  options: { key: Precision; label: string }[]; onChange: (v: Precision) => void;
}) {
  return (
    <GlassCard className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="font-medium text-white">{title}</div>
        <div className="text-xs text-white/60">{people}</div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {options.map(o => (
          <Button
            key={o.key}
            size="sm"
            variant={value === o.key ? 'default' : 'ghost'}
            className={value === o.key ? 'bg-violet-600' : 'text-white/70'}
            onClick={() => onChange(o.key)}
          >
            {o.label}
          </Button>
        ))}
      </div>
    </GlassCard>
  );
}

type Props = {
  machine: OnboardingMachine;
  onComplete?: () => void;
};

export function PrivacyStep({ machine, onComplete }: Props) {
  const [preset, setPreset] = useState<PrivacyPreset>('balanced');
  const [matrix, setMatrix] = useState<PrivacyMatrix>(PRESETS['balanced']);

  const applyPreset = (p: PrivacyPreset) => {
    setPreset(p);
    setMatrix(PRESETS[p]);
  };

  const handleNext = async () => {
    // Fire-and-forget; do not block UX
    void updatePrivacySettings({ share_precision_preset: preset, privacy_matrix: matrix, privacy_receipts: true });
    await machine.goNext();
    onComplete?.();
  };

  return (
    <OnboardingShell
      machine={{ ...machine, goNext: handleNext }}
      nextLabel="Perfect"
    >
      <div className="space-y-4">
        {/* Preset pills */}
        <div className="flex gap-2">
          {(['strict','balanced','open'] as PrivacyPreset[]).map(p => (
            <Button
              key={p}
              size="sm"
              variant={preset === p ? 'default' : 'ghost'}
              className={preset === p ? 'bg-violet-600' : 'text-white/70'}
              onClick={() => applyPreset(p)}
            >
              {p === 'strict' ? 'Strict' : p === 'balanced' ? 'Balanced' : 'Open'}
            </Button>
          ))}
        </div>

        {/* Matrix */}
        <Tier
          title="Inner Circle"
          people="0 friends"
          value={matrix.circle}
          options={[
            { key: 'realtime', label: 'Real-time' },
            { key: 'when_out', label: 'When out' },
            { key: 'hidden',   label: 'Never' },
          ]}
          onChange={(v) => setMatrix(m => ({ ...m, circle: v }))}
        />
        <Tier
          title="Friends"
          people="12 friends"
          value={matrix.friends}
          options={[
            { key: 'realtime', label: 'Real-time' },
            { key: 'when_out', label: 'When out' },
            { key: 'hidden',   label: 'Never' },
          ]}
          onChange={(v) => setMatrix(m => ({ ...m, friends: v }))}
        />
        <Tier
          title="Everyone else"
          people="Strangers"
          value={matrix.others}
          options={[
            { key: 'area_only', label: 'Area only' },
            { key: 'when_out',  label: 'When out' },
            { key: 'hidden',    label: 'Hidden' },
          ]}
          onChange={(v) => setMatrix(m => ({ ...m, others: v }))}
        />

        <GlassCard className="p-4">
          <div className="text-sm text-emerald-400">✓ You always contribute anonymously to city patterns</div>
        </GlassCard>
      </div>
    </OnboardingShell>
  );
}
