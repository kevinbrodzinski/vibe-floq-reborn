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

const argv = yargs(hideBin(process.argv))
  .option('count', { type: 'number', default: 150 })
  .option('service-key', { type: 'string', demandOption: true })
  .argv as { count: number; serviceKey: string };

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  argv.serviceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

(async () => {
  console.log(`Creating ${argv.count} fake users...`);
  const tokens: string[] = [];
  
  for (let i = 0; i < argv.count; i++) {
    const email = `loadbot_${i}@floq.fake`;
    const password = 'loadbot123';
    
    try {
      // Create user
      const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          display_name: `LoadBot ${i}`,
          generated_for: 'load_testing'
        }
      });

      if (createError) {
        console.warn(`Failed to create user ${i}:`, createError.message);
        continue;
      }

      // Generate access token
      const { data: tokenData, error: tokenError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email,
      });

      if (tokenError || !tokenData.properties?.authentication_token) {
        console.warn(`Failed to generate token for user ${i}:`, tokenError?.message);
        continue;
      }

      tokens.push(tokenData.properties.authentication_token);
      
      if (i % 25 === 0) {
        console.log(`Created ${i + 1}/${argv.count} users...`);
      }
    } catch (error) {
      console.warn(`Error creating user ${i}:`, error);
    }
  }

  // Save tokens to file
  const tokensFile = 'scripts/loadbot-tokens.json';
  writeFileSync(tokensFile, JSON.stringify(tokens, null, 2));
  
  console.log(`✅ Created ${tokens.length} users with tokens saved to ${tokensFile}`);
  console.log('Now you can run: npx ts-node scripts/loadPresence.ts');
})();