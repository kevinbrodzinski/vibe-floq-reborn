import { useState, useEffect, useRef, useCallback } from 'react';
import type { Vibe } from '@/utils/vibe';

interface SensorData {
  audioLevel: number; // 0-100
  lightLevel: number; // 0-100  
  movement: {
    intensity: number; // 0-100
    pattern: 'still' | 'walking' | 'dancing' | 'active';
    frequency: number; // Hz
  };
  location: {
    context: 'indoor' | 'outdoor' | 'venue' | 'transport' | 'unknown';
    density: number; // people/km²
  };
}

interface VibeDetection {
  suggestedVibe: Vibe;
  confidence: number; // 0-1
  reasoning: string[];
  sensors: SensorData;
}

interface SensorPermissions {
  microphone: boolean;
  motion: boolean;
  location: boolean;
}

export const useSensorMonitoring = (enabled: boolean = false) => {
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

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const motionListenerRef = useRef<((event: DeviceMotionEvent) => void) | null>(null);
  const lightSensorRef = useRef<any>(null);
  const audioUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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
          autoGainControl: false
        }
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

    // Location permission handled by useGeolocation
    newPermissions.location = true;

    setPermissions(newPermissions);
    return newPermissions;
  }, [permissions]);

  // Audio level monitoring with adaptive throttling
  const startAudioMonitoring = useCallback(async () => {
    if (!permissions.microphone || !streamRef.current) return;

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
        
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        let audioLevel = Math.min(100, (average / 255) * 100);
        
        // Calibrate against baseline if available
        if (micBaselineRef.current === null && audioLevel > 5) {
          micBaselineRef.current = average;
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
    if (!permissions.motion) return;

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
    if ('AmbientLightSensor' in window) {
      try {
        // @ts-ignore - Experimental API
        const sensor = new (window as any).AmbientLightSensor({ frequency: 1 });
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
        
        return () => sensor.stop();
      } catch (error) {
        console.log('Light sensor not available:', error);
      }
    } else {
      // Web fallback using CSS media query
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
      mediaQuery.addEventListener('change', updateLightFromMedia);
      
      return () => mediaQuery.removeEventListener('change', updateLightFromMedia);
    }
  }, []);

  // Vibe detection algorithm
  const detectVibe = useCallback((sensors: SensorData): VibeDetection => {
    const reasoning: string[] = [];
    let suggestedVibe: Vibe = 'chill';
    let confidence = 0;

    const { audioLevel, lightLevel, movement, location } = sensors;

    // Audio-based detection
    if (audioLevel > 70) {
      reasoning.push('High audio level detected');
      confidence += 0.3;
      if (movement.pattern === 'dancing') {
        suggestedVibe = 'hype';
        reasoning.push('Dancing motion with loud music');
        confidence += 0.4;
      } else {
        suggestedVibe = 'social';
        reasoning.push('Loud environment suggests social setting');
        confidence += 0.2;
      }
    } else if (audioLevel < 20) {
      reasoning.push('Quiet environment detected');
      confidence += 0.2;
      suggestedVibe = movement.intensity > 20 ? 'solo' : 'chill';
      reasoning.push(`Low activity suggests ${suggestedVibe} vibe`);
      confidence += 0.2;
    }

    // Light-based detection
    if (lightLevel < 30) {
      reasoning.push('Low light environment');
      confidence += 0.1;
      if (audioLevel > 50) {
        suggestedVibe = 'romantic';
        reasoning.push('Dim lighting with music suggests intimate setting');
        confidence += 0.3;
      }
    } else if (lightLevel > 80) {
      reasoning.push('Bright environment detected');
      if (movement.intensity > 40) {
        suggestedVibe = 'open';
        reasoning.push('Bright and active environment');
        confidence += 0.2;
      }
    }

    // Movement-based detection
    if (movement.pattern === 'dancing') {
      suggestedVibe = 'hype';
      reasoning.push('Dancing motion detected');
      confidence += 0.4;
    } else if (movement.pattern === 'walking' && movement.intensity > 30) {
      suggestedVibe = 'flowing';
      reasoning.push('Active movement pattern');
      confidence += 0.3;
    } else if (movement.pattern === 'still') {
      if (audioLevel < 30 && lightLevel < 50) {
        suggestedVibe = 'down';
        reasoning.push('Still and quiet environment');
        confidence += 0.3;
      }
    }

    // Weird detection (unusual combinations)
    if ((audioLevel > 60 && movement.pattern === 'still') || 
        (lightLevel < 20 && movement.pattern === 'dancing' && audioLevel < 40)) {
      suggestedVibe = 'weird';
      reasoning.push('Unusual sensor combination detected');
      confidence += 0.2;
    }

    // Ensure confidence is between 0-1
    confidence = Math.min(1, Math.max(0, confidence));

    return {
      suggestedVibe,
      confidence,
      reasoning,
      sensors
    };
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
          // Reset session - this would typically trigger a parent component update
          sessionStartRef.current = null;
        }
      }
    };
    
    const sessionInterval = setInterval(checkSessionExpiry, 60000); // Check every minute
    return () => clearInterval(sessionInterval);
  }, [enabled]);

  // Update vibe detection when sensor data changes
  useEffect(() => {
    if (enabled && permissions.microphone) {
      const detection = detectVibe(sensorData);
      setVibeDetection(detection);
    }
  }, [sensorData, enabled, permissions.microphone, detectVibe]);

  // Start monitoring when enabled
  useEffect(() => {
    if (!enabled) return;

    let cleanups: (() => void)[] = [];

    const startMonitoring = async () => {
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
    enabled
  };
};