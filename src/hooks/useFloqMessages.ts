import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export function useFloqMessages(floqId: string) {
  return useInfiniteQuery({
    queryKey: ['floq-msgs', floqId],
    queryFn: ({ pageParam }) =>
      supabase
        .rpc('fetch_floq_messages', { p_floq: floqId, p_before: pageParam ?? null })
        .then(({ data, error }) => {
          if (error) throw error
          return (data as Array<{
            id: string;
            body: string;
            created_at: string;
            sender_id: string;
          }>) || []
        }),
    getNextPageParam: (last) => last?.length === 20 ? last.at(-1)?.created_at : undefined,
    staleTime: 60_000,
    initialPageParam: null,
  })
}

export function useSendFloqMessage(floqId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: string) =>
      supabase.functions.invoke('post-floq-message', { body: { floq_id: floqId, body } }),
    onSuccess: ({ data }) =>
      qc.setQueryData(['floq-msgs', floqId], (d: any) => {
        if (!d) return d
        // Check for duplicates before unshifting
        if (!d.pages[0].some((r: any) => r.id === data.id)) {
          d.pages[0].unshift(data)
        }
        return { ...d }
      }),
  })
}