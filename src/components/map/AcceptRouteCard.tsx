import * as React from 'react';
import { MapPin, Check, X } from 'lucide-react';

type Props = {
  to: { lat: number; lng: number; name?: string };
  onAccept: () => void;
  onClose: () => void;
};

/** Small bottom card: Accept & Route */
export const AcceptRouteCard: React.FC<Props> = ({ to, onAccept, onClose }) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Converge request"
      className="fixed inset-x-0 bottom-0 z-[85] p-3"
    >
      <div className="mx-auto w-full max-w-md rounded-xl bg-black/80 backdrop-blur-md border border-white/10 text-white shadow-xl">
        <div className="p-3 flex items-center gap-3">
          <div className="h-9 w-9 grid place-items-center rounded-full bg-white/10">
            <MapPin size={16} />
          </div>
          <div className="min-w-0">
            <div className="font-semibold truncate">
              {to.name ?? 'Suggested rally point'}
            </div>
            <div className="text-xs text-white/70">
              {to.lat.toFixed(5)}, {to.lng.toFixed(5)}
            </div>
          </div>
          <div className="ml-auto flex gap-2">
            <button
              onClick={onClose}
              className="h-9 px-3 rounded-lg bg-white/10 hover:bg-white/15"
              aria-label="Dismiss"
            >
              <X size={16} />
            </button>
            <button
              onClick={onAccept}
              className="h-9 px-3 rounded-lg bg-white text-black font-medium hover:bg-white/90"
            >
              <span className="inline-flex items-center gap-2">
                <Check size={16} /> Accept & Route
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};