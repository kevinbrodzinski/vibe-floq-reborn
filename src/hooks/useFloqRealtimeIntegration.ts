import { useMemo } from 'react';
import { useEnhancedFloqRealtime } from './useEnhancedFloqRealtime';
import { useVibeMatchingEngine } from './useVibeMatchingEngine';
import { useSocialGraphIntegration } from './useSocialGraphIntegration';
import type { HubItem } from './useFloqsHubData';

interface RealtimeEnhancedFloq extends HubItem {
  realtime_data?: ReturnType<typeof useEnhancedFloqRealtime>['realtimeData'];
  live_vibe_analysis?: {
    dominant_vibe: string;
    energy_level: number;
    member_harmony: number;
    social_proof_score: number;
  };
  connection_quality?: 'excellent' | 'good' | 'fair' | 'poor';
}

export function useFloqRealtimeIntegration(floqId: string, floqData?: HubItem) {
  const realtimeHook = useEnhancedFloqRealtime(floqId);
  const vibeEngine = useVibeMatchingEngine();
  const socialGraph = useSocialGraphIntegration();

  const enhancedFloq = useMemo((): RealtimeEnhancedFloq | null => {
    if (!floqData) return null;

    const { realtimeData, connectionQuality } = realtimeHook;

    // Analyze live group vibe dynamics
    const memberVibes = realtimeData.member_profiles
      .map(p => p.current_vibe)
      .filter(Boolean);

    const vibeAnalysis = memberVibes.length > 0 
      ? vibeEngine.analyzeGroupVibes(memberVibes)
      : null;

    return {
      ...floqData,
      realtime_data: realtimeData,
      live_vibe_analysis: vibeAnalysis ? {
        dominant_vibe: vibeAnalysis.dominant_vibe,
        energy_level: vibeAnalysis.average_energy,
        member_harmony: vibeAnalysis.harmony_score,
        social_proof_score: 0.5 // TODO: Calculate based on social graph
      } : undefined,
      connection_quality: connectionQuality,
      
      // Override static counts with live data
      participants: realtimeData.member_count || floqData.participants,
    };
  }, [floqData, realtimeHook, vibeEngine]);

  const getLiveUpdates = () => realtimeHook.getRecentActivity();
  
  const getMemberProfiles = () => realtimeHook.realtimeData.member_profiles;

  const isFloqAlive = () => {
    const recentActivity = realtimeHook.getRecentActivity();
    const hasRecentActivity = recentActivity.some(activity => 
      Date.now() - new Date(activity.timestamp).getTime() < 5 * 60 * 1000 // 5 minutes
    );
    
    return realtimeHook.isConnected && 
           (realtimeHook.realtimeData.member_count > 0 || hasRecentActivity);
  };

  const getVibeInsight = () => {
    if (!enhancedFloq?.live_vibe_analysis) return null;
    
    const { dominant_vibe, energy_level, member_harmony } = enhancedFloq.live_vibe_analysis;
    
    if (member_harmony > 0.8) {
      return { type: 'positive', message: `Great ${dominant_vibe} energy flowing` };
    } else if (member_harmony < 0.4) {
      return { type: 'mixed', message: 'Diverse vibes mixing' };
    } else {
      return { type: 'neutral', message: `${dominant_vibe} mood with ${Math.round(energy_level * 100)}% energy` };
    }
  };

  return {
    enhancedFloq,
    
    // Real-time status
    isConnected: realtimeHook.isConnected,
    isReconnecting: realtimeHook.isReconnecting,
    connectionQuality: realtimeHook.connectionQuality,
    
    // Live data access
    getLiveUpdates,
    getMemberProfiles,
    isFloqAlive,
    getVibeInsight,
    
    // Performance metrics
    getPerformanceMetrics: realtimeHook.getPerformanceMetrics,
    stats: realtimeHook.stats,
    
    // Utility functions
    isUserInFloq: (profileId: string) => 
      realtimeHook.realtimeData.member_profiles.some(m => m.profile_id === profileId),
    getUserStatus: (profileId: string) => 
      realtimeHook.getMemberProfile(profileId)?.online_status || 'offline'
  };
}