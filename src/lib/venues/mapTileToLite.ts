import type { TileVenue } from '@/lib/api/mapContracts'
import type { VenueLite } from '@/components/venue/VenueChooserPanel'

export function mapTileToLite(v: TileVenue): VenueLite {
  return {
    id: v.pid,
    name: v.name,
    loc: v.lng && v.lat ? { lng: v.lng, lat: v.lat } : undefined,
    vibeTags: v.category ? [v.category] : [],
    openNow: !!v.open_now,
    priceLevel: undefined,
    popularityLive: v.busy_band != null ? v.busy_band / 4 : undefined,
    photoUrl: undefined,
  }
}