import useSWRMutation from 'swr/mutation'
import { supabase } from '@/integrations/supabase/client'

interface ShareLinkResponse {
  slug: string
  url: string
}

export function useShareLink(afterglowId: string) {
  return useSWRMutation(
    ['share-link', afterglowId],
    async () => {
      console.log('Creating share link for afterglow:', afterglowId)
      
      const { data, error } = await supabase.functions.invoke('create-share-link', {
        body: { daily_afterglow_id: afterglowId }
      })
      
      if (error) {
        console.error('Error creating share link:', error)
        throw error
      }
      
      // Validate the response shape
      if (!data || typeof data !== 'object' || !data.url || !data.slug) {
        console.error('Invalid response from create-share-link:', data)
        throw new Error('Invalid response format from server')
      }
      
      console.log('Share link created:', data)
      return data as ShareLinkResponse
    },
    { revalidate: false }
  )
}