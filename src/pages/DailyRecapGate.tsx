import React, { useEffect, useState } from 'react'
import { useTodayRecap, shouldShowRecap } from '@/lib/recap'
// Removed analytics dependency
import DailyRecapCard from '@/lib/recap/card'
import EnhancedDailyRecapCard from '@/lib/recap/enhanced-card'
import CardSkeleton from '@/components/ui/CardSkeleton'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function DailyRecapGate() {
  const { data, isLoading, error } = useTodayRecap()
  const enhancedData = null; // Stub until analytics restored
  const enhancedLoading = false;
  const [showEnhanced, setShowEnhanced] = useState(false) // Default to false since enhancedData is null
  const navigate = useNavigate()

  // Debug logging
  console.log('🎯 DailyRecapGate state:', {
    isLoading,
    error: !!error,
    hasData: !!data,
    shouldShow: data ? shouldShowRecap(data) : 'no-data'
  })

  // Move navigation logic into useEffect to avoid render-time state updates
  useEffect(() => {
    if (!isLoading && (error || !shouldShowRecap(data))) {
      console.log('🏠 DailyRecapGate navigating to /home')
      navigate('/home', { replace: true })
    }
  }, [data, error, isLoading, navigate])

  // Fallback: if stuck loading for too long, navigate to home
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.log('⏰ DailyRecapGate timeout, navigating to /home')
        navigate('/home', { replace: true })
      }
    }, 5000) // 5 second timeout

    return () => clearTimeout(timeout)
  }, [isLoading, navigate])

  // Show skeleton while loading
  if (isLoading || (showEnhanced && enhancedLoading)) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm p-4">
        <div className="w-full max-w-sm">
          <CardSkeleton />
        </div>
      </div>
    )
  }

  // If error, no data, or shouldn't show recap, return null (navigation handled in useEffect)
  if (error || !shouldShowRecap(data)) {
    return null
  }

  const handleContinue = () => {
    navigate('/recap-actions', { replace: true })
  }

  const handleSkip = () => {
    navigate('/home', { replace: true })
  }

  // Determine which data to show
  const displayData = showEnhanced && enhancedData ? enhancedData : data!

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Enhanced Mode Toggle */}
        {enhancedData && (
          <div className="flex items-center justify-center gap-3 p-3 bg-background/50 rounded-lg">
            <Label htmlFor="enhanced-mode" className="text-sm flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Enhanced Analytics
            </Label>
            <Switch
              id="enhanced-mode"
              checked={showEnhanced}
              onCheckedChange={setShowEnhanced}
            />
          </div>
        )}

        {/* Recap Card */}
        {showEnhanced && enhancedData ? (
          <EnhancedDailyRecapCard data={enhancedData} />
        ) : data ? (
          <DailyRecapCard data={data} />
        ) : (
          <div className="text-center text-white">
            <p>No recap data available</p>
            <Button onClick={handleSkip} className="mt-4">Continue to App</Button>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Button
            onClick={handleContinue}
            className="w-full"
            size="lg"
          >
            What's next?
          </Button>

          <Button
            onClick={handleSkip}
            variant="ghost"
            className="w-full"
            size="sm"
          >
            Skip for now
          </Button>
        </div>
      </div>
    </div>
  )
}