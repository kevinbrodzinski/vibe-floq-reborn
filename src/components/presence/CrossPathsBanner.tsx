import * as React from 'react';
import { useBannerQueue } from '@/hooks/useBannerQueue';
import { useUnifiedPrivacy } from '@/lib/store/usePrivacy';
import { canConverge, openConvergeForFriend } from '@/lib/presence/openConverge';

function metersToLabel(m?: number) {
  if (m == null) return '';
  if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
  return `${Math.round(m)} m`;
}

/**
 * Cross-paths UI banner:
 * - Listens to `floq:nearby_banner` events emitted by useCrossPathsWatcher
 * - Queues multiple hits, shows one at a time
 * - Snooze (mutes) for a duration via localStorage
 * - Emits high-level UI actions for analytics/routing
 */
export const CrossPathsBanner: React.FC<{
  className?: string;
  autoSnoozeMinutes?: number; // optional default for "Mute for 1h" button
}> = ({ className, autoSnoozeMinutes = 60 }) => {
  const { current, dismissCurrent, snooze, isSnoozed } = useBannerQueue();
  const { isGhostMode, mode } = useUnifiedPrivacy();

  // Respect privacy/ghost mode — hide entirely
  if (mode === 'off' || isGhostMode) return null;

  // Nothing to show or snoozed
  if (!current || isSnoozed) return null;

  const label = current.tier === 'bestie' ? 'Nearby bestie' : 'Friend nearby';
  const dist = metersToLabel(current.distanceM);
  const canOpenConverge = canConverge(current.id);

  const onPrimary = () => {
    // Try to open ConvergeSuggestions directly; fallback to "Suggest meet"
    if (canOpenConverge && openConvergeForFriend(current.id)) {
      window.dispatchEvent(new CustomEvent('ui_banner_action', { detail: { action: 'converge_from_banner', id: current.id } }));
    } else {
      window.dispatchEvent(new CustomEvent('ui:rallyInbox:open', { detail: { id: current.id } }));
      window.dispatchEvent(new CustomEvent('ui_banner_action', { detail: { action: 'suggest_meet', id: current.id } }));
    }
    dismissCurrent();
  };

  const onView = () => {
    // You can switch to a more specific selection event if you have friend payloads in memory
    window.dispatchEvent(new CustomEvent('friends:select', {
      detail: { kind: 'friend', id: current.id, name: current.name }
    }));
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
    // don't dismiss; keep banner for explicit choice
  };

  const onSnooze = () => {
    window.dispatchEvent(new CustomEvent('ui_banner_action', { detail: { action: 'snooze', minutes: autoSnoozeMinutes } }));
    snooze(autoSnoozeMinutes);
  };

  // ESC to close
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
            {current.name && (
              <div className="text-xs text-white/70 truncate">{current.name}</div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              className="h-8 px-3 rounded-md bg-white text-black text-xs font-semibold hover:bg-white/90"
              onClick={onPrimary}
            >
              {canOpenConverge ? 'Converge now' : 'Suggest meet'}
            </button>
            <button
              className="h-8 px-3 rounded-md bg-white/10 text-white text-xs hover:bg-white/15"
              onClick={onView}
            >
              View
            </button>
            <button
              className="h-8 px-3 rounded-md bg-white/10 text-white text-xs hover:bg-white/15"
              onClick={onDismiss}
              aria-label="Dismiss notification"
            >
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
