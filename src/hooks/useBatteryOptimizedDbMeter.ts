import { useState, useEffect, useRef, useCallback } from 'react';
import { useVibe } from '@/lib/store/useVibe';

interface DbReading {
  level: number; // dB level
  timestamp: number;
  confidence: number;
}

interface DbMeterState {
  isActive: boolean;
  currentLevel: number;
  averageLevel: number;
  isListening: boolean;
  lastReading: DbReading | null;
  batteryOptimized: boolean;
}

export const useBatteryOptimizedDbMeter = (pulseInterval: number = 30000) => {
  const { vibe: currentVibe } = useVibe();
  const [dbState, setDbState] = useState<DbMeterState>({
    isActive: false,
    currentLevel: 0,
    averageLevel: 0,
    isListening: false,
    lastReading: null,
    batteryOptimized: true
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const pulseTimerRef = useRef<number | null>(null);
  const readingsRef = useRef<DbReading[]>([]);

  // Calculate dB level from frequency data
  const calculateDbLevel = useCallback((dataArray: Uint8Array): number => {
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const average = sum / dataArray.length;
    
    // Convert to dB (approximate)
    const db = 20 * Math.log10(average / 255) + 90;
    return Math.max(0, Math.min(120, db));
  }, []);

  // Get average dB from recent readings
  const getAverageDb = useCallback((readings: DbReading[]): number => {
    if (readings.length === 0) return 0;
    const sum = readings.reduce((acc, reading) => acc + reading.level, 0);
    return sum / readings.length;
  }, []);

  // Start listening to microphone
  const startListening = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('Microphone access not supported');
        return false;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
      microphoneRef.current.connect(analyserRef.current);
      
      dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
      
      setDbState(prev => ({ ...prev, isListening: true }));
      return true;
    } catch (error) {
      console.error('Failed to access microphone:', error);
      return false;
    }
  }, []);

  // Stop listening
  const stopListening = useCallback(() => {
    if (microphoneRef.current) {
      microphoneRef.current.disconnect();
      microphoneRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    dataArrayRef.current = null;
    
    setDbState(prev => ({ ...prev, isListening: false }));
  }, []);

  // Take a single dB reading
  const takeReading = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current) return;

    analyserRef.current.getByteFrequencyData(dataArrayRef.current as unknown as Uint8Array);
    const dbLevel = calculateDbLevel(dataArrayRef.current as unknown as Uint8Array);
    
    const reading: DbReading = {
      level: dbLevel,
      timestamp: Date.now(),
      confidence: 0.8 // High confidence for direct measurement
    };

    readingsRef.current.push(reading);
    
    // Keep only last 10 readings
    if (readingsRef.current.length > 10) {
      readingsRef.current.shift();
    }

    const averageLevel = getAverageDb(readingsRef.current);
    
    setDbState(prev => ({
      ...prev,
      currentLevel: dbLevel,
      averageLevel,
      lastReading: reading
    }));

    return reading;
  }, [calculateDbLevel, getAverageDb]);

  // Start battery-optimized pulsing
  const startPulsing = useCallback(() => {
    if (pulseTimerRef.current) {
      clearInterval(pulseTimerRef.current);
    }

    // Take initial reading
    takeReading();

    // Set up pulsing interval
    pulseTimerRef.current = window.setInterval(() => {
      takeReading();
    }, pulseInterval);

    setDbState(prev => ({ ...prev, isActive: true, batteryOptimized: true }));
  }, [pulseInterval, takeReading]);

  // Stop pulsing
  const stopPulsing = useCallback(() => {
    if (pulseTimerRef.current) {
      window.clearInterval(pulseTimerRef.current);
      pulseTimerRef.current = null;
    }
    setDbState(prev => ({ ...prev, isActive: false }));
  }, []);

  // Get vibe influence from dB level
  const getVibeInfluence = useCallback((dbLevel: number): string => {
    if (dbLevel < 30) return 'very quiet';
    if (dbLevel < 50) return 'quiet';
    if (dbLevel < 70) return 'moderate';
    if (dbLevel < 90) return 'loud';
    return 'very loud';
  }, []);

  // Determine if vibe should change based on dB
  const shouldChangeVibeFromDb = useCallback((dbLevel: number, currentVibe: string): boolean => {
    const influence = getVibeInfluence(dbLevel);
    
    // Only change vibe if there's a significant mismatch
    switch (influence) {
      case 'very quiet':
        return !['chill', 'solo'].includes(currentVibe);
      case 'quiet':
        return !['chill', 'solo', 'open'].includes(currentVibe);
      case 'moderate':
        return !['open', 'social', 'flowing'].includes(currentVibe);
      case 'loud':
        return !['social', 'hype', 'weird'].includes(currentVibe);
      case 'very loud':
        return !['hype', 'weird'].includes(currentVibe);
      default:
        return false;
    }
  }, [getVibeInfluence]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
      stopPulsing();
    };
  }, [stopListening, stopPulsing]);

  return {
    // State
    dbState,
    
    // Controls
    startListening,
    stopListening,
    startPulsing,
    stopPulsing,
    takeReading,
    
    // Utilities
    getVibeInfluence: () => getVibeInfluence(dbState.currentLevel),
    shouldChangeVibeFromDb: () => shouldChangeVibeFromDb(dbState.currentLevel, currentVibe),
    
    // Data
    currentLevel: dbState.currentLevel,
    averageLevel: dbState.averageLevel,
    isListening: dbState.isListening,
    isActive: dbState.isActive,
    batteryOptimized: dbState.batteryOptimized
  };
}; 