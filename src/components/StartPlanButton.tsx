import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { NewPlanWizard, type PlanWizardData } from './NewPlanWizard';

interface StartPlanButtonProps {
  floqId: string;
  onPlanCreated: (planData: PlanWizardData) => void;
  disabled?: boolean;
  isLoading?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
}

export const StartPlanButton = ({ floqId, onPlanCreated, disabled, isLoading, variant = 'default' }: StartPlanButtonProps) => {
  const [showWizard, setShowWizard] = useState(false);

  const handlePlanComplete = (planData: PlanWizardData) => {
    setShowWizard(false);
    onPlanCreated(planData);
  };

  return (
    <>
      <Button
        onClick={() => setShowWizard(true)}
        disabled={disabled || isLoading}
        className="w-full"
        variant={variant}
        size="lg"
      >
        <Plus className="w-5 h-5 mr-2" />
        {isLoading ? 'Creating...' : 'Start Planning'}
      </Button>

      <NewPlanWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onComplete={handlePlanComplete}
        floqId={floqId}
      />
    </>
  );
};