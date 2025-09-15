import * as React from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { ConvergeInputs, RankedPoint } from '@/types/presence';
import { rankConvergence, scoreCandidate } from '@/lib/converge/rankConvergence';
import { Button } from "@/components/ui/button";

type Props = { onClose?: () => void };

export function ConvergeSuggestions({ onClose }: Props) {
  const [open, setOpen] = React.useState(false);
  const [points, setPoints] = React.useState<RankedPoint[]>([]);
  const [loading, setLoading] = React.useState(false);

  const close = React.useCallback(() => {
    setOpen(false);
    onClose?.();
  }, [onClose]);

  React.useEffect(() => {
    const handler = async (e: Event) => {
      const { peer, anchor } = (e as CustomEvent<ConvergeInputs>).detail ?? {};
      setOpen(true);
      setLoading(true);
      try {
        // 1) baseline ranking
        const ranked = await rankConvergence({ peer, anchor: anchor ?? null });

        // 2) pre-insert friend's current venue if available
        const me = (window as any)?.floq?.myLocation ?? null;
        const peerLL = peer?.lngLat ?? null;
        const fr = (window as any)?.floq?.friendsIndex?.[peer?.id ?? ''] ?? null;
        const v = fr?.venue;

        let merged = ranked;
        if (me && peerLL && v && Number.isFinite(v.lat) && Number.isFinite(v.lng) && v.name) {
          const candidate = scoreCandidate(
            { energy01: fr?.energy01, direction: fr?.direction, lngLat: peerLL },
            { id: String(v.id ?? `${v.lat},${v.lng}`), name: v.name, lat: Number(v.lat), lng: Number(v.lng), category: v.category, openNow: v.openNow },
            { lat: me.lat, lng: me.lng },
            { lat: peerLL.lat, lng: peerLL.lng },
          );
          const existingIx = ranked.findIndex(p => p.id === candidate.id);
          merged = existingIx === -1 ? [candidate, ...ranked] : [candidate, ...ranked.filter((_, i) => i !== existingIx)];
        }

        setPoints(merged.slice(0, 6));
      } catch (err) {
        console.warn('[ConvergeSuggestions] Ranking failed:', err);
        setPoints([]);
      } finally {
        setLoading(false);
      }
    };

    window.addEventListener('converge:open', handler as EventListener);
    return () => window.removeEventListener('converge:open', handler as EventListener);
  }, [onClose]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    if (open) {
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
  }, [open, close]);

  const request = (p: RankedPoint) => {
    window.dispatchEvent(new CustomEvent('converge:request', { detail: { point: p } }));
    close();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div 
          role="dialog"
          aria-label="Suggested convergence points"
          className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-x-0 bottom-0 p-3">
            <motion.div
              className="mx-auto w-full max-w-md rounded-2xl bg-neutral-900 border border-white/10 shadow-xl"
              initial={{ y: 40, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: 40, opacity: 0 }}
            >
              <div className="p-3 flex items-center justify-between">
                <div className="font-semibold text-white">Suggested convergence points</div>
                <button 
                  className="text-white/60 hover:text-white p-1 rounded"
                  onClick={close}
                >
                  ✕
                </button>
              </div>
              
              <div className="max-h-[60vh] overflow-auto px-3 pb-3">
                {loading ? (
                  <div className="p-6 text-center text-white/60">
                    Finding great spots…
                  </div>
                ) : points.length === 0 ? (
                  <div className="p-6 text-center text-white/60">
                    No strong options nearby.
                  </div>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {points.map(p => (
                      <li key={p.id} className="rounded-xl bg-white/5 px-3 py-2 border border-white/10">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-white truncate">{p.name}</div>
                            <div className="text-xs text-white/70">
                              {p.category ?? "Place"} · {Math.round(p.match * 100)}% match
                              <br />
                              Me: {Math.round(p.eta.meMin)}m · Friend: {Math.round(p.eta.friendMin)}m
                            </div>
                          </div>
                          <Button 
                            size="sm"
                            className="ml-2 shrink-0"
                            onClick={() => request(p)}
                          >
                            Request converge
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}