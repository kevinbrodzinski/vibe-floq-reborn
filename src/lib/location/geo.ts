/** Simple haversine distance (metres) */
export function metersBetween(
    lat1: number, lng1: number,
    lat2: number, lng2: number
) {
    const R = 6_371_000;                       // m
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const dφ = (lat2 - lat1) * Math.PI / 180;
    const dλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(dφ / 2) ** 2 +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(dλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
} 