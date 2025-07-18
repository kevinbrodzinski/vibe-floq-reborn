import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { TimeDialStep } from '@/components/new-plan/TimeDialStep'
import { DetailsStep } from '@/components/new-plan/DetailsStep'
import { ReviewStep } from '@/components/new-plan/ReviewStep'
import { useCreatePlan } from '@/hooks/useCreatePlan'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { X, ArrowLeft } from 'lucide-react'

export interface TimeRange {
  start: string
  end: string
}

export interface PlanDetails {
  title: string
  description?: string
  vibe_tag?: string
  invitedUserIds: string[]
}

export interface PlanDraft extends PlanDetails, TimeRange {
  duration_hours: number
}

export function NewPlanWizard() {
  const navigate = useNavigate()
  const { mutateAsync: createPlan, isPending } = useCreatePlan()
  
  const [step, setStep] = useState<0 | 1 | 2>(0)
  const [timeRange, setTimeRange] = useState<TimeRange>({ start: '18:00', end: '00:00' })
  const [durationHours, setDurationHours] = useState<4 | 6 | 8 | 12>(6)
  const [details, setDetails] = useState<PlanDetails>({
    title: '',
    description: '',
    vibe_tag: '',
    invitedUserIds: []
  })

  const totalSteps = 3
  const progress = ((step + 1) / totalSteps) * 100

  const steps = [
    { title: 'Set Time Window', description: 'When will your plan happen?' },
    { title: 'Plan Details', description: 'Tell us about your plan' },
    { title: 'Review & Create', description: 'Ready to make it happen?' }
  ]

  const handleNext = () => {
    if (step < 2) {
      setStep(prev => prev + 1 as 1 | 2)
    }
  }
  
  const handleBack = () => {
    if (step > 0) {
      setStep(prev => prev - 1 as 0 | 1)
    }
  }

  const handleTimeChange = (range: TimeRange, duration: 4 | 6 | 8 | 12) => {
    setTimeRange(range)
    setDurationHours(duration)
  }

  const handleCreate = async () => {
    try {
      const planData: PlanDraft = {
        ...details,
        ...timeRange,
        duration_hours: durationHours
      }
      
      // Map to CreatePlanPayload format for legacy flow
      const planData_result = await createPlan({
        ...planData,
        plannedAt: planData.start, // Legacy flow uses start/end times
      })
      navigate(`/plan/${planData_result.id}`, { replace: true })
    } catch (error) {
      console.error('Failed to create plan:', error)
    }
  }

  const handleClose = () => {
    navigate(-1)
  }

  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold">{steps[step].title}</h2>
              <p className="text-muted-foreground">{steps[step].description}</p>
            </div>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <Button variant="ghost" size="sm" onClick={handleBack}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground">
              Step {step + 1} of {totalSteps}
            </p>
          </div>

          {/* Step Content */}
          <div className="min-h-[400px]">
            {step === 0 && (
              <TimeDialStep
                initialRange={timeRange}
                initialDuration={durationHours}
                onChange={handleTimeChange}
                onNext={handleNext}
              />
            )}
            
            {step === 1 && (
              <DetailsStep
                draft={details}
                onChange={setDetails}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}
            
            {step === 2 && (
              <ReviewStep
                draft={{
                  ...details,
                  ...timeRange,
                  duration_hours: durationHours
                }}
                onCreate={handleCreate}
                isCreating={isPending}
                onBack={handleBack}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}