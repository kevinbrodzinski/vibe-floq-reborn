import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';

type LngLat = { lng: number; lat: number };

export type PresenceSelection =
  | {
      kind: 'friend';
      id: string;
      name?: string;
      avatarUrl?: string;
      vibe?: string;
      color?: string;
      distanceM?: number;
      lastSeenMs?: number;
      lngLat?: LngLat;
    }
  | {
      kind: 'self';
      id: 'self';
      name?: string;
      color?: string;
      lngLat?: LngLat;
    }
  | {
      kind: 'venue';
      id: string;
      name?: string;
      category?: string;
      isOpen?: boolean;
      rating?: number;
      userRatings?: number;
      color?: string;
      lngLat?: LngLat;
    };

type CardAction = {
  key: string;
  label: string;
  intent?: 'primary' | 'secondary' | 'ghost';
  icon?: React.ReactNode;
  hidden?: boolean;
  onClick: () => void;
};

type Props = {
  selection: PresenceSelection | null;
  onClose: () => void;
  onPing?: (id: string) => void;
  onNavigate?: (to: LngLat, meta?: any) => void;
  onRecenter?: () => void;
  className?: string;
  maxWidth?: number;
};

export function PresenceInfoCard({
  selection,
  onClose,
  onPing,
  onNavigate,
  onRecenter,
  className,
  maxWidth = 420,
}: Props) {
  const open = !!selection;

  // Keyboard support
  React.useEffect(() => {
    if (!open) return;

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter') {
        // Trigger primary action
        const actions = actionsFor(selection!, {
          onPing,
          onNavigate,
          onRecenter,
          onInvite: (idOrTo) => window.dispatchEvent(new CustomEvent('floq:invite', { detail: { idOrTo } })),
          onSaveVenue: (id) => window.dispatchEvent(new CustomEvent('floq:save_venue', { detail: { id } })),
          onShareLive: () => window.dispatchEvent(new CustomEvent('floq:share_live', { detail: { minutes: 10 } })),
          onFavorite: (id) => window.dispatchEvent(new CustomEvent('floq:favorite_friend', { detail: { id } })),
          onCopyLoc: (to) => {
            try {
              const s = to ? `${to.lat.toFixed(6)}, ${to.lng.toFixed(6)}` : 'No location';
              navigator.clipboard.writeText(s);
            } catch {}
          },
        });
        const primary = actions.find(a => a.intent === 'primary');
        primary?.onClick();
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [open, selection, onPing, onNavigate, onRecenter, onClose]);

  if (!selection) return null;

  const isFriend = selection.kind === 'friend';
  const isSelf = selection.kind === 'self';
  const isVenue = selection.kind === 'venue';

  const title = isSelf
    ? (selection.name || 'You')
    : (selection.name || (isVenue ? 'Venue' : 'Friend'));

  const vibeLabel = isFriend && selection.vibe ? capitalize(selection.vibe) : undefined;
  const distanceLabel =
    typeof (selection as any).distanceM === 'number'
      ? formatDistance((selection as any).distanceM)
      : 'Nearby';

  const lastSeenLabel =
    isFriend && typeof selection.lastSeenMs === 'number'
      ? ` · ${formatAgo(selection.lastSeenMs)}`
      : '';

  const metaLine = isVenue
    ? [
        selection.category || 'Place',
        selection.isOpen != null ? (selection.isOpen ? 'Open now' : 'Closed') : null,
        typeof selection.rating === 'number' ? `⭐ ${selection.rating.toFixed(1)}` : null,
      ].filter(Boolean).join(' · ')
    : `${distanceLabel}${lastSeenLabel}`;

  const ringColor = selection.color || getVibeHexSafe();
  const titleColor = 'text-white';

  const rawActions = actionsFor(selection, {
    onPing,
    onNavigate,
    onRecenter,
    onInvite: (idOrTo) => window.dispatchEvent(new CustomEvent('floq:invite', { detail: { idOrTo } })),
    onSaveVenue: (id) => window.dispatchEvent(new CustomEvent('floq:save_venue', { detail: { id } })),
    onShareLive: () => window.dispatchEvent(new CustomEvent('floq:share_live', { detail: { minutes: 10 } })),
    onFavorite: (id) => window.dispatchEvent(new CustomEvent('floq:favorite_friend', { detail: { id } })),
    onCopyLoc: (to) => {
      try {
        const s = to ? `${to.lat.toFixed(6)}, ${to.lng.toFixed(6)}` : 'No location';
        navigator.clipboard.writeText(s);
      } catch {}
    },
  });

  const actions = rawActions.filter(a => !a.hidden);
  const primary = actions.find(a => a.intent === 'primary');
  const secondaries = actions.filter(a => a.intent === 'secondary').slice(0, 2);
  const more = actions.filter(a => a.intent === 'ghost').concat(
    actions.filter(a => a.intent === 'secondary').slice(2)
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 12, opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className={cn(
            'fixed left-1/2 bottom-4 z-[200] -translate-x-1/2',
            'rounded-2xl border border-white/15 bg-[#0B0C0F]/80 backdrop-blur-xl',
            'shadow-xl shadow-black/40',
            'px-4 py-3 sm:px-5 sm:py-4',
            'text-white',
            className
          )}
          style={{ width: 'calc(100vw - 24px)', maxWidth }}
          role="dialog"
          aria-label="Presence info"
        >
          <div className="flex items-center gap-3">
            <HeaderGlyph selection={selection} ringColor={ringColor} />

            <div className="min-w-0 flex-1">
              <div className={cn('text-base font-semibold leading-none', titleColor, 'truncate')}>
                {title}
              </div>

              <div className="mt-1 text-xs text-white/70 truncate">
                {metaLine || '—'}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {isFriend && vibeLabel && (
                  <Badge className="bg-white/10 border-white/20 text-white/90">{vibeLabel}</Badge>
                )}
                {isVenue && selection.category && (
                  <Badge className="bg-white/10 border-white/20 text-white/90">{selection.category}</Badge>
                )}
                {isVenue && typeof selection.rating === 'number' && (
                  <Badge variant="outline" className="border-white/20 text-white/90">
                    ⭐ {selection.rating.toFixed(1)}
                  </Badge>
                )}
              </div>
            </div>

            <button
              aria-label="Close"
              className="ml-2 rounded-lg p-1.5 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
              onClick={onClose}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-80">
                <path fill="currentColor" d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59L7.11 5.7A1 1 0 1 0 5.7 7.11L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.9a1 1 0 0 0 1.41-1.42L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4" />
              </svg>
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            {primary && (
              <Button size="sm" className="min-w-[92px]" onClick={primary.onClick}>
                {primary.label}
              </Button>
            )}
            {secondaries.map(a => (
              <Button key={a.key} size="sm" variant="secondary" className="min-w-[92px]" onClick={a.onClick}>
                {a.label}
              </Button>
            ))}
            {more.length > 0 && (
              <MoreMenu items={more} onClose={onClose} />
            )}
            <Button size="sm" variant="ghost" className="text-white/80 hover:text-white ml-auto" onClick={onClose}>
              Close
            </Button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function HeaderGlyph({
  selection,
  ringColor,
}: {
  selection: PresenceSelection;
  ringColor: string;
}) {
  if (selection.kind === 'friend' || selection.kind === 'self') {
    const initials = selection.kind === 'self'
      ? 'You'.slice(0, 2).toUpperCase()
      : (selection.name || 'F').slice(0, 2).toUpperCase();

    return (
      <div className="relative">
        <div
          className="absolute -inset-[2px] rounded-full"
          style={{ boxShadow: `0 0 0 2px ${ringColor}` }}
          aria-hidden
        />
        <Avatar className="h-10 w-10 ring-1 ring-white/15">
          {selection.kind === 'friend' && selection.avatarUrl ? (
            <AvatarImage src={selection.avatarUrl} alt={selection.name || 'Friend'} />
          ) : null}
          <AvatarFallback className="bg-white/10 text-white/90">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    );
  }

  return (
    <div
      className="flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-white/15"
      style={{ background: 'linear-gradient(180deg, #16a34a 0%, #0d5d2c 100%)' }}
      aria-hidden
    >
      <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-90 text-white">
        <path
          fill="currentColor"
          d="M12 2C8.14 2 5 5.14 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.86-3.14-7-7-7m0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z"
        />
      </svg>
    </div>
  );
}

function MoreMenu({ items, onClose }: { items: CardAction[]; onClose: () => void }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative">
      <Button size="sm" variant="ghost" onClick={() => setOpen(v => !v)}>More</Button>
      {open && (
        <div className="absolute bottom-9 right-0 min-w-[180px] rounded-xl border border-white/15 bg-[#0B0C0F]/95 p-1 shadow-lg">
          {items.map(a => (
            <button
              key={a.key}
              className="block w-full rounded-md px-3 py-2 text-left text-sm text-white/90 hover:bg-white/10"
              onClick={() => { a.onClick(); setOpen(false); onClose?.(); }}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function actionsFor(
  sel: PresenceSelection,
  api: {
    onPing?: (id: string) => void;
    onNavigate?: (to: LngLat, meta?: any) => void;
    onRecenter?: () => void;
    onInvite?: (idOrTo: string | LngLat) => void;
    onSaveVenue?: (venueId: string) => void;
    onShareLive?: () => void;
    onFavorite?: (id: string) => void;
    onCopyLoc?: (to?: LngLat) => void;
  }
): CardAction[] {
  const canNav = !!sel.lngLat;

  if (sel.kind === 'friend') {
    return [
      { key: 'ping', label: 'Ping', intent: 'primary', onClick: () => api.onPing?.(sel.id) },
      { key: 'nav', label: 'Flow toward', intent: 'secondary', hidden: !canNav, onClick: () => canNav && api.onNavigate?.(sel.lngLat!, { type: 'friend' }) },
      { key: 'dm', label: 'Message', intent: 'secondary', hidden: !window?.dispatchEvent, onClick: () => window.dispatchEvent(new CustomEvent('floq:dm', { detail: { id: sel.id } })) },
      { key: 'invite', label: 'Invite to meet here', intent: 'ghost', onClick: () => api.onInvite?.(sel.id) },
      { key: 'fav', label: 'Favorite', intent: 'ghost', onClick: () => api.onFavorite?.(sel.id) },
    ];
  }

  if (sel.kind === 'self') {
    return [
      { key: 'recenter', label: 'Recenter', intent: 'primary', onClick: () => api.onRecenter?.() },
      { key: 'share', label: 'Share Live (10m)', intent: 'secondary', onClick: () => api.onShareLive?.() },
      { key: 'anchor', label: 'Set Meet Here', intent: 'secondary', onClick: () => api.onInvite?.(sel.lngLat ?? { lng: 0, lat: 0 }) },
      { key: 'flow', label: 'Flow toward…', intent: 'ghost', onClick: () => window.dispatchEvent(new CustomEvent('floq:flow_picker')) },
      { key: 'copy', label: 'Copy location', intent: 'ghost', onClick: () => api.onCopyLoc?.(sel.lngLat) },
    ];
  }

  return [
    { key: 'nav', label: 'Flow to venue', intent: 'primary', hidden: !canNav, onClick: () => canNav && api.onNavigate?.(sel.lngLat!, { type: 'venue', venueId: sel.id }) },
    { key: 'invite', label: 'Invite friends here', intent: 'secondary', onClick: () => api.onInvite?.(sel.lngLat ?? { lng: 0, lat: 0 }) },
    { key: 'save', label: 'Save venue', intent: 'secondary', onClick: () => api.onSaveVenue?.(sel.id) },
    { key: 'insights', label: 'Peak Times', intent: 'ghost', onClick: () => window.dispatchEvent(new CustomEvent('floq:venue_insights', { detail: { id: sel.id } })) },
    { key: 'maps', label: 'Open in Maps', intent: 'ghost', onClick: () => window.dispatchEvent(new CustomEvent('floq:open_maps', { detail: { id: sel.id, to: sel.lngLat } })) },
  ];
}

function formatDistance(n?: number) {
  if (n == null) return 'Nearby';
  if (n < 1000) return `${Math.round(n)} m away`;
  return `${(n / 1000).toFixed(1)} km away`;
}

function formatAgo(tsMs: number) {
  const m = Math.floor((Date.now() - tsMs) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function getVibeHexSafe() {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--vibe-hex').trim();
    return v || '#22d3ee';
  } catch {
    return '#22d3ee';
  }
}