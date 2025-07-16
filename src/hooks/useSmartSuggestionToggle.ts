import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export function useSmartSuggestionToggle(userId: string) {
  const queryClient = useQueryClient()

  const { data: enabled, isLoading } = useQuery({
    queryKey: ['user-preferences', userId, 'smart-suggestions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('prefer_smart_suggestions')
        .eq('user_id', userId)
        .maybeSingle()
      
      if (error && error.code !== 'PGRST116') {
        throw error
      }
      
      return data?.prefer_smart_suggestions ?? true
    },
    enabled: !!userId
  })

  const toggleMutation = useMutation({
    mutationFn: async (newValue: boolean) => {
      const { error } = await supabase
        .from('user_preferences')
        .upsert(
          { user_id: userId, prefer_smart_suggestions: newValue },
          { onConflict: 'user_id' }
        )
      
      if (error) throw error
      return newValue
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['user-preferences', userId, 'smart-suggestions'] 
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