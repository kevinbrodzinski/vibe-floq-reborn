
import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { WizardPortal } from '@/components/WizardPortal'
import { TimeDialStep } from '@/components/new-plan/TimeDialStep'
import { DetailsStep } from '@/components/new-plan/DetailsStep'
import { PlanFloqStep } from '@/components/plans/PlanFloqStep'
import PlanReviewStep from '@/components/plans/PlanReviewStep'
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
}

export interface PlanDraft extends PlanDetails, TimeRange {
  duration_hours: number
}

type FloqSelection =
  | { type: 'existing'; floqId: string; name: string; autoDisband: boolean }
  | { type: 'new'; name: string; autoDisband: boolean };

type Step = 0 | 1 | 2 | 3 | 4;

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
  
  const [step, setStep] = useState<Step>(0)
  const [timeRange, setTimeRange] = useState<TimeRange>({ start: '18:00', end: '00:00' })
  const [durationHours, setDurationHours] = useState<4 | 6 | 8 | 12>(6)
  const [details, setDetails] = useState<PlanDetails>({
    title: '',
    description: '',
    vibe_tag: ''
  })
  const [invitedUserIds, setInvitedUserIds] = useState<string[]>([])
  const [floqSelections, setFloqSelections] = useState<FloqSelection[]>([])
  const [combinedFloqName, setCombinedFloqName] = useState('')

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
        description: templateDescriptions[templateType] || ''
      }))
    }
  }, [navigationState])

  const totalSteps = 5
  const progress = ((step + 1) / totalSteps) * 100

  const steps = [
    { title: 'Set Time Window', description: 'When will your plan happen?' },
    { title: 'Plan Details', description: 'Tell us about your plan' },
    { title: 'Choose Floqs', description: 'Which Floqs should this plan be linked to?' },
    { title: 'Review', description: 'Double-check everything' },
    { title: 'All Done!', description: 'Your plan has been created' }
  ]

  const handleNext = () => {
    if (step < 4) {
      setStep(prev => Math.min(prev + 1, 4) as Step)
    }
  }
  
  const handleBack = () => {
    if (step > 0) {
      setStep(prev => Math.max(prev - 1, 0) as Step)
    }
  }

  const handleTimeChange = (range: TimeRange, duration: 4 | 6 | 8 | 12) => {
    setTimeRange(range)
    setDurationHours(duration)
  }

  const handleReviewSubmit = async () => {
    try {
      const finalPayload = {
        ...details,
        ...timeRange,
        floqSelections: floqSelections,
        combinedName: (combinedFloqName ?? '').trim() || undefined,
        invitedUserIds: invitedUserIds,
      }
      
      const planData_result = await createPlan(finalPayload)
      setStep(4) // Go to success step
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
    <WizardPortal onBackdropClick={handleClose}>
      <div 
        className="bg-background border rounded-lg shadow-xl max-w-2xl w-full overflow-hidden"
        style={{ paddingBottom: gap }}
      >
        <div className="p-6 space-y-6">
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
          <div className="min-h-[400px] max-h-[60vh] overflow-y-auto">
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
                onCreateFloq={() => setStep(2)} // Skip to floq creation step
              />
            )}
            
            {step === 2 && (
              <PlanFloqStep
                value={floqSelections}
                onChange={setFloqSelections}
                onNext={handleNext}
                combinedName={combinedFloqName}
                onCombinedNameChange={setCombinedFloqName}
                invitedIds={invitedUserIds}
                onInvitedChange={setInvitedUserIds}
              />
            )}
            
            {step === 3 && (
              <PlanReviewStep
                title={details.title}
                description={details.description}
                start={timeRange.start}
                end={timeRange.end}
                selections={floqSelections}
                combinedName={combinedFloqName}
                invitedIds={invitedUserIds}
                onBack={handleBack}
                onSubmit={handleReviewSubmit}
                isCreating={isPending}
              />
            )}
            
            {step === 4 && (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <div className="w-8 h-8 text-green-600">✓</div>
                </div>
                <h3 className="text-xl font-semibold">Plan Created!</h3>
                <p className="text-muted-foreground">
                  Your plan has been created successfully. You can view it in your plans list.
                </p>
                <Button onClick={handleClose}>Close</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </WizardPortal>
  )
}
