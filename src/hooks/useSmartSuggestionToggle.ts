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
        .eq('profile_id', profileId as any)
        .maybeSingle()
        .returns<any>()
      
      if (error && error.code !== 'PGRST116') {
        throw error
      }
      
      return (data as any)?.prefer_smart_suggestions ?? true
    },
    enabled: !!profileId
  })

  const toggleMutation = useMutation({
    mutationFn: async (newValue: boolean) => {
      const { error } = await supabase
        .from('user_preferences')
        .upsert(
          { profile_id: profileId, prefer_smart_suggestions: newValue } as any,
          { onConflict: 'profile_id' }
        )
        .returns<any>()
      
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