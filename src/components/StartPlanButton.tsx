
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface StartPlanButtonProps {
  floqId: string;
  onPlanCreated?: (planData: any) => void;
  disabled?: boolean;
  isLoading?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
}

export const StartPlanButton = ({ 
  floqId, 
  onPlanCreated, 
  disabled, 
  isLoading, 
  variant = 'default' 
}: StartPlanButtonProps) => {
  const navigate = useNavigate();

  const handleStartPlan = () => {
    navigate('/plan/new', { 
      state: { 
        floqId,
        templateType: 'custom'
      } 
    });
  };

  return (
    <Button
      onClick={handleStartPlan}
      disabled={disabled || isLoading}
      className="w-full"
      variant={variant}
      size="lg"
    >
      <Plus className="w-5 h-5 mr-2" />
      {isLoading ? 'Creating...' : 'Start Planning'}
    </Button>
  );
};
