import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@supabase/auth-helpers-react';
import { Loader2, TestTube, Clock, CheckCircle, XCircle } from 'lucide-react';
import { GenericStatusEnum, type GenericStatus } from '@/types/enums/genericStatus';

interface TestResult {
  test: string;
  status: GenericStatus;
  message: string;
  timestamp: Date;
}

export default function WeeklyAITest() {
  const user = useUser();
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addTestResult = (test: string, status: GenericStatus, message: string) => {
    setTests(prev => [...prev, { test, status, message, timestamp: new Date() }]);
  };

  const runCooldownTest = async () => {
    if (!user) return;
    
    setIsRunning(true);
    setTests([]);

    try {
      // Test 1: Normal call
      addTestResult('Normal Call', 'pending', 'Testing normal edge function call...');
      const { data: normalData, error: normalError } = await supabase.functions.invoke('generate-weekly-ai-suggestion', {
        body: { forceRefresh: false },
      });

      if (normalError) {
        addTestResult('Normal Call', 'error', `Error: ${normalError.message}`);
      } else {
        addTestResult('Normal Call', 'success', `Success: ${normalData?.source || 'unknown'} source`);
      }

      // Test 2: Force refresh (should work first time)
      addTestResult('Force Refresh #1', 'pending', 'Testing forceRefresh: true...');
      const { data: forceData1, error: forceError1 } = await supabase.functions.invoke('generate-weekly-ai-suggestion', {
        body: { forceRefresh: true },
      });

      if (forceError1) {
        addTestResult('Force Refresh #1', 'error', `Error: ${forceError1.message}`);
      } else {
        addTestResult('Force Refresh #1', 'success', `Success: ${forceData1?.source || 'unknown'} source`);
      }

      // Test 3: Immediate second force refresh (should hit cooldown)
      addTestResult('Force Refresh #2 (Cooldown Test)', 'pending', 'Testing immediate second forceRefresh...');
      const { data: forceData2, error: forceError2 } = await supabase.functions.invoke('generate-weekly-ai-suggestion', {
        body: { forceRefresh: true },
      });

      if (forceError2 && (forceError2.status === 429 || forceError2.message?.includes('cooldown'))) {
        addTestResult('Force Refresh #2 (Cooldown Test)', 'success', `✅ Cooldown working: ${forceError2.message}`);
      } else if (forceError2) {
        addTestResult('Force Refresh #2 (Cooldown Test)', 'error', `Unexpected error: ${forceError2.message}`);
      } else {
        addTestResult('Force Refresh #2 (Cooldown Test)', 'error', '❌ Cooldown not working - second call succeeded');
      }

      // Test 4: Pre-warm call
      addTestResult('Pre-warm Call', 'pending', 'Testing preWarm: true...');
      const { data: prewarmData, error: prewarmError } = await supabase.functions.invoke('generate-weekly-ai-suggestion', {
        body: { preWarm: true, userId: user.id },
      });

      if (prewarmError) {
        addTestResult('Pre-warm Call', 'error', `Error: ${prewarmError.message}`);
      } else {
        addTestResult('Pre-warm Call', 'success', `Success: Pre-warm completed`);
      }

    } catch (error) {
      addTestResult('Test Suite', 'error', `Unexpected error: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="w-5 h-5" />
          Weekly AI Edge Function Test Suite
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Test the critical path: cooldown enforcement and error propagation
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runCooldownTest} 
          disabled={isRunning || !user}
          className="w-full"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Running Tests...
            </>
          ) : (
            <>
              <TestTube className="w-4 h-4 mr-2" />
              Run Cooldown Test Suite
            </>
          )}
        </Button>

        {!user && (
          <p className="text-sm text-muted-foreground text-center">
            Please log in to run tests
          </p>
        )}

        {tests.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-medium">Test Results</h3>
            {tests.map((test, index) => (
              <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                {getStatusIcon(test.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{test.test}</span>
                    <Badge variant={test.status === 'success' ? 'default' : test.status === 'error' ? 'destructive' : 'secondary'}>
                      {test.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{test.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {test.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}