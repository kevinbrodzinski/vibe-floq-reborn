import * as React from 'react';
import { openTransitDirections, openRideshare } from '@/lib/geo/openNativeDirections';

export type ConvergencePoint = {
  lng: number;
  lat: number;
  groupMin: number;
  prob: number;   // 0..1
  etaMin: number; // minutes
};

type Props = {
  point: ConvergencePoint;
  onClose: () => void;
  onInvite?: (point: ConvergencePoint) => void;
  onRoute?: (point: ConvergencePoint) => void;
  className?: string;
};

const confidenceLabel = (p: number) => (p >= 0.75 ? 'High' : p >= 0.45 ? 'Medium' : 'Low');

export default function ConvergenceCard({
  point, onClose, onInvite, onRoute, className,
}: Props) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const conf = Math.round(point.prob * 100);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label="Convergence details"
      className={`fixed left-4 right-4 z-[605] rounded-2xl border border-white/15 bg-black/65 backdrop-blur p-3 shadow-xl
                  md:left-1/2 md:-translate-x-1/2 md:w-[420px]
                  transition-all`}
      style={{ bottom: `calc(6.25rem + env(safe-area-inset-bottom))` }}
    >
      <div className="flex items-start gap-2">
        <div className="shrink-0 mt-[2px]">
          <div className="w-8 h-8 rounded-full bg-white/12 grid place-items-center">✨</div>
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-white font-semibold text-sm">
              Convergence ahead
            </h3>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white text-xs px-2 py-1 rounded-md bg-white/10"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="mt-1 text-[13px] text-white/90">
            <span className="mr-3">👥 {Math.max(3, point.groupMin)}+</span>
            <span className="mr-3">⏱ {point.etaMin}m</span>
            <span className="mr-1">🧭 {confidenceLabel(point.prob)}</span>
            <span className="text-white/60">({conf}%)</span>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => onInvite?.(point)}
              className="px-3 py-1.5 rounded-md text-xs font-semibold bg-white text-black hover:bg-white/90"
            >
              Ping friends
            </button>
            <button
              onClick={() => onRoute?.(point)}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-white/10 text-white hover:bg-white/15 border border-white/15"
            >
              Route
            </button>
          </div>

          <div className="mt-2 flex gap-2">
            <button
              className="px-3 py-1.5 rounded-md text-xs bg-white/10 text-white hover:bg-white/15 border border-white/15"
              onClick={(e) => {
                e.stopPropagation();
                openTransitDirections({
                  dest: { lat: point.lat, lng: point.lng },
                  label: 'Convergence',
                  transitMode: 'rail|bus',
                });
              }}
            >
              Transit
            </button>
            <button
              className="px-3 py-1.5 rounded-md text-xs bg-white text-black hover:bg-white/90"
              onClick={(e) => {
                e.stopPropagation();
                openRideshare({
                  dest: { lat: point.lat, lng: point.lng },
                  destLabel: 'Convergence',
                  pickup: 'my_location',
                  provider: 'both',
                  rideTypeId: 'uberx',
                });
              }}
            >
              Rideshare
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}