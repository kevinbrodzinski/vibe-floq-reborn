import React from 'react';
import { CalendarDays, Clock, Users, CheckCircle2 } from 'lucide-react';
import { ProgressRing } from './ProgressRing';
import { cn } from '@/lib/utils';

export function PlanHero({
  title, dateLabel, timeLabel, durationLabel,
  participants, readinessPct=0, status='Draft', variant='darkGlass',
}: {
  title: string; dateLabel: string; timeLabel: string; durationLabel: string;
  participants: { name?: string; avatar?: string }[];
  readinessPct?: number; status?: 'Draft'|'Planning'|'Ready';
  variant?: 'darkGlass'|'lightGlass'|'neumorph';
}) {
  const shell = 'relative overflow-hidden rounded-3xl border p-5 sm:p-6 backdrop-blur-xl';
  const theme = {
    darkGlass: 'bg-gradient-to-b from-white/8 to-white/4 border-white/10 text-white',
    lightGlass: 'bg-white/80 border-black/10 text-black',
    neumorph: 'bg-[#0f1320] text-white shadow-[12px_12px_24px_#0b0e19,-12px_-12px_24px_#13182a] border-white/5',
  }[variant];

  return (
    <div className={cn(shell, theme)}>
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(600px_200px_at_10%_-10%,rgba(124,58,237,.25),transparent),radial-gradient(400px_160px_at_90%_-20%,rgba(16,185,129,.25),transparent)]" />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm opacity-70 mb-1">{status}</div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">{title}</h1>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm opacity-85">
            <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4"/>{dateLabel}</div>
            <div className="flex items-center gap-2"><Clock className="h-4 w-4"/>{timeLabel} <span className="ml-2 opacity-70">{durationLabel}</span></div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4"/>
              <div className="flex -space-x-2">
                {participants.slice(0,5).map((p,i)=>(
                  <img key={i} src={p.avatar || '/placeholder/avatar.png'} className="h-6 w-6 rounded-full ring-2 ring-background"/>
                ))}
              </div>
              {participants.length>5 && <span className="text-xs opacity-60">+{participants.length-5}</span>}
            </div>
          </div>
        </div>

        <div className="shrink-0 relative">
          <ProgressRing value={readinessPct} className="text-violet-400" />
          <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold">
            {Math.round(readinessPct)}%
          </div>
        </div>
      </div>

      {status==='Ready' && (
        <div className="mt-4 inline-flex items-center gap-2 text-emerald-300 text-sm">
          <CheckCircle2 className="h-4 w-4"/> Good to go
        </div>
      )}
    </div>
  );
}