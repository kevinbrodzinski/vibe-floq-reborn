import * as React from 'react';
import { PresenceInfoCard } from './PresenceInfoCard';
import { ConvergeSuggestions } from './ConvergeSuggestions';
import type { PresencePayload } from '@/types/presence';

const AcceptRouteCard: React.FC<{
  to: { lat: number; lng: number; name?: string } | null;
  onAccept: () => void;
  onClose: () => void;
}> = ({ to, onAccept, onClose }) => {
  if (!to) return null;
  return (
    <div role="dialog" aria-label="Converge request" className="fixed inset-x-0 bottom-0 z-[85] p-3">
      <div className="mx-auto w-full max-w-md rounded-xl bg-black/80 backdrop-blur-md border border-white/10 text-white shadow-xl">
        <div className="p-3 flex items-center gap-3">
          <div className="h-9 w-9 grid place-items-center rounded-full bg-white/10">📍</div>
          <div className="min-w-0">
            <div className="font-semibold truncate">{to.name ?? 'Suggested rally point'}</div>
            <div className="text-xs text-white/70">{to.lat.toFixed(5)}, {to.lng.toFixed(5)}</div>
          </div>
          <div className="ml-auto flex gap-2">
            <button onClick={onClose} className="h-9 px-3 rounded-lg bg-white/10 hover:bg-white/15" aria-label="Dismiss">Close</button>
            <button onClick={onAccept} className="h-9 px-3 rounded-lg bg-white text-black font-medium hover:bg-white/90">Accept & Route</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const PresenceCardHost: React.FC = () => {
  const [data, setData] = React.useState<PresencePayload | null>(null);
  const [acceptTo, setAcceptTo] = React.useState<{ lat: number; lng: number; name?: string } | null>(null);

  // Open info card from selection events
  React.useEffect(() => {
    const onFriend = (e: Event) => setData((e as CustomEvent<PresencePayload>).detail);
    const onVenue  = (e: Event) => setData((e as CustomEvent<PresencePayload>).detail);
    window.addEventListener('friends:select', onFriend as EventListener);
    window.addEventListener('venues:select',  onVenue  as EventListener);
    return () => {
      window.removeEventListener('friends:select', onFriend as EventListener);
      window.removeEventListener('venues:select',  onVenue  as EventListener);
    };
  }, []);

  // Show Accept & Route on converge request
  React.useEffect(() => {
    const onReq = (e: Event) => {
      const p = (e as CustomEvent<{ point: { lat: number; lng: number; name?: string } }>).detail?.point;
      if (p) setAcceptTo(p);
    };
    window.addEventListener('converge:request', onReq as EventListener);
    return () => window.removeEventListener('converge:request', onReq as EventListener);
  }, []);

  // ESC closes open cards
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setData(null); setAcceptTo(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <PresenceInfoCard data={data} onClose={() => setData(null)} />
      <ConvergeSuggestions onClose={() => {}} />
      <AcceptRouteCard
        to={acceptTo}
        onAccept={() => {
          if (acceptTo) window.dispatchEvent(new CustomEvent('floq:navigate', { detail: { to: acceptTo } }));
          setAcceptTo(null);
        }}
        onClose={() => setAcceptTo(null)}
      />
    </>
  );
};