import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/lib/notifications/useNotifications';
import { useEventNotifications } from '@/providers/EventNotificationsProvider';
import { getNotificationIcon, getNotificationTitle, getNotificationSubtitle } from '@/components/notifications/formatters';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { telemetry } from '@/lib/telemetry';

export const NotificationsList = () => {
  const { toast } = useToast();
  const nav = useNavigate();
  const [onlyUnread, setOnlyUnread] = React.useState(true);

  // Ping notifications (DB)
  const {
    items: pingItems,
    loading, error, hasMore, refresh, loadMore, markRead, markAllReadUpTo
  } = useNotifications({ pageSize: 20, onlyUnread });

  // Event notifications (client channel store)
  const { unseen: eventNotifications, markAllSeen } = useEventNotifications(); 

  React.useEffect(() => { refresh(); }, [refresh]);

  // Merge: pings + events; filter event side when onlyUnread
  const events = React.useMemo(() => {
    return eventNotifications ?? [];
  }, [eventNotifications]);

  const all = React.useMemo(() => {
    const pings = pingItems.map(p => ({ ...p, seen_at: p.read_at, _isPing: true }));
    return [...pings, ...events].sort(
      (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [pingItems, events]);

  const markAll = async () => {
    try {
      await markAllReadUpTo();  // DB pings
      markAllSeen();            // Event store
      toast({ title: 'All notifications marked read' });
      refresh();
    } catch {
      toast({ title: 'Failed to mark all', variant: 'destructive' });
    }
  };

  const viewPingOnMap = React.useCallback((n: any) => {
    try {
      if (n?.kind !== 'ping' || !n?.payload?.point) return;
      const p = n.payload.point as { lng:number; lat:number; prob?:number; etaMin?:number; groupMin?:number };

      // Route to Field/Map (adjust path if your map route differs)
      nav('/', { replace: true }); // Use replace for better back-button UX

      // Allow the route to mount, then open the convergence card prefilled.
      setTimeout(() => {
        const success = window.dispatchEvent(new CustomEvent('floq:open-convergence', {
          detail: {
            lng: p.lng,
            lat: p.lat,
            prob: Number.isFinite(p.prob) ? p.prob! : 0.25,
            etaMin: Number.isFinite(p.etaMin) ? p.etaMin! : 10,
            groupMin: Math.max(3, Number(n.payload?.groupMin ?? 3)),
          },
        }));
        
        // Log telemetry
        telemetry.convergenceOpenFromNotification(
          Number.isFinite(p.etaMin) ? p.etaMin! : 10,
          Number.isFinite(p.prob) ? p.prob! : 0.25,
          success
        );
      }, 0);
    } catch (e) {
      // non-fatal; keep silent or log
      console.warn('[NotificationsList] viewPingOnMap failed:', e);
    }
  }, [nav]);

  const onClickRow = async (n: any) => {
    try {
      // Mark ping read if needed
      if (n._isPing && !n.read_at) await markRead([n.id]);

      // Route on ping w/ point payload
      if (n.kind === 'ping' && n.payload?.point) {
        const p = n.payload.point as { lng:number; lat:number; prob:number; etaMin:number };
        // hop to Field/Map (adjust path if your field route differs)
        nav('/', { replace: true }); // Better back-button behavior

        // defer to allow route render, then open the convergence card
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('floq:open-convergence', {
            detail: { lng: p.lng, lat: p.lat, prob: p.prob ?? 0.25, etaMin: p.etaMin ?? 10, groupMin: Math.max(3, Number(n.payload?.groupMin ?? 3)) }
          }));
        }, 0);
        return;
      }

      // Otherwise, pass to your existing handler (DM, plan, etc)
      // handleNotificationTap(n);
    } catch {}
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Notifications</h2>
        <div className="inline-flex gap-1">
          {/* Unread / All toggle */}
          <button
            type="button"
            onClick={() => setOnlyUnread(true)}
            className={`px-3 py-1.5 rounded-md text-xs ${onlyUnread ? 'bg-white/20 text-white' : 'bg-white/10 text-white/75 hover:bg-white/15'}`}
          >
            Unread
          </button>
          <button
            type="button"
            onClick={() => setOnlyUnread(false)}
            className={`px-3 py-1.5 rounded-md text-xs ${!onlyUnread ? 'bg-white/20 text-white' : 'bg-white/10 text-white/75 hover:bg-white/15'}`}
          >
            All
          </button>

          {all.length > 0 && (
            <button
              type="button"
              onClick={markAll}
              className="ml-2 px-3 py-1.5 rounded-md text-xs bg-white/10 text-white hover:bg-white/15"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* States */}
      {loading && all.length === 0 && <div className="text-white/70 text-sm">Loading notifications…</div>}
      {error && <div className="text-red-400 text-sm">{error}</div>}
      {all.length === 0 && !loading && (
        <div className="text-white/60 text-sm">No notifications yet</div>
      )}

      {/* List */}
      <div className="space-y-2">
        {all.map((n: any) => (
          <button
            key={`${n._isPing ? 'ping' : 'evt'}:${n.id}`}
            onClick={() => onClickRow(n)}
            className="w-full flex items-start gap-3 p-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.06] text-left"
          >
            <div className="mt-0.5">{getNotificationIcon(n.kind)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="truncate text-white">{getNotificationTitle(n)}</div>
                <div className="shrink-0 text-[11px] text-white/60">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </div>
              </div>
              {getNotificationSubtitle(n) && (
                <div id={`subtitle-${n.id}`} className="truncate text-xs text-white/70">{getNotificationSubtitle(n)}</div>
              )}
            </div>
            
            {/* Unread dot (unchanged) */}
            {!n.seen_at && !n.read_at && (
              <span className="w-2 h-2 rounded-full bg-blue-400 mt-1" aria-label="unread" />
            )}

            {/* NEW: 'View on map' pill for ping w/ point – does NOT mark as read */}
            {n.kind === 'ping' && n.payload?.point && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); viewPingOnMap(n); }}
                className="ml-2 px-2 py-1 rounded-md text-[11px] bg-white/10 hover:bg-white/15 border border-white/15 text-white"
                title="Open on map"
                aria-label="View on map"
                aria-describedby={`subtitle-${n.id}`}
              >
                View on map
              </button>
            )}
          </button>
        ))}
      </div>

      {/* Pager */}
      {hasMore && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => loadMore().catch(() => {})}
            className="text-sm px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/15 text-white"
            disabled={loading}
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
};
