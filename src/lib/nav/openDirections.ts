export function openDirections(lat: number, lng: number, label?: string) {
  const q = encodeURIComponent(label ?? `${lat},${lng}`);
  
  const url = /iPad|iPhone|iPod/.test(navigator.userAgent)
    ? `http://maps.apple.com/?daddr=${lat},${lng}&q=${q}`
    : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=&travelmode=walking`;
  
  window.open(url, "_blank", "noopener");
}