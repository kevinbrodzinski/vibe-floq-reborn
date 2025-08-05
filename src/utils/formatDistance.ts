// utils/formatDistance.ts
export const formatDistance = (m?: number | null) =>
  !Number.isFinite(m)
    ? '—'
    : m! < 1000
        ? `${m} m`
        : `${(m! / 1000).toFixed(1)} km`;