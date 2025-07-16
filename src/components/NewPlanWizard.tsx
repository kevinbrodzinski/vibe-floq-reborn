import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PlanDetailsForm, type PlanDetails } from './PlanDetailsForm';
import { InviteFriendsModal } from './InviteFriendsModal';
import { Progress } from '@/components/ui/progress';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NewPlanWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (planData: PlanWizardData) => void;
  floqId: string;
}

export interface PlanWizardData {
  details: PlanDetails;
  invitedParticipants: string[];
}

type WizardStep = 'details' | 'invites' | 'complete';

export const NewPlanWizard = ({ isOpen, onClose, onComplete, floqId }: NewPlanWizardProps) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('details');
  const [planDetails, setPlanDetails] = useState<PlanDetails | null>(null);
  const [invitedParticipants, setInvitedParticipants] = useState<string[]>([]);

  const steps = [
    { id: 'details', title: 'Plan Details', description: 'What, when, and where' },
    { id: 'invites', title: 'Invite Friends', description: 'Who\'s coming along' },
    { id: 'complete', title: 'Ready!', description: 'Plan created successfully' }
  ];

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleDetailsSubmit = (details: PlanDetails) => {
    setPlanDetails(details);
    setCurrentStep('invites');
  };

  const handleInvitesComplete = (participants: string[]) => {
    setInvitedParticipants(participants);
    setCurrentStep('complete');
    
    // Complete the wizard
    if (planDetails) {
      onComplete({
        details: planDetails,
        invitedParticipants: participants
      });
    }
  };

  const handleClose = () => {
    setCurrentStep('details');
    setPlanDetails(null);
    setInvitedParticipants([]);
    onClose();
  };

  const getStepIcon = (step: typeof steps[0], index: number) => {
    if (index < currentStepIndex) {
      return <Check className="w-4 h-4 text-primary" />;
    }
    if (index === currentStepIndex) {
      return (
        <div className="w-4 h-4 rounded-full bg-primary animate-pulse" />
      );
    }
    return (
      <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Plan</DialogTitle>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="space-y-4">
          <Progress value={progress} className="h-2" />
          
          <div className="flex justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center space-x-2 text-sm">
                {getStepIcon(step, index)}
                <div>
                  <div className={cn(
                    "font-medium",
                    index <= currentStepIndex ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {step.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {step.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="mt-6">
          {currentStep === 'details' && (
            <PlanDetailsForm
              onSubmit={handleDetailsSubmit}
              onCancel={handleClose}
            />
          )}

          {currentStep === 'invites' && (
            <InviteFriendsModal
              floqId={floqId}
              onClose={() => setCurrentStep('details')}
              onComplete={handleInvitesComplete}
              inline={true}
            />
          )}

          {currentStep === 'complete' && planDetails && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Plan Created!</h3>
              <p className="text-muted-foreground mb-6">
                "{planDetails.title}" is ready for collaboration
              </p>
              <div className="bg-card/50 rounded-xl p-4 text-left">
                <div className="text-sm space-y-2">
                  <div><strong>Date:</strong> {planDetails.date.toDateString()}</div>
                  <div><strong>Time:</strong> {planDetails.startTime} - {planDetails.endTime}</div>
                  <div><strong>Participants:</strong> {invitedParticipants.length + 1} people</div>
                  <div><strong>Vibe:</strong> {planDetails.vibe}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};