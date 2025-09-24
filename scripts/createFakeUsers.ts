/**
 * Creates N fake users for load testing with proper auth tokens
 * Run this once before using loadPresence.ts
 * 
 * USAGE:
 *   $ npx ts-node scripts/createFakeUsers.ts --count 150 --service-key $SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { writeFileSync } from 'fs';

// Demo users for testing the profile functionality
const demoUsers = [
  {
    id: 'demo-user-1',
    username: 'danii',
    display_name: 'Dani Rodriguez',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=danii',
    bio: 'Always down for a good vibe! 🌟'
  },
  {
    id: 'demo-user-2', 
    username: 'alex_chen',
    display_name: 'Alex Chen',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex',
    bio: 'Exploring the city one floq at a time 🗺️'
  },
  {
    id: 'demo-user-3',
    username: 'jordan_smith',
    display_name: 'Jordan Smith',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jordan',
    bio: 'Music lover and social butterfly 🎵'
  },
  {
    id: 'demo-user-4',
    username: 'casey_williams',
    display_name: 'Casey Williams',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=casey',
    bio: 'Adventure seeker and coffee enthusiast ☕'
  },
  {
    id: 'demo-user-5',
    username: 'morgan_davis',
    display_name: 'Morgan Davis',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=morgan',
    bio: 'Creative soul finding inspiration everywhere ✨'
  }
];

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createDemoUsers() {
  console.log('🚀 Creating demo users...');
  
  for (const user of demoUsers) {
    try {
      // Insert into profiles table
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          username: user.username,
          display_name: user.display_name,
          avatar_url: user.avatar_url,
          bio: user.bio,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (error) {
        console.error(`❌ Error creating user ${user.username}:`, error);
      } else {
        console.log(`✅ Created user: ${user.username} (${user.display_name})`);
      }
    } catch (error) {
      console.error(`❌ Failed to create user ${user.username}:`, error);
    }
  }
  
  console.log('🎉 Demo users creation completed!');
  console.log('\n📋 Available demo usernames:');
  demoUsers.forEach(user => {
    console.log(`  - @${user.username} (${user.display_name})`);
  });
  console.log('\n🔗 Test URLs:');
  demoUsers.forEach(user => {
    console.log(`  - http://localhost:3000/u/${user.username}`);
  });
}

// Run the script
createDemoUsers().catch(console.error);