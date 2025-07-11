import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BackfillStats {
  usersProcessed: number;
  friendsAchievementsAwarded: number;
  explorerAchievementsAwarded: number;
  socialVibeAchievementsAwarded: number;
  errors: number;
  processingTimeMs: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const stats: BackfillStats = {
    usersProcessed: 0,
    friendsAchievementsAwarded: 0,
    explorerAchievementsAwarded: 0,
    socialVibeAchievementsAwarded: 0,
    errors: 0,
    processingTimeMs: 0
  };

  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting achievement backfill process...');

    // Get all user profiles to process
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .not('id', 'is', null);

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    console.log(`Processing ${profiles.length} users for achievement backfill`);

    // Process in batches to avoid overwhelming the database
    const BATCH_SIZE = 50;
    for (let i = 0; i < profiles.length; i += BATCH_SIZE) {
      const batch = profiles.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (profile) => {
        try {
          await processUserAchievements(supabase, profile.id, stats);
          stats.usersProcessed++;
        } catch (error) {
          console.error(`Error processing user ${profile.id}:`, error);
          stats.errors++;
        }
      }));

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    stats.processingTimeMs = Date.now() - startTime;

    console.log('Achievement backfill completed:', stats);

    return new Response(
      JSON.stringify({ 
        success: true,
        stats,
        message: 'Achievement backfill completed successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Backfill error:', error);
    stats.processingTimeMs = Date.now() - startTime;
    
    return new Response(
      JSON.stringify({ 
        error: 'Backfill failed',
        stats,
        message: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processUserAchievements(
  supabase: any, 
  userId: string, 
  stats: BackfillStats
) {
  // 1. Check and award friend achievements
  const { data: friendCount } = await supabase
    .from('friendships')
    .select('friend_id', { count: 'exact' })
    .eq('user_id', userId);

  if (friendCount && friendCount.length > 0) {
    const { data: wasEarned } = await supabase.rpc('award_if_goal_met', {
      _user: userId,
      _code: 'first_friend',
      _increment: friendCount.length,
    });
    
    if (wasEarned) {
      stats.friendsAchievementsAwarded++;
    }
  }

  // 2. Check and award venue exploration achievements
  const { data: venueCheckins } = await supabase
    .from('vibes_log')
    .select('venue_id', { count: 'exact' })
    .eq('user_id', userId)
    .not('venue_id', 'is', null);

  if (venueCheckins && venueCheckins.length > 0) {
    // Count unique venues
    const uniqueVenues = new Set(venueCheckins.map(v => v.venue_id)).size;
    
    const { data: wasEarned } = await supabase.rpc('award_if_goal_met', {
      _user: userId,
      _code: 'explorer',
      _increment: uniqueVenues,
    });
    
    if (wasEarned) {
      stats.explorerAchievementsAwarded++;
    }
  }

  // 3. Check and award social vibe achievements
  const { data: socialVibes } = await supabase
    .from('vibes_log')
    .select('ts')
    .eq('user_id', userId)
    .eq('vibe', 'social')
    .order('ts', { ascending: true });

  if (socialVibes && socialVibes.length > 1) {
    // Calculate total time spent in social vibe
    // Assume each entry represents a 5-minute session (conservative estimate)
    const estimatedSocialSeconds = socialVibes.length * 300; // 5 minutes per entry
    
    const { data: wasEarned } = await supabase.rpc('award_if_goal_met', {
      _user: userId,
      _code: 'social_vibe_master',
      _increment: estimatedSocialSeconds,
    });
    
    if (wasEarned) {
      stats.socialVibeAchievementsAwarded++;
    }
  }
}