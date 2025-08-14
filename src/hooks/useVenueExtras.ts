import * as React from 'react';
import { supabase } from '@/integrations/supabase/client';

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

  const [openNow, setOpenNow] = React.useState<boolean | null>(null);
  const [nextOpenText, setNextOpenText] = React.useState<string | null>(null);
  const [hoursToday, setHoursToday] = React.useState<{ open: string; close: string }[]>([]);
  const [deals, setDeals] = React.useState<Deal[]>([]);
  const [friends, setFriends] = React.useState<Friend[]>([]);
  const [hasVisited, setHasVisited] = React.useState(false);
  const [aiSummary, setAiSummary] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!venueId) return;

      // FAVORITE (user_favorites uses item_type/item_id)
      const { data: favRow, error: favErr } = await supabase
        .from('user_favorites')
        .select('id')
        .eq('profile_id', (await supabase.auth.getUser()).data.user?.id || '')
        .eq('item_type', 'venue')
        .eq('item_id', venueId)
        .maybeSingle();

      if (!cancelled) {
        if (favErr && favErr.code !== 'PGRST116') console.warn('favorites check error', favErr);
        setFavorite(!!favRow);
      }

      // WATCHLIST (ensure you added venue_id to user_watchlist; otherwise this returns false)
      const { data: wlRow, error: wlErr } = await supabase
        .from('user_watchlist')
        .select('id')
        .eq('profile_id', (await supabase.auth.getUser()).data.user?.id || '')
        .eq('venue_id', venueId)
        .maybeSingle();

      if (!cancelled) {
        if (wlErr && wlErr.code !== 'PGRST116') console.warn('watchlist check error', wlErr);
        setWatch(!!wlRow);
      }

      // HOURS (table/view might not exist → treat 404 as "no hours")
      try {
        const dow = (new Date().getDay() + 6) % 7; // 0=Mon…6=Sun if your DB expects that; change if your DOW is 0=Sun
        const r = await supabase
          .from('venue_hours')
          .select('open,close')
          .eq('venue_id', venueId)
          .eq('dow', dow);

        if (!cancelled) {
          if (r.error && isNotFound(r.error)) {
            setHoursToday([]);
          } else if (r.error) {
            console.warn('venue_hours error', r.error);
            setHoursToday([]);
          } else {
            const rows = (r.data || []) as { open: string; close: string }[];
            setHoursToday(rows);
            // naive open/nextOpen
            if (rows.length) {
              setOpenNow(null); // compute on server if/when you have proper tz-aware fn
              setNextOpenText(`${rows[0].open}–${rows[0].close}`);
            }
          }
        }
      } catch (e: any) {
        if (!cancelled) setHoursToday([]);
      }

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
        const userId = (await supabase.auth.getUser()).data.user?.id || '';
        const sinceIso = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
        const { data: vs, error } = await supabase
          .from('venue_visits')
          .select('id')
          .eq('venue_id', venueId)
          .eq('profile_id', userId) // you store auth.uid() in profile_id today
          .gte('arrived_at', sinceIso)
          .limit(1);
        if (!cancelled) {
          if (error) console.warn('venue_visits error', error);
          setHasVisited((vs || []).length > 0);
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
    const userId = (await supabase.auth.getUser()).data.user?.id || '';
    if (!favorite) {
      const { error } = await supabase.from('user_favorites').insert({
        profile_id: userId,
        item_type: 'venue',
        item_id: venueId,
      });
      if (!error) setFavorite(true);
    } else {
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('profile_id', userId)
        .eq('item_type', 'venue')
        .eq('item_id', venueId);
      if (!error) setFavorite(false);
    }
  };

  const toggleWatch = async () => {
    if (!venueId) return;
    const userId = (await supabase.auth.getUser()).data.user?.id || '';
    if (!watch) {
      const { error } = await supabase.from('user_watchlist').insert({
        profile_id: userId,
        venue_id: venueId, // requires the column we added earlier
      });
      if (!error) setWatch(true);
    } else {
      const { error } = await supabase
        .from('user_watchlist')
        .delete()
        .eq('profile_id', userId)
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
      openNow,
      nextOpenText,
      hoursToday,
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