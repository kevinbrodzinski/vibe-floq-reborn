import * as React from 'react';
import type { PresencePayload } from '@/types/presence';

type Props = { data: PresencePayload | null; onClose: () => void };

export const PresenceInfoCard: React.FC<Props> = ({ data, onClose }) => {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  if (!data) return null;

  const { kind, id, name, lngLat } = data;

  // Primary CTA mapping (Enter triggers this)
  const primary = React.useMemo(() => {
    if (kind === 'friend') {
      return { label: 'Ping', exec: () => window.dispatchEvent(new CustomEvent('floq:ping', { detail: { id } })) };
    }
    if (kind === 'venue' && lngLat) {
      return {
        label: 'Flow to venue',
        exec: () => window.dispatchEvent(new CustomEvent('floq:navigate', { detail: { to: lngLat, meta: { type: 'venue', venueId: id } } })),
      };
    }
    return { label: 'Recenter', exec: () => window.dispatchEvent(new CustomEvent('floq:geolocate')) };
  }, [kind, id, lngLat]);

  // Keyboard a11y
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter') { primary.exec(); onClose(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [primary, onClose]);

  // Token-safe color
  const ringStyle = { background: data.color ?? 'var(--vibe-ring, rgb(128,128,128))' };

  return (
    <div ref={rootRef} role="dialog" aria-label="Presence details" className="fixed bottom-3 inset-x-3 z-[85]">
      <div className="mx-auto w-full max-w-md rounded-xl bg-black/80 border border-white/10 text-white backdrop-blur-md shadow-xl p-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full" style={ringStyle} />
          <div className="min-w-0">
            <div className="font-semibold truncate">{name || (kind === 'venue' ? 'Venue' : kind === 'self' ? 'You' : 'Friend')}</div>
            <div className="text-xs text-white/70">{kind === 'venue' ? 'Place' : kind === 'self' ? 'My location' : 'Friend'}</div>
          </div>
          <div className="ml-auto flex gap-2">
            <button className="h-9 px-3 rounded-lg bg-white text-black font-medium hover:bg-white/90" onClick={() => { primary.exec(); onClose(); }}>
              {primary.label}
            </button>
            <button className="h-9 px-3 rounded-lg bg-white/10 hover:bg-white/15" onClick={onClose} aria-label="Close">Close</button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {kind === 'venue' && (
            <>
              <button className="h-9 px-3 rounded-lg bg-white/10 hover:bg-white/15"
                      onClick={() => { if (lngLat) window.dispatchEvent(new CustomEvent('floq:invite', { detail: { to: lngLat, id } })); onClose(); }}>
                Invite friends
              </button>
              <button className="h-9 px-3 rounded-lg bg-white/10 hover:bg-white/15"
                      onClick={() => { window.dispatchEvent(new CustomEvent('floq:save_venue', { detail: { id } })); onClose(); }}>
                Save
              </button>
            </>
          )}

          {kind === 'self' && (
            <>
              <button className="h-9 px-3 rounded-lg bg-white/10 hover:bg-white/15"
                      onClick={() => { window.dispatchEvent(new CustomEvent('floq:share_location')); onClose(); }}>
                Share live
              </button>
              <button className="h-9 px-3 rounded-lg bg-white/10 hover:bg-white/15"
                      onClick={() => { if (lngLat) window.dispatchEvent(new CustomEvent('floq:set_meet_here', { detail: { at: lngLat } })); onClose(); }}>
                Set meet here
              </button>
            </>
          )}

          {kind === 'friend' && (
            <>
              <button className="h-9 px-3 rounded-lg bg-white/10 hover:bg-white/15"
                      onClick={() => { window.dispatchEvent(new CustomEvent('floq:message', { detail: { id } })); onClose(); }}>
                Message
              </button>
              <button className="h-9 px-3 rounded-lg bg-white/10 hover:bg-white/15"
                      onClick={() => { window.dispatchEvent(new CustomEvent('floq:invite', { detail: { id } })); onClose(); }}>
                Invite
              </button>
              {lngLat && (
                <button className="h-9 px-3 rounded-lg bg-white text-black font-medium hover:bg-white/90"
                        onClick={() => {
                          const myLoc = (window as any)?.floq?.myLocation ?? null;
                          window.dispatchEvent(new CustomEvent('converge:open', {
                            detail: {
                              peer: { id, lngLat, energy01: data.energy01 ?? data.properties?.energy01, direction: data.direction ?? data.properties?.direction },
                              anchor: myLoc,
                            },
                          }));
                          onClose();
                        }}>
                  Converge
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};