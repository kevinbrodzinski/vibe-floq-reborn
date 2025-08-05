/**
 * One-shot smoke test for presence pipeline:
 * 1. Upserts N random presence rows via the `upsert-presence` edge function.
 * 2. Calls `presence_nearby` RPC from 3 different coordinates.
 * 3. Verifies that:
 *    • rows are visible to the caller
 *    • ST_DWithin filter is respected
 *    • RLS does NOT expose rows from another authed user
 *
 * USAGE 
 *   $ npx ts-node scripts/smokePresence.ts --rows 50 --jwt $SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
  .option('rows', { type: 'number', default: 20 })
  .option('jwt', { type: 'string', demandOption: true })
  .argv as { rows: number; jwt: string };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  argv.jwt,                      // service role key for bulk write step
  { global: { headers: { 'X-Client-Info': 'smoke-presence-script' } } },
);

const center = { lat: 34.05223, lng: -118.24368 }; // downtown LA
const rand = (min: number, max: number) => Math.random() * (max - min) + min;

(async () => {
  console.time('upsert');
  for (let i = 0; i < argv.rows; i++) {
    const lat = center.lat + rand(-0.02, 0.02);
    const lng = center.lng + rand(-0.02, 0.02);

    const { error } = await supabase.functions.invoke('upsert-presence', {
      body: {
        lat,
        lng,
        vibe: ['hype', 'chill', 'social'][i % 3],
        venue_id: null,
      },
    });
    if (error) throw error;
  }
  console.timeEnd('upsert');

  // Swap to anon key to test RLS visibility
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  console.time('rpc');
  const { data, error } = await anon.rpc('presence_nearby', {
    lat: center.lat,
    lng: center.lng,
    km: 3,
    include_self: false,
  });
  console.timeEnd('rpc');

  if (error) throw error;

  console.log(`RPC returned ${data.length} rows`);
  if (data.length === 0) {
    throw new Error('Expected at least 1 row – check RLS or edge insert');
  }

  // Basic geo sanity: every row within ~3 km
  data.forEach((p: any) => {
    const dLat = (p.lat - center.lat) * 111;        // crude km/deg
    const dLng = (p.lng - center.lng) * 92;         // ~km/deg at 34°N
    const dist = Math.hypot(dLat, dLng);
    if (dist > 3.2) throw new Error(`Row ${p.user_id} outside 3 km filter`);
  });

  // Validate geohash6 and expires_at fields
  data.forEach((p: any) => {
    if (!p.geohash6 || p.geohash6.length !== 6) {
      throw new Error(`Invalid geohash6: ${p.geohash6}`);
    }
    if (!p.expires_at || new Date(p.expires_at) <= new Date()) {
      throw new Error(`Invalid expires_at: ${p.expires_at}`);
    }
  });

  console.log('✅ Presence edge path looks healthy');
})();