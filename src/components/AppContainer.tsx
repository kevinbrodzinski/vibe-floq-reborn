// ✅ AppContainer.tsx — patched for onboarding transition reliability

import { useAuth } from '@/providers/AuthProvider'
import { useUserPreferences } from '@/hooks/useUserPreferences'
import { AuthScreen } from '@/components/auth/AuthScreen'
import { EnhancedOnboardingScreen } from '@/components/onboarding/EnhancedOnboardingScreen'
import { FloqApp } from '@/components/FloqApp'
import { useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'

export function AppContainer() {
  const { user, loading } = useAuth()
  const { data: preferences, isLoading: loadingPrefs } = useUserPreferences()
  const queryClient = useQueryClient()

  const [onboardingComplete, setOnboardingComplete] = useState(false)

  const onboardingVersion = 'v2'
  const hasCompleted = preferences?.onboarding_version === onboardingVersion

  // Debug logging
  console.log('[AppContainer Debug]', {
    user: !!user,
    preferences,
    onboardingVersion,
    hasCompleted,
    onboardingComplete,
    currentDbVersion: preferences?.onboarding_version
  })

  useEffect(() => {
    if (hasCompleted) setOnboardingComplete(true)
  }, [hasCompleted])

  if (loading || (user && loadingPrefs)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) return <AuthScreen />

  if (!onboardingComplete) {
    return (
      <EnhancedOnboardingScreen
        onComplete={async () => {
          await queryClient.invalidateQueries({ queryKey: ['user-preferences'] })
          setOnboardingComplete(true)
        }}
      />
    )
  }

  return <FloqApp />
}