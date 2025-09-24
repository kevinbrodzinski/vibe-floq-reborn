import * as React from 'react';
import { useRallyInbox } from '@/hooks/useRallyInbox';
import { useRallyInboxUI } from '@/contexts/RallyInboxUIContext';
import { RallyInboxDrawer } from '@/components/rally/RallyInboxDrawer';
import { getCurrentMap } from '@/lib/geo/mapSingleton';
import { listThreadMessages, getLastSeen } from '@/lib/api/rallyThreads';
import { computeFirstUnread } from '@/lib/api/rallyThreads';
import { RallyThreadView } from '@/components/rally/RallyThreadView';

export function RallyInboxHost() {
  const { isOpen, close, activeThreadId, closeThread } = useRallyInboxUI();
  const { items, loading, error, join, decline, refresh } = useRallyInbox();

  // Deep-link: load messages when a thread is set
  const [messages, setMessages] = React.useState<any[]>([]);
  const [firstUnreadAt, setFirstUnreadAt] = React.useState<string | null>(null);
  const [threadLoading, setThreadLoading] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!activeThreadId) return;
      try {
        setThreadLoading(true);
        const msgs = await listThreadMessages(activeThreadId);
        if (cancelled) return;
        setMessages(msgs);

        // Resolve rallyId -> last seen time
        const rallyId = items.find(i => (i as any).thread_id === activeThreadId)?.rally_id
          ?? items[0]?.rally_id // best-effort if not present
        if (rallyId) {
          const lastSeen = await getLastSeen(rallyId);
          const { t } = computeFirstUnread(msgs, lastSeen);
          setFirstUnreadAt(t);
        } else {
          setFirstUnreadAt(null);
        }
      } finally {
        if (!cancelled) setThreadLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [activeThreadId, items]);

  const onViewMap = (itm: any) => {
    const map = getCurrentMap();
    if (Number.isFinite(itm.center_lng) && Number.isFinite(itm.center_lat) && map?.flyTo) {
      map.flyTo({ center: [itm.center_lng, itm.center_lat], zoom: 15, essential: true });
    }
    // Optionally close the inbox after jumping:
    // close();
  };

  // If deep-linked into a thread, show the thread view as a simple full-frame modal
  if (isOpen && activeThreadId) {
    return (
      <div className="fixed inset-0 z-[710] bg-black/40 flex items-center justify-center">
        <div className="relative w-full max-w-lg max-h-[80vh] overflow-hidden rounded-2xl bg-background border border-border shadow-2xl">
          <header className="flex items-center gap-2 p-3 border-b border-border bg-card/60 backdrop-blur">
            <button
              type="button"
              className="text-sm px-2 py-1 rounded hover:bg-foreground/10"
              onClick={closeThread}
              aria-label="Back to inbox"
              title="Back to inbox"
            >
              ← Back
            </button>
            <div className="ml-auto" />
            <button
              type="button"
              className="px-2 py-1 rounded hover:bg-foreground/10"
              onClick={close}
              aria-label="Close inbox"
              title="Close inbox"
            >
              ✖️
            </button>
          </header>

          <div className="h-[calc(80vh-44px)]">
            {threadLoading ? (
              <div className="p-3 text-sm text-muted-foreground">Loading thread…</div>
            ) : (
              <RallyThreadView
                rallyId={items[0]?.rally_id ?? '' /* best effort if thread->rally not present */}
                threadId={activeThreadId}
                messages={messages}
                firstUnreadAt={firstUnreadAt}
                className="h-full"
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Normal inbox drawer
  return (
    <RallyInboxDrawer
      open={isOpen}
      items={items}
      loading={loading}
      error={error ?? null}
      onClose={close}
      onJoin={async (id) => { await join(id); refresh(); }}
      onDecline={async (id) => { await decline(id); refresh(); }}
      onViewMap={onViewMap}
    />
  );
}