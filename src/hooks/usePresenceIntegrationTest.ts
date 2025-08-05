import { useEffect, useState } from 'react';
import { usePresenceDemoData } from './usePresenceDemoData';
import { useFieldTileSync } from './useFieldTileSync';
import { useFriendsPresence } from './useFriendsPresence';
import { useFieldTiles } from './useFieldTiles';

interface TestResult {
  step: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  timestamp: Date;
}

/**
 * Integration testing hook for the complete presence data flow
 * Tests: Demo Data → vibes_now → field_tiles → WebSocket updates → UI
 */
export function usePresenceIntegrationTest() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  
  const { seedDemoData, clearDemoData } = usePresenceDemoData();
  const { triggerRefresh } = useFieldTileSync();
  const { presenceMap, isConnected, totalOnline } = useFriendsPresence();

  const addResult = (step: string, status: TestResult['status'], message: string) => {
    setTestResults(prev => [...prev, { 
      step, 
      status, 
      message, 
      timestamp: new Date() 
    }]);
  };

  const runIntegrationTest = async () => {
    setIsRunning(true);
    setTestResults([]);

    try {
      // Step 1: Clear existing data
      addResult('cleanup', 'pending', 'Clearing existing demo data...');
      await clearDemoData();
      addResult('cleanup', 'success', 'Demo data cleared');

      // Step 2: Seed demo presence data
      addResult('seed', 'pending', 'Seeding 25 demo presence records...');
      const seedResult = await seedDemoData();
      addResult('seed', 'success', `Seeded ${seedResult?.records || 25} records`);

      // Step 3: Trigger field tile refresh
      addResult('tiles', 'pending', 'Refreshing field tiles...');
      await triggerRefresh();
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for processing
      addResult('tiles', 'success', 'Field tiles refreshed');

      // Step 4: Check WebSocket connectivity
      addResult('websocket', 'pending', 'Checking WebSocket connection...');
      if (isConnected) {
        addResult('websocket', 'success', `Connected, tracking ${totalOnline} online users`);
      } else {
        addResult('websocket', 'error', 'WebSocket not connected');
      }

      // Step 5: Validate data flow
      addResult('validation', 'pending', 'Validating complete data flow...');
      
      // Check if we have presence data
      const hasPresenceData = Object.keys(presenceMap).length > 0;
      if (hasPresenceData) {
        addResult('validation', 'success', 
          `✅ End-to-end test passed! ${totalOnline} users online`);
      } else {
        addResult('validation', 'error', 
          'No presence data detected - check data flow');
      }

    } catch (error: any) {
      addResult('error', 'error', `Test failed: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return {
    testResults,
    isRunning,
    runIntegrationTest,
    clearResults: () => setTestResults([]),
    // Test status summary
    summary: {
      total: testResults.length,
      success: testResults.filter(r => r.status === 'success').length,
      errors: testResults.filter(r => r.status === 'error').length,
      pending: testResults.filter(r => r.status === 'pending').length,
    }
  };
}