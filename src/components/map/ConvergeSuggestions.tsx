import * as React from 'react';
import { ConvergeInputs, RankedPoint } from '@/types/presence';
import { rankConvergence, scoreCandidate } from '@/lib/converge/rankConvergence';

type Props = { onClose?: () => void };

export function ConvergeSuggestions({ onClose }: Props) {
  const [open, setOpen] = React.useState(false);
  const [points, setPoints] = React.useState<RankedPoint[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [prefillId, setPrefillId] = React.useState<string | null>(null);
  const seqRef = React.useRef(0);
  const closeBtnRef = React.useRef<HTMLButtonElement | null>(null);

  const close = React.useCallback(() => {
    setOpen(false);
    onClose?.();
  }, [onClose]);

  React.useEffect(() => {
    const handler = async (e: Event) => {
      const { peer, anchor } = (e as CustomEvent<ConvergeInputs>).detail ?? {};
      const mySeq = ++seqRef.current;
      setOpen(true);
      setLoading(true);
      try {
        // 1) baseline ranking
        const ranked = await rankConvergence({ peer, anchor: anchor ?? null });

        // 2) pre-insert the friend's current venue if available (and valid)
        const me = (window as any)?.floq?.myLocation ?? null;
        const peerLL = peer?.lngLat ?? null;
        const fr = (window as any)?.floq?.friendsIndex?.[peer?.id ?? ''] ?? null;
        const v = fr?.venue;

        let merged = ranked;
        let markedId: string | null = null;

        if (me && peerLL && v && Number.isFinite(v.lat) && Number.isFinite(v.lng) && v.name) {
          const candidate = scoreCandidate(
            { energy01: fr?.energy01, direction: fr?.direction, lngLat: peerLL },
            { id: String(v.id ?? `${v.lat},${v.lng}`), name: v.name, lat: Number(v.lat), lng: Number(v.lng), category: v.category, openNow: v.openNow },
            { lat: me.lat, lng: me.lng },
            { lat: peerLL.lat, lng: peerLL.lng },
          );
          const existingIx = ranked.findIndex(p => p.id === candidate.id);
          if (existingIx === -1) {
            merged = [candidate, ...ranked];
            markedId = candidate.id;
          } else {
            const best = candidate.match >= ranked[existingIx].match ? candidate : ranked[existingIx];
            merged = [best, ...ranked.filter((_, i) => i !== existingIx)];
            markedId = best.id;
          }
        }

        if (mySeq !== seqRef.current) return; // stale; ignore
        
        // Analytics: emit prefill event when friend's venue is shown at top
        if (markedId) {
          window.dispatchEvent(new CustomEvent('ui_converge_prefill', {
            detail: { friendId: peer?.id, venueId: markedId }
          }));
        }

        setPrefillId(markedId);
        setPoints(merged.slice(0, 6));
      } catch (err) {
        if (mySeq !== seqRef.current) return;
        console.warn('[ConvergeSuggestions] Ranking failed:', err);
        setPrefillId(null);
        setPoints([]);
      } finally {
        if (mySeq !== seqRef.current) return;
        setLoading(false);
      }
    };

    window.addEventListener('converge:open', handler as EventListener);
    return () => window.removeEventListener('converge:open', handler as EventListener);
  }, []); // No dependencies - handler doesn't use onClose directly

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    // Focus close button for accessibility
    closeBtnRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  const request = React.useCallback((p: RankedPoint) => {
    // Analytics: track when user selects a suggestion
    const isPrefilled = prefillId !== null && p.id === prefillId;
    window.dispatchEvent(new CustomEvent('ui_converge_request', {
      detail: { from: isPrefilled ? 'prefill_top' : 'ranked', id: p.id }
    }));
    
    window.dispatchEvent(new CustomEvent('converge:request', { detail: { point: p } }));
    close();
  }, [close, prefillId]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Suggested convergence points"
      className="fixed inset-0 z-[90]"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={close} />

      {/* Card */}
      <div
        className="relative mx-auto mt-12 w-[min(560px,calc(100vw-24px))] rounded-xl bg-black/80 border border-white/10
                   backdrop-blur-md text-white shadow-xl"
      >
        <div className="p-3 flex items-center justify-between">
          <div className="font-semibold">Suggested convergence points</div>
          <button
            ref={closeBtnRef}
            onClick={close}
            aria-label="Close suggestions"
            className="h-9 px-3 rounded-lg bg-white/10 hover:bg-white/15"
          >
            ✕
          </button>
        </div>

        <div className="p-2 space-y-2">
          {loading ? (
            <div className="px-3 py-8 text-sm text-white/80">Finding great spots…</div>
          ) : points.length === 0 ? (
            <div className="px-3 py-8 text-sm text-white/80">No strong options nearby.</div>
          ) : (
            points.map((p, idx) => {
              const isPrefilledTop = prefillId !== null && p.id === prefillId && idx === 0;
              return (
                <button
                  key={p.id}
                  onClick={() => request(p)}
                  className={[
                    // base card
                    "w-full text-left px-3 py-3 rounded-lg border border-white/10 bg-black/60 hover:bg-black/50",
                    "transition-[background,box-shadow,transform] duration-150",
                    // token glow for the top prefilled card
                    isPrefilledTop
                      ? "ring-2 ring-[var(--vibe-ring)] shadow-[0_0_24px_1px_var(--vibe-ring)]"
                      : ""
                  ].join(" ")}
                  // small lift on hover to juice CTR a bit
                  style={isPrefilledTop ? { transform: "translateZ(0)" } : undefined}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-medium truncate">{p.name}</div>

                        {/* Tiny badge only for the prefilled top item */}
                        {isPrefilledTop && (
                          <span
                            aria-label="Friend's current spot"
                            className="inline-flex items-center rounded-full text-[10px] font-semibold px-2 py-[2px] border
                                       border-[var(--vibe-ring)] text-[var(--vibe-ring)] bg-white/5"
                          >
                            Friend's current spot
                          </span>
                        )}
                      </div>

                      <div className="mt-0.5 text-xs text-white/70 truncate">
                        {(p.category ?? 'Place')} · {Math.round(p.match * 100)}% match
                      </div>
                    </div>

                    <div className="shrink-0 text-xs text-white/80">
                      <div>Me: {Math.round(p.eta.meMin)}m</div>
                      <div>Friend: {Math.round(p.eta.friendMin)}m</div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}