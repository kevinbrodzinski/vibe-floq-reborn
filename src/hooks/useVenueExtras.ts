import * as React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useVenueOpenState, formatVenueHours, getNextOpenText } from '@/hooks/useVenueOpenState';

type Friend = { id: string; display_name?: string | null; username?: string | null; avatar_url?: string | null };
type Deal = { id: string; title: string; subtitle?: string | null; endsAtText?: string | null };

function isNotFound(err: any) {
  // PostgREST 404 → resource not found
  return !!err && (err.code === 'PGRST301' || err.code === '404' || (typeof err.message === 'string' && err.message.includes('Not Found')));
}

export function useVenueExtras(venueId: string | null) {
  const [favorite, setFavorite] = React.useState(false);
  const [watch, setWatch] = React.useState(false);
  const [reviewOpen, setReviewOpen] = React.useState(false);
  const [photoOpen, setPhotoOpen] = React.useState(false);
  const [reviewText, setReviewText] = React.useState('');
  const photoInputRef = React.useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Use the new venue open state hook
  const { data: openState } = useVenueOpenState(venueId);

  const [deals, setDeals] = React.useState<Deal[]>([]);
  const [friends, setFriends] = React.useState<Friend[]>([]);
  const [hasVisited, setHasVisited] = React.useState(false);
  const [aiSummary, setAiSummary] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!venueId) return;

      // FAVORITE (user_favorites uses item_type/item_id; no id column)
      const uid = (await supabase.auth.getUser()).data.user?.id || '';
      const favCheck = await supabase
        .from('user_favorites')
        .select('item_id', { count: 'exact', head: true })
        .eq('profile_id', uid)
        .eq('item_type', 'venue')
        .eq('item_id', venueId);

      if (!cancelled) {
        if (favCheck.error && favCheck.error.code !== 'PGRST116') console.warn('favorites check error', favCheck.error);
        setFavorite((favCheck.count ?? 0) > 0);
      }

      // WATCHLIST (no id column either)
      const wlCheck = await supabase
        .from('user_watchlist')
        .select('venue_id', { count: 'exact', head: true })
        .eq('profile_id', uid)
        .eq('venue_id', venueId);

      if (!cancelled) {
        if (wlCheck.error && wlCheck.error.code !== 'PGRST116') console.warn('watchlist check error', wlCheck.error);
        setWatch((wlCheck.count ?? 0) > 0);
      }

      // Hours and open state are now handled by the useVenueOpenState hook
      // No manual logic needed here

      // DEALS (table/view might not exist → treat 404 as none)
      try {
        const nowIso = new Date().toISOString();
        const r = await supabase
          .from('venue_deals')
          .select('id,title,subtitle,ends_at')
          .eq('venue_id', venueId)
          .gte('ends_at', nowIso)
          .order('ends_at', { ascending: true });

        if (!cancelled) {
          if (r.error && isNotFound(r.error)) {
            setDeals([]);
          } else if (r.error) {
            console.warn('venue_deals error', r.error);
            setDeals([]);
          } else {
            const rows = (r.data || []) as any[];
            setDeals(
              rows.map((d) => ({
                id: d.id,
                title: d.title,
                subtitle: d.subtitle,
                endsAtText: d.ends_at ? `Ends ${new Date(d.ends_at).toLocaleString()}` : null,
              }))
            );
          }
        }
      } catch (e: any) {
        if (!cancelled) setDeals([]);
      }

      // FRIENDS (RPC we added)
      try {
        const { data: fr, error } = await supabase.rpc('friends_recent_at_venue', {
          p_venue_id: venueId,
          p_days: 30,
        });
        if (!cancelled) {
          if (error) console.warn('friends_recent_at_venue error', error);
          setFriends((fr || []).map((r: any) => ({
            id: r.friend_profile_id,
            display_name: r.friend_name,
            avatar_url: null,
          })));
        }
      } catch (e) {
        if (!cancelled) setFriends([]);
      }

      // VISITS (boolean: has user visited recently?)
      try {
        const sinceIso = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
        const visitCheck = await supabase
          .from('venue_visits')
          .select('id', { count: 'exact', head: true })
          .eq('venue_id', venueId)
          .eq('profile_id', uid)
          .gte('arrived_at', sinceIso);
        if (!cancelled) {
          if (visitCheck.error) console.warn('venue_visits error', visitCheck.error);
          setHasVisited((visitCheck.count ?? 0) > 0);
        }
      } catch (e) {
        if (!cancelled) setHasVisited(false);
      }

      // AI summary placeholder (fill when you have it server-side)
      if (!cancelled) setAiSummary(null);
    })();
    return () => { cancelled = true; };
  }, [venueId]);

  // Toggles
  const toggleFavorite = async () => {
    if (!venueId) return;
    const uid = (await supabase.auth.getUser()).data.user?.id || '';
    if (!favorite) {
      const { error } = await supabase.from('user_favorites').insert({
        profile_id: uid,
        item_type: 'venue',
        item_id: venueId,
      });
      if (!error) setFavorite(true);
    } else {
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('profile_id', uid)
        .eq('item_type', 'venue')
        .eq('item_id', venueId);
      if (!error) setFavorite(false);
    }
  };

  const toggleWatch = async () => {
    if (!venueId) return;
    const uid = (await supabase.auth.getUser()).data.user?.id || '';
    if (!watch) {
      const { error } = await supabase.from('user_watchlist').insert({
        profile_id: uid,
        venue_id: venueId,
      });
      if (!error) setWatch(true);
    } else {
      const { error } = await supabase
        .from('user_watchlist')
        .delete()
        .eq('profile_id', uid)
        .eq('venue_id', venueId);
      if (!error) setWatch(false);
    }
  };

  const openReview = () => setReviewOpen(true);
  const openPhoto = () => setPhotoOpen(true);

  const submitReview = async () => {
    setSubmitting(true);
    // TODO: wire to your review endpoint/table
    setTimeout(() => setSubmitting(false), 600);
  };
  const uploadPhoto = async (_file: File) => {
    setSubmitting(true);
    // TODO: wire to storage
    setTimeout(() => setSubmitting(false), 600);
  };

  return {
    data: {
      openNow: openState?.open_now ?? null,
      nextOpenText: getNextOpenText(openState?.open_now ?? null, openState?.hours_today ?? null),
      hoursToday: openState?.hours_today ? openState.hours_today
        .filter(h => h && typeof h === 'string')
        .map(h => {
          const parts = h.split('–');
          return { 
            open: parts[0] || '', 
            close: parts[1] || '' 
          };
        }) : [],
      hoursDisplay: formatVenueHours(openState?.hours_today ?? null),
      deals,
      friends,
      hasVisited,
      aiSummary,
    },
    toggles: {
      favorite,
      watch,
      reviewOpen,
      photoOpen,
      reviewText,
      setReviewText,
      photoInputRef,
      toggleFavorite,
      toggleWatch,
      openReview,
      openPhoto,
    },
    submitReview,
    uploadPhoto,
    submitting,
  };
}