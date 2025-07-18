import { useState, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'

interface EncounteredUser {
  user_id: string
  interaction_strength: number
  shared_duration: number
  interaction_type: string
}

interface PeopleMetadata {
  encountered_users: EncounteredUser[]
  total_people_count: number
}

interface SocialContext {
  floq_id?: string
  group_size?: number
  activity_type?: string
}

export function usePeopleData() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getPeopleInMoment = useCallback((metadata: any): PeopleMetadata => {
    if (!metadata?.people) {
      return {
        encountered_users: [],
        total_people_count: 0
      }
    }

    return {
      encountered_users: metadata.people.encountered_users || [],
      total_people_count: metadata.people.total_people_count || 0
    }
  }, [])

  const getSocialContext = useCallback((metadata: any): SocialContext => {
    if (!metadata?.social_context) {
      return {}
    }

    return {
      floq_id: metadata.social_context.floq_id,
      group_size: metadata.social_context.group_size,
      activity_type: metadata.social_context.activity_type
    }
  }, [])

  const fetchUserProfiles = useCallback(async (userIds: string[]) => {
    if (userIds.length === 0) return []

    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', userIds)

      if (fetchError) throw fetchError
      return data || []
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user profiles'
      setError(errorMessage)
      console.error('Error fetching user profiles:', err)
      return []
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getInteractionStrength = useCallback((strength: number) => {
    if (strength >= 0.8) return { level: 'strong', color: 'emerald', label: 'Strong Connection' }
    if (strength >= 0.6) return { level: 'good', color: 'blue', label: 'Good Interaction' }
    if (strength >= 0.4) return { level: 'medium', color: 'yellow', label: 'Medium Interaction' }
    return { level: 'brief', color: 'gray', label: 'Brief Encounter' }
  }, [])

  const formatDuration = useCallback((minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = Math.round(minutes % 60)
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }, [])

  const calculateTotalInteractionTime = useCallback((encounteredUsers: EncounteredUser[]) => {
    return encounteredUsers.reduce((total, user) => total + user.shared_duration, 0)
  }, [])

  const getStrongestConnection = useCallback((encounteredUsers: EncounteredUser[]) => {
    if (encounteredUsers.length === 0) return null
    return encounteredUsers.reduce((strongest, current) => 
      current.interaction_strength > strongest.interaction_strength ? current : strongest
    )
  }, [])

  return {
    isLoading,
    error,
    getPeopleInMoment,
    getSocialContext,
    fetchUserProfiles,
    getInteractionStrength,
    formatDuration,
    calculateTotalInteractionTime,
    getStrongestConnection
  }
}