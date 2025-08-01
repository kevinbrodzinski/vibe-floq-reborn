import { useMemo } from 'react'
import { useUserSearch, SearchedUser } from './useUserSearch'
import { useUnifiedFriends } from './useUnifiedFriends'
import { useAuth } from '@/providers/AuthProvider'

export function useFriendDiscovery(query: string, enabled: boolean = true) {
  const { user } = useAuth()
  const userSearch = useUserSearch(query, enabled)
  const { rows: friendRows } = useUnifiedFriends()

  // Filter out current user and existing friends/requests
  const filteredResults = useMemo(() => {
    if (!userSearch.data || !user) return []

    const existingConnections = new Set(friendRows.map(row => row.id))
    
    return userSearch.data.filter((searchUser: SearchedUser) => {
      // Remove self
      if (searchUser.id === user.id) return false
      
      // Remove existing friends/requests
      if (existingConnections.has(searchUser.id)) return false
      
      return true
    })
  }, [userSearch.data, user, friendRows])

  return {
    ...userSearch,
    data: filteredResults
  }
}