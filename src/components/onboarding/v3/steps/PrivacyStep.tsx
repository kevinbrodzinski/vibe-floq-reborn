import { useState } from 'react';
import { OnboardingShell } from '../OnboardingShell';
import { GlassCard } from '../shared/GlassCard';
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
    <GlassCard className="p-4 rounded-3xl">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-base font-medium text-white">{title}</div>
        <div className="text-sm text-white/50">{people}</div>
      </div>
      <div className="flex gap-3">
        {options.map(o => {
          const isSelected = value === o.key;
          return (
            <button
              key={o.key}
              onClick={() => onChange(o.key)}
              className={[
                'flex-1 h-11 rounded-full text-sm font-medium transition-all',
                isSelected 
                  ? 'bg-[var(--accent-violet-400)] text-white shadow-[0_4px_16px_rgba(124,103,234,0.4)]'
                  : 'bg-white/[0.08] text-white/70 hover:bg-white/[0.12] border border-white/[0.08]'
              ].join(' ')}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </GlassCard>
  );
}

type Props = {
  machine: OnboardingMachine;
  onComplete?: () => void;
};

export function PrivacyStep({ machine, onComplete }: Props) {
  const [preset] = useState<PrivacyPreset>('balanced');
  const [matrix, setMatrix] = useState<PrivacyMatrix>(PRESETS['balanced']);

  const handleNext = async () => {
    // Fire-and-forget; do not block UX
    void updatePrivacySettings({ share_precision_preset: preset, privacy_matrix: matrix, privacy_receipts: true });
    await machine.goNext();
    onComplete?.();
  };

  return (
    <OnboardingShell
      machine={{ ...machine, goNext: handleNext }}
      title="YOUR PRIVACY MATTERS"
      subtitle="You control who sees what, always"
      headerVariant="section"
      showProgress={true}
      pager={{ index: 3, count: 7 }}
      nextLabel="Perfect"
      verticalAlign="center"
    >
      <div className="mx-auto w-full max-w-md space-y-4">
        {/* Inner Circle */}
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

        {/* Friends */}
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

        {/* Everyone else */}
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

        {/* Anonymous contribution message */}
        <GlassCard className="p-4 rounded-2xl bg-emerald-500/10 border-emerald-400/20">
          <div className="flex items-start gap-2 text-sm text-emerald-400">
            <span className="text-emerald-400">✓</span>
            <span>You always contribute anonymously to city patterns</span>
          </div>
        </GlassCard>
      </div>
    </OnboardingShell>
  );
}
