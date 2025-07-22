// Analytics hook for tracking onboarding metrics
import { useEffect, useCallback } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

interface OnboardingEvent {
  event_type: 'started' | 'step_completed' | 'step_dropped' | 'completed' | 'username_created' | 'username_failed';
  step_number?: number;
  step_name?: string;
  user_id: string;
  session_id: string;
  metadata?: Record<string, any>;
}

interface AnalyticsMetrics {
  completionRate: number;
  averageTimeToComplete: number;
  dropoffByStep: Record<number, number>;
  usernameSuccessRate: number;
}

// Simple session ID generation
const getSessionId = () => {
  if (typeof window !== 'undefined') {
    let sessionId = sessionStorage.getItem('onboarding_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('onboarding_session_id', sessionId);
    }
    return sessionId;
  }
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export function useOnboardingAnalytics() {
  const { user } = useAuth();
  const sessionId = getSessionId();

  const trackEvent = useCallback(async (event: Omit<OnboardingEvent, 'user_id' | 'session_id'>) => {
    if (!user) return;

    try {
      // In a real app, you'd send this to your analytics service
      // For now, we'll log to console and optionally store in Supabase
      console.log('📊 Onboarding Analytics Event:', {
        ...event,
        user_id: user.id,
        session_id: sessionId,
        timestamp: new Date().toISOString()
      });

      // Optional: Store in a Supabase table for analytics
      // Uncomment if you create an onboarding_analytics table
      /*
      const { error } = await supabase
        .from('onboarding_analytics')
        .insert({
          event_type: event.event_type,
          step_number: event.step_number,
          step_name: event.step_name,
          user_id: user.id,
          session_id: sessionId,
          metadata: event.metadata || {},
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to track onboarding event:', error);
      }
      */
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  }, [user, sessionId]);

  const trackOnboardingStart = useCallback(() => {
    trackEvent({
      event_type: 'started',
      step_number: 0,
      step_name: 'welcome'
    });
  }, [trackEvent]);

  const trackStepCompleted = useCallback((stepNumber: number, stepName: string, metadata?: Record<string, any>) => {
    trackEvent({
      event_type: 'step_completed',
      step_number: stepNumber,
      step_name: stepName,
      metadata
    });
  }, [trackEvent]);

  const trackStepDropped = useCallback((stepNumber: number, stepName: string) => {
    trackEvent({
      event_type: 'step_dropped',
      step_number: stepNumber,
      step_name: stepName
    });
  }, [trackEvent]);

  const trackOnboardingCompleted = useCallback((metadata?: Record<string, any>) => {
    trackEvent({
      event_type: 'completed',
      metadata: {
        ...metadata,
        completion_time: Date.now()
      }
    });
  }, [trackEvent]);

  const trackUsernameCreated = useCallback((username: string, attempts: number = 1) => {
    trackEvent({
      event_type: 'username_created',
      metadata: {
        username_length: username.length,
        attempts_taken: attempts,
        contains_numbers: /\d/.test(username),
        contains_special: /[_.-]/.test(username)
      }
    });
  }, [trackEvent]);

  const trackUsernameFailed = useCallback((reason: string, attempted_username?: string) => {
    trackEvent({
      event_type: 'username_failed',
      metadata: {
        failure_reason: reason,
        attempted_username: attempted_username?.substring(0, 3) + '***' // Privacy
      }
    });
  }, [trackEvent]);

  // Auto-track page visibility for dropout detection
  useEffect(() => {
    if (!user) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User left the page - potential dropout
        console.log('📊 Potential onboarding dropout detected');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  return {
    trackOnboardingStart,
    trackStepCompleted,
    trackStepDropped,
    trackOnboardingCompleted,
    trackUsernameCreated,
    trackUsernameFailed,
    trackEvent
  };
}

// Hook for querying analytics data (for dashboards)
export function useOnboardingMetrics() {
  const getMetrics = useCallback(async (): Promise<AnalyticsMetrics> => {
    // This would query your analytics data
    // For now, return mock data
    return {
      completionRate: 0.85, // 85% completion rate
      averageTimeToComplete: 180000, // 3 minutes
      dropoffByStep: {
        0: 0.05, // 5% drop off at welcome
        1: 0.10, // 10% drop off at vibe selection
        2: 0.25, // 25% drop off at profile setup (username enforcement working!)
        3: 0.15, // 15% drop off at avatar
        4: 0.05, // 5% drop off at features
      },
      usernameSuccessRate: 0.92 // 92% of users successfully create username
    };
  }, []);

  return { getMetrics };
}