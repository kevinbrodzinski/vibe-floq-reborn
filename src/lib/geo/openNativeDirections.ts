// Enhanced directions with surgical polish for Flow Reflection system
export type NavMode = 'walking' | 'driving' | 'transit' | 'bicycling';
export type LatLng = { lat: number; lng: number };

// Robust platform detection
const isIOS =
  typeof navigator !== 'undefined' &&
  /iPad|iPhone|iPod/.test(navigator.userAgent) &&
  // iPad on iOS 13+ may masquerade as Mac
  !('MSStream' in (window as any));

const isAndroid = typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent);
const enc = encodeURIComponent;

export function openTransitDirections(args: {
  dest: LatLng;
  label?: string;
  /** 'bus' | 'subway' | 'train' | 'tram' | 'rail' (Google Maps) */
  transitMode?: string;
}) {
  const { dest, label, transitMode } = args;
  const name = label ? `(${enc(label)})` : '';

  if (isIOS) {
    // Apple Maps transit: maps://?daddr=<lat,lng>(Label)&dirflg=r
    const url = `maps://?daddr=${dest.lat},${dest.lng}${name}&dirflg=r`;
    window.location.href = url;
    return;
  }

  // Google Maps universal link (Android + desktop)
  // https://developers.google.com/maps/documentation/urls/get-started
  const g = new URL('https://www.google.com/maps/dir/');
  g.searchParams.set('api', '1');
  g.searchParams.set('destination', `${dest.lat},${dest.lng}${name}`);
  g.searchParams.set('travelmode', 'transit');
  if (transitMode) g.searchParams.set('transit_mode', transitMode);
  window.open(g.toString(), '_blank', 'noopener,noreferrer');
}

export function openWalkingDirections(args: { dest: LatLng; label?: string }) {
  const { dest, label } = args;
  const name = label ? `(${enc(label)})` : '';
  if (isIOS) {
    window.location.href = `maps://?daddr=${dest.lat},${dest.lng}${name}&dirflg=w`;
    return;
  }
  const g = new URL('https://www.google.com/maps/dir/');
  g.searchParams.set('api', '1');
  g.searchParams.set('destination', `${dest.lat},${dest.lng}${name}`);
  g.searchParams.set('travelmode', 'walking');
  window.open(g.toString(), '_blank', 'noopener,noreferrer');
}

/** Rideshare handoff (app deep link + web fallback) */
export function openRideshare(args: {
  dest: LatLng;
  destLabel?: string;
  pickup?: LatLng | 'my_location';
  provider?: 'uber' | 'lyft' | 'both';
  /** Uber: 'uberx' | 'comfort' ... / Lyft: 'lyft' | 'lyft_plus' ... */
  rideTypeId?: string;
  /** Optional partner/client ids if you have them */
  clientIds?: { uber?: string; lyft?: string };
}) {
  const {
    dest, destLabel, pickup = 'my_location',
    provider = 'both', rideTypeId, clientIds
  } = args;

  const pickupQuery =
    pickup === 'my_location'
      ? { scheme: 'pickup=my_location', web: 'pickup=my_location' }
      : {
          scheme: `pickup[latitude]=${pickup.lat}&pickup[longitude]=${pickup.lng}`,
          web:    `pickup[latitude]=${pickup.lat}&pickup[longitude]=${pickup.lng}`,
        };

  const dropQuery =
    `dropoff[latitude]=${dest.lat}` +
    `&dropoff[longitude]=${dest.lng}` +
    (destLabel ? `&dropoff[nickname]=${enc(destLabel)}` : '');

  const now = Date.now(); // used to make urls unique-ish on some Androids

  const openUber = () => {
    const app =
      `uber://?action=setPickup` +
      `&${pickupQuery.scheme}` +
      `&${dropQuery}` +
      (clientIds?.uber ? `&client_id=${enc(clientIds.uber)}` : '');
    const web =
      `https://m.uber.com/ul/?action=setPickup` +
      `&${pickupQuery.web}` +
      `&${dropQuery}` +
      (clientIds?.uber ? `&client_id=${enc(clientIds.uber)}` : '') +
      (rideTypeId ? `&product_id=${enc(rideTypeId)}` : '');

    // Try app scheme; fall back to web
    attemptAppThenWeb(app, web);
  };

  const openLyft = () => {
    // https://developer.lyft.com/docs/ride-requests
    const pickLyft =
      pickup === 'my_location'
        ? `pickup[latitude]=0&pickup[longitude]=0` // lyft uses 0/0 to trigger current location in some builds
        : `pickup[latitude]=${(pickup as LatLng).lat}&pickup[longitude]=${(pickup as LatLng).lng}`;

    const app =
      `lyft://ridetype?id=${enc(rideTypeId ?? 'lyft')}` +
      (clientIds?.lyft ? `&partner=${enc(clientIds.lyft)}` : '') +
      `&${pickLyft}` +
      `&destination[latitude]=${dest.lat}&destination[longitude]=${dest.lng}`;

    const web =
      `https://ride.lyft.com/?id=${enc(rideTypeId ?? 'lyft')}` +
      (clientIds?.lyft ? `&partner=${enc(clientIds.lyft)}` : '') +
      `&${pickLyft}` +
      `&destination[latitude]=${dest.lat}&destination[longitude]=${dest.lng}`;

    attemptAppThenWeb(app, web);
  };

  if (provider === 'uber') return openUber();
  if (provider === 'lyft') return openLyft();

  // both: prefer installed app feel; try Uber first on iOS, Lyft first on Android
  if (isIOS) openUber(); else openLyft();
}

/** Simple "transit-first" helper that exposes a rideshare fallback in one call */
export function openTransitFirstOrRideshare(args: {
  dest: LatLng;
  label?: string;
  /** If user taps "Use rideshare instead" in your UI, call openRideshare separately. */
  transitMode?: string;
}) {
  // Always attempt transit first — it's safe & lightweight.
  openTransitDirections({ dest: args.dest, label: args.label, transitMode: args.transitMode });
}

// ---------- internals ----------

export function openDrivingDirections(args: { dest: LatLng; label?: string }) {
  const { dest, label } = args;
  const name = label ? `(${enc(label)})` : '';
  if (isIOS) {
    window.location.href = `maps://?daddr=${dest.lat},${dest.lng}${name}&dirflg=d`;
    return;
  }
  const g = new URL('https://www.google.com/maps/dir/');
  g.searchParams.set('api', '1');
  g.searchParams.set('destination', `${dest.lat},${dest.lng}${name}`);
  g.searchParams.set('travelmode', 'driving');
  window.open(g.toString(), '_blank', 'noopener,noreferrer');
}

/** Try app scheme first; if it fails (after a tick), open web. */
function attemptAppThenWeb(appUrl: string, webUrl: string) {
  const started = Date.now();

  try { window.location.href = appUrl; } catch {/* ignore */}

  // Give the OS a tick to hand off to app; then fallback if we're still visible
  setTimeout(() => {
    const elapsed = Date.now() - started;
    const stillHere = !document.hidden && elapsed < 3000;
    if (stillHere) window.open(webUrl, '_blank', 'noopener,noreferrer');
  }, 900);
}

// Legacy compatibility
export const openNativeMaps = (position: LatLng) => {
  openDrivingDirections({ dest: position });
};