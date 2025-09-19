export function openDirections(lat: number, lng: number, label?: string, mode: "walking"|"driving" = "walking") {
  const q = encodeURIComponent(label ?? `${lat},${lng}`);
  const travelmode = mode === "driving" ? "driving" : "walking";
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const apple = /iPad|iPhone|iPod/.test(ua);
  const url = apple
    ? `http://maps.apple.com/?daddr=${lat},${lng}&q=${q}&dirflg=${travelmode === "walking" ? "w" : "d"}`
    : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=&travelmode=${travelmode}`;
  window.open(url, "_blank", "noopener");
}