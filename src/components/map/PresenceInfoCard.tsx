import * as React from 'react';
import type { PresencePayload } from '@/types/presence';

type Props = { data: PresencePayload | null; onClose: () => void };

export const PresenceInfoCard: React.FC<Props> = ({ data, onClose }) => {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  
  // Compute everything in a memo - hooks ALWAYS run
  const computed = React.useMemo(() => {
    if (!data) return null;
    
    const { kind, id, name, lngLat } = data;
    
    // Primary CTA mapping
    let primaryLabel = 'Recenter';
    let primaryExec = () => window.dispatchEvent(new CustomEvent('floq:geolocate'));
    
    if (kind === 'friend') {
      primaryLabel = 'Ping';
      primaryExec = () => window.dispatchEvent(new CustomEvent('floq:ping', { detail: { id } }));
    } else if (kind === 'venue' && lngLat) {
      primaryLabel = 'Flow to venue';
      primaryExec = () => window.dispatchEvent(new CustomEvent('floq:navigate', { 
        detail: { to: lngLat, meta: { type: 'venue', venueId: id } } 
      }));
    }
    
    // Token-safe color
    const ringStyle = { background: data.color ?? 'var(--vibe-ring, rgb(128,128,128))' };
    
    return {
      kind,
      id,
      name: name || (kind === 'venue' ? 'Venue' : kind === 'self' ? 'You' : 'Friend'),
      subtitle: kind === 'venue' ? 'Place' : kind === 'self' ? 'My location' : 'Friend',
      lngLat,
      primaryLabel,
      primaryExec,
      ringStyle,
      energy01: data.energy01 ?? data.properties?.energy01,
      direction: data.direction ?? data.properties?.direction,
    };
  }, [data]);

  // Keyboard a11y - always run effect, just no-op when computed is null
  React.useEffect(() => {
    if (!computed) return;
    
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter') { 
        computed.primaryExec(); 
        onClose(); 
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [computed, onClose]);

  // Only gate the JSX - hooks have already run
  if (!computed) return null;

  return (
    <div ref={rootRef} role="dialog" aria-label="Presence details" className="fixed bottom-3 inset-x-3 z-[85]">
      <div className="mx-auto w-full max-w-md rounded-xl bg-black/80 border border-white/10 text-white backdrop-blur-md shadow-xl p-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full" style={computed.ringStyle} />
          <div className="min-w-0">
            <div className="font-semibold truncate">{computed.name}</div>
            <div className="text-xs text-white/70">{computed.subtitle}</div>
          </div>
          <div className="ml-auto flex gap-2">
            <button 
              className="h-9 px-3 rounded-lg bg-white text-black font-medium hover:bg-white/90" 
              onClick={() => { computed.primaryExec(); onClose(); }}
            >
              {computed.primaryLabel}
            </button>
            <button 
              className="h-9 px-3 rounded-lg bg-white/10 hover:bg-white/15" 
              onClick={onClose} 
              aria-label="Close"
            >
              Close
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {computed.kind === 'venue' && (
            <>
              <button 
                className="h-9 px-3 rounded-lg bg-white/10 hover:bg-white/15"
                onClick={() => { 
                  if (computed.lngLat) {
                    window.dispatchEvent(new CustomEvent('floq:invite', { 
                      detail: { to: computed.lngLat, id: computed.id } 
                    })); 
                  }
                  onClose(); 
                }}
              >
                Invite friends
              </button>
              <button 
                className="h-9 px-3 rounded-lg bg-white/10 hover:bg-white/15"
                onClick={() => { 
                  window.dispatchEvent(new CustomEvent('floq:save_venue', { 
                    detail: { id: computed.id } 
                  })); 
                  onClose(); 
                }}
              >
                Save
              </button>
            </>
          )}

          {computed.kind === 'self' && (
            <>
              <button 
                className="h-9 px-3 rounded-lg bg-white/10 hover:bg-white/15"
                onClick={() => { 
                  window.dispatchEvent(new CustomEvent('floq:share_location')); 
                  onClose(); 
                }}
              >
                Share live
              </button>
              <button 
                className="h-9 px-3 rounded-lg bg-white/10 hover:bg-white/15"
                onClick={() => { 
                  if (computed.lngLat) {
                    window.dispatchEvent(new CustomEvent('floq:set_meet_here', { 
                      detail: { at: computed.lngLat } 
                    })); 
                  }
                  onClose(); 
                }}
              >
                Set meet here
              </button>
            </>
          )}

          {computed.kind === 'friend' && (
            <>
              <button 
                className="h-9 px-3 rounded-lg bg-white/10 hover:bg-white/15"
                onClick={() => { 
                  window.dispatchEvent(new CustomEvent('floq:message', { 
                    detail: { id: computed.id } 
                  })); 
                  onClose(); 
                }}
              >
                Message
              </button>
              <button 
                className="h-9 px-3 rounded-lg bg-white/10 hover:bg-white/15"
                onClick={() => { 
                  window.dispatchEvent(new CustomEvent('floq:invite', { 
                    detail: { id: computed.id } 
                  })); 
                  onClose(); 
                }}
              >
                Invite
              </button>
              {computed.lngLat && (
                <button 
                  className="h-9 px-3 rounded-lg bg-white text-black font-medium hover:bg-white/90"
                  onClick={() => {
                    const myLoc = (window as any)?.floq?.myLocation ?? null;
                    window.dispatchEvent(new CustomEvent('converge:open', {
                      detail: {
                        peer: { 
                          id: computed.id, 
                          lngLat: computed.lngLat, 
                          energy01: computed.energy01, 
                          direction: computed.direction 
                        },
                        anchor: myLoc,
                      },
                    }));
                    onClose();
                  }}
                >
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
