interface Position {
  lat: number
  lng: number
}

export const openNativeMaps = (position: Position) => {
  const { lat, lng } = position
  
  // Detect platform
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const isAndroid = /Android/.test(navigator.userAgent)
  
  if (isIOS) {
    // Use Apple Maps on iOS
    window.open(`maps://maps.google.com/maps?daddr=${lat},${lng}&amp;ll=`)
  } else if (isAndroid) {
    // Use Google Maps on Android
    window.open(`geo:${lat},${lng}`)
  } else {
    // Use Google Maps web on desktop/other
    window.open(`https://maps.google.com/maps?q=${lat},${lng}`)
  }
}