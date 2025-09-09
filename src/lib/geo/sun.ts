// Minimal solar elevation (deg) per NOAA-style approximation.
// Good enough for SUI gating (day vs night + intensity curve).
// Inputs: Date (UTC ok), lat/lng in degrees.
export function solarElevationDeg(d: Date, latDeg: number, lngDeg: number): number {
  // Convert to fractional day
  const rad = Math.PI / 180
  const dayMs = 24 * 60 * 60 * 1000
  const J1970 = 2440588
  const J2000 = 2451545
  const toJulian = (date: Date) => date.getTime() / dayMs - 0.5 + J1970
  const dJ = toJulian(d) - J2000

  // fractional year (in rad)
  const gamma = 2 * Math.PI / 365.25 * (dJ % 365.25)

  // equation of time (minutes), declination (rad)
  const eqTime = 229.18 * (
      0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma)
  )
  const decl = 0.006918
            - 0.399912 * Math.cos(gamma)
            + 0.070257 * Math.sin(gamma)
            - 0.006758 * Math.cos(2 * gamma)
            + 0.000907 * Math.sin(2 * gamma)
            - 0.002697 * Math.cos(3 * gamma)
            + 0.00148  * Math.sin(3 * gamma)

  // true solar time (minutes)
  const mins = d.getUTCHours()*60 + d.getUTCMinutes() + d.getUTCSeconds()/60
  const tst = (mins + eqTime + 4*lngDeg) % 1440
  const ha = ((tst / 4) - 180) * rad // hour angle (rad)

  const lat = latDeg * rad
  const zenith = Math.acos(Math.sin(lat)*Math.sin(decl) + Math.cos(lat)*Math.cos(decl)*Math.cos(ha))
  const elev = (90 - (zenith / rad))
  return elev
}

// Map elevation + clouds + outdoor to [0..1] exposure signal
export function sunExposure01(
  elevDeg: number,
  opts?: { cloudCover01?: number; isOutdoor?: boolean }
): number {
  const { cloudCover01 = 0, isOutdoor = true } = opts ?? {}
  if (!isOutdoor) return 0
  if (elevDeg <= 0) return 0 // night
  // Elevation weighting ~ sin(elev) gives a nice 0..1 curve
  const elevWeight = Math.sin((Math.PI / 180) * elevDeg)
  const cloudLoss  = Math.max(0, Math.min(1, cloudCover01))
  return Math.max(0, Math.min(1, elevWeight * (1 - cloudLoss)))
}