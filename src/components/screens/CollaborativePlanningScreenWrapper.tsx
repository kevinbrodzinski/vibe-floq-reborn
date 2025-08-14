import { Suspense } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { FullScreenSpinner } from '@/components/ui/FullScreenSpinner'
import { CollaborativePlanningScreen } from './CollaborativePlanningScreen'

export function CollaborativePlanningScreenWrapper() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<FullScreenSpinner />}>
        <CollaborativePlanningScreen />
      </Suspense>
    </ErrorBoundary>
  )
}