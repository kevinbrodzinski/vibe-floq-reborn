import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useCurrentUserId } from '@/hooks/useCurrentUser'

type VenueExtrasState = {
  favorite: boolean
  watch: boolean
  isLoading: boolean
  reviewOpen: boolean
  photoOpen: boolean
}

export function useVenueExtras(venueId?: string): VenueExtrasState & {
  toggleFavorite: () => Promise<void>
  toggleWatch: () => Promise<void>
  openReview: () => void
  openPhoto: () => void
  setReviewOpen: (open: boolean) => void
  setPhotoOpen: (open: boolean) => void
} {
  const currentUserId = useCurrentUserId()
  const [favorite, setFavorite] = useState(false)
  const [watch, setWatch] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [photoOpen, setPhotoOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!venueId || !currentUserId) return

    const loadExtras = async () => {
      setIsLoading(true)
      
      try {
        // Check favorites using user_venue_interactions
        const { data: favData, error: favError } = await supabase
          .from('user_venue_interactions')
          .select('id')
          .eq('profile_id', currentUserId)
          .eq('venue_id', venueId)
          .eq('interaction_type', 'favorite')
          .maybeSingle()

        if (!cancelled) {
          if (favError && favError.code !== 'PGRST116') {
            console.warn('favorites check error', favError)
          }
          setFavorite(!!favData)
        }

        // Check watchlist
        const { data: watchData, error: watchError } = await supabase
          .from('user_watchlist')
          .select('venue_id')
          .eq('profile_id', currentUserId)
          .eq('venue_id', venueId)
          .maybeSingle()

        if (!cancelled) {
          if (watchError && watchError.code !== 'PGRST116') {
            console.warn('watchlist check error', watchError)
          }
          setWatch(!!watchData)
        }
      } catch (error) {
        console.error('Error loading venue extras:', error)
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadExtras()
    return () => { cancelled = true }
  }, [venueId, currentUserId])

  const toggleFavorite = async () => {
    if (!venueId || !currentUserId) return

    if (!favorite) {
      const { error } = await supabase.from('user_venue_interactions').insert({
        profile_id: currentUserId,
        venue_id: venueId,
        interaction_type: 'favorite',
        interaction_count: 1,
      })
      if (!error) setFavorite(true)
    } else {
      const { error } = await supabase
        .from('user_venue_interactions')
        .delete()
        .eq('profile_id', currentUserId)
        .eq('venue_id', venueId)
        .eq('interaction_type', 'favorite')
      if (!error) setFavorite(false)
    }
  }

  const toggleWatch = async () => {
    if (!venueId || !currentUserId) return

    if (!watch) {
      const { error } = await supabase.from('user_watchlist').insert({
        profile_id: currentUserId,
        venue_id: venueId,
      })
      if (!error) setWatch(true)
    } else {
      const { error } = await supabase
        .from('user_watchlist')
        .delete()
        .eq('profile_id', currentUserId)
        .eq('venue_id', venueId)
      if (!error) setWatch(false)
    }
  }

  const openReview = () => setReviewOpen(true)
  const openPhoto = () => setPhotoOpen(true)

  return {
    favorite,
    watch,
    isLoading,
    reviewOpen,
    photoOpen,
    toggleFavorite,
    toggleWatch,
    openReview,
    openPhoto,
    setReviewOpen,
    setPhotoOpen,
  }
}