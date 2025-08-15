import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, MapPin, Clock, DollarSign, Plus, Building2, Calendar, Loader2 } from 'lucide-react';
import { useUnifiedPlanStops } from '@/hooks/useUnifiedPlanStops';

import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ComprehensiveStopModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
}

interface VenueResult {
  id: string;
  name: string;
  address: string;
  category: string;
  rating?: number;
  priceLevel?: number;
  distance?: number;
}

export function ComprehensiveStopModal({ isOpen, onClose, planId }: ComprehensiveStopModalProps) {
  // Form state
  const [activeTab, setActiveTab] = useState<'venue' | 'custom'>('venue');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [selectedVenue, setSelectedVenue] = useState<VenueResult | null>(null);
  
  // Venue search state
  const [venueQuery, setVenueQuery] = useState('');
  const [venueResults, setVenueResults] = useState<VenueResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Hooks
  const { createStop, isCreating } = useUnifiedPlanStops(planId);
  const { toast } = useToast();

  // Mock venue search for now - replace with actual venue search hook
  const searchVenues = async (query: string) => {
    if (!query.trim()) {
      setVenueResults([]);
      return;
    }

    setIsSearching(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Mock venue data - replace with actual venue search
    const mockVenues: VenueResult[] = [
      {
        id: '1',
        name: `${query} Coffee Shop`,
        address: '123 Main St, City',
        category: 'Coffee & Tea',
        rating: 4.5,
        priceLevel: 2,
        distance: 0.3
      },
      {
        id: '2',
        name: `${query} Restaurant`,
        address: '456 Oak Ave, City',
        category: 'Restaurant',
        rating: 4.2,
        priceLevel: 3,
        distance: 0.7
      },
      {
        id: '3',
        name: `${query} Park`,
        address: '789 Pine St, City',
        category: 'Park & Recreation',
        rating: 4.8,
        priceLevel: 1,
        distance: 1.2
      }
    ];

    setVenueResults(mockVenues);
    setIsSearching(false);
  };

  // Debounced venue search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchVenues(venueQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [venueQuery]);

  // Calculate duration
  const duration = useMemo(() => {
    if (!startTime || !endTime) return 60;
    
    const startMinutes = startTime.split(':').reduce((acc, time) => (60 * parseInt(acc) + parseInt(time)));
    const endMinutes = endTime.split(':').reduce((acc, time) => (60 * parseInt(acc) + parseInt(time)));
    const diff = endMinutes - startMinutes;
    
    return diff > 0 ? diff : 60;
  }, [startTime, endTime]);

  // Reset form
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStartTime('');
    setEndTime('');
    setEstimatedCost('');
    setSelectedVenue(null);
    setVenueQuery('');
    setVenueResults([]);
    setActiveTab('venue');
  };

  // Handle venue selection
  const handleVenueSelect = (venue: VenueResult) => {
    setSelectedVenue(venue);
    setTitle(venue.name);
    setDescription(`Visit ${venue.name} at ${venue.address}`);
    
    // Set default estimated cost based on price level
    if (venue.priceLevel) {
      const costs = ['5', '15', '30', '50'];
      setEstimatedCost(costs[venue.priceLevel - 1] || '15');
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({
        title: 'Title required',
        description: 'Please enter a title for your stop',
        variant: 'destructive'
      });
      return;
    }

    try {
      await createStop.mutateAsync({
        plan_id: planId,
        title: title.trim(),
        description: description.trim() || undefined,
        start_time: startTime || undefined,
        end_time: endTime || undefined,
        duration_minutes: duration,
        venue_id: selectedVenue?.id || undefined,
        estimated_cost_per_person: estimatedCost ? parseFloat(estimatedCost) : undefined,
      });

      resetForm();
      onClose();
    } catch (error) {
      console.error('Failed to create stop:', error);
    }
  };

  // Handle close
  const handleClose = () => {
    if (isCreating) return;
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Stop to Plan
          </DialogTitle>
          <DialogDescription>
            Search for a venue or create a custom stop for your plan timeline.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'venue' | 'custom')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="venue" className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Search Venues
              </TabsTrigger>
              <TabsTrigger value="custom" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Custom Stop
              </TabsTrigger>
            </TabsList>

            <TabsContent value="venue" className="space-y-4">
              {/* Venue Search */}
              <div className="space-y-2">
                <Label htmlFor="venue-search">Search for venues</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="venue-search"
                    placeholder="Coffee shops, restaurants, parks..."
                    value={venueQuery}
                    onChange={(e) => setVenueQuery(e.target.value)}
                    className="pl-10"
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
                  )}
                </div>
              </div>

              {/* Venue Results */}
              {venueResults.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  <Label>Select a venue</Label>
                  {venueResults.map((venue) => (
                    <div
                      key={venue.id}
                      onClick={() => handleVenueSelect(venue)}
                      className={cn(
                        "p-3 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50",
                        selectedVenue?.id === venue.id && "border-blue-500 bg-blue-50"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{venue.name}</h4>
                          <p className="text-sm text-gray-600">{venue.address}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {venue.category}
                            </Badge>
                            {venue.rating && (
                              <span className="text-xs text-gray-500">
                                ⭐ {venue.rating}
                              </span>
                            )}
                            {venue.distance && (
                              <span className="text-xs text-gray-500">
                                📍 {venue.distance}mi
                              </span>
                            )}
                          </div>
                        </div>
                        {venue.priceLevel && (
                          <div className="text-sm text-gray-500">
                            {'$'.repeat(venue.priceLevel)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {venueQuery && !isSearching && venueResults.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No venues found for "{venueQuery}"</p>
                  <p className="text-sm">Try a different search term or create a custom stop</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="custom" className="space-y-4">
              <p className="text-sm text-gray-600">
                Create a custom stop that's not tied to a specific venue
              </p>
            </TabsContent>
          </Tabs>

          {/* Stop Details Form */}
          <div className="space-y-4 border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor="title">Stop Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Coffee break, Lunch, Museum visit"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Add details about this stop..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* Time and Cost */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-time" className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Start Time
                </Label>
                <Input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-time" className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  End Time
                </Label>
                <Input
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cost" className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  Est. Cost
                </Label>
                <Input
                  id="cost"
                  type="number"
                  placeholder="0.00"
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* Duration Display */}
            {startTime && endTime && (
              <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                Duration: {Math.floor(duration / 60)}h {duration % 60}m
              </div>
            )}

            {/* Selected Venue Display */}
            {selectedVenue && (
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-blue-900">Selected Venue</p>
                    <p className="text-sm text-blue-700">{selectedVenue.name}</p>
                    <p className="text-xs text-blue-600">{selectedVenue.address}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedVenue(null)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating || !title.trim()}
              className="min-w-[100px]"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Stop
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}