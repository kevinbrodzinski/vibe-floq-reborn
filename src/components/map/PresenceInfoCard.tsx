import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";

type Kind = 'friend' | 'venue' | 'self';

type LngLat = { lng: number; lat: number };

export type PresencePayload = {
  kind: Kind;
  id: string;
  name?: string;
  lngLat?: LngLat;
  color?: string;
  properties?: Record<string, any>;
};

type Props = {
  data: PresencePayload | null;
  onClose: () => void;
};

const Row: React.FC<{label:string; value?:React.ReactNode}> = ({label,value}) => (
  <div className="flex items-center justify-between text-sm text-white/80">
    <span className="font-medium text-white">{label}</span>
    <span className="ml-3">{value ?? '—'}</span>
  </div>
);

export const PresenceInfoCard: React.FC<Props> = ({ data, onClose }) => {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' && data) primaryAction(data);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [data, onClose]);

  if (!data) return null;
  const { kind, name, color } = data;
  const isSelf = kind === 'self';

  const primaryLabel =
    kind === 'venue' ? 'Flow to venue'
    : isSelf ? 'Recenter'
    : 'Ping';

  function primaryAction(d: PresencePayload) {
    if (d.kind === 'venue') {
      if (d.lngLat) window.dispatchEvent(new CustomEvent('floq:navigate', { detail: { to: d.lngLat }}));
    } else if (d.kind === 'self') {
      window.dispatchEvent(new CustomEvent('floq:geolocate'));
    } else {
      window.dispatchEvent(new CustomEvent('floq:ping', { detail: { id: d.id }}));
    }
    onClose();
  }



  return (
    <AnimatePresence>
      <motion.div
        ref={ref}
        className="fixed left-0 right-0 bottom-0 z-[70] px-3 pb-6 pointer-events-none"
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <div className="pointer-events-auto mx-auto w-[min(560px,92%)] rounded-2xl border border-white/10 bg-black/70 backdrop-blur-lg shadow-xl">
          <div className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full border border-white/20" style={{ background: color ?? '#64748b' }} />
            <div className="min-w-0">
              <div className="text-white font-semibold truncate">
                {name || (kind === 'venue' ? 'Venue' : isSelf ? 'You' : 'Friend')}
              </div>
              <div className="text-xs text-white/60">{kind === 'venue' ? 'Place' : isSelf ? 'My location' : 'Friend'}</div>
            </div>
          </div>

          <div className="px-4 pb-3 space-y-2">
            {data.properties?.category && <Row label="Category" value={data.properties.category} />}
            {data.properties?.distance_m != null && (
              <Row label="Distance" value={`${Math.round(Number(data.properties.distance_m))} m`} />
            )}
            {data.properties?.vibe && <Row label="Vibe" value={String(data.properties.vibe)} />}
          </div>

          <div className="p-3 pt-0 flex gap-2 justify-end">
            {/* secondary actions vary by kind */}
            {kind === 'venue' ? (
              <>
                <button
                  onClick={() => {
                    if (data.lngLat) window.dispatchEvent(new CustomEvent('floq:invite', { detail: { to: data.lngLat, id: data.id } }));
                    onClose();
                  }}
                  className="px-3 h-9 rounded-lg bg-white/6 text-white hover:bg-white/10"
                >
                  Invite friends
                </button>
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('floq:save_venue', { detail: { id: data.id } }));
                    onClose();
                  }}
                  className="px-3 h-9 rounded-lg bg-white/6 text-white hover:bg-white/10"
                >
                  Save
                </button>
              </>
            ) : isSelf ? (
              <>
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('floq:share_location'));
                    onClose();
                  }}
                  className="px-3 h-9 rounded-lg bg-white/6 text-white hover:bg-white/10"
                >
                  Share live
                </button>
                <button
                  onClick={() => {
                    if (data.lngLat) window.dispatchEvent(new CustomEvent('floq:set_meet_here', { detail: { at: data.lngLat } }));
                    onClose();
                  }}
                  className="px-3 h-9 rounded-lg bg-white/6 text-white hover:bg-white/10"
                >
                  Set meet here
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('floq:message', { detail: { id: data.id }}));
                    onClose();
                  }}
                  className="px-3 h-9 rounded-lg bg-white/6 text-white hover:bg-white/10"
                >
                  Message
                </button>
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('floq:invite', { detail: { id: data.id }}));
                    onClose();
                  }}
                  className="px-3 h-9 rounded-lg bg-white/6 text-white hover:bg-white/10"
                >
                  Invite
                </button>
              </>
            )}

            <button
              onClick={() => primaryAction(data)}
              className="px-3 h-9 rounded-lg bg-white text-black font-medium hover:bg-white/90"
            >
              {primaryLabel}
            </button>
            <button onClick={onClose} className="px-3 h-9 rounded-lg bg-white/6 text-white hover:bg-white/10">Close</button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
