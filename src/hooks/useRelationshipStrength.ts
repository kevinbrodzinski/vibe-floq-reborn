import useSWR from 'swr'
import { supabase } from '@/integrations/supabase/client'

export interface RelationshipStrength {
  userId: string
  displayName: string
  avatarUrl?: string
  strength: number // 0-100
  interactionCount: number
  lastInteraction: string
  mutualFriends: number
  sharedInterests: string[]
  isPublic: boolean
}

const fetchRelationshipStrength = async (): Promise<RelationshipStrength[]> => {
  // For now, we'll simulate relationship strength data
  // In production, this would call a Supabase edge function or RPC
  
  const mockRelationships: RelationshipStrength[] = [
    {
      userId: '1',
      displayName: 'Sarah Chen',
      avatarUrl: undefined,
      strength: 85,
      interactionCount: 47,
      lastInteraction: '2 hours ago',
      mutualFriends: 12,
      sharedInterests: ['coffee', 'photography', 'travel'],
      isPublic: true
    },
    {
      userId: '2',
      displayName: 'Mike Rodriguez',
      avatarUrl: undefined,
      strength: 72,
      interactionCount: 23,
      lastInteraction: '1 day ago',
      mutualFriends: 8,
      sharedInterests: ['music', 'basketball'],
      isPublic: false
    },
    {
      userId: '3',
      displayName: 'Emma Thompson',
      avatarUrl: undefined,
      strength: 45,
      interactionCount: 8,
      lastInteraction: '3 days ago',
      mutualFriends: 3,
      sharedInterests: ['art'],
      isPublic: true
    },
    {
      userId: '4',
      displayName: 'Alex Kim',
      avatarUrl: undefined,
      strength: 28,
      interactionCount: 3,
      lastInteraction: '1 week ago',
      mutualFriends: 1,
      sharedInterests: [],
      isPublic: false
    },
    {
      userId: '5',
      displayName: 'Jordan Lee',
      avatarUrl: undefined,
      strength: 95,
      interactionCount: 89,
      lastInteraction: '30 min ago',
      mutualFriends: 15,
      sharedInterests: ['gaming', 'anime', 'tech', 'food'],
      isPublic: true
    }
  ]

  return mockRelationships
}

export const useRelationshipStrength = () => {
  const { data, error, mutate } = useSWR(
    'relationship-strength',
    fetchRelationshipStrength,
    {
      refreshInterval: 60000, // Refresh every minute
      revalidateOnFocus: true,
      revalidateOnReconnect: true
    }
  )

  const updatePrivacy = async (userId: string, isPublic: boolean) => {
    // In production, this would update the database
    console.log(`Updating privacy for user ${userId} to ${isPublic}`)
    
    // Optimistically update the local data
    if (data) {
      const updatedData = data.map(relationship => 
        relationship.userId === userId 
          ? { ...relationship, isPublic }
          : relationship
      )
      mutate(updatedData, false) // Update without revalidation
    }
  }

  return {
    relationships: data || [],
    loading: !data && !error,
    error,
    refetch: mutate,
    updatePrivacy
  }
} 