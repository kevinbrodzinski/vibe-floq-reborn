// src/hooks/useUsernameAvailability.ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useDebounce } from '@/hooks/useDebounce'

export function useUsernameAvailability(raw: string) {
  // normalise once
  const candidate = raw.trim().toLowerCase()

  // ❶ debounce keystrokes (400 ms)
  const debounced = useDebounce(candidate, 400)

  return useQuery({
    queryKey: ['username_available', debounced],   // ❷ stable cache key
    enabled : debounced.length >= 3,               // ❸ skip very short strings
    staleTime: 15_000,

    queryFn : async () => {
      const { data, error } = await supabase.rpc('username_available', {
        p_username: debounced,                     // ❹ param name matches SQL
      })
      if (error) throw error
      return data as boolean                       // true → available
    },
  })
}