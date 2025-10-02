import { useState } from 'react';
import { OnboardingShell } from '../OnboardingShell';
import { GlassCard } from '../shared/GlassCard';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { OnboardingMachine } from '@/hooks/useOnboardingMachine';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] as const;
const VIBES = ['Social','Party','Chill','Active','Culture','Food'] as const;
const CREWS = ['Solo','Small (2-3)','Medium (4-6)','Big (7+)'] as const;

type Props = {
  machine: OnboardingMachine;
};

export function ProfileVibeStep({ machine }: Props) {
  const [month, setMonth] = useState<string>();
  const [year, setYear] = useState<string>();
  const [vibes, setVibes] = useState<string[]>([]);
  const [crew, setCrew] = useState<string>();

  const canNext = !!month && !!year && vibes.length > 0;

  return (
    <OnboardingShell 
      machine={{ ...machine, canGoNext: canNext }}
      nextLabel="Continue"
    >
      <div className="space-y-6">
        <GlassCard className="flex items-center justify-between">
          <div>
            <div className="font-medium text-white">Venice Beach</div>
            <div className="text-sm text-white/60">Auto-detected • Tap to change</div>
          </div>
          <div className="h-6 w-6 rounded-full border border-white/20 grid place-items-center">
            <div className="h-3 w-3 rounded-full bg-violet-400" />
          </div>
        </GlassCard>

        <div>
          <div className="text-sm text-white/60 mb-1">When's your birthday?</div>
          <div className="text-xs text-white/40 mb-2">For age-appropriate experiences</div>
          <div className="flex gap-3">
            <Select onValueChange={setMonth}>
              <SelectTrigger className="w-40 rounded-xl bg-white/[0.05] border-white/[0.08]">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Select onValueChange={setYear}>
              <SelectTrigger className="w-32 rounded-xl bg-white/[0.05] border-white/[0.08]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({length: 60}, (_, i) => String(2025 - i)).map(y =>
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <div className="mb-2 text-white">What's your vibe?</div>
          <ToggleGroup type="multiple" value={vibes} onValueChange={setVibes} className="flex flex-wrap gap-2">
            {VIBES.map(v => (
              <ToggleGroupItem
                key={v}
                value={v}
                className="rounded-2xl bg-white/[0.05] border-white/[0.08] data-[state=on]:bg-violet-500/20"
              >
                {v}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <div>
          <div className="mb-2 text-white">Crew size preference</div>
          <ToggleGroup type="single" value={crew} onValueChange={setCrew} className="flex flex-wrap gap-2">
            {CREWS.map(c => (
              <ToggleGroupItem
                key={c}
                value={c}
                className="rounded-2xl bg-white/[0.05] border-white/[0.08] data-[state=on]:bg-violet-500/20"
              >
                {c}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>
    </OnboardingShell>
  );
}
