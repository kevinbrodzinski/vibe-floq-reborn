import React from 'react';
import { cn } from '@/lib/utils';

export function KpiChip({
  icon, label, value, hint, variant='darkGlass', className
}: {
  icon: React.ReactNode; label: string; value: string | number; hint?: string;
  variant?: 'darkGlass'|'lightGlass'|'neumorph'; className?: string;
}) {
  const base = 'rounded-2xl px-4 py-3 border backdrop-blur-xl transition';
  const theme = {
    darkGlass: 'bg-white/6 border-white/12 text-white',
    lightGlass: 'bg-white/70 border-black/10 text-black',
    neumorph: 'bg-[#0f1320] text-white shadow-[8px_8px_16px_#0b0e19,-8px_-8px_16px_#13182a] border-white/5',
  }[variant];

  return (
    <div className={cn(base, theme, 'flex items-center gap-3', className)}>
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="text-xs opacity-70">{label}</div>
        <div className="text-sm font-semibold truncate">{value}</div>
        {hint && <div className="text-[11px] opacity-60 truncate">{hint}</div>}
      </div>
    </div>
  );
}