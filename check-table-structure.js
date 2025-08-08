#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://reztyrrafsmlvvlqvsqt.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlenR5cnJhZnNtbHZ2bHF2c3F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYwOTQ4NzgsImV4cCI6MjA1MTY3MDg3OH0.FNsw9vKvBbPZlbDUo6Rh6WjZdPD2Hn4Lqj7wCWBJcAo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkTableStructure() {
  console.log('🔍 Checking direct_threads table structure...\n');

  // Test 1: Basic table access
  console.log('1. Testing basic table access...');
  try {
    const { data, error } = await supabase
      .from('direct_threads')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log(`❌ Basic table access failed: ${error.message}`);
      console.log(`   Code: ${error.code}`);
      console.log(`   Details: ${error.details}`);
    } else {
      console.log('✅ Basic table access works');
      console.log(`   Found ${data?.length || 0} rows`);
    }
  } catch (error) {
    console.log(`❌ Basic table access error: ${error.message}`);
  }

  // Test 2: Foreign key relationship access
  console.log('\n2. Testing foreign key relationships...');
  try {
    const { data, error } = await supabase
      .from('direct_threads')
      .select(`
        *,
        member_a_profile:profiles!direct_threads_member_a_profile_id_fkey(display_name, username, avatar_url)
      `)
      .limit(1);
    
    if (error) {
      console.log(`❌ Foreign key relationship failed: ${error.message}`);
      console.log(`   Code: ${error.code}`);
      console.log(`   Details: ${error.details}`);
      console.log(`   Hint: ${error.hint}`);
    } else {
      console.log('✅ Foreign key relationships work');
    }
  } catch (error) {
    console.log(`❌ Foreign key relationship error: ${error.message}`);
  }

  // Test 3: Simple query without joins
  console.log('\n3. Testing simple query without joins...');
  try {
    const { data, error } = await supabase
      .from('direct_threads')
      .select('id, member_a_profile_id, member_b_profile_id, created_at')
      .limit(5);
    
    if (error) {
      console.log(`❌ Simple query failed: ${error.message}`);
    } else {
      console.log('✅ Simple query works');
      console.log(`   Columns: id, member_a_profile_id, member_b_profile_id, created_at`);
      console.log(`   Rows: ${data?.length || 0}`);
    }
  } catch (error) {
    console.log(`❌ Simple query error: ${error.message}`);
  }

  // Test 4: Check if profiles table exists
  console.log('\n4. Testing profiles table access...');
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url')
      .limit(1);
    
    if (error) {
      console.log(`❌ Profiles table access failed: ${error.message}`);
    } else {
      console.log('✅ Profiles table access works');
      console.log(`   Found ${data?.length || 0} profiles`);
    }
  } catch (error) {
    console.log(`❌ Profiles table error: ${error.message}`);
  }

  // Test 5: Manual join without foreign key names
  console.log('\n5. Testing manual join...');
  try {
    const { data, error } = await supabase
      .from('direct_threads')
      .select(`
        *,
        member_a_profile:profiles!inner(display_name, username, avatar_url)
      `)
      .eq('profiles.id', 'direct_threads.member_a_profile_id')
      .limit(1);
    
    if (error) {
      console.log(`❌ Manual join failed: ${error.message}`);
    } else {
      console.log('✅ Manual join works');
    }
  } catch (error) {
    console.log(`❌ Manual join error: ${error.message}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('💡 Diagnosis:');
  console.log('If basic table access works but foreign key relationships fail,');
  console.log('it means the foreign key constraints are missing or incorrectly named.');
  console.log('='.repeat(60));
}

checkTableStructure().catch(console.error);