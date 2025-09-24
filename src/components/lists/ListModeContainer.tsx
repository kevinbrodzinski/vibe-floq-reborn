import { useNearbyVenues } from '@/hooks/useNearbyVenues'
import { useGeo } from '@/hooks/useGeo'
import { VenueListItem } from '@/components/VenueListItem'
import { useSelectedVenue } from '@/store/useSelectedVenue'
import { usePrefetchVenue } from '@/hooks/usePrefetchVenue'

export const ListModeContainer = () => {
  const { coords } = useGeo()
  const lat = coords?.lat
  const lng = coords?.lng
  const { data: nearby, isLoading } = useNearbyVenues(lat, lng, 0.5)
  const list = Array.isArray(nearby as any) ? (nearby as any) : []
  const { setSelectedVenueId } = useSelectedVenue()
  const prefetchVenue = usePrefetchVenue()

  return (
    <div className="pt-3 pb-[120px] px-4 space-y-1 overflow-y-auto h-full">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Nearby Places</h2>
        <p className="text-sm text-muted-foreground">{list.length} venues within 500m</p>
      </div>
      
      {isLoading && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading venues...</p>
        </div>
      )}

      {!isLoading && list.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No venues found nearby</p>
        </div>
      )}

      {list.map((v: any) => (
        <VenueListItem
          key={v.id}
          venue={{
            id: v.id,
            name: v.name,
            lat: v.lat,
            lng: v.lng,
            vibe: v.categories?.[0] || 'venue',
            source: 'database',
            distance_m: v.distance_m,
            live_count: v.live_count
          }}
          onTap={() => setSelectedVenueId(v.id)}
          onMouseEnter={() => prefetchVenue(v.id)}
          onFocus={() => prefetchVenue(v.id)}
          onPointerDownCapture={() => prefetchVenue(v.id)}
        />
      ))}
    </div>
  )
}