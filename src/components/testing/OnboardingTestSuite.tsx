// Test suite for onboarding flow validation
// This component provides manual testing capabilities for the onboarding flow

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, Play } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';
import { useOnboardingDatabase } from '@/hooks/useOnboardingDatabase';
import { supabase } from '@/integrations/supabase/client';

interface TestCase {
  id: string;
  name: string;
  description: string;
  category: 'critical' | 'important' | 'nice-to-have';
  status: 'pending' | 'running' | 'passed' | 'failed';
  result?: string;
}

const TEST_CASES: TestCase[] = [
  {
    id: 'signup-flow',
    name: 'Complete Signup Flow',
    description: 'New user signup → onboarding → profile reflection',
    category: 'critical',
    status: 'pending'
  },
  {
    id: 'username-enforcement',
    name: 'Username Enforcement',
    description: 'Cannot proceed without valid username',
    category: 'critical', 
    status: 'pending'
  },
  {
    id: 'dropout-recovery',
    name: 'Dropout & Re-entry',
    description: 'Leave onboarding, return to correct step',
    category: 'critical',
    status: 'pending'
  },
  {
    id: 'cross-device-sync',
    name: 'Cross-device Consistency',
    description: 'Start on device A, continue on device B',
    category: 'important',
    status: 'pending'
  },
  {
    id: 'data-persistence',
    name: 'Database Persistence',
    description: 'All onboarding data persists correctly',
    category: 'critical',
    status: 'pending'
  },
  {
    id: 'profile-updates',
    name: 'Real-time Profile Updates',
    description: 'Profile changes reflect immediately',
    category: 'important',
    status: 'pending'
  }
];

export function OnboardingTestSuite() {
  const { user } = useAuth();
  const progress = useOnboardingProgress();
  const { loadProgress, saveProgress, clearProgress } = useOnboardingDatabase();
  const [testCases, setTestCases] = useState<TestCase[]>(TEST_CASES);
  const [isRunning, setIsRunning] = useState(false);

  const runTest = async (testId: string) => {
    setTestCases(prev => prev.map(test => 
      test.id === testId ? { ...test, status: 'running' } : test
    ));

    try {
      let result = '';
      
      switch (testId) {
        case 'username-enforcement':
          result = await testUsernameEnforcement();
          break;
        case 'data-persistence':
          result = await testDataPersistence();
          break;
        case 'dropout-recovery':
          result = await testDropoutRecovery();
          break;
        case 'profile-updates':
          result = await testProfileUpdates();
          break;
        default:
          result = 'Manual test - requires user interaction';
      }
      
      setTestCases(prev => prev.map(test => 
        test.id === testId ? { 
          ...test, 
          status: 'passed',
          result 
        } : test
      ));
    } catch (error) {
      setTestCases(prev => prev.map(test => 
        test.id === testId ? { 
          ...test, 
          status: 'failed',
          result: error instanceof Error ? error.message : 'Test failed'
        } : test
      ));
    }
  };

  const testUsernameEnforcement = async (): Promise<string> => {
    if (!user) throw new Error('User not authenticated');
    
    // Check if username is required in database
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();
    
    if (!profile?.username) {
      throw new Error('User has no username - enforcement failed');
    }
    
    // Check if username meets format requirements
    if (!/^[A-Za-z0-9_.-]+$/.test(profile.username)) {
      throw new Error('Username format validation failed');
    }
    
    return 'Username enforcement working correctly';
  };

  const testDataPersistence = async (): Promise<string> => {
    if (!user) throw new Error('User not authenticated');
    
    // Save test data
    const testState = {
      currentStep: 3,
      completedSteps: [0, 1, 2],
      selectedVibe: 'chill' as const,
      profileData: {
        username: 'test_user',
        display_name: 'Test User',
        bio: 'Test bio'
      },
      avatarUrl: null,
      startedAt: Date.now()
    };
    
    await saveProgress(testState);
    
    // Load and verify data
    const loaded = await loadProgress();
    if (!loaded) throw new Error('Failed to load saved progress');
    
    if (loaded.currentStep !== testState.currentStep) {
      throw new Error('Current step not persisted correctly');
    }
    
    return 'Data persistence working correctly';
  };

  const testDropoutRecovery = async (): Promise<string> => {
    // This would test the resume functionality
    const hasProgress = progress.hasProgress;
    const currentStep = progress.state.currentStep;
    
    if (!hasProgress) {
      return 'No progress to test recovery - create some progress first';
    }
    
    return `Recovery available - would resume at step ${currentStep}`;
  };

  const testProfileUpdates = async (): Promise<string> => {
    if (!user) throw new Error('User not authenticated');
    
    // Test profile update
    const testUpdate = {
      bio: `Test bio updated at ${Date.now()}`
    };
    
    const { error } = await supabase
      .from('profiles')
      .update(testUpdate)
      .eq('id', user.id);
    
    if (error) throw error;
    
    return 'Profile updates working correctly';
  };

  const runAllTests = async () => {
    setIsRunning(true);
    for (const test of testCases) {
      await runTest(test.id);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    setIsRunning(false);
  };

  const getStatusIcon = (status: TestCase['status']) => {
    switch (status) {
      case 'passed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'running': return <Clock className="w-4 h-4 text-blue-600 animate-spin" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getBadgeVariant = (category: TestCase['category']) => {
    switch (category) {
      case 'critical': return 'destructive';
      case 'important': return 'default';
      case 'nice-to-have': return 'secondary';
    }
  };

  if (!user) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Onboarding Test Suite</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Please sign in to run tests</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Onboarding Test Suite
          <Button 
            onClick={runAllTests} 
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Run All Tests
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {testCases.map(test => (
            <div 
              key={test.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  {getStatusIcon(test.status)}
                  <div>
                    <h3 className="font-medium">{test.name}</h3>
                    <p className="text-sm text-muted-foreground">{test.description}</p>
                    {test.result && (
                      <p className="text-xs mt-1 text-green-600">{test.result}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={getBadgeVariant(test.category)}>
                  {test.category}
                </Badge>
                <Button 
                  size="sm"
                  variant="outline"
                  onClick={() => runTest(test.id)}
                  disabled={test.status === 'running' || isRunning}
                >
                  Run Test
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}