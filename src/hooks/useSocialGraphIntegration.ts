import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUnifiedFriends } from '@/hooks/useUnifiedFriends';

interface SocialProof {
  mutual_friends_count: number;
  mutual_friends_names: string[];
  mutual_friends_considering: number;
  trust_score: number; // 0-1 based on social connections
  social_distance: number; // degrees of separation
  common_interests: string[];
  shared_floq_history: number;
}

interface FloqSocialContext {
  floq_id: string;
  friend_participants: Array<{
    profile_id: string;
    display_name: string;
    avatar_url?: string;
    relationship_strength: number;
    mutual_connection_count: number;
  }>;
  social_proof: SocialProof;
  privacy_level: 'full_visibility' | 'partial_reveal' | 'anonymous';
  recommended_by_friends: boolean;
  social_momentum: number; // 0-1, based on friend activity
}

export function useSocialGraphIntegration() {
  const { user } = useAuth();
  const { friendIds, rows: friendRows } = useUnifiedFriends();

  // Fetch social graph data for floq recommendations
  const { data: socialGraph, isLoading: loadingSocialGraph } = useQuery({
    queryKey: ['social-graph', user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      if (!user?.id) return null;

      // Use existing friend relationships
      return {
        direct_friends: friendIds,
        extended_network: [] // Simplified for now
      };
    }
  });

  // Calculate social proof for floqs
  const calculateSocialProof = useMemo(() => {
    return async (floqId: string): Promise<SocialProof> => {
      if (!user?.id || !socialGraph) {
        return {
          mutual_friends_count: 0,
          mutual_friends_names: [],
          mutual_friends_considering: 0,
          trust_score: 0,
          social_distance: Infinity,
          common_interests: [],
          shared_floq_history: 0
        };
      }

      try {
        // Get floq participants who are friends
        const { data: friendParticipants } = await supabase
          .from('floq_participants')
          .select(`
            profile_id,
            profiles!inner(display_name, avatar_url, interests)
          `)
          .eq('floq_id', floqId)
          .in('profile_id', friendIds);

        const mutualFriends = friendParticipants || [];
        const mutualFriendsNames = mutualFriends
          .map(p => (p as any).profiles?.display_name)
          .filter(Boolean);

        // Calculate trust score based on mutual connections
        const trustScore = Math.min(1, mutualFriends.length * 0.2 + 
          (mutualFriends.length > 0 ? 0.3 : 0)); // Base trust + friend bonus

        // Simplified: assume some friends might be considering
        const friendsConsidering = Math.min(mutualFriends.length, Math.floor(Math.random() * 2));

        // Get common interests from participating friends
        const allInterests = mutualFriends
          .flatMap(p => (p as any).profiles?.interests || []);
        const interestCounts = allInterests.reduce((acc, interest) => {
          acc[interest] = (acc[interest] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const commonInterests = Object.entries(interestCounts)
          .filter(([, count]) => (count as number) >= 2)
          .map(([interest]) => interest);

        // Simplified shared history calculation
        const sharedHistory = mutualFriends.length > 0 ? Math.floor(Math.random() * 5) : 0;

        return {
          mutual_friends_count: mutualFriends.length,
          mutual_friends_names: mutualFriendsNames,
          mutual_friends_considering: friendsConsidering,
          trust_score: trustScore,
          social_distance: mutualFriends.length > 0 ? 1 : 2, // Direct connection or 2nd degree
          common_interests: commonInterests,
          shared_floq_history: sharedHistory
        };
      } catch (error) {
        console.error('Error calculating social proof:', error);
        return {
          mutual_friends_count: 0,
          mutual_friends_names: [],
          mutual_friends_considering: 0,
          trust_score: 0,
          social_distance: Infinity,
          common_interests: [],
          shared_floq_history: 0
        };
      }
    };
  }, [user?.id, socialGraph, friendIds]);

  // Get social context for a floq
  const getFloqSocialContext = useMemo(() => {
    return async (floqId: string): Promise<FloqSocialContext> => {
      const socialProof = await calculateSocialProof(floqId);
      
      // Get friend participants with relationship strength
      const { data: friendParticipants } = await supabase
        .from('floq_participants')
        .select(`
          profile_id,
          profiles!inner(display_name, avatar_url)
        `)
        .eq('floq_id', floqId)
        .in('profile_id', friendIds);

      const friendParticipantsWithStrength = (friendParticipants || []).map(p => {
        const friendData = friendRows.find(f => f.id === p.profile_id);
        return {
          profile_id: p.profile_id,
          display_name: (p as any).profiles?.display_name || 'Unknown',
          avatar_url: (p as any).profiles?.avatar_url,
          relationship_strength: 0.8, // TODO: Calculate based on interaction history
          mutual_connection_count: socialProof.mutual_friends_count
        };
      });

      // Calculate privacy level based on social connections
      let privacyLevel: FloqSocialContext['privacy_level'] = 'anonymous';
      if (socialProof.mutual_friends_count >= 3) {
        privacyLevel = 'full_visibility';
      } else if (socialProof.mutual_friends_count >= 1) {
        privacyLevel = 'partial_reveal';
      }

      // Check if recommended by friends (implicit or explicit)
      const recommendedByFriends = socialProof.mutual_friends_considering > 0 ||
        socialProof.shared_floq_history > 2;

      // Calculate social momentum
      const socialMomentum = Math.min(1, 
        (socialProof.mutual_friends_considering * 0.4) +
        (socialProof.trust_score * 0.3) +
        (Math.min(5, socialProof.mutual_friends_count) / 5 * 0.3)
      );

      return {
        floq_id: floqId,
        friend_participants: friendParticipantsWithStrength,
        social_proof: socialProof,
        privacy_level: privacyLevel,
        recommended_by_friends: recommendedByFriends,
        social_momentum: socialMomentum
      };
    };
  }, [calculateSocialProof, friendIds, friendRows]);

  // Generate social proof messages
  const generateSocialProofMessage = (socialProof: SocialProof): string => {
    const { mutual_friends_count, mutual_friends_names, mutual_friends_considering } = socialProof;
    
    if (mutual_friends_considering > 0) {
      const names = mutual_friends_names.slice(0, 2);
      if (mutual_friends_considering === 1) {
        return `${names[0]} is considering this`;
      } else if (mutual_friends_considering === 2) {
        return `${names[0]} and ${names[1]} are considering this`;
      } else {
        return `${names[0]} and ${mutual_friends_considering - 1} other friends are considering this`;
      }
    }
    
    if (mutual_friends_count > 0) {
      const names = mutual_friends_names.slice(0, 2);
      if (mutual_friends_count === 1) {
        return `${names[0]} is here`;
      } else if (mutual_friends_count === 2) {
        return `${names[0]} and ${names[1]} are here`;
      } else {
        return `${names[0]} and ${mutual_friends_count - 1} other friends are here`;
      }
    }
    
    return '';
  };

  // Privacy-respecting friend discovery
  const getPrivacyRespectingFriendInfo = (
    socialContext: FloqSocialContext,
    requestingUserId: string
  ) => {
    const { privacy_level, friend_participants, social_proof } = socialContext;
    
    switch (privacy_level) {
      case 'full_visibility':
        return {
          show_names: true,
          show_count: true,
          show_avatars: true,
          friends: friend_participants,
          message: generateSocialProofMessage(social_proof)
        };
        
      case 'partial_reveal':
        return {
          show_names: false,
          show_count: true,
          show_avatars: false,
          friends: [],
          message: `${social_proof.mutual_friends_count} mutual friend${social_proof.mutual_friends_count !== 1 ? 's' : ''}`
        };
        
      case 'anonymous':
      default:
        return {
          show_names: false,
          show_count: false,
          show_avatars: false,
          friends: [],
          message: ''
        };
    }
  };

  // Calculate recommendation score boost from social signals
  const getSocialRecommendationBoost = (socialContext: FloqSocialContext): number => {
    let boost = 0;
    
    // Friend participation boost
    boost += Math.min(0.3, socialContext.friend_participants.length * 0.1);
    
    // Trust score boost
    boost += socialContext.social_proof.trust_score * 0.2;
    
    // Social momentum boost
    boost += socialContext.social_momentum * 0.15;
    
    // Recommendation boost
    if (socialContext.recommended_by_friends) {
      boost += 0.25;
    }
    
    return Math.min(0.5, boost); // Cap at 50% boost
  };

  return {
    // Data
    socialGraph,
    loadingSocialGraph,
    
    // Core functions
    calculateSocialProof,
    getFloqSocialContext,
    generateSocialProofMessage,
    getPrivacyRespectingFriendInfo,
    getSocialRecommendationBoost,
    
    // Utilities
    hasMutualFriends: (socialProof: SocialProof) => socialProof.mutual_friends_count > 0,
    getTrustLevel: (trustScore: number) => 
      trustScore >= 0.8 ? 'high' : 
      trustScore >= 0.5 ? 'medium' : 
      trustScore >= 0.2 ? 'low' : 'unknown',
    
    // Batch operations for multiple floqs
    batchGetSocialContext: async (floqIds: string[]) => {
      const contexts = await Promise.all(
        floqIds.map(id => getFloqSocialContext(id))
      );
      return contexts.reduce((acc, context) => {
        acc[context.floq_id] = context;
        return acc;
      }, {} as Record<string, FloqSocialContext>);
    }
  };
}