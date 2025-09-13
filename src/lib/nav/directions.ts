type LatLng = { lat:number; lng:number };

function isiOS(){ try{ return /iPad|iPhone|iPod/.test(navigator.userAgent) }catch{return false} }
function isAndroid(){ try{ return /Android/.test(navigator.userAgent) }catch{return false} }

// Normalized open — returns true if the attempt was launched
export function openAppleMaps(dest:LatLng, label?:string, mode:'transit'|'drive'|'walk'='transit'){
  const dir = mode==='walk'?'w': mode==='drive'?'d':'r'; // r=transit, d=drive, w=walk
  const q = encodeURIComponent(label??'Destination');
  const url = `https://maps.apple.com/?daddr=${dest.lat},${dest.lng}&dirflg=${dir}&q=${q}`;
  window.location.href = url; return true;
}
export function openGoogleMaps(dest:LatLng, label?:string, mode:'transit'|'drive'|'walk'='transit'){
  const travelmode = mode==='walk'?'walking': mode==='drive'?'driving':'transit';
  const q = encodeURIComponent(label??`${dest.lat},${dest.lng}`);
  const url = `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}&destination_place_id=&travelmode=${travelmode}&dir_action=navigate`;
  window.location.href = url; return true;
}

// Try native apps first via scheme, then web fallback
export function openTransitFirstOrRideshare(opts:{ dest:LatLng; label?:string; mode?:'transit'|'drive'|'walk' }){
  const mode = opts.mode ?? 'transit';
  // Try platform-best
  if (isiOS()) return openAppleMaps(opts.dest, opts.label, mode);
  // Android → GMaps
  if (isAndroid()) return openGoogleMaps(opts.dest, opts.label, mode);
  // Desktop → Google Maps
  return openGoogleMaps(opts.dest, opts.label, mode);
}