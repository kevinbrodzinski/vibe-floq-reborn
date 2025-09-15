import * as React from 'react';
import { useBannerQueue } from '@/hooks/useBannerQueue';
import { useUnifiedPrivacy } from '@/lib/store/usePrivacy';

function metersToLabel(m?: number) {
  if (m == null) return '';
  if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
  return `${Math.round(m)} m`;
}

export const CrossPathsBanner: React.FC<{
  className?: string;
  autoSnoozeMinutes?: number;
}> = ({ className, autoSnoozeMinutes = 60 }) => {
  const { current, dismissCurrent, snooze, isSnoozed } = useBannerQueue();
  const { mode, isGhostMode } = useUnifiedPrivacy();

  if (mode === 'off' || isGhostMode) return null;
  if (!current || isSnoozed) return null;

  const label = current.tier === 'bestie' ? 'Nearby bestie' : 'Friend nearby';
  const dist = metersToLabel(current.distanceM);

  const onSuggest = () => {
    window.dispatchEvent(new CustomEvent('ui:rallyInbox:open', { detail: { id: current.id } }));
    window.dispatchEvent(new CustomEvent('ui_banner_action', { detail: { action: 'suggest_meet', id: current.id } }));
    dismissCurrent();
  };

  const onView = () => {
    window.dispatchEvent(new CustomEvent('friends:select', { detail: { kind: 'friend', id: current.id, name: current.name } }));
    window.dispatchEvent(new CustomEvent('ui_banner_action', { detail: { action: 'view_profile', id: current.id } }));
    dismissCurrent();
  };

  const onDismiss = () => {
    window.dispatchEvent(new CustomEvent('ui_banner_action', { detail: { action: 'dismiss', id: current.id } }));
    dismissCurrent();
  };

  const onSettings = () => {
    window.dispatchEvent(new CustomEvent('ui:presenceSettings:open'));
    window.dispatchEvent(new CustomEvent('ui_banner_action', { detail: { action: 'open_settings' } }));
  };

  const onSnooze = () => {
    window.dispatchEvent(new CustomEvent('ui_banner_action', { detail: { action: 'snooze', minutes: autoSnoozeMinutes } }));
    snooze(autoSnoozeMinutes);
  };

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onDismiss(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className={["fixed left-3 right-3 bottom-16 z-[70]", className].filter(Boolean).join(' ')}>
      <div
        role="dialog"
        aria-live="polite"
        aria-label="Cross-paths notification"
        className="mx-auto w-[min(520px,calc(100vw-24px))] rounded-lg bg-black/80 border border-white/10
                   backdrop-blur-md text-white shadow-xl px-3 py-2"
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">
              {label}{dist ? ` · ${dist}` : ''}
            </div>
            {current.name && <div className="text-xs text-white/70 truncate">{current.name}</div>}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button className="h-8 px-3 rounded-md bg-white text-black text-xs font-semibold hover:bg-white/90" onClick={onSuggest}>
              Suggest meet
            </button>
            <button className="h-8 px-3 rounded-md bg-white/10 text-white text-xs hover:bg-white/15" onClick={onView}>
              View
            </button>
            <button className="h-8 px-3 rounded-md bg-white/10 text-white text-xs hover:bg-white/15" onClick={onDismiss} aria-label="Dismiss notification">
              Dismiss
            </button>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-3 text-[11px] text-white/60">
          <button className="underline hover:text-white/80" onClick={onSnooze}>
            Mute for {autoSnoozeMinutes} min
          </button>
          <span aria-hidden>•</span>
          <button className="underline hover:text-white/80" onClick={onSettings}>
            Settings
          </button>
        </div>
      </div>
    </div>
  );
};