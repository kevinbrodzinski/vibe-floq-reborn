// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { useState, useEffect, useRef, useCallback } from 'react';
import type { Vibe } from '@/lib/vibes';
import { VibeAnalysisEngine, type SensorData, type VibeAnalysisResult } from '@/lib/vibeAnalysis/VibeAnalysisEngine';
import { UserLearningSystem } from '@/lib/vibeAnalysis/UserLearningSystem';
import { storage } from '@/lib/storage';

interface VibeDetection {
  suggestedVibe: Vibe;
  confidence: number; // 0-1
  reasoning: string[];
  sensors: SensorData;
  alternatives?: Array<{ vibe: Vibe; confidence: number }>;
  contextFactors?: {
    temporal: number;
    environmental: number;
    personal: number;
  };
  learningBoost?: {
    boosted: boolean;
    boostFactor: number;
    originalConfidence: number;
  };
}

interface SensorPermissions {
  microphone: boolean;
  motion: boolean;
  location: boolean;
}

interface LearningData {
  patterns: Array<{ context: string; preferredVibe: Vibe; confidence: number }>;
  preferences: Partial<Record<Vibe, number>>;
  accuracy: number;
  correctionCount: number;
}

export const useSensorMonitoring = (enabled: boolean = false) => {
  // ✅ ALL hooks declared unconditionally at top level
  const analysisEngineRef = useRef<VibeAnalysisEngine>(new VibeAnalysisEngine());
  const learningSystemRef = useRef<UserLearningSystem>(new UserLearningSystem());
  const [sensorData, setSensorData] = useState<SensorData>({
    audioLevel: 0,
    lightLevel: 50, // Default mid-level
    movement: { intensity: 0, pattern: 'still', frequency: 0 },
    location: { context: 'unknown', density: 0 }
  });

  const [vibeDetection, setVibeDetection] = useState<VibeDetection | null>(null);
  const [permissions, setPermissions] = useState<SensorPermissions>({
    microphone: false,
    motion: false,
    location: false
  });
  
  const [learningData, setLearningData] = useState<LearningData>({
    patterns: [],
    preferences: {},
    accuracy: 0,
    correctionCount: 0
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const motionListenerRef = useRef<((event: DeviceMotionEvent) => void) | null>(null);
  const lightSensorRef = useRef<any>(null);
  const audioUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionStartRef = useRef<Date | null>(null);
  const micBaselineRef = useRef<number | null>(null);

  // Request permissions with iOS-compliant descriptions
  const requestPermissions = useCallback(async () => {
    const newPermissions = { ...permissions };

    // Request microphone permission - iOS compliant wording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,    // Safari / iOS flag
          googAutoGainControl: false // Chromium / Android flag
        } as MediaTrackConstraints
      });
      newPermissions.microphone = true;
      streamRef.current = stream;
    } catch (error) {
      console.log('Ambient noise level permission denied:', error);
      newPermissions.microphone = false;
    }

    // Request motion permission (iOS 13+)
    if ('DeviceMotionEvent' in window && typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        newPermissions.motion = permission === 'granted';
      } catch (error) {
        console.log('Motion permission denied:', error);
        newPermissions.motion = false;
      }
    } else {
      newPermissions.motion = 'DeviceMotionEvent' in window;
    }

    // Location permission handled by useGeo
    newPermissions.location = true;

    setPermissions(newPermissions);
    return newPermissions;
  }, [permissions]);

  // Audio level monitoring with adaptive throttling
  const startAudioMonitoring = useCallback(async () => {
    if (!enabled || !permissions.microphone || !streamRef.current) return;

    try {
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(streamRef.current);
      
      analyserRef.current.fftSize = 256;
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      
      microphoneRef.current.connect(analyserRef.current);
      sessionStartRef.current = new Date();

      const updateAudioLevel = () => {
        if (!analyserRef.current) return;
        
        // Handle AudioContext suspension on iOS
        if (audioContextRef.current?.state === 'suspended') {
          audioContextRef.current.resume();
        }
        
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        let audioLevel = Math.min(100, (average / 255) * 100);
        
        // Persist mic baseline in storage
        if (micBaselineRef.current === null && audioLevel > 5) {
          micBaselineRef.current = average;
          storage.setItem('micBaseline', String(micBaselineRef.current)).catch(console.error);
        } else if (micBaselineRef.current === null) {
          storage.getItem('micBaseline').then(stored => {
            const parsed = Number(stored);
            if (!Number.isNaN(parsed)) micBaselineRef.current = parsed;
          }).catch(console.error);
        }
        
        if (micBaselineRef.current !== null) {
          audioLevel = Math.max(0, Math.min(100, ((average - micBaselineRef.current) / 128) * 100));
        }
        
        setSensorData(prev => {
          const newData = {
            ...prev,
            audioLevel: Math.round(audioLevel)
          };
          
          // Adaptive polling - throttle when quiet and still
          const isQuiet = audioLevel < 15;
          const isStill = prev.movement.pattern === 'still';
          const nextInterval = isQuiet && isStill ? 1500 : 500;
          
          // Clear existing timeout and schedule next update
          if (audioUpdateTimeoutRef.current) {
            clearTimeout(audioUpdateTimeoutRef.current);
          }
          audioUpdateTimeoutRef.current = setTimeout(updateAudioLevel, nextInterval);
          
          return newData;
        });
      };

      // Start first update
      updateAudioLevel();
      
      return () => {
        if (audioUpdateTimeoutRef.current) {
          clearTimeout(audioUpdateTimeoutRef.current);
        }
      };
    } catch (error) {
      console.error('Audio monitoring failed:', error);
    }
  }, [permissions.microphone]);

  // Movement pattern detection
  const startMotionMonitoring = useCallback(() => {
    if (!enabled || !permissions.motion) return;

    const motionData: number[] = [];
    const maxSamples = 20;

    const handleMotion = (event: DeviceMotionEvent) => {
      const { acceleration } = event;
      if (!acceleration) return;

      const magnitude = Math.sqrt(
        (acceleration.x || 0) ** 2 + 
        (acceleration.y || 0) ** 2 + 
        (acceleration.z || 0) ** 2
      );

      motionData.push(magnitude);
      if (motionData.length > maxSamples) {
        motionData.shift();
      }

      // Calculate movement metrics
      const average = motionData.reduce((a, b) => a + b) / motionData.length;
      const intensity = Math.min(100, average * 10);
      
      // Detect patterns based on variance and frequency
      const variance = motionData.reduce((sum, val) => sum + (val - average) ** 2, 0) / motionData.length;
      const frequency = variance > 2 ? (average > 1 ? 2.5 : 1.5) : 0.5;
      
      let pattern: SensorData['movement']['pattern'] = 'still';
      if (intensity > 15) {
        if (variance > 3 && frequency > 2) pattern = 'dancing';
        else if (intensity > 30) pattern = 'active';
        else pattern = 'walking';
      }

      setSensorData(prev => ({
        ...prev,
        movement: {
          intensity: Math.round(intensity),
          pattern,
          frequency: Math.round(frequency * 10) / 10
        }
      }));
    };

    motionListenerRef.current = handleMotion;
    window.addEventListener('devicemotion', handleMotion);

    return () => {
      if (motionListenerRef.current) {
        window.removeEventListener('devicemotion', motionListenerRef.current);
      }
    };
  }, [permissions.motion]);

  // Ambient light monitoring with web fallback
  const startLightMonitoring = useCallback(() => {
    if (!enabled) return;
    if ('AmbientLightSensor' in window) {
      try {
        // Experimental API
        const sensor = new (window as unknown as { AmbientLightSensor: new (options: { frequency: number }) => any }).AmbientLightSensor({ frequency: 1 });
        lightSensorRef.current = sensor;
        
        sensor.addEventListener('reading', () => {
          const lux = sensor.illuminance;
          const lightLevel = Math.min(100, Math.max(0, (lux / 400) * 100)); // Normalize to 0-100
          
          setSensorData(prev => ({
            ...prev,
            lightLevel: Math.round(lightLevel)
          }));
        });

        sensor.start();
        
        return () => {
          if (lightSensorRef.current) {
            lightSensorRef.current.stop();
          }
        };
      } catch (error) {
        console.log('Light sensor not available:', error);
      }
    } else {
      // Web fallback using CSS media query with compatibility
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const updateLightFromMedia = () => {
        // Dark mode suggests low light (30%), light mode suggests bright (70%)
        const lightLevel = mediaQuery.matches ? 30 : 70;
        setSensorData(prev => ({
          ...prev,
          lightLevel
        }));
      };
      
      updateLightFromMedia();
      
      // Handle older browser compatibility
      const addListener = mediaQuery.addEventListener || mediaQuery.addListener;
      const removeListener = mediaQuery.removeEventListener || mediaQuery.removeListener;
      
      if (addListener) {
        addListener.call(mediaQuery, 'change', updateLightFromMedia);
      }
      
      return () => {
        if (removeListener) {
          removeListener.call(mediaQuery, 'change', updateLightFromMedia);
        }
      };
    }
  }, []);

  // Record user feedback for learning
  const recordFeedback = useCallback(async (accepted: boolean, correctedVibe?: Vibe) => {
    if (!vibeDetection) return;

    const now = new Date();
    const hour = now.getHours();
    const getTimeOfDay = (hour: number) => {
      if (hour >= 0 && hour < 6) return 'late-night' as const;
      if (hour >= 6 && hour < 8) return 'early-morning' as const;
      if (hour >= 8 && hour < 12) return 'morning' as const;
      if (hour >= 12 && hour < 17) return 'afternoon' as const;
      if (hour >= 17 && hour < 21) return 'evening' as const;
      return 'night' as const;
    };
    
    const context = {
      timestamp: now,
      timeOfDay: getTimeOfDay(hour),
      dayOfWeek: now.getDay(),
      hourOfDay: hour,
      isWeekend: now.getDay() === 0 || now.getDay() === 6,
      locationHistory: sensorData.location ? [{
        context: sensorData.location.context,
        timestamp: now
      }] : []
    };

    try {
      if (accepted) {
        // Record as correct prediction
        await analysisEngineRef.current.recordUserFeedback(
          {
            suggestedVibe: vibeDetection.suggestedVibe,
            confidence: vibeDetection.confidence,
            reasoning: vibeDetection.reasoning,
            alternatives: vibeDetection.alternatives || [],
            contextFactors: vibeDetection.contextFactors || {
              temporal: 0.5,
              environmental: 0.5,
              personal: 0.5
            },
            sensorQuality: {
              audio: permissions.microphone ? 0.8 : 0,
              motion: permissions.motion ? 0.8 : 0,
              light: 0.6,
              location: sensorData.location ? 0.7 : 0,
              overall: 0.7
            },
            mlAnalysis: {} // Add missing required property
          },
          vibeDetection.suggestedVibe,
          context
        );
      } else if (correctedVibe) {
        // Record as correction
        await analysisEngineRef.current.recordUserFeedback(
          {
            suggestedVibe: vibeDetection.suggestedVibe,
            confidence: vibeDetection.confidence,
            reasoning: vibeDetection.reasoning,
            alternatives: vibeDetection.alternatives || [],
            contextFactors: vibeDetection.contextFactors || {
              temporal: 0.5,
              environmental: 0.5,
              personal: 0.5
            },
            sensorQuality: {
              audio: permissions.microphone ? 0.8 : 0,
              motion: permissions.motion ? 0.8 : 0,
              light: 0.6,
              location: sensorData.location ? 0.7 : 0,
              overall: 0.7
            },
            mlAnalysis: {} // Add missing required property
          },
          correctedVibe,
          context
        );
      }

      // Update learning data display
      const personalFactors = await learningSystemRef.current.getPersonalFactors(sensorData, context);
      const newLearningData = {
        patterns: personalFactors.contextualPatterns,
        preferences: personalFactors.vibePreferences,
        accuracy: personalFactors.accuracy,
        correctionCount: Math.round(personalFactors.relevance * 100) // Approximate correction count
      };
      
      setLearningData(newLearningData);
      
      // Persist learning data cache with schema versioning
      try {
        const versionedData = { schema: 1, data: newLearningData };
        await storage.setJSON('vibe_learning_v1', versionedData);
      } catch (error) {
        console.warn('Failed to cache learning data:', error);
      }
    } catch (error) {
      console.error('Failed to record feedback:', error);
    }
  }, [vibeDetection, sensorData]);

  // Load learning data on mount
  useEffect(() => {
    const loadLearningData = async () => {
      try {
        // Try to load cached data first with schema versioning
        const cachedData = await storage.getJSON<{schema: number, data: any} | any>('vibe_learning_v1');
        if (cachedData) {
          // Support both old format and new schema-versioned format
          setLearningData(cachedData.schema ? cachedData.data : cachedData);
        }
        
        const now = new Date();
        const hour = now.getHours();
        const getTimeOfDay = (hour: number) => {
          if (hour >= 0 && hour < 6) return 'late-night' as const;
          if (hour >= 6 && hour < 8) return 'early-morning' as const;
          if (hour >= 8 && hour < 12) return 'morning' as const;
          if (hour >= 12 && hour < 17) return 'afternoon' as const;
          if (hour >= 17 && hour < 21) return 'evening' as const;
          return 'night' as const;
        };
        
        const context = {
          timestamp: now,
          timeOfDay: getTimeOfDay(hour),
          dayOfWeek: now.getDay(),
          hourOfDay: hour,
          isWeekend: now.getDay() === 0 || now.getDay() === 6,
          locationHistory: sensorData.location ? [{
            context: sensorData.location.context,
            timestamp: now
          }] : []
        };
        
        const personalFactors = await learningSystemRef.current.getPersonalFactors(sensorData, context);
        const newLearningData = {
          patterns: personalFactors.contextualPatterns,
          preferences: personalFactors.vibePreferences,
          accuracy: personalFactors.accuracy,
          correctionCount: Math.round(personalFactors.relevance * 100)
        };
        
        setLearningData(newLearningData);
        
        // Update cache if we got new data with schema versioning
        const versionedData = { schema: 1, data: newLearningData };
        const currentCached = await storage.getJSON('vibe_learning_v1');
        if (!currentCached || JSON.stringify(versionedData) !== JSON.stringify(currentCached)) {
          await storage.setJSON('vibe_learning_v1', versionedData);
        }
      } catch (error) {
        console.error('Failed to load learning data:', error);
      }
    };

    loadLearningData();
  }, [sensorData.location]);

  // Enhanced vibe detection using analysis engine
  const detectVibe = useCallback(async (sensors: SensorData): Promise<VibeDetection> => {
    try {
      const analysisResult = await analysisEngineRef.current.analyzeVibe(sensors);
      
      return {
        suggestedVibe: analysisResult.suggestedVibe,
        confidence: analysisResult.confidence,
        reasoning: analysisResult.reasoning,
        sensors,
        alternatives: analysisResult.alternatives,
        contextFactors: analysisResult.contextFactors,
        learningBoost: analysisResult.learningBoost
      };
    } catch (error) {
      console.error('Vibe analysis failed, falling back to simple detection:', error);
      
      // Fallback to simplified detection
      return {
        suggestedVibe: 'chill',
        confidence: 0.3,
        reasoning: ['Using simplified detection due to analysis error'],
        sensors
      };
    }
  }, []);

  // Session management with 90-minute auto-expire
  useEffect(() => {
    if (!enabled || !sessionStartRef.current) return;
    
    const checkSessionExpiry = () => {
      if (sessionStartRef.current) {
        const elapsed = Date.now() - sessionStartRef.current.getTime();
        const ninetyMinutes = 90 * 60 * 1000;
        
        if (elapsed > ninetyMinutes) {
          console.log('Auto-vibe session expired after 90 minutes');
          // Reset session and stop auto-vibe
          sessionStartRef.current = null;
          // This would trigger parent component to call stopVibe() 
          setVibeDetection(null);
        }
      }
    };
    
    const sessionInterval = setInterval(checkSessionExpiry, 60000); // Check every minute
    return () => clearInterval(sessionInterval);
  }, [enabled]);

  // Update vibe detection when sensor data changes
  useEffect(() => {
    if (enabled && permissions.microphone) {
      detectVibe(sensorData).then(setVibeDetection);
    }
  }, [sensorData, enabled, permissions.microphone, detectVibe]);

  // Clear audio timeout when disabled
  useEffect(() => {
    if (!enabled && audioUpdateTimeoutRef.current) {
      clearTimeout(audioUpdateTimeoutRef.current);
      audioUpdateTimeoutRef.current = null;
    }
  }, [enabled]);

  // Start monitoring when enabled  
  useEffect(() => {
    const cleanups: (() => void)[] = [];

    const startMonitoring = async () => {
      if (!enabled) return; // ✅ Guard inside effect
      
      const perms = await requestPermissions();
      
      if (perms.microphone) {
        const audioCleanup = await startAudioMonitoring();
        if (audioCleanup) cleanups.push(audioCleanup);
      }
      
      if (perms.motion) {
        const motionCleanup = startMotionMonitoring();
        if (motionCleanup) cleanups.push(motionCleanup);
      }
      
      const lightCleanup = startLightMonitoring();
      if (lightCleanup) cleanups.push(lightCleanup);
    };

    startMonitoring();

    return () => {
      cleanups.forEach(cleanup => cleanup());
      
      // Cleanup audio resources
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [enabled, requestPermissions, startAudioMonitoring, startMotionMonitoring, startLightMonitoring]);

  return {
    sensorData,
    vibeDetection,
    permissions,
    requestPermissions,
    recordFeedback,
    learningData
  };
};