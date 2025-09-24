import * as React from 'react';

type Nudge = {
  id: string;
  title: string;
  body: string;
  cta: { label: string; kind: 'reminder' | 'save' | 'open' };
  payload?: Record<string, any>;
};

export function SmartNudgeChip({ 
  nudge, 
  onAct, 
  className = '' 
}: {
  nudge: Nudge | null;
  onAct?: (n: Nudge) => void;
  className?: string;
}) {
  if (!nudge) return null;
  
  return (
    <div className={`mt-4 flex items-center justify-between rounded-xl border border-border bg-card/40 p-3 ${className}`}>
      <div>
        <div className="text-foreground text-sm font-medium">{nudge.title}</div>
        <div className="text-xs text-muted-foreground">{nudge.body}</div>
      </div>
      <button
        aria-label={nudge.cta.label}
        onClick={() => onAct?.(nudge)}
        className="px-3 py-1.5 rounded-md text-xs bg-primary text-primary-foreground hover:bg-primary/90"
      >
        {nudge.cta.label}
      </button>
    </div>
  );
}