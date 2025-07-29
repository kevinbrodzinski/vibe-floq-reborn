import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export function useSmartSuggestionToggle(profileId: string) {
  const queryClient = useQueryClient()

  const { data: enabled, isLoading } = useQuery({
    queryKey: ['user-preferences', profileId, 'smart-suggestions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('prefer_smart_suggestions')
        .eq('profile_id', profileId)
        .maybeSingle()
      
      if (error && error.code !== 'PGRST116') {
        throw error
      }
      
      return data?.prefer_smart_suggestions ?? true
    },
    enabled: !!profileId
  })

  const toggleMutation = useMutation({
    mutationFn: async (newValue: boolean) => {
      const { error } = await supabase
        .from('user_preferences')
        .upsert(
          { profile_id: profileId, prefer_smart_suggestions: newValue },
          { onConflict: 'profile_id' }
        )
      
      if (error) throw error
      return newValue
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['user-preferences', profileId, 'smart-suggestions'] 
      })
    }
  })

  const toggle = () => {
    const newValue = !enabled
    toggleMutation.mutate(newValue)
  }

  return {
    enabled: !!enabled,
    isLoading,
    toggle,
    isToggling: toggleMutation.isPending
  }
}