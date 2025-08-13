import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type Id = string;

async function tableExists(name: string) {
  // Light probe: PostgREST returns 404 if table is missing
  const { error } = await supabase.from(name).select("id").limit(0);
  return !error || error.status !== 404;
}

function is404(e: any) { return e?.status === 404; }
function is400(e: any) { return e?.status === 400; }

export function useVenueExtras(venueId: string | null) {
  const { user } = useAuth();
  const profileId = user?.id;

  const { data = {}, isLoading } = useQuery({
    queryKey: ["venue-extras", venueId, profileId],
    enabled: !!venueId,
    queryFn: async () => {
      if (!venueId) return {};

      const now = new Date();
      const day = (now.getDay() + 6) % 7; // Mon=0 … Sun=6
      const twoWeeksAgoIso = new Date(Date.now() - 14 * 86400000).toISOString();

      // --- favorites / watchlist (profile_id + venue_id)
      const getFlag = async (primary: string, fallback: string) => {
        if (!profileId) return false;
        try {
          const { data, error } = await supabase
            .from(primary)
            .select("id")
            .eq("profile_id", profileId)
            .eq("venue_id", venueId)
            .limit(1);
          if (error) throw error;
          return !!data?.length;
        } catch (e: any) {
          if (is404(e)) {
            try {
              const { data, error } = await supabase
                .from(fallback)
                .select("id")
                .eq("profile_id", profileId)
                .eq("venue_id", venueId)
                .limit(1);
              if (error) throw error;
              return !!data?.length;
            } catch {
              return false;
            }
          }
          return false;
        }
      };

      const [isFav, inWatchlist] = await Promise.all([
        profileId ? getFlag("user_favorites", "favorites") : Promise.resolve(false),
        profileId ? getFlag("user_watchlist", "watchlist") : Promise.resolve(false),
      ]);

      // --- hours (if you add a table later, this starts working automatically)
      let hours: { open?: string; close?: string } | null = null;
      let openNow: boolean | null = null;
      let nextOpenText: string | null = null;
      try {
        if (await tableExists("venue_hours")) {
          const { data, error } = await supabase
            .from("venue_hours")
            .select("open,close")
            .eq("venue_id", venueId)
            .eq("dow", day)
            .maybeSingle();
          if (error) throw error;
          if (data) {
            hours = data;
            // Calculate if open now
            const pad = (n: number) => n.toString().padStart(2, '0');
            const currentTime = `${pad(now.getHours())}:${pad(now.getMinutes())}:00`;
            openNow = data.open && data.close ? (data.open <= currentTime && currentTime <= data.close) : null;
            if (!openNow && data.open) {
              nextOpenText = `Opens ${data.open.slice(0, 5)}`;
            }
          }
        }
      } catch (e: any) {
        if (!is404(e)) console.warn("hours error", e);
      }

      // --- deals (optional)
      let deals: any[] = [];
      try {
        if (await tableExists("venue_deals")) {
          const { data, error } = await supabase
            .from("venue_deals")
            .select("id,title,ends_at,starts_at,cta_url")
            .eq("venue_id", venueId)
            .gte("ends_at", now.toISOString())
            .order("ends_at", { ascending: true });
          if (error) throw error;
          deals = (data ?? []).map(d => ({
            id: d.id,
            title: d.title,
            subtitle: d.cta_url ? 'Special offer available' : undefined,
            endsAtText: d.ends_at ? `Ends ${new Date(d.ends_at).toLocaleDateString()}` : undefined,
          }));
        }
      } catch (e: any) {
        if (!is404(e)) console.warn("deals error", e);
      }

      // --- has user visited recently? (uses arrived_at, not created_at)
      let hasVisited = false;
      if (profileId) {
        try {
          const { data, error } = await supabase
            .from("venue_visits")
            .select("id")
            .eq("venue_id", venueId)
            .eq("profile_id", profileId)
            .gte("arrived_at", twoWeeksAgoIso)
            .limit(1);
          if (error && !is400(error)) throw error; // 400 can happen if RLS forbids; treat as no
          hasVisited = !!data?.length;
        } catch (e) {
          // Silently handle - user just won't see review/photo options
        }
      }

      // --- friends recently (RPC if present, else fallback)
      let friends: any[] = [];
      try {
        const { data, error } = await supabase.rpc("friends_recent_at_venue", {
          p_profile_id: profileId,
          p_venue_id: venueId,
          p_days_back: 14,
        });
        if (error) throw error;
        // Transform to expected format
        friends = (data ?? []).map((f: any) => ({
          id: f.friend_id,
          display_name: null, // Would need to join with profiles
          username: null,
          avatar_url: null,
        }));
      } catch (e: any) {
        if (is404(e) && profileId) {
          try {
            // Fallback: friendships + venue_visits join in JS
            const { data: f1 } = await supabase
              .from("friendships")
              .select("profile_a_id, profile_b_id")
              .or(`profile_a_id.eq.${profileId},profile_b_id.eq.${profileId}`);
            const friendIds = new Set<string>();
            (f1 ?? []).forEach((r: any) => {
              friendIds.add(r.profile_a_id === profileId ? r.profile_b_id : r.profile_a_id);
            });
            if (friendIds.size) {
              const { data: v } = await supabase
                .from("venue_visits")
                .select("profile_id, arrived_at")
                .eq("venue_id", venueId)
                .gte("arrived_at", twoWeeksAgoIso);
              const friendVisits = (v ?? [])
                .filter((x: any) => friendIds.has(x.profile_id))
                .map((x: any) => ({ profile_id: x.profile_id, since: x.arrived_at }));
              
              // Get friend profiles
              if (friendVisits.length > 0) {
                const friendProfileIds = [...new Set(friendVisits.map(f => f.profile_id))];
                const { data: profiles } = await supabase
                  .from("profiles")
                  .select("id, display_name, username, avatar_url")
                  .in("id", friendProfileIds);
                
                friends = (profiles ?? []).map(p => ({
                  id: p.id,
                  display_name: p.display_name,
                  username: p.username,
                  avatar_url: p.avatar_url,
                }));
              }
            }
          } catch {
            // Silently fail - no friends data
          }
        }
      }

      return {
        openNow,
        nextOpenText,
        hoursToday: hours ? [{ open: hours.open || '', close: hours.close || '' }] : null,
        deals,
        friends,
        hasVisited,
        aiSummary: null,
        isFav,
        inWatchlist,
      };
    },
    staleTime: 30_000,
  });

  // State for toggles
  const [favorite, setFavorite] = React.useState(data.isFav || false);
  const [watch, setWatch] = React.useState(data.inWatchlist || false);
  const [reviewOpen, setReviewOpen] = React.useState(false);
  const [reviewText, setReviewText] = React.useState('');
  const [photoOpen, setPhotoOpen] = React.useState(false);
  const photoInputRef = React.useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Update local state when query data changes
  React.useEffect(() => {
    setFavorite(data.isFav || false);
    setWatch(data.inWatchlist || false);
  }, [data.isFav, data.inWatchlist]);

  const toggleFavorite = async () => {
    if (!venueId || !profileId) return;
    try {
      if (favorite) {
        await supabase.from('user_favorites').delete().eq('venue_id', venueId).eq('profile_id', profileId);
        setFavorite(false);
      } else {
        await supabase.from('user_favorites').insert({ venue_id: venueId, profile_id: profileId });
        setFavorite(true);
      }
    } catch (error) {
      // Try fallback table name
      try {
        if (favorite) {
          await supabase.from('favorites').delete().eq('venue_id', venueId).eq('profile_id', profileId);
          setFavorite(false);
        } else {
          await supabase.from('favorites').insert({ venue_id: venueId, profile_id: profileId });
          setFavorite(true);
        }
      } catch {
        // Silently fail
      }
    }
  };

  const toggleWatch = async () => {
    if (!venueId || !profileId) return;
    try {
      if (watch) {
        await supabase.from('user_watchlist').delete().eq('venue_id', venueId).eq('profile_id', profileId);
        setWatch(false);
      } else {
        await supabase.from('user_watchlist').insert({ venue_id: venueId, profile_id: profileId });
        setWatch(true);
      }
    } catch (error) {
      // Try fallback table name
      try {
        if (watch) {
          await supabase.from('watchlist').delete().eq('venue_id', venueId).eq('profile_id', profileId);
          setWatch(false);
        } else {
          await supabase.from('watchlist').insert({ venue_id: venueId, profile_id: profileId });
          setWatch(true);
        }
      } catch {
        // Silently fail
      }
    }
  };

  const submitReview = async () => {
    if (!venueId || !profileId || !reviewText.trim()) return;
    setSubmitting(true);
    try {
      await supabase.from('venue_reviews').insert({ venue_id: venueId, profile_id: profileId, body: reviewText.trim() });
      setReviewText('');
      setReviewOpen(false);
    } catch {
      // Silently fail
    } finally {
      setSubmitting(false);
    }
  };

  const uploadPhoto = async (file: File) => {
    if (!venueId || !profileId) return;
    setSubmitting(true);
    try {
      const path = `${venueId}/${profileId}-${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('venue-photos').upload(path, file, { upsert: false });
      if (error) throw error;
      await supabase.from('venue_photos').insert({ venue_id: venueId, profile_id: profileId, path });
      setPhotoOpen(false);
    } catch {
      // Silently fail
    } finally {
      setSubmitting(false);
    }
  };

  return {
    data,
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