
import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { TimeDialStep } from '@/components/new-plan/TimeDialStep'
import { DetailsStep } from '@/components/new-plan/DetailsStep'
import { ReviewStep } from '@/components/new-plan/ReviewStep'
import { PlanFloqStep } from '@/components/plans/PlanFloqStep'
import { useCreatePlan } from '@/hooks/useCreatePlan'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { X, ArrowLeft } from 'lucide-react'
import { useBottomGap } from '@/hooks/useBottomGap'

export interface TimeRange {
  start: string
  end: string
}

export interface PlanDetails {
  title: string
  description?: string
  vibe_tag?: string
  invitedUserIds: string[]
  floqId?: string | null
}

export interface PlanDraft extends PlanDetails, TimeRange {
  duration_hours: number
}

type FloqSelection =
  | { type: 'existing'; floqId: string; name: string; autoDisband: boolean }
  | { type: 'new'; name: string; autoDisband: boolean };

interface NavigationState {
  floqId?: string
  floqTitle?: string
  templateType?: string
}

export function NewPlanWizard() {
  const navigate = useNavigate()
  const location = useLocation()
  const { mutateAsync: createPlan, isPending } = useCreatePlan()
  const gap = useBottomGap()
  
  // Get floq context from navigation state
  const navigationState = location.state as NavigationState | undefined
  
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0)
  const [timeRange, setTimeRange] = useState<TimeRange>({ start: '18:00', end: '00:00' })
  const [durationHours, setDurationHours] = useState<4 | 6 | 8 | 12>(6)
  const [details, setDetails] = useState<PlanDetails>({
    title: '',
    description: '',
    vibe_tag: '',
    invitedUserIds: [],
    floqId: navigationState?.floqId || null
  })
  const [floqSelections, setFloqSelections] = useState<FloqSelection[]>([])

  // Set initial plan details based on template type and floq context
  useEffect(() => {
    if (navigationState) {
      const templateTitles = {
        coffee: 'Coffee Meetup',
        activity: 'Group Activity', 
        study: 'Study Session',
        custom: ''
      }
      
      const templateDescriptions = {
        coffee: 'Casual coffee and conversation',
        activity: 'Organized group activity',
        study: 'Collaborative learning session',
        custom: ''
      }

      const templateType = (navigationState.templateType || 'custom') as keyof typeof templateTitles
      
      setDetails(prev => ({
        ...prev,
        title: templateTitles[templateType] || '',
        description: templateDescriptions[templateType] || '',
        floqId: navigationState.floqId || null
      }))
    }
  }, [navigationState])

  const totalSteps = 4
  const progress = ((step + 1) / totalSteps) * 100

  const steps = [
    { title: 'Set Time Window', description: 'When will your plan happen?' },
    { title: 'Plan Details', description: 'Tell us about your plan' },
    { title: 'Choose Floqs', description: 'Which Floqs should this plan be linked to?' },
    { title: 'Review & Create', description: 'Ready to make it happen?' }
  ]

  const handleNext = () => {
    if (step < 3) {
      setStep(prev => (prev + 1) as 1 | 2 | 3)
    }
  }
  
  const handleBack = () => {
    if (step > 0) {
      setStep(prev => (prev - 1) as 0 | 1 | 2)
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
        duration_hours: durationHours,
        floqId: details.floqId
      }
      
      const planData_result = await createPlan(planData)
      navigate(`/plan/${planData_result.id}`, { replace: true })
    } catch (error) {
      console.error('Failed to create plan:', error)
    }
  }

  const handleClose = () => {
    // Navigate back to floq if we came from one, otherwise go to plans hub
    if (navigationState?.floqId) {
      navigate(`/floqs/${navigationState.floqId}`)
    } else {
      navigate('/plans')
    }
  }

  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        style={{ paddingBottom: gap }}
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold">{steps[step].title}</h2>
              <p className="text-muted-foreground">{steps[step].description}</p>
              {navigationState?.floqTitle && (
                <p className="text-sm text-muted-foreground">
                  For: <span className="font-medium">{navigationState.floqTitle}</span>
                </p>
              )}
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
              <PlanFloqStep
                value={floqSelections}
                onChange={setFloqSelections}
                onNext={handleNext}
              />
            )}
            
            {step === 3 && (
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
