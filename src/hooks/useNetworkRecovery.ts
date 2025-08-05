import { useState, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

interface NetworkState {
  isOnline: boolean
  isRetrying: boolean
  retryCount: number
  lastFailedAt?: Date
}

export function useNetworkRecovery() {
  const queryClient = useQueryClient()
  const [networkState, setNetworkState] = useState<NetworkState>({
    isOnline: navigator.onLine,
    isRetrying: false,
    retryCount: 0
  })

  const handleOnline = useCallback(() => {
    setNetworkState(prev => ({
      ...prev,
      isOnline: true,
      isRetrying: false,
      retryCount: 0
    }))

    // Retry failed queries when back online
    queryClient.refetchQueries({
      type: 'all',
      stale: true
    })

    toast.success('Connection restored', {
      description: 'You\'re back online!'
    })
  }, [queryClient])

  const handleOffline = useCallback(() => {
    setNetworkState(prev => ({
      ...prev,
      isOnline: false,
      lastFailedAt: new Date()
    }))

    toast.error('Connection lost', {
      description: 'Check your internet connection'
    })
  }, [])

  const retryConnection = useCallback(async () => {
    setNetworkState(prev => ({
      ...prev,
      isRetrying: true,
      retryCount: prev.retryCount + 1
    }))

    // Simple connectivity check
    try {
      const response = await fetch('/api/health', { 
        method: 'HEAD',
        cache: 'no-cache'
      })
      
      if (response.ok) {
        handleOnline()
        return true
      }
    } catch (error) {
      console.log('Retry failed:', error)
    }

    setNetworkState(prev => ({
      ...prev,
      isRetrying: false
    }))

    return false
  }, [handleOnline])

  useEffect(() => {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [handleOnline, handleOffline])

  // Auto-retry with exponential backoff
  useEffect(() => {
    if (!networkState.isOnline && !networkState.isRetrying && networkState.retryCount < 5) {
      const timeout = Math.min(1000 * Math.pow(2, networkState.retryCount), 30000)
      
      const timer = setTimeout(() => {
        retryConnection()
      }, timeout)

      return () => clearTimeout(timer)
    }
  }, [networkState, retryConnection])

  return {
    ...networkState,
    retryConnection,
    canRetry: networkState.retryCount < 5
  }
}