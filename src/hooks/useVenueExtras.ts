import * as React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth'; // must expose profile { id, ... }

type Friend = { id: string; display_name?: string | null; username?: string | null; avatar_url?: string | null };

export function useVenueExtras(venueId: string | null) {
  const { user } = useAuth(); // ← use profile_id, not user_id
  const me = user?.id ?? null;

  const [state, setState] = React.useState<{
    openNow?: boolean | null;
    nextOpenText?: string | null;
    hoursToday?: { open: string; close: string }[] | null;
    deals?: { id: string; title: string; subtitle?: string; endsAtText?: string }[];
    friends?: Friend[];
    hasVisited?: boolean;
    aiSummary?: string | null;
  }>({ deals: [], friends: [] });

  const [favorite, setFavorite] = React.useState(false);
  const [watch, setWatch] = React.useState(false);
  const [reviewOpen, setReviewOpen] = React.useState(false);
  const [reviewText, setReviewText] = React.useState('');
  const [photoOpen, setPhotoOpen] = React.useState(false);
  const photoInputRef = React.useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    let ignore = false;
    (async () => {
      if (!venueId || !me) return;

      const [favRes, watchRes] = await Promise.all([
        supabase.from('user_favorites').select('venue_id').eq('venue_id', venueId).eq('profile_id', me).maybeSingle(),
        supabase.from('user_watchlist').select('venue_id').eq('venue_id', venueId).eq('profile_id', me).maybeSingle(),
      ]);
      if (!ignore) {
        setFavorite(!!favRes.data);
        setWatch(!!watchRes.data);
      }

      // Hours today (if table exists)
      const now = new Date();
      const dow = now.getDay();
      const hrs = await supabase.from('venue_hours').select('open,close').eq('venue_id', venueId).eq('dow', dow);
      let openNow: boolean | null = null;
      let nextOpenText: string | null = null;
      let hoursToday: { open: string; close: string }[] = [];
      if (hrs.data?.length) {
        hoursToday = hrs.data.map((r) => ({ open: r.open, close: r.close }));
        const pad = (n: number) => n.toString().padStart(2, '0');
        const t = `${pad(now.getHours())}:${pad(now.getMinutes())}:00`;
        openNow = hrs.data.some((r) => r.open <= t && t <= r.close);
        if (!openNow) {
          const next = hrs.data.find((r) => t < r.open);
          if (next) nextOpenText = `Opens ${next.open.slice(0, 5)}`;
        }
      }

      // Specials (optional)
      const deals = await supabase
        .from('venue_deals')
        .select('id,title,subtitle,ends_at')
        .eq('venue_id', venueId)
        .gte('ends_at', new Date().toISOString())
        .order('ends_at', { ascending: true });

      // Friends via RPC on friendships table (see SQL below)
      const friends = await supabase
        .rpc('friends_recent_at_venue', { p_me: me, p_venue: venueId })
        .then((r) => (r.data as Friend[]) ?? [])
        .catch(() => []);

      // Have I visited?
      const myVisit = await supabase
        .from('venue_visits')
        .select('id')
        .eq('venue_id', venueId)
        .eq('profile_id', me)
        .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle();

      if (!ignore) {
        setState({
          openNow,
          nextOpenText,
          hoursToday: hoursToday.length ? hoursToday : null,
          deals:
            deals.data?.map((d) => ({
              id: d.id,
              title: d.title,
              subtitle: d.subtitle ?? undefined,
              endsAtText: d.ends_at ? `Ends ${new Date(d.ends_at).toLocaleDateString()}` : undefined,
            })) ?? [],
          friends,
          hasVisited: !!myVisit.data,
          aiSummary: null,
        });
      }
    })();
    return () => {
      ignore = true;
    };
  }, [venueId, me]);

  const toggleFavorite = async () => {
    if (!venueId || !me) return;
    if (favorite) {
      await supabase.from('user_favorites').delete().eq('venue_id', venueId).eq('profile_id', me);
      setFavorite(false);
    } else {
      await supabase.from('user_favorites').insert({ venue_id: venueId, profile_id: me });
      setFavorite(true);
    }
  };
  const toggleWatch = async () => {
    if (!venueId || !me) return;
    if (watch) {
      await supabase.from('user_watchlist').delete().eq('venue_id', venueId).eq('profile_id', me);
      setWatch(false);
    } else {
      await supabase.from('user_watchlist').insert({ venue_id: venueId, profile_id: me });
      setWatch(true);
    }
  };
  const submitReview = async () => {
    if (!venueId || !me || !reviewText.trim()) return;
    setSubmitting(true);
    try {
      await supabase.from('venue_reviews').insert({ venue_id: venueId, profile_id: me, body: reviewText.trim() });
      setReviewText('');
      setReviewOpen(false);
    } finally {
      setSubmitting(false);
    }
  };
  const uploadPhoto = async (file: File) => {
    if (!venueId || !me) return;
    setSubmitting(true);
    try {
      const path = `${venueId}/${me}-${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('venue-photos').upload(path, file, { upsert: false });
      if (error) throw error;
      await supabase.from('venue_photos').insert({ venue_id: venueId, profile_id: me, path });
      setPhotoOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return {
    data: state,
    toggles: {
      favorite,
      watch,
      toggleFavorite,
      toggleWatch,
      reviewOpen,
      setReviewText,
      reviewText,
      openReview: () => setReviewOpen((s) => !s),
      openPhoto: () => setPhotoOpen((s) => !s),
      photoOpen,
      photoInputRef,
    },
    submitReview,
    uploadPhoto,
    submitting,
  };
}