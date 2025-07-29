import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

type PinnedMutationContext = {
  previousAfterglow: unknown
  previousHistory: unknown
  id: string
}

export const useTogglePinned = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation<boolean, Error, {id: string; pinned: boolean}, PinnedMutationContext>({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      const { error } = await supabase
        .from('daily_afterglow')
        .update({ is_pinned: pinned })
        .eq('id', id)
      
      if (error) throw error
      return pinned
    },
    
    // Optimistic UI updates
    onMutate: async ({ id, pinned }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['afterglow', id] })
      await queryClient.cancelQueries({ queryKey: ['afterglow-history'] })
      
      // Snapshot previous values
      const previousAfterglow = queryClient.getQueryData(['afterglow', id])
      const previousHistory = queryClient.getQueryData(['afterglow-history'])
      
      // Optimistically update afterglow detail
      queryClient.setQueryData(['afterglow', id], (old: any) =>
        old ? { ...old, is_pinned: pinned } : old
      )
      
    // Optimistically update history list
    queryClient.setQueryData(['afterglow-history'], (old: any) =>
      old ? old.map((item: any) => 
        item.id === id ? { ...item, is_pinned: pinned } : item
      ) : old
    )
      
      return { previousAfterglow, previousHistory, id }
    },
    
    onError: (error, variables, context) => {
      // Rollback optimistic updates
      if (context?.previousAfterglow) {
        queryClient.setQueryData(['afterglow', context.id], context.previousAfterglow)
      }
      if (context?.previousHistory) {
        queryClient.setQueryData(['afterglow-history'], context.previousHistory)
      }
      
      toast({
        title: "Error",
        description: "Failed to update pin status. Please try again.",
        variant: "destructive"
      })
    },
    
    onSuccess: (pinned) => {
      toast({
        title: pinned ? "Pinned!" : "Unpinned",
        description: pinned ? "Afterglow pinned to top" : "Afterglow unpinned",
      })
    },
    
    onSettled: (_, __, variables) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['afterglow', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['afterglow-history'] })
    }
  })
}

type FavoriteMutationContext = {
  previousAfterglow: unknown
  previousFavorites: unknown
  afterglowId: string
}

export const useToggleFavorite = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation<boolean, Error, {afterglowId: string; isFavorite: boolean; profileId: string}, FavoriteMutationContext>({
    mutationFn: async ({ afterglowId, isFavorite, profileId }: { 
      afterglowId: string 
      isFavorite: boolean
      profileId: string
    }) => {
      if (isFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from('afterglow_favorites')
          .delete()
          .eq('daily_afterglow_id', afterglowId)
          .eq('profile_id', profileId)
        
        if (error) throw error
        return false
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('afterglow_favorites')
          .insert({
            daily_afterglow_id: afterglowId,
            profile_id: profileId
          })
        
        if (error) throw error
        return true
      }
    },
    
    onMutate: async ({ afterglowId, isFavorite }) => {
      const newFavoriteStatus = !isFavorite
      
      // Cancel queries
      await queryClient.cancelQueries({ queryKey: ['afterglow', afterglowId] })
      await queryClient.cancelQueries({ queryKey: ['favorites'] })
      
      // Snapshot previous values
      const previousAfterglow = queryClient.getQueryData(['afterglow', afterglowId])
      const previousFavorites = queryClient.getQueryData(['favorites'])
      
      // Optimistically update
      queryClient.setQueryData(['afterglow', afterglowId], (old: any) =>
        old ? { ...old, is_favorite: newFavoriteStatus } : old
      )
      
      return { previousAfterglow, previousFavorites, afterglowId }
    },
    
    onError: (error, variables, context) => {
      // Rollback
      if (context?.previousAfterglow) {
        queryClient.setQueryData(['afterglow', context.afterglowId], context.previousAfterglow)
      }
      if (context?.previousFavorites) {
        queryClient.setQueryData(['favorites'], context.previousFavorites)
      }
      
      toast({
        title: "Error",
        description: "Failed to update favorite status. Please try again.",
        variant: "destructive"
      })
    },
    
    onSuccess: (isFavorite) => {
      toast({
        title: isFavorite ? "Added to Favorites!" : "Removed from Favorites",
        description: isFavorite ? "Afterglow saved to your favorites" : "Afterglow removed from favorites",
      })
    },
    
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ['afterglow', variables.afterglowId] })
      queryClient.invalidateQueries({ queryKey: ['favorites'] })
    }
  })
}