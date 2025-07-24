import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useEffect, useRef, useState } from 'react'
import { useToast } from '@/hooks/use-toast'

export interface PlanSuggestion {
  title: string
  body: string
  emoji: string
}

export interface PlanRecapData {
  plan_id: string
  summary_md: string | null
  suggestions: PlanSuggestion[]
  status: 'pending' | 'ready' | 'error'
  error_message: string | null
  created_at: string
  updated_at: string
}

interface LocationPing {
  ts: string
  lat: number
  lng: number
  acc?: number
}

// Location tracking hook with throttling and batching
export function useUserLocation() {
  const [isTracking, setIsTracking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const bufferRef = useRef<LocationPing[]>([])
  const watchIdRef = useRef<number | null>(null)
  const flushIntervalRef = useRef<number | null>(null)
  const { toast } = useToast()

  const flushBuffer = async () => {
    if (bufferRef.current.length === 0) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const batch = bufferRef.current.splice(0, bufferRef.current.length)
      
      const { error } = await supabase.functions.invoke('record_locations', {
        body: { user_id: user.id, batch }
      })

      if (error) {
        console.error('Failed to record locations:', error)
      }
    } catch (err) {
      console.error('Location flush error:', err)
    }
  }

  const startTracking = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const permission = await navigator.permissions?.query({ name: 'geolocation' })
      if (permission?.state === 'denied') {
        setError('Location permission denied')
        setLoading(false)
        return
      }

      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude: lat, longitude: lng, accuracy: acc } = position.coords
          const newPing: LocationPing = {
            ts: new Date().toISOString(),
            lat,
            lng,
            acc
          }

          // Throttle: skip if too close to last ping (within 20m and 20s)
          const lastPing = bufferRef.current.at(-1)
          if (lastPing) {
            const timeDiff = Date.now() - new Date(lastPing.ts).valueOf()
            const distance = Math.sqrt(
              Math.pow((lat - lastPing.lat) * 111000, 2) + 
              Math.pow((lng - lastPing.lng) * 111000, 2)
            )
            
            if (distance < 20 && timeDiff < 20_000) {
              return // Skip duplicate/jitter
            }
          }

          bufferRef.current.push(newPing)
          
          if (!isTracking) {
            setIsTracking(true)
            setLoading(false)
            setError(null)
          }
        },
        (err) => {
          console.error('Geolocation error:', err)
          setError(err.message)
          setLoading(false)
          setIsTracking(false)
        },
        {
          enableHighAccuracy: false,
          timeout: 30000,
          maximumAge: 30000
        }
      )

      watchIdRef.current = watchId

      // Flush buffer every 15 seconds
      flushIntervalRef.current = setInterval(flushBuffer, 15_000)

    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    
    if (flushIntervalRef.current) {
      clearInterval(flushIntervalRef.current)
      flushIntervalRef.current = null
    }
    
    // Final flush
    flushBuffer()
    
    setIsTracking(false)
    setLoading(false)
    setError(null)
  }

  useEffect(() => {
    return () => {
      stopTracking()
    }
  }, [])

  return {
    isTracking,
    loading,
    error,
    startTracking,
    stopTracking
  }
}

// Realtime afterglow notifications hook
export function useAfterglowNotifications() {
  const { toast } = useToast()

  useEffect(() => {
    const setupChannel = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const channel = supabase
        .channel('user_notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'app_user_notification',
            filter: `user_id=eq.${session.user.id}`
          },
          (payload) => {
            const notification = payload.new.payload as any
            if (notification.type === 'afterglow_ready') {
              toast({
                title: '✨ Afterglow Ready',
                description: notification.msg,
                duration: 5000
              })
            }
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }

    setupChannel()
  }, [toast])
}

export function usePlanRecap(planId: string) {
  return useQuery({
    queryKey: ['plan-recap', planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_ai_summaries')
        .select('*')
        .eq('plan_id', planId)
        .single()
      
      if (error && error.code !== 'PGRST116') {
        throw error
      }
      
      return data ? {
        ...data,
        suggestions: Array.isArray(data.suggestions) ? data.suggestions as unknown as PlanSuggestion[] : []
      } as PlanRecapData : null
    },
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
    enabled: !!planId
  })
}