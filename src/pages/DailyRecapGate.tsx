import React from 'react'
import { useTodayRecap, shouldShowRecap } from '@/lib/recap'
import DailyRecapCard from '@/lib/recap/card'
import CardSkeleton from '@/components/ui/CardSkeleton'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'

export default function DailyRecapGate() {
  const { data, isLoading, error } = useTodayRecap()
  const navigate = useNavigate()

  // Show skeleton while loading
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm p-4">
        <div className="w-full max-w-sm">
          <CardSkeleton />
        </div>
      </div>
    )
  }

  // If error, no data, or shouldn't show recap, forward to home
  if (error || !shouldShowRecap(data)) {
    navigate('/home', { replace: true })
    return null
  }

  const handleContinue = () => {
    navigate('/recap-actions', { replace: true })
  }

  const handleSkip = () => {
    navigate('/home', { replace: true })
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm space-y-6">
        <DailyRecapCard data={data!} />
        
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