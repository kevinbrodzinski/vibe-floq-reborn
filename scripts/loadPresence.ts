/**
 * Continuously spams upsert-presence from M simulated users.
 * Use for load / soak testing WS fan-out + PostGIS writes.
 *
 *   $ npx ts-node scripts/loadPresence.ts --count 150
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
  .option('count', { type: 'number', default: 50 })
  .argv as { count: number };

const DOWNTOWN = { lat: 34.05223, lng: -118.24368 };
const vibes = ['hype', 'chill', 'social', 'open', 'solo', 'curious'];

function jitter(v = 0.01) {
  return (Math.random() - 0.5) * v;
}

// Load pre-generated auth tokens
let tokens: string[] = [];
try {
  tokens = JSON.parse(readFileSync('scripts/loadbot-tokens.json', 'utf8'));
} catch (error) {
  console.error('❌ Failed to load tokens. Run createFakeUsers.ts first:', error);
  process.exit(1);
}

if (tokens.length < argv.count) {
  console.error(`❌ Only ${tokens.length} tokens available, but ${argv.count} requested. Run createFakeUsers.ts with --count ${argv.count}`);
  process.exit(1);
}

async function tick(jwt: string, uid: string) {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${jwt}`
        }
      }
    }
  );

  const { error } = await client.functions.invoke('upsert-presence', {
    body: {
      lat: DOWNTOWN.lat + jitter(),
      lng: DOWNTOWN.lng + jitter(),
      vibe: vibes[Math.floor(Math.random() * vibes.length)],
      venue_id: null,
    },
  });
  
  if (error) {
    console.error(`${uid}: ${error.message}`);
  } else {
    process.stdout.write('.');
  }
}

// Start load testing
console.log(`🚀 Spamming ${argv.count} fake users… Ctrl-C to stop`);
console.log('Each dot represents a successful presence update...\n');

for (let i = 0; i < argv.count; i++) {
  const jwt = tokens[i];
  const uid = `loadbot_${i}`;
  
  // Stagger initial starts to avoid thundering herd
  setTimeout(() => {
    setInterval(() => tick(jwt, uid), 8_000 + Math.random() * 4_000); // 8-12 s heartbeat
  }, i * 100); // 100ms spacing between starts
}

// Report progress every 30 seconds
setInterval(() => {
  console.log(`\n⏱️  Load test running with ${argv.count} bots...`);
}, 30_000);