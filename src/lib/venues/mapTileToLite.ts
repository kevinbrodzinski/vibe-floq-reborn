import type { TileVenue } from '@/components/field/ExploreDrawer'
import type { VenueLite } from '@/components/venue/VenueChooserPanel'

export function mapTileToLite(v: TileVenue): VenueLite {
  return {
    id: v.pid,
    name: v.name,
    loc: undefined, // TileVenue doesn't have lat/lng - fill if available elsewhere
    vibeTags: v.category ? [v.category] : [],
    openNow: !!v.open_now,
    priceLevel: undefined,
    popularityLive: v.busy_band != null ? v.busy_band / 4 : undefined,
    photoUrl: undefined,
  }
}