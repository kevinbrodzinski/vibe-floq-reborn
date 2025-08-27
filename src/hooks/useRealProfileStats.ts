
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUserId } from '@/hooks/useCurrentUser';

export interface RealProfileStats {
  friendCount: number;
  mutualCount: number;
  sharedFloqs: number;
  resonanceScore: number;
  totalFloqs: number;
  totalPlans: number;
  achievementCount: number;
  venuesVisited: number;
  averageVibeScore: number;
}

export const useRealProfileStats = (profileId: string | undefined) => {
  const currentUserId = useCurrentUserId();

  return useQuery({
    queryKey: ['real-profile-stats', profileId, currentUserId],
    queryFn: async (): Promise<RealProfileStats> => {
      if (!profileId) throw new Error('Profile ID is required');
      
      // Initialize stats
      let friendCount = 0;
      let mutualCount = 0;
      let sharedFloqs = 0;
      let totalFloqs = 0;
      let totalPlans = 0;
      let achievementCount = 0;
      let venuesVisited = 0;
      let averageVibeScore = 50;

      try {
        // 1. Get friend count
        const { count: friendsCount } = await supabase
          .from('friendships')
          .select('*', { count: 'exact', head: true })
          .or(`profile_low.eq.${profileId},profile_high.eq.${profileId}`)
          .eq('friend_state', 'accepted');
        
        friendCount = friendsCount || 0;

        // 2. Get mutual friends count (if viewing someone else's profile)
        if (currentUserId && currentUserId !== profileId) {
          // Get current user's friends
          const { data: myFriends } = await supabase
            .from('friendships')
            .select('profile_low, profile_high')
            .or(`profile_low.eq.${currentUserId},profile_high.eq.${currentUserId}`)
            .eq('friend_state', 'accepted');

          // Get target user's friends
          const { data: theirFriends } = await supabase
            .from('friendships')
            .select('profile_low, profile_high')
            .or(`profile_low.eq.${profileId},profile_high.eq.${profileId}`)
            .eq('friend_state', 'accepted');

          if (myFriends && theirFriends) {
            // Extract friend IDs for current user
            const myFriendIds = new Set(myFriends.map(f => 
              f.profile_low === currentUserId ? f.profile_high : f.profile_low
            ));

            // Extract friend IDs for target user
            const theirFriendIds = new Set(theirFriends.map(f => 
              f.profile_low === profileId ? f.profile_high : f.profile_low
            ));

            // Count mutual friends
            mutualCount = [...myFriendIds].filter(id => theirFriendIds.has(id)).length;
          }
        }

        // 3. Get floq/plan participation (fix table name)
        const { data: floqParticipation } = await supabase
          .from('floq_participants')
          .select('floq_id, role')
          .eq('profile_id', profileId);

        totalFloqs = floqParticipation?.length || 0;

        // Count shared floqs with current user
        if (currentUserId && currentUserId !== profileId && floqParticipation) {
          const { data: myFloqs } = await supabase
            .from('floq_participants')
            .select('floq_id')
            .eq('profile_id', currentUserId);

          if (myFloqs) {
            const myFlockIds = new Set(myFloqs.map((f) => f.floq_id));
            sharedFloqs = floqParticipation.filter((f) => myFlockIds.has(f.floq_id)).length;
          }
        }

        // 4. Get plan participation
        const { data: planParticipation } = await supabase
          .from('plan_participants')
          .select('plan_id')
          .eq('profile_id', profileId);

        totalPlans = planParticipation?.length || 0;

        // 5. Get achievement count
        const { count: achievementsCount } = await supabase
          .from('achievements')
          .select('*', { count: 'exact', head: true })
          .eq('profile_id', profileId);

        achievementCount = achievementsCount || 0;

        // 6. Get unique venues visited
        const { data: venueVisits } = await supabase
          .from('venue_live_presence')
          .select('venue_id')
          .eq('profile_id', profileId);

        if (venueVisits) {
          venuesVisited = new Set(venueVisits.map(v => v.venue_id)).size;
        }

        // 7. Calculate average vibe score from recent presence
        const { data: recentVibes } = await supabase
          .from('vibes_now')
          .select('vibe')
          .eq('profile_id', profileId)
          .order('updated_at', { ascending: false })
          .limit(10);

        if (recentVibes && recentVibes.length > 0) {
          // Basic vibe score mapping since vibe_score field doesn't exist
          const vibeScores = recentVibes.map((v) => {
            switch (v.vibe) {
              case 'hype': case 'energetic': case 'excited': return 80;
              case 'social': case 'open': return 70;
              case 'chill': case 'flowing': return 60;
              case 'solo': case 'focused': return 50;
              case 'down': case 'weird': return 40;
              default: return 50;
            }
          });
          averageVibeScore = vibeScores.reduce((sum, score) => sum + score, 0) / vibeScores.length;
        }

        // 8. Calculate resonance score based on interactions
        let resonanceScore = 50; // Base score

        if (currentUserId && currentUserId !== profileId) {
          // Check if they're friends (boosts resonance)
          const userLow = currentUserId < profileId ? currentUserId : profileId;
          const userHigh = currentUserId < profileId ? profileId : currentUserId;
          
          const { data: friendship } = await supabase
            .from('friendships')
            .select('*')
            .eq('profile_low', userLow)
            .eq('profile_high', userHigh)
            .eq('friend_state', 'accepted')
            .maybeSingle();

          if (friendship) {
            resonanceScore += 30; // Friend bonus

            // Add bonus for shared activities
            resonanceScore += Math.min(sharedFloqs * 5, 20); // Up to 20 points for shared floqs
            resonanceScore += Math.min(mutualCount * 2, 10); // Up to 10 points for mutual friends
          }

          // Check for recent interactions (messages, etc.)
          const userA = currentUserId < profileId ? currentUserId : profileId;
          const userB = currentUserId < profileId ? profileId : currentUserId;
          
          const { data: recentInteractions } = await supabase
            .from('flock_relationships')
            .select('last_interaction_at, interaction_count')
            .eq('user_a_id', userA)
            .eq('user_b_id', userB)
            .maybeSingle();

          if (recentInteractions?.last_interaction_at) {
            const daysSinceInteraction = (Date.now() - new Date(recentInteractions.last_interaction_at).getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceInteraction < 7) {
              resonanceScore += Math.max(0, 10 - daysSinceInteraction); // Recent interaction bonus
            }
          }
        }

        resonanceScore = Math.min(100, Math.max(0, resonanceScore)); // Clamp between 0-100

        return {
          friendCount,
          mutualCount,
          sharedFloqs,
          resonanceScore: Math.round(resonanceScore),
          totalFloqs,
          totalPlans,
          achievementCount,
          venuesVisited,
          averageVibeScore: Math.round(averageVibeScore)
        };

      } catch (error) {
        console.error('Error fetching real profile stats:', error);
        
        // Return basic stats on error
        return {
          friendCount: 0,
          mutualCount: 0,
          sharedFloqs: 0,
          resonanceScore: 50,
          totalFloqs: 0,
          totalPlans: 0,
          achievementCount: 0,
          venuesVisited: 0,
          averageVibeScore: 50
        };
      }
    },
    enabled: !!profileId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};