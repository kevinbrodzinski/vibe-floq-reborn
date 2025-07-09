import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup } from '@/components/ui/command';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';
import { OnlineFriendRow } from '@/components/OnlineFriendRow';
import { VenueListItem } from '@/components/VenueListItem';
import { TitleRow } from '@/components/TitleRow';
import { useFriends } from '@/hooks/useFriends';
import { useProfileCache } from '@/hooks/useProfileCache';
import { useFullscreenMap } from '@/store/useFullscreenMap';
import { useSelectedVenue } from '@/store/useSelectedVenue';

interface CommandPaletteSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPaletteSheet({ open, onOpenChange }: CommandPaletteSheetProps) {
  const [query, setQuery] = useState('');
  const { data: results, isLoading } = useGlobalSearch(query, open);
  
  const navigate = useNavigate();
  const { addFriend, isFriend } = useFriends();
  const { primeProfiles } = useProfileCache();
  const { set: setMapMode } = useFullscreenMap();
  const { setSelectedVenueId } = useSelectedVenue();

  // Clear search when sheet closes
  useEffect(() => {
    if (!open) {
      setQuery('');
    }
  }, [open]);

  const handleUserTap = async (userId: string) => {
    // Prime profile cache for instant rendering
    if (results?.users) {
      const user = results.users.find(u => u.id === userId);
      if (user) {
        primeProfiles([{
          id: userId,
          display_name: user.label,
          avatar_url: null,
          created_at: ''
        }]);
      }
    }

    // Check if already a friend, if so navigate to profile
    if (isFriend(userId)) {
      navigate(`/u/${userId}`);
    } else {
      // Send friend request
      await addFriend(userId);
    }
    
    onOpenChange(false);
  };

  const handleVenueTap = (venueId: string) => {
    // Exit full-screen/list mode and show map
    setMapMode('map');
    // Set selected venue to open details sheet
    setSelectedVenueId(venueId);
    onOpenChange(false);
  };

  const handleFloqEventTap = (floqId: string) => {
    // Navigate to floq details (stub route)
    navigate(`/floq/${floqId}`);
    onOpenChange(false);
  };

  const hasResults = results && (
    results.users.length > 0 || 
    results.venues.length > 0 || 
    results.floqs.length > 0 || 
    results.events.length > 0
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="top" 
        className="h-[90vh] p-0 border-0 bg-background/95 backdrop-blur-sm"
        style={{ maxHeight: '90vh' }}
      >
        <Command className="h-full border-0">
          {/* Sticky Search Input */}
          <div className="sticky top-0 border-b bg-background/95 backdrop-blur-sm p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <CommandInput
                placeholder="Search users, venues, floqs, events..."
                value={query}
                onValueChange={setQuery}
                className="pl-10 h-12 text-base bg-muted/50 border-0 focus-visible:ring-1"
              />
            </div>
          </div>

          {/* Results */}
          <CommandList className="flex-1 overflow-auto px-2">
            {!query.trim() ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <div className="text-center">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Start typing to search...</p>
                </div>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <div className="text-center">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                  <p>Searching...</p>
                </div>
              </div>
            ) : !hasResults ? (
              <CommandEmpty className="py-8 text-center text-muted-foreground">
                <div>
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No results found for "{query}"</p>
                </div>
              </CommandEmpty>
            ) : (
              <>
                {/* Users Section */}
                {results?.users && results.users.length > 0 && (
                  <CommandGroup heading="Users" className="pb-2">
                    {results.users.map((user) => (
                      <div 
                        key={user.id} 
                        className="px-2 cursor-pointer"
                        onClick={() => handleUserTap(user.id)}
                      >
                        <OnlineFriendRow
                          userId={user.id}
                          isNearby={false}
                        />
                      </div>
                    ))}
                  </CommandGroup>
                )}

                {/* Venues Section */}
                {results?.venues && results.venues.length > 0 && (
                  <CommandGroup heading="Venues" className="pb-2">
                    {results.venues.map((venue) => (
                      <div key={venue.id} className="px-2">
                        <VenueListItem
                          venue={{
                            id: venue.id,
                            name: venue.label,
                            vibe: venue.sublabel,
                            lat: 0, // These aren't used in search context
                            lng: 0,
                            source: 'search',
                            distance_m: venue.distance_m
                          }}
                          onTap={handleVenueTap}
                        />
                      </div>
                    ))}
                  </CommandGroup>
                )}

                {/* Floqs Section */}
                {results?.floqs && results.floqs.length > 0 && (
                  <CommandGroup heading="Floqs" className="pb-2">
                    {results.floqs.map((floq) => (
                      <div key={floq.id} className="px-2">
                        <TitleRow
                          id={floq.id}
                          label={floq.label}
                          sublabel={floq.sublabel}
                          kind="floq"
                          starts_at={floq.starts_at}
                          onTap={handleFloqEventTap}
                        />
                      </div>
                    ))}
                  </CommandGroup>
                )}

                {/* Events Section */}
                {results?.events && results.events.length > 0 && (
                  <CommandGroup heading="Events" className="pb-2">
                    {results.events.map((event) => (
                      <div key={event.id} className="px-2">
                        <TitleRow
                          id={event.id}
                          label={event.label}
                          sublabel={event.sublabel}
                          kind="event"
                          starts_at={event.starts_at}
                          onTap={handleFloqEventTap}
                        />
                      </div>
                    ))}
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </SheetContent>
    </Sheet>
  );
}