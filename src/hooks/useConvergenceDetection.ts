import { useState, useEffect, useRef, useCallback } from 'react';
import { MultiAgentConvergenceCalculator, type Agent, type Venue, type ConvergenceResult } from '@/lib/convergence/MultiAgentConvergenceCalculator';
import { useSocialCache } from '@/hooks/useSocialCache';
import { eventBridge } from '@/services/eventBridge';
import type { EnhancedFriendHead } from '@/hooks/useSocialCache';

interface ConvergenceSettings {
  enabled: boolean;
  probabilityThreshold: number;
  maxPredictionTime: number;
  suppressionDuration: number;
  minNotificationInterval: number;
}

const DEFAULT_SETTINGS: ConvergenceSettings = {
  enabled: true,
  probabilityThreshold: 0.75,
  maxPredictionTime: 180, // 3 minutes
  suppressionDuration: 30000, // 30 seconds
  minNotificationInterval: 10000 // 10 seconds
};

export function useConvergenceDetection(venues: Venue[] = []) {
  const { friendHeads, myPath } = useSocialCache();
  const [activeConvergences, setActiveConvergences] = useState<ConvergenceResult[]>([]);
  const [settings] = useState<ConvergenceSettings>(DEFAULT_SETTINGS);
  
  const lastNotificationTime = useRef<number>(0);
  const suppressedConvergences = useRef<Map<string, number>>(new Map());
  const detectionInterval = useRef<NodeJS.Timeout>();

  // Convert social cache data to agents
  const getAgents = useCallback((): Agent[] => {
    const agents: Agent[] = [];

    // Add friends as agents if they have velocity data
    friendHeads.forEach((friend: EnhancedFriendHead) => {
      if (friend.velocity && friend.velocity.confidence > 0.3) {
        agents.push({
          id: friend.profile_id || `friend-${Math.random().toString(36).substr(2, 9)}`,
          position: [friend.lng, friend.lat],
          velocity: friend.velocity.velocity, // velocity field contains [lng/s, lat/s]
          confidence: friend.velocity.confidence,
          lastSeen: new Date(friend.t_head).getTime()
        });
      }
    });

    // Add self if we have a recent path (calculate velocity from path)
    if (myPath.length >= 2) {
      const recent = myPath.slice(-2);
      const latest = recent[1];
      const previous = recent[0];
      
      // Calculate velocity from path
      const dt = ((latest.t || Date.now()) - (previous.t || Date.now())) / 1000;
      if (dt > 0) {
        const vx = (latest.lng - previous.lng) / dt;
        const vy = (latest.lat - previous.lat) / dt;
        
        agents.push({
          id: 'self',
          position: [latest.lng, latest.lat],
          velocity: [vx, vy],
          confidence: 0.8, // High confidence for our own position
          lastSeen: latest.t || Date.now()
        });
      }
    }

    return agents;
  }, [friendHeads, myPath]);

  // Check if convergence should be suppressed
  const isConvergenceSuppressed = useCallback((convergence: ConvergenceResult): boolean => {
    const suppressionKey = convergence.agentIds.sort().join('-');
    const suppressedUntil = suppressedConvergences.current.get(suppressionKey);
    return suppressedUntil ? Date.now() < suppressedUntil : false;
  }, []);

  // Add convergence to suppression list
  const suppressConvergence = useCallback((convergence: ConvergenceResult): void => {
    const suppressionKey = convergence.agentIds.sort().join('-');
    suppressedConvergences.current.set(
      suppressionKey, 
      Date.now() + settings.suppressionDuration
    );
  }, [settings.suppressionDuration]);

  // Clean up expired suppressions
  const cleanupSuppressions = useCallback((): void => {
    const now = Date.now();
    for (const [key, expiry] of suppressedConvergences.current.entries()) {
      if (now > expiry) {
        suppressedConvergences.current.delete(key);
      }
    }
  }, []);

  // Detect convergences
  const detectConvergences = useCallback((): void => {
    if (!settings.enabled) return;

    const agents = getAgents();
    
    // Need at least 2 agents for convergence
    if (agents.length < 2) {
      setActiveConvergences([]);
      return;
    }

    const convergences = MultiAgentConvergenceCalculator.detectConvergences(
      agents,
      venues,
      settings.maxPredictionTime
    );

    // Filter by probability threshold and suppression
    const validConvergences = convergences.filter(convergence => 
      convergence.probability >= settings.probabilityThreshold &&
      !isConvergenceSuppressed(convergence)
    );

    // Check for new convergences to emit notifications
    const now = Date.now();
    if (now - lastNotificationTime.current >= settings.minNotificationInterval) {
      for (const convergence of validConvergences) {
        const existingMatch = activeConvergences.find(existing => 
          existing.agentIds.length === convergence.agentIds.length &&
          existing.agentIds.every(id => convergence.agentIds.includes(id))
        );

        // New convergence detected
        if (!existingMatch) {
          eventBridge.emit('CONVERGENCE_DETECTED', convergence);
          lastNotificationTime.current = now;
          break; // Only emit one notification at a time
        }
      }
    }

    setActiveConvergences(validConvergences);
    cleanupSuppressions();
  }, [
    settings, 
    getAgents, 
    venues, 
    isConvergenceSuppressed, 
    cleanupSuppressions, 
    activeConvergences
  ]);

  // Start/stop detection
  const startDetection = useCallback((): void => {
    if (detectionInterval.current) return;

    // Initial detection
    detectConvergences();

    // Set up periodic detection
    detectionInterval.current = setInterval(detectConvergences, 5000);
  }, [detectConvergences]);

  const stopDetection = useCallback((): void => {
    if (detectionInterval.current) {
      clearInterval(detectionInterval.current);
      detectionInterval.current = undefined;
    }
    setActiveConvergences([]);
  }, []);

  // Auto-start detection when friends are available
  useEffect(() => {
    const agents = getAgents();
    if (agents.length >= 2 && settings.enabled) {
      startDetection();
    } else {
      stopDetection();
    }

    return () => stopDetection();
  }, [getAgents, settings.enabled, startDetection, stopDetection]);

  // Listen for friend movement events
  useEffect(() => {
    const handleFriendMove = () => {
      // Trigger immediate detection on friend movement
      if (settings.enabled) {
        detectConvergences();
      }
    };

    eventBridge.on('FLOQ_FRIEND_MOVE', handleFriendMove);
    return () => {
      eventBridge.off('FLOQ_FRIEND_MOVE', handleFriendMove);
    };
  }, [detectConvergences, settings.enabled]);

  return {
    activeConvergences,
    isDetecting: !!detectionInterval.current,
    suppressConvergence,
    startDetection,
    stopDetection,
    // Statistics
    totalAgents: getAgents().length,
    detectionEnabled: settings.enabled
  };
}