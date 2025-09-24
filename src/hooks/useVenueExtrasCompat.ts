import { useVenueExtras } from '@/hooks/useVenueExtras'
import { useRef, useState } from 'react'

export function useVenueExtrasCompat(venueId?: string | null) {
  const h = useVenueExtras(venueId)
  const [reviewText, setReviewText] = useState('')
  const photoInputRef = useRef<HTMLInputElement>(null)
  
  return {
    data: { 
      favorite: h.favorite, 
      watch: h.watch,
      openNow: undefined,
      nextOpenText: undefined,
      deals: [],
      friends: [],
      hasVisited: false,
      hoursDisplay: 'Hours unavailable',
      aiSummary: undefined
    },
    toggles: { 
      favorite: h.favorite,
      watch: h.watch,
      toggleFavorite: h.toggleFavorite, 
      toggleWatch: h.toggleWatch,
      reviewOpen: h.reviewOpen,
      openReview: h.openReview,
      photoOpen: h.photoOpen,
      openPhoto: h.openPhoto,
      reviewText,
      setReviewText,
      photoInputRef
    },
    submitReview: async () => h.setReviewOpen(false),
    uploadPhoto: async () => h.setPhotoOpen(false),
    submitting: h.isLoading,
  }
}