import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Search, MapPin, Star, Clock, DollarSign } from 'lucide-react'
import { trackEvent } from '@/lib/analytics'
import { useCollaborativeState } from '@/hooks/useCollaborativeState'
import { usePlanStops } from '@/hooks/usePlanStops'
import type { PlanStop } from '@/types/plan'

interface VenueSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onBack: () => void
  planId: string
  timeSlot: string
  defaultEndTime: string
}

// Mock venue data - replace with actual venue search API
const mockVenues = [
  {
    id: '1',
    name: 'The Local Bistro',
    category: 'Restaurant',
    rating: 4.5,
    priceRange: '$$',
    address: '123 Main St',
    estimatedTime: '1-2 hours'
  },
  {
    id: '2', 
    name: 'Craft Cocktail Lounge',
    category: 'Bar',
    rating: 4.2,
    priceRange: '$$$',
    address: '456 Oak Ave',
    estimatedTime: '2-3 hours'
  },
  {
    id: '3',
    name: 'Escape Room Adventure',
    category: 'Entertainment',
    rating: 4.8,
    priceRange: '$',
    address: '789 Pine St',
    estimatedTime: '1 hour'
  }
]

export function VenueSearchModal({ 
  isOpen, 
  onClose, 
  onBack,
  planId, 
  timeSlot,
  defaultEndTime
}: VenueSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedVenue, setSelectedVenue] = useState<typeof mockVenues[0] | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { addStop } = useCollaborativeState(planId)
  const { data: existingStops } = usePlanStops(planId)

  const formatTimeSlot = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const filteredVenues = mockVenues.filter(venue =>
    venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    venue.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleVenueSelect = (venue: typeof mockVenues[0]) => {
    setSelectedVenue(venue)
  }

  const handleAddVenue = async () => {
    if (!selectedVenue) return

    setIsSubmitting(true)
    try {
      const newStop: PlanStop = {
        id: '', // Will be set by the backend
        plan_id: planId,
        title: selectedVenue.name,
        description: `${selectedVenue.category} • ${selectedVenue.estimatedTime}`,
        startTime: timeSlot,
        endTime: defaultEndTime,
        start_time: timeSlot,
        end_time: defaultEndTime,
        location: selectedVenue.address,
        venue: selectedVenue.name,
        address: selectedVenue.address,
        vibeMatch: 0.8,
        status: 'confirmed' as const,
        color: '#3B82F6',
        stop_order: (existingStops?.length || 0) + 1,
        createdBy: '',
        participants: [],
        votes: [],
        kind: 'venue' as any
      }

      await addStop(newStop)
      
      // Track successful venue addition
      trackEvent('stop_created', {
        mode: 'venue',
        plan_id: planId,
        time_slot: timeSlot,
        venue_name: selectedVenue.name,
        venue_category: selectedVenue.category
      })
      onClose()
    } catch (error) {
      console.error('Failed to add venue:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
        <SheetHeader className="pb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <SheetTitle>
              Search Venues for {formatTimeSlot(timeSlot)}
            </SheetTitle>
          </div>
        </SheetHeader>

        <div className="space-y-6 pb-6">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search restaurants, bars, activities..."
              className="pl-10"
            />
          </div>

          {/* Venue Results */}
          <div className="space-y-3">
            {filteredVenues.map((venue) => (
              <div
                key={venue.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedVenue?.id === venue.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => handleVenueSelect(venue)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-medium">{venue.name}</h3>
                    <p className="text-sm text-muted-foreground">{venue.category}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {venue.rating}
                    </div>
                    <div className="text-sm text-muted-foreground">{venue.priceRange}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {venue.address}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {venue.estimatedTime}
                  </div>
                </div>
              </div>
            ))}

            {filteredVenues.length === 0 && searchQuery && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No venues found for "{searchQuery}"</p>
                <p className="text-sm">Try a different search term</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onBack} className="flex-1">
              Back
            </Button>
            <Button 
              onClick={handleAddVenue}
              disabled={!selectedVenue || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Adding...' : 'Add Venue'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Component display name for debugging
VenueSearchModal.displayName = 'VenueSearchModal'