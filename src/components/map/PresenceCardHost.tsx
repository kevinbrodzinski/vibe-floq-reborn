import * as React from 'react';
import { PresenceInfoCard } from './PresenceInfoCard';
import { ConvergeSuggestions } from './ConvergeSuggestions';

export const PresenceCardHost: React.FC = () => {
  const [acceptTo, setAcceptTo] = React.useState<{ lat: number; lng: number; name?: string } | null>(null);

  // Listen for convergence requests
  React.useEffect(() => {
    const onReq = (e: Event) => {
      const p = (e as CustomEvent<{ point: { lat: number; lng: number; name?: string } }>).detail?.point;
      if (p) setAcceptTo(p);
    };
    
    window.addEventListener('converge:request', onReq as EventListener);
    return () => window.removeEventListener('converge:request', onReq as EventListener);
  }, []);

  return (
    <>
      <PresenceInfoCard />
      <ConvergeSuggestions />
      
      {/* Accept & Route modal for convergence requests */}
      {acceptTo && (
        <div 
          role="dialog" 
          aria-label="Converge request" 
          className="fixed inset-x-0 bottom-0 z-[85] p-3"
        >
          <div className="mx-auto w-[min(520px,calc(100vw-24px))] rounded-xl bg-black/80 border border-white/10 text-white backdrop-blur-md p-3 flex items-center gap-3">
            <div className="min-w-0">
              <div className="font-semibold truncate">{acceptTo.name ?? 'Suggested rally point'}</div>
              <div className="text-xs text-white/70">{acceptTo.lat.toFixed(5)}, {acceptTo.lng.toFixed(5)}</div>
            </div>
            <div className="ml-auto flex gap-2">
              <button 
                className="h-9 px-3 rounded-lg bg-white/10 hover:bg-white/15" 
                onClick={() => setAcceptTo(null)}
              >
                Close
              </button>
              <button 
                className="h-9 px-3 rounded-lg bg-white text-black font-medium hover:bg-white/90"
                onClick={() => { 
                  window.dispatchEvent(new CustomEvent('floq:navigate', { detail: { to: acceptTo } })); 
                  setAcceptTo(null); 
                }}
              >
                Accept & Route
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};