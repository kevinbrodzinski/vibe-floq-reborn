import { useState, useEffect, useCallback, useRef } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { type Vibe } from '@/types/vibes';
import { useOnboardingDatabase, ONBOARDING_VERSION } from './useOnboardingDatabase';
import { useAuth } from '@/providers/AuthProvider';
import { storage } from '@/lib/storage';

interface OnboardingState {
  currentStep: number;
  completedSteps: number[];
  selectedVibe?: Vibe;
  profileData?: {
    username: string;
    display_name: string;
    bio?: string;
    interests?: string[];
  };
  avatarUrl?: string | null;
  startedAt: number;
}

const STORAGE_KEY = 'floq_onboarding_progress';
const EXPIRY_HOURS = 24;

export function useOnboardingProgress() {
  const { user } = useAuth();
  const userRef = useRef(user);
  const { loadProgress, saveProgress, completeOnboarding, clearProgress: clearDbProgress } = useOnboardingDatabase();
  const [state, setState] = useState<OnboardingState>({
    currentStep: 0,
    completedSteps: [],
    startedAt: Date.now()
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // Keep user ref updated
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Load progress from database or localStorage on mount
  useEffect(() => {
    const loadInitialProgress = async () => {
      if (user) {
        // Try to load from database first
        const dbProgress = await loadProgress();
        if (dbProgress) {
          // Ensure completedSteps exists for backwards compatibility
          if (!dbProgress.completedSteps) {
            dbProgress.completedSteps = Array.from({ length: dbProgress.currentStep }, (_, i) => i);
          }
          setState(dbProgress);
          setIsLoaded(true);
          return;
        }
      }
      
      // Fallback to unified storage
      const savedProgress = await storage.getItem(STORAGE_KEY);
      if (savedProgress) {
        try {
          const parsed: OnboardingState = JSON.parse(savedProgress);
          
          // Check if progress has expired
          const hoursSinceStart = (Date.now() - parsed.startedAt) / (1000 * 60 * 60);
          if (hoursSinceStart < EXPIRY_HOURS) {
            // Ensure completedSteps exists for backwards compatibility
            if (!parsed.completedSteps) {
              parsed.completedSteps = Array.from({ length: parsed.currentStep }, (_, i) => i);
            }
            setState(parsed);
          } else {
            // Clear expired progress
            await storage.removeItem(STORAGE_KEY);
          }
        } catch (error) {
          console.error('Failed to parse onboarding progress:', error);
          await storage.removeItem(STORAGE_KEY);
        }
      }
      setIsLoaded(true);
    };

    loadInitialProgress();
  }, [user, loadProgress]);

  // Debounced save to prevent excessive writes (fixed double callback wrapping)
  const debouncedSave = useDebouncedCallback(
    async (stateToSave: OnboardingState) => {
      if (!userRef.current) return; // Guard against logout
      if (stateToSave.currentStep > 0 || stateToSave.selectedVibe) {
        await storage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
        if (userRef.current) {
          await saveProgress(stateToSave);
        }
      }
    },
    1500, // Increased for mobile networks
    { leading: false, trailing: true }
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => debouncedSave.cancel();
  }, [debouncedSave]);

  // Save progress to both localStorage and database (debounced)
  useEffect(() => {
    if (!isLoaded) return;
    debouncedSave(state);
  }, [state, isLoaded, debouncedSave]);

  const updateProgress = useCallback((updates: Partial<OnboardingState>) => {
    setState(prev => {
      const newState = { ...prev, ...updates };
      
      // Auto-update completed steps based on current step
      if (updates.currentStep !== undefined) {
        newState.completedSteps = Array.from({ length: updates.currentStep }, (_, i) => i);
      }
      
      return newState;
    });
  }, []);

  const clearProgress = useCallback(async () => {
    await storage.removeItem(STORAGE_KEY);
    if (user) {
      await clearDbProgress();
    }
    setState({
      currentStep: 0,
      completedSteps: [],
      startedAt: Date.now()
    });
  }, [user, clearDbProgress]);

  const markComplete = useCallback(async () => {
    if (user) {
      await completeOnboarding();
    }
  }, [user, completeOnboarding]);

  const goToStep = useCallback((step: number) => {
    updateProgress({ currentStep: step });
  }, [updateProgress]);

  const nextStep = useCallback(() => {
    updateProgress({ currentStep: state.currentStep + 1 });
  }, [state.currentStep, updateProgress]);

  const prevStep = useCallback(() => {
    updateProgress({ currentStep: Math.max(0, state.currentStep - 1) });
  }, [state.currentStep, updateProgress]);

  const setVibe = useCallback((vibe: Vibe) => {
    updateProgress({ selectedVibe: vibe });
  }, [updateProgress]);

  const setProfile = useCallback((profileData: OnboardingState['profileData']) => {
    updateProgress({ profileData });
  }, [updateProgress]);

  const setAvatar = useCallback((avatarUrl: string | null) => {
    updateProgress({ avatarUrl });
  }, [updateProgress]);

  const hasProgress = state.currentStep > 0;
  const progressPercentage = Math.round((state.currentStep / 5) * 100);

  return {
    state,
    hasProgress,
    progressPercentage,
    goToStep,
    nextStep,
    prevStep,
    setVibe,
    setProfile,
    setAvatar,
    clearProgress,
    updateProgress,
    markComplete,
    isLoaded
  };
}