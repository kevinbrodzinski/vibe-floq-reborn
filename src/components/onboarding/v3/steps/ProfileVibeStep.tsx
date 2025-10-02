import { useState, useRef } from 'react';
import { OnboardingShell } from '../OnboardingShell';
import { GlassCard } from '../shared/GlassCard';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useOnboardingAchievements } from '@/hooks/useOnboardingAchievements';
import { useToast } from '@/hooks/use-toast';
import { haptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
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
  const startTime = useRef(performance.now());
  const { toast } = useToast();
  const achievements = useOnboardingAchievements();

  const canNext = !!month && !!year && vibes.length > 0;

  const handleNext = async () => {
    // Check achievements
    const duration = performance.now() - startTime.current;
    if (duration < 120000) {
      achievements.maybeUnlock('speed_runner', (t, d) => toast({ title: t, description: d }));
    }
    
    if (crew === 'Solo') {
      achievements.maybeUnlock('lone_wolf', (t, d) => toast({ title: t, description: d }));
    }
    
    const hiEnergy = vibes.filter(v => ['Party', 'Active', 'Social'].includes(v)).length;
    if (hiEnergy >= 3) {
      achievements.maybeUnlock('party_animal', (t, d) => toast({ title: t, description: d }));
    }

    haptic('medium');
    await machine.goNext();
  };

  const toggleVibe = (vibe: string) => {
    haptic('light');
    setVibes(prev => prev.includes(vibe) ? prev.filter(v => v !== vibe) : [...prev, vibe]);
  };

  const selectCrew = (size: string) => {
    haptic('light');
    setCrew(size);
  };

  return (
    <OnboardingShell 
      machine={{ ...machine, canGoNext: canNext, goNext: handleNext }}
      title="QUICK SETUP"
      headerVariant="section"
      showProgress={true}
      pager={{ index: 1, count: 7 }}
      nextLabel="Continue"
      verticalAlign="center"
    >
      <div className="mx-auto w-full max-w-md space-y-8">
        <GlassCard className="p-4 rounded-3xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-base font-medium text-white">Venice Beach</div>
              <div className="text-sm text-white/60">Auto-detected • Tap to change</div>
            </div>
            <div className="h-6 w-6 rounded-full border border-[var(--glass-border)] grid place-items-center">
              <div className="h-3 w-3 rounded-full bg-[var(--accent-violet-400)]" />
            </div>
          </div>
        </GlassCard>

        <section>
          <div className="text-sm text-white/80 mb-1">When's your birthday?</div>
          <div className="text-xs text-white/50 mb-4">For age-appropriate experiences</div>
          <div className="flex gap-3">
            <Select onValueChange={setMonth}>
              <SelectTrigger className="h-10 w-40 rounded-xl bg-[var(--glass-bg)] border-[var(--glass-border)]">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select onValueChange={setYear}>
              <SelectTrigger className="h-10 w-32 rounded-xl bg-[var(--glass-bg)] border-[var(--glass-border)]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({length:60},(_,i)=>String(new Date().getFullYear()-18-i))
                  .map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </section>

        <section>
          <div className="mb-2">What's your vibe?</div>
          <div className="grid grid-cols-3 gap-3">
            {VIBES.map(v => {
              const on = vibes.includes(v);
              return (
                <button
                  key={v}
                  onClick={() => toggleVibe(v)}
                  className={cn(
                    "h-10 rounded-2xl border px-4 text-sm transition-all",
                    "border-[var(--glass-border)] bg-[var(--glass-bg)]",
                    on 
                      ? "ring-1 ring-[var(--accent-violet-400)] bg-[var(--accent-violet-400)]/15 scale-[1.02]" 
                      : "hover:bg-white/10"
                  )}
                >
                  {v}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <div className="mb-2">Crew size preference</div>
          <div className="grid grid-cols-2 gap-3">
            {CREWS.map(c => {
              const on = crew === c;
              return (
                <button
                  key={c}
                  onClick={() => selectCrew(c)}
                  className={cn(
                    "h-10 rounded-2xl border px-4 text-sm transition-all",
                    "border-[var(--glass-border)] bg-[var(--glass-bg)]",
                    on 
                      ? "ring-1 ring-[var(--accent-violet-400)] bg-[var(--accent-violet-400)]/15 scale-[1.02]" 
                      : "hover:bg-white/10"
                  )}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </OnboardingShell>
  );
}
