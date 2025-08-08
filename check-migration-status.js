#!/usr/bin/env node

/**
 * P2P Migration Status Checker
 * 
 * This script checks if the P2P enhancement migrations have been applied
 * to your Supabase database by testing for the existence of key functions.
 */

const { createClient } = require('@supabase/supabase-js');

// You'll need to set these environment variables or update them here
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://reztyrrafsmlvvlqvsqt.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlenR5cnJhZnNtbHZ2bHF2c3F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYwOTQ4NzgsImV4cCI6MjA1MTY3MDg3OH0.FNsw9vKvBbPZlbDUo6Rh6WjZdPD2Hn4Lqj7wCWBJcAo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkMigrationStatus() {
  console.log('🔍 Checking P2P Migration Status...\n');

  const checks = [
    {
      name: 'create_or_get_thread',
      description: 'Thread creation function',
      test: async () => {
        const { error } = await supabase.rpc('create_or_get_thread', {
          p_user_a: '00000000-0000-0000-0000-000000000001',
          p_user_b: '00000000-0000-0000-0000-000000000002'
        });
        return error?.code !== 'PGRST202'; // Function exists if not "not found"
      }
    },
    {
      name: 'toggle_dm_reaction',
      description: 'Message reaction function',
      test: async () => {
        const { error } = await supabase.rpc('toggle_dm_reaction', {
          p_message_id: '00000000-0000-0000-0000-000000000001',
          p_profile_id: '00000000-0000-0000-0000-000000000001',
          p_emoji: '👍'
        });
        return error?.code !== 'PGRST202';
      }
    },
    {
      name: 'send_friend_request_with_rate_limit',
      description: 'Friend request function',
      test: async () => {
        const { error } = await supabase.rpc('send_friend_request_with_rate_limit', {
          p_requester_id: '00000000-0000-0000-0000-000000000001',
          p_target_id: '00000000-0000-0000-0000-000000000002'
        });
        return error?.code !== 'PGRST202';
      }
    },
    {
      name: 'search_direct_threads_enhanced',
      description: 'Thread search function',
      test: async () => {
        const { error } = await supabase.rpc('search_direct_threads_enhanced', {
          p_profile_id: '00000000-0000-0000-0000-000000000001',
          p_query: 'test',
          p_limit: 5
        });
        return error?.code !== 'PGRST202';
      }
    },
    {
      name: 'dm_message_reactions table',
      description: 'Message reactions table',
      test: async () => {
        const { error } = await supabase
          .from('dm_message_reactions')
          .select('*')
          .limit(1);
        return !error || error.code !== 'PGRST106'; // Table exists if not "not found"
      }
    },
    {
      name: 'v_dm_message_reactions_summary view',
      description: 'Reaction summary view',
      test: async () => {
        const { error } = await supabase
          .from('v_dm_message_reactions_summary')
          .select('*')
          .limit(1);
        return !error || error.code !== 'PGRST106';
      }
    }
  ];

  let allPassed = true;

  for (const check of checks) {
    try {
      const passed = await check.test();
      const status = passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${check.name} - ${check.description}`);
      if (!passed) allPassed = false;
    } catch (error) {
      console.log(`❌ FAIL ${check.name} - ${check.description} (Error: ${error.message})`);
      allPassed = false;
    }
  }

  console.log('\n' + '='.repeat(60));
  
  if (allPassed) {
    console.log('🎉 All P2P migrations have been applied successfully!');
    console.log('✅ Your database is ready for P2P features.');
  } else {
    console.log('⚠️  Some P2P migrations are missing.');
    console.log('\n📋 To apply migrations:');
    console.log('1. npx supabase db push --file supabase/migrations/20250106000002_safe_p2p_enhancements_step1.sql');
    console.log('2. npx supabase db push --file supabase/migrations/20250106000004_safe_p2p_enhancements_step2_fixed.sql');
    console.log('3. npx supabase db push --file supabase/migrations/20250106000005_fix_search_function_types.sql');
    console.log('\n🔄 Then run this script again to verify.');
  }
  
  console.log('='.repeat(60));
}

checkMigrationStatus().catch(console.error);