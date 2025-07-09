import { useNearbyVenues } from '@/hooks/useNearbyVenues'
import { useGeolocation } from '@/hooks/useGeolocation'
import { VenueListItem } from '@/components/VenueListItem'
import { useSelectedVenue } from '@/store/useSelectedVenue'

export const ListModeContainer = () => {
  const { lat, lng } = useGeolocation()
  const { data: nearby = [], isLoading } = useNearbyVenues(lat, lng, 0.5)
  const { setSelectedVenueId } = useSelectedVenue()

  return (
    <div className="pt-3 pb-[120px] px-4 space-y-1 overflow-y-auto h-full">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Nearby Places</h2>
        <p className="text-sm text-muted-foreground">{nearby.length} venues within 500m</p>
      </div>
      
      {isLoading && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading venues...</p>
        </div>
      )}

      {!isLoading && nearby.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No venues found nearby</p>
        </div>
      )}

      {nearby.map((v) => (
        <VenueListItem
          key={v.id}
          venue={v}
          onTap={() => setSelectedVenueId(v.id)}
        />
      ))}
    </div>
  )
}