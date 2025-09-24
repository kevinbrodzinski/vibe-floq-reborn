import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, MapPin, Users, Clock, Zap } from 'lucide-react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';
import { VibeFloqCard } from '@/components/social/VibeFloqCard';

interface NearbyFloqsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Mock floq data for the modal
const mockFloqs = [
  {
    id: 'floq-1',
    title: 'Venice Sunset Vibes',
    description: 'Catching golden hour at the beach with good energy',
    vibe: 'flowing',
    distance: '0.2km',
    timeLeft: '2h 15m',
    participants: 8,
    maxParticipants: 12,
    isLive: true,
    isNew: false,
    boostCount: 3,
    creator: 'Maya'
  },
  {
    id: 'floq-2', 
    title: 'Coffee & Code',
    description: 'Productive morning session at local cafe',
    vibe: 'focused',
    distance: '0.4km',
    timeLeft: '1h 30m',
    participants: 4,
    maxParticipants: 6,
    isLive: true,
    isNew: true,
    boostCount: 1,
    creator: 'Alex'
  },
  {
    id: 'floq-3',
    title: 'Morning Yoga Flow',
    description: 'Gentle stretch session in the park',
    vibe: 'zen',
    distance: '0.7km',
    timeLeft: '45m',
    participants: 12,
    maxParticipants: 15,
    isLive: false,
    isNew: false,
    boostCount: 7,
    creator: 'Luna'
  }
];

export const NearbyFloqsModal: React.FC<NearbyFloqsModalProps> = ({
  open,
  onOpenChange
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [mounted, setMounted] = React.useState(false);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  
  // Prevent hydration issues
  React.useEffect(() => {
    setMounted(true);
  }, []);
  
  // Memoize filtered floqs to prevent unnecessary re-renders
  const filteredFloqs = React.useMemo(() => 
    mockFloqs.filter(floq =>
      floq.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      floq.description.toLowerCase().includes(searchQuery.toLowerCase())
    ), [searchQuery]
  );

  // Reset search when modal closes to prevent visual glitches
  React.useEffect(() => {
    if (!open) {
      setSearchQuery('');
    }
  }, [open]);

  // Don't render until mounted to prevent hydration issues
  if (!mounted) {
    return null;
  }

  const ModalContent = React.memo(() => (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {mockFloqs.length} active floqs in your area
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          LIVE
        </Badge>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search floqs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats Row */}
      <div className="flex gap-2 mb-6">
        <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded-lg">
          <MapPin className="w-3 h-3 text-primary" />
          <span className="text-xs font-medium">Within 1km</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 rounded-lg">
          <Clock className="w-3 h-3 text-emerald-500" />
          <span className="text-xs font-medium">{mockFloqs.filter(f => f.isLive).length} live now</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/10 rounded-lg">
          <Zap className="w-3 h-3 text-orange-500" />
          <span className="text-xs font-medium">{mockFloqs.reduce((sum, f) => sum + f.boostCount, 0)} boosts</span>
        </div>
      </div>

      {/* Floqs List */}
      <ScrollArea className="flex-1">
        <div className="space-y-3 sm:space-y-4 pb-6">
          {filteredFloqs.map((floq) => (
            <VibeFloqCard key={floq.id} floq={floq} />
          ))}
          {filteredFloqs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No floqs match your search</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </>
  ));

  return (
    <>
      {/* Desktop Dialog */}
      {isDesktop && (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="flex flex-col max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Nearby Floqs</DialogTitle>
              <DialogDescription>
                Discover and join exciting floqs happening near you
              </DialogDescription>
            </DialogHeader>
            <ModalContent />
          </DialogContent>
        </Dialog>
      )}

      {/* Mobile Sheet */}
      {!isDesktop && (
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent side="bottom" className="flex flex-col h-[85vh] px-3 sm:px-6">
            <SheetHeader>
              <SheetTitle>Nearby Floqs</SheetTitle>
              <SheetDescription>
                Discover and join exciting floqs happening near you
              </SheetDescription>
            </SheetHeader>
            <ModalContent />
          </SheetContent>
        </Sheet>
      )}
    </>
  );
};