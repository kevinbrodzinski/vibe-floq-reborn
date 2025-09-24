// node >=18
const fetch = globalThis.fetch;

const ORIGIN = process.env.TEST_ORIGIN || 'https://localhost';
const BASE   = process.env.SUPABASE_FUNCTIONS_URL; // e.g. https://xxxx.supabase.co/functions/v1

if (!BASE) {
  console.error('Set SUPABASE_FUNCTIONS_URL, e.g. https://xyz.supabase.co/functions/v1');
  process.exit(1);
}

const paths = [
  'clusters',
  'social-forecast',
  'social-weather',
  'venue-favorites',
  'get-winds',
  'nearby_people',
];

async function preflight(path) {
  const url = `${BASE}/${path}`;
  const res = await fetch(url, {
    method: 'OPTIONS',
    headers: {
      Origin: ORIGIN,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers':
        'authorization, x-client-info, apikey, content-type, range, range-unit, accept-profile, prefer',
    },
  });
  const ok = res.status === 204;
  const allow = res.headers.get('access-control-allow-headers');
  const vary  = res.headers.get('vary');
  const expose = res.headers.get('access-control-expose-headers');
  console.log(`${ok ? '✅' : '❌'} ${path} ${res.status} allow=[${allow}] vary=[${vary}] expose=[${expose}]`);
  if (!ok) process.exitCode = 1;
}

console.log('Testing CORS preflight for edge functions...');
for (const p of paths) await preflight(p);
console.log(process.exitCode ? '\n❌ Some functions failed preflight' : '\n✅ All functions passed preflight');