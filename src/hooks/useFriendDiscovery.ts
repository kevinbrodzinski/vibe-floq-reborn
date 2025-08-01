import { useState, useCallback, useMemo, useEffect } from 'react'
import { useDebounce } from 'use-debounce'
import { supabase } from '@/integrations/supabase/client'
import { useUnifiedFriends } from '@/hooks/useUnifiedFriends'
import type { SearchedUser } from '@/hooks/useUserSearch'

interface DiscoveryUser extends SearchedUser {
  is_friend: boolean
  has_pending_request: boolean
}

export function useFriendDiscovery() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<DiscoveryUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Debounce search query
  const [debouncedQuery] = useDebounce(query, 300)
  
  // Get existing friends data to filter results
  const { friendIds, pendingOut } = useUnifiedFriends()
  
  // Get pending request IDs for filtering
  const pendingRequestIds = useMemo(() => 
    new Set(pendingOut.map(req => req.id)), 
    [pendingOut]
  )

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.rpc('search_profiles', {
        p_query: searchQuery.trim(),
        p_limit: 20
      })

      if (error) throw error

      // Filter out existing friends and add metadata
      const filteredResults: DiscoveryUser[] = (data || [])
        .filter((user: SearchedUser) => !friendIds.includes(user.id))
        .map((user: SearchedUser) => ({
          ...user,
          is_friend: friendIds.includes(user.id),
          has_pending_request: pendingRequestIds.has(user.id)
        }))

      setResults(filteredResults)
    } catch (err) {
      console.error('Friend discovery search error:', err)
      setError(err instanceof Error ? err.message : 'Search failed')
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [friendIds, pendingRequestIds])

  // Auto-search when debounced query changes
  useEffect(() => {
    search(debouncedQuery)
  }, [debouncedQuery, search])

  const clear = useCallback(() => {
    setQuery('')
    setResults([])
    setError(null)
  }, [])

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    search,
    clear,
    // Helper for getting "people you may know" when query is empty
    isEmpty: !query.trim(),
    hasResults: results.length > 0
  }
}