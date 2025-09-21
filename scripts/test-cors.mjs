const fetch = (...a) => import('node-fetch').then(({default: f}) => f(...a));

const ORIGIN = process.env.TEST_ORIGIN || 'https://localhost';
const BASE   = process.env.SUPABASE_FUNCTIONS_URL; // e.g. https://<ref>.supabase.co/functions/v1

async function preflight(path) {
  const url = `${BASE}/${path}`;
  const res = await fetch(url, {
    method: 'OPTIONS',
    headers: {
      Origin: ORIGIN,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'authorization, x-client-info, apikey, content-type, range, range-unit, accept-profile, prefer'
    }
  });
  console.log(path, res.status, res.headers.get('access-control-allow-headers'));
}

await preflight('clusters');
await preflight('social-forecast');
await preflight('get_weather');