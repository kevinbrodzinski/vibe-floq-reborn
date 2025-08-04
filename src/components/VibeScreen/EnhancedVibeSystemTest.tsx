import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, MapPin, Users, Zap } from 'lucide-react';
import { LocationEnhancedVibeSystem } from '@/lib/vibeAnalysis/LocationEnhancedVibeSystem';
import { useEnhancedLocationSharing } from '@/hooks/location/useEnhancedLocationSharing';
import { useSensorMonitoring } from '@/hooks/useSensorMonitoring';
import { useVibe } from '@/lib/store/useVibe';

interface TestResult {
  component: string;
  status: 'success' | 'error' | 'pending';
  message: string;
  data?: any;
}

/**
 * EnhancedVibeSystemTest - Test component to verify integration
 * This component tests the enhanced vibe detection system integration
 */
export const EnhancedVibeSystemTest: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [vibeSystem] = useState(() => new LocationEnhancedVibeSystem());
  
  // Hook integrations
  const enhancedLocation = useEnhancedLocationSharing();
  const { sensorData } = useSensorMonitoring(true);
  const { vibe: currentVibe } = useVibe();

  const addTestResult = (result: TestResult) => {
    setTestResults(prev => [...prev, result]);
  };

  const runTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    // Test 1: Enhanced Location System
    try {
      addTestResult({
        component: 'Enhanced Location System',
        status: enhancedLocation.location ? 'success' : 'error',
        message: enhancedLocation.location 
          ? `Location available: ${enhancedLocation.location.lat?.toFixed(4)}, ${enhancedLocation.location.lng?.toFixed(4)}`
          : 'No location data available',
        data: {
          hasLocation: !!enhancedLocation.location,
          hasProximityEvents: !!enhancedLocation.proximityEvents?.length,
          venueDetections: enhancedLocation.venueDetections
        }
      });
    } catch (error) {
      addTestResult({
        component: 'Enhanced Location System',
        status: 'error',
        message: `Error: ${error.message}`
      });
    }

    // Test 2: Sensor Monitoring
    try {
      addTestResult({
        component: 'Sensor Monitoring',
        status: sensorData ? 'success' : 'error',
        message: sensorData 
          ? `Sensor data available with ${Object.keys(sensorData).length} sensors`
          : 'No sensor data available',
        data: sensorData ? {
          hasMovement: !!sensorData.movement,
          hasLocation: !!sensorData.location
        } : null
      });
    } catch (error) {
      addTestResult({
        component: 'Sensor Monitoring',
        status: 'error',
        message: `Error: ${error.message}`
      });
    }

    // Test 3: Enhanced Personal Hero Data
    if (sensorData) {
      try {
        const mockContext = {
          timestamp: new Date(),
          location: enhancedLocation.location || null,
          socialContext: { nearbyFriends: [], crowdDensity: 0 },
          environmentalFactors: { timeOfDay: 'day', weather: 'clear' }
        };

        const heroData = await vibeSystem.getEnhancedPersonalHeroData(sensorData, mockContext);
        
        addTestResult({
          component: 'Enhanced Personal Hero Data',
          status: 'success',
          message: `Generated hero data with ${heroData.confidence.toFixed(2)} confidence`,
          data: {
            currentVibe: heroData.currentVibe,
            confidence: heroData.confidence,
            accuracy: heroData.accuracy,
            sensorQualityCount: Object.keys(heroData.sensorQuality).length,
            hasPredictions: !!heroData.predictions,
            hasEnvironmentalFactors: !!heroData.environmentalFactors
          }
        });
      } catch (error) {
        addTestResult({
          component: 'Enhanced Personal Hero Data',
          status: 'error',
          message: `Error: ${error.message}`
        });
      }
    }

    // Test 4: Location-Enhanced Social Context
    if (enhancedLocation.location && currentVibe) {
      try {
        const mockFriends = [
          { id: 'friend1', distance: 150, confidence: 0.8, vibe: 'chill' },
          { id: 'friend2', distance: 300, confidence: 0.6, vibe: 'social' }
        ];

        const socialData = await vibeSystem.getLocationEnhancedSocialContextData(
          enhancedLocation.location,
          currentVibe as any,
          mockFriends
        );

        addTestResult({
          component: 'Location-Enhanced Social Context',
          status: 'success',
          message: `Generated social context with ${mockFriends.length} nearby friends`,
          data: {
            alignment: socialData.alignment,
            friendsCount: mockFriends.length,
            hasOptimalLocations: !!socialData.proximityIntelligence?.optimalMeetupLocations?.length
          }
        });
      } catch (error) {
        addTestResult({
          component: 'Location-Enhanced Social Context',
          status: 'error',
          message: `Error: ${error.message}`
        });
      }
    }

    // Test 5: Database Connectivity
    try {
      const healthMetrics = await vibeSystem.getSystemHealthMetrics();
      
      addTestResult({
        component: 'Database Connectivity',
        status: 'success',
        message: `System health: ${healthMetrics.overallHealth.toFixed(2)}`,
        data: {
          overallHealth: healthMetrics.overallHealth,
          accuracy: healthMetrics.accuracy,
          responseTime: healthMetrics.responseTime,
          learningProgress: healthMetrics.learningProgress,
          recommendations: healthMetrics.recommendations?.length || 0
        }
      });
    } catch (error) {
      addTestResult({
        component: 'Database Connectivity',
        status: 'error',
        message: `Error: ${error.message}`
      });
    }

    setIsRunning(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-500/20 text-green-500 border-green-500/30';
      case 'error': return 'bg-red-500/20 text-red-500 border-red-500/30';
      default: return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <Zap className="w-4 h-4" />;
      case 'error': return <Activity className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4 animate-spin" />;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Enhanced Vibe System Integration Test
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Test the integration between enhanced vibe detection, location system, and database
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runTests} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? 'Running Tests...' : 'Run Integration Tests'}
        </Button>

        {/* Current System Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-card/40 rounded-lg">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-500" />
            <span className="text-sm">
              Location: {enhancedLocation.location ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-green-500" />
            <span className="text-sm">
              Sensors: {sensorData ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-500" />
            <span className="text-sm">
              Proximity: {enhancedLocation.proximityEvents?.length || 0} events
            </span>
          </div>
        </div>

        {/* Test Results */}
        <div className="space-y-3">
          {testResults.map((result, index) => (
            <div 
              key={index}
              className="flex items-start gap-3 p-3 bg-card/20 rounded-lg border border-border/30"
            >
              <Badge className={`${getStatusColor(result.status)} shrink-0`}>
                {getStatusIcon(result.status)}
              </Badge>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm">{result.component}</h4>
                <p className="text-xs text-muted-foreground mt-1">{result.message}</p>
                {result.data && (
                  <details className="mt-2">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                      View Details
                    </summary>
                    <pre className="text-xs bg-background/50 p-2 rounded mt-1 overflow-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        {testResults.length > 0 && (
          <div className="p-4 bg-card/40 rounded-lg">
            <h3 className="font-medium text-sm mb-2">Test Summary</h3>
            <div className="flex gap-4 text-xs">
              <span className="text-green-500">
                ✓ {testResults.filter(r => r.status === 'success').length} Passed
              </span>
              <span className="text-red-500">
                ✗ {testResults.filter(r => r.status === 'error').length} Failed
              </span>
              <span className="text-yellow-500">
                ⏳ {testResults.filter(r => r.status === 'pending').length} Pending
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};