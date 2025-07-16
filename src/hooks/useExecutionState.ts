import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ExecutionState {
  isExecuting: boolean;
  currentStopIndex: number;
  afterglowStarted: boolean;
  reflectionSubmitted: boolean;
  executionStartTime?: Date;
  estimatedEndTime?: Date;
  participantCheckIns: Record<string, boolean>;
}

interface UseExecutionStateOptions {
  planId: string;
  totalStops: number;
  onStateChange?: (state: ExecutionState) => void;
  autoAdvanceThreshold?: number; // Percentage of participants needed to auto-advance
}

export function useExecutionState({ 
  planId, 
  totalStops, 
  onStateChange,
  autoAdvanceThreshold = 0.6 // 60% threshold by default
}: UseExecutionStateOptions) {
  const [state, setState] = useState<ExecutionState>({
    isExecuting: false,
    currentStopIndex: 0,
    afterglowStarted: false,
    reflectionSubmitted: false,
    participantCheckIns: {},
  });

  const { toast } = useToast();

  // Persist state to localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`execution-state-${planId}`);
    if (saved) {
      try {
        const parsedState = JSON.parse(saved);
        setState(prev => ({
          ...prev,
          ...parsedState,
          executionStartTime: parsedState.executionStartTime ? new Date(parsedState.executionStartTime) : undefined,
          estimatedEndTime: parsedState.estimatedEndTime ? new Date(parsedState.estimatedEndTime) : undefined,
        }));
      } catch (error) {
        console.error('Failed to parse execution state:', error);
      }
    }
  }, [planId]);

  // Save state changes
  useEffect(() => {
    localStorage.setItem(`execution-state-${planId}`, JSON.stringify(state));
    onStateChange?.(state);
  }, [state, planId, onStateChange]);

  const startExecution = useCallback(() => {
    const startTime = new Date();
    const estimatedEnd = new Date(startTime.getTime() + (totalStops * 2 * 60 * 60 * 1000)); // 2 hours per stop

    setState(prev => ({
      ...prev,
      isExecuting: true,
      executionStartTime: startTime,
      estimatedEndTime: estimatedEnd,
      currentStopIndex: 0,
    }));

    toast({
      title: "Plan Execution Started! 🎉",
      description: "Your plan is now live. Check in at each stop to track progress.",
    });
  }, [totalStops, toast]);

  const advanceToNextStop = useCallback(() => {
    setState(prev => {
      if (prev.currentStopIndex < totalStops - 1) {
        const newIndex = prev.currentStopIndex + 1;
        
        toast({
          title: `Moving to Stop ${newIndex + 1}`,
          description: "Get ready for your next destination!",
        });

        return {
          ...prev,
          currentStopIndex: newIndex,
          participantCheckIns: {}, // Reset check-ins for new stop
        };
      }
      return prev;
    });
  }, [totalStops, toast]);

  const updateCheckIn = useCallback((userId: string, isCheckedIn: boolean) => {
    setState(prev => ({
      ...prev,
      participantCheckIns: {
        ...prev.participantCheckIns,
        [userId]: isCheckedIn,
      },
    }));
  }, []);

  const checkAutoAdvance = useCallback((totalParticipants: number) => {
    const checkedInCount = Object.values(state.participantCheckIns).filter(Boolean).length;
    const participationRate = checkedInCount / totalParticipants;
    
    if (participationRate >= autoAdvanceThreshold && checkedInCount > 0) {
      toast({
        title: "Ready to advance?",
        description: `${checkedInCount}/${totalParticipants} participants have checked in.`,
      });
    }
  }, [state.participantCheckIns, autoAdvanceThreshold, advanceToNextStop, toast]);

  const startAfterglow = useCallback(() => {
    setState(prev => ({
      ...prev,
      afterglowStarted: true,
    }));

    toast({
      title: "Afterglow Started ✨",
      description: "Time to capture and reflect on your experience!",
    });
  }, [toast]);

  const submitReflection = useCallback(() => {
    setState(prev => ({
      ...prev,
      reflectionSubmitted: true,
    }));

    toast({
      title: "Reflection Submitted! 🎭",
      description: "Your memories have been captured.",
    });
  }, [toast]);

  const resetExecution = useCallback(() => {
    setState({
      isExecuting: false,
      currentStopIndex: 0,
      afterglowStarted: false,
      reflectionSubmitted: false,
      participantCheckIns: {},
    });
    
    localStorage.removeItem(`execution-state-${planId}`);
    
    toast({
      title: "Execution Reset",
      description: "Plan has been reset to planning mode.",
    });
  }, [planId, toast]);

  // Calculate progress
  const progress = state.isExecuting 
    ? Math.min(((state.currentStopIndex + 1) / totalStops) * 100, 100)
    : 0;

  const isComplete = state.currentStopIndex >= totalStops - 1 && state.isExecuting;

  return {
    state,
    progress,
    isComplete,
    startExecution,
    advanceToNextStop,
    updateCheckIn,
    checkAutoAdvance,
    startAfterglow,
    submitReflection,
    resetExecution,
  };
}