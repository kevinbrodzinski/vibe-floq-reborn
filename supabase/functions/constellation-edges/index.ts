import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const okJson = (body: unknown, ttlSec = 60) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'content-type': 'application/json; charset=utf-8', 'cache-control': `public, max-age=${ttlSec}` }
  });

const bad = (msg: string, code = 400) =>
  new Response(JSON.stringify({ error: msg }), { status: code, headers: { ...corsHeaders, 'content-type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return bad('POST required', 405);

  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(url, anon, { global: { headers: { Authorization: req.headers.get('Authorization')! } } });

    const { windowDays = 30 } = await req.json();

    // Get real relationship data from database
    const { data: friendships, error: friendError } = await supabase
      .from('friendships')
      .select(`
        profile_low,
        profile_high,
        friend_state,
        created_at,
        responded_at
      `)
      .eq('friend_state', 'accepted');

    const { data: dmData, error: dmError } = await supabase
      .from('direct_messages')
      .select('profile_id, thread_id, created_at')
      .gte('created_at', new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString());

    const { data: planData, error: planError } = await supabase
      .from('plan_participants')
      .select('profile_id, plan_id, joined_at')
      .gte('joined_at', new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString());

    // Build relationship pairs with signals
    const pairMap = new Map<string, { 
      a: string; 
      b: string; 
      count: number; 
      last: number; 
      mutual: number; 
      coEvents: number; 
      replyFast: number;
    }>();

    // Add friendship pairs
    if (friendships && !friendError) {
      for (const f of friendships) {
        const key = `${f.profile_low}_${f.profile_high}`;
        pairMap.set(key, {
          a: f.profile_low,
          b: f.profile_high,
          count: 1,
          last: new Date(f.responded_at || f.created_at).getTime(),
          mutual: 1.0, // confirmed friends are mutual
          coEvents: 0,
          replyFast: 0.7 // assume decent reply speed for confirmed friends
        });
      }
    }

    // Add DM interaction counts
    if (dmData && !dmError) {
      const threadParticipants = new Map<string, Set<string>>();
      
      for (const dm of dmData) {
        if (!threadParticipants.has(dm.thread_id)) {
          // Get thread participants
          const { data: thread } = await supabase
            .from('direct_threads')
            .select('member_a_profile_id, member_b_profile_id')
            .eq('id', dm.thread_id)
            .single();
          
          if (thread) {
            threadParticipants.set(dm.thread_id, new Set([
              thread.member_a_profile_id,
              thread.member_b_profile_id
            ]));
          }
        }
        
        const participants = threadParticipants.get(dm.thread_id);
        if (participants && participants.size === 2) {
          const [a, b] = Array.from(participants).sort();
          const key = `${a}_${b}`;
          const existing = pairMap.get(key);
          const timestamp = new Date(dm.created_at).getTime();
          
          if (existing) {
            existing.count++;
            existing.last = Math.max(existing.last, timestamp);
          } else {
            pairMap.set(key, {
              a, b,
              count: 1,
              last: timestamp,
              mutual: 0.5, // DM indicates some mutual interest
              coEvents: 0,
              replyFast: 0.6
            });
          }
        }
      }
    }

    // Add plan co-participation
    if (planData && !planError) {
      const planParticipants = new Map<string, string[]>();
      
      for (const pp of planData) {
        if (!planParticipants.has(pp.plan_id)) {
          planParticipants.set(pp.plan_id, []);
        }
        planParticipants.get(pp.plan_id)!.push(pp.profile_id);
      }
      
      for (const [planId, participants] of planParticipants) {
        for (let i = 0; i < participants.length; i++) {
          for (let j = i + 1; j < participants.length; j++) {
            const [a, b] = [participants[i], participants[j]].sort();
            const key = `${a}_${b}`;
            const existing = pairMap.get(key);
            
            if (existing) {
              existing.coEvents++;
            } else {
              pairMap.set(key, {
                a, b,
                count: 1,
                last: Date.now() - 7 * 24 * 60 * 60 * 1000, // assume recent
                mutual: 0.3,
                coEvents: 1,
                replyFast: 0.5
              });
            }
          }
        }
      }
    }

    // Scoring functions
    function recencyDecay(days: number, halfLife = 21) {
      return Math.exp(-(days * Math.log(2)) / halfLife);
    }

    function scorePair(p: { count: number; last: number; mutual: number; coEvents: number; replyFast: number }) {
      const days = Math.max(0, (Date.now() - p.last) / 864e5);
      const rec = recencyDecay(days);                // 0..1 (fresh ties pop)
      const freq = Math.min(1, p.count / 10);        // 0..1 (10 events saturate)
      const mutual = p.mutual ?? 0;                  // 0..1 (close friend flag)
      const co = Math.min(1, (p.coEvents ?? 0) / 6); // 0..1 (shared plans)
      const reply = p.replyFast ?? 0;                // 0..1 (inverse latency)

      // weights: tune later
      const pattern = 0.30*freq + 0.25*mutual + 0.20*co + 0.15*reply + 0.10; // 0.10 for vibe/time overlap placeholder
      return Math.max(0.1, Math.min(1, rec * pattern));
    }

    // Convert to edges with real scoring
    const edges = Array.from(pairMap.values()).map(p => ({
      a: p.a,
      b: p.b,
      strength: scorePair(p),
      lastSync: new Date(p.last).toISOString()
    }));

    return okJson({ edges, ttlSec: 120 }, 120);
  } catch (e) {
    console.error('constellation-edges error:', e);
    return bad('Internal error', 500);
  }
});