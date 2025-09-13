import * as React from 'react';

export function RallyMomentCard({
  m,
  onOpenMap,
}: {
  m: {
    rally_id?: string;
    center?: { lng: number; lat: number };
    started_at: string;
    ended_at?: string | null;
    participants?: any[];
    interaction_strength?: number | null;
  };
  onOpenMap?: (c: { lng: number; lat: number }) => void;
}) {
  const p = m.participants || [];
  const gotCenter =
    !!m?.rally_id &&
    !!m?.center &&
    Number.isFinite(m?.center?.lng) &&
    Number.isFinite(m?.center?.lat);

  return (
    <div className="rounded-xl bg-card/60 border border-border p-3 flex items-start gap-3">
      <div className="text-xl" aria-hidden>⚡</div>
      <div className="flex-1">
        <div className="text-sm font-semibold">Rally</div>
        <div className="text-xs text-muted-foreground">
          {new Date(m.started_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
          {m.ended_at ? ` – ${new Date(m.ended_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}
        </div>

        {!!p.length && (
          <div className="mt-2 text-xs">
            Participants: {p.length}
          </div>
        )}

        {typeof m.interaction_strength === 'number' && (
          <div className="mt-1 text-[11px] text-muted-foreground">
            Social intensity: {Math.round(m.interaction_strength * 100)}%
          </div>
        )}

        {gotCenter && (
          <button
            type="button"
            className="mt-2 inline-flex text-[11px] px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/90"
            aria-label="View rally location on map"
            onClick={() => onOpenMap?.(m.center!)}
          >
            View on map
          </button>
        )}
      </div>
    </div>
  );
}