import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Clock, MapPin, Users, Globe, Heart, Eye } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DateTimePicker } from "@/components/inputs/DateTimePicker";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateFloq } from "@/hooks/useCreateFloq";
import { useNearbyVenues } from "@/hooks/useNearbyVenues";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useFriends } from "@/hooks/useFriends";
import { vibeEmoji } from "@/utils/vibe";
import type { Database } from '@/integrations/supabase/types';

type VibeEnum = Database['public']['Enums']['vibe_enum'];

interface CreateFloqSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedVenueId?: string | null;
}

const VIBE_OPTIONS: { value: VibeEnum; label: string; emoji: string }[] = [
  { value: 'chill', label: 'Chill', emoji: '😌' },
  { value: 'hype', label: 'Hype', emoji: '🔥' },
  { value: 'curious', label: 'Curious', emoji: '🤔' },
  { value: 'social', label: 'Social', emoji: '🤝' },
  { value: 'solo', label: 'Solo', emoji: '🧘' },
  { value: 'romantic', label: 'Romantic', emoji: '💕' },
  { value: 'weird', label: 'Weird', emoji: '🤪' },
  { value: 'down', label: 'Down', emoji: '😔' },
  { value: 'flowing', label: 'Flowing', emoji: '🌊' },
  { value: 'open', label: 'Open', emoji: '🌈' },
];

export function CreateFloqSheet({ open, onOpenChange, preselectedVenueId }: CreateFloqSheetProps) {
  const [title, setTitle] = useState("");
  const [vibe, setVibe] = useState<VibeEnum | "">("chill"); // Default to chill for better UX
  const [visibility, setVisibility] = useState<"public" | "friends" | "invite">("public");
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(preselectedVenueId || null);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [startsAt, setStartsAt] = useState(() => {
    const now = new Date();
    now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15); // Round to next 15min
    return now;
  });

  const { createFloq, isCreating } = useCreateFloq();
  const { lat, lng } = useGeolocation();
  const { data: nearbyVenues = [] } = useNearbyVenues(lat, lng, 0.5);
  const { friends } = useFriends();

  // Reset form when sheet opens/closes
  useEffect(() => {
    if (open) {
      setSelectedVenueId(preselectedVenueId || null);
    } else {
      setTitle("");
      setVibe("chill"); // Reset to default chill vibe
      setVisibility("public");
      setSelectedVenueId(null);
      setSelectedFriends([]);
      const now = new Date();
      now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15);
      setStartsAt(now);
    }
  }, [open, preselectedVenueId]);

  const selectedVenue = nearbyVenues.find(v => v.id === selectedVenueId);

  const handleCreate = async () => {
    if (!selectedVenue || !vibe || !lat || !lng) return;

    try {
      await createFloq({
        location: [selectedVenue.lng, selectedVenue.lat], // [lng, lat] tuple format
        startsAt: startsAt,
        vibe: vibe as VibeEnum,
        visibility,
        title: title.trim() || selectedVenue.name,
        invitees: visibility === 'invite' ? selectedFriends : [],
      });
      
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const canCreate = selectedVenue && vibe && (visibility !== 'invite' || selectedFriends.length > 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
        <SheetHeader className="space-y-4">
          <SheetTitle className="flex items-center gap-2">
            <span className="text-2xl">✨</span>
            Create a New Floq
          </SheetTitle>
          <SheetDescription>
            Start a vibe and invite people to join you at a venue
          </SheetDescription>
        </SheetHeader>

        <div className="mt-8 space-y-6">
          {/* Venue Selection */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Choose a venue
            </Label>
            <Select value={selectedVenueId || ""} onValueChange={setSelectedVenueId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a nearby venue..." />
              </SelectTrigger>
              <SelectContent>
                {nearbyVenues.map((venue) => (
                  <SelectItem key={venue.id} value={venue.id}>
                    <div className="flex items-center gap-2">
                      <span>{vibeEmoji(venue.vibe)}</span>
                      <span>{venue.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {nearbyVenues.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No venues found nearby. Try expanding your search radius.
              </p>
            )}
          </div>

          {/* Vibe Selection */}
          <div className="space-y-3">
            <Label>Set the vibe</Label>
            <div className="grid grid-cols-2 gap-2">
              {VIBE_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  variant={vibe === option.value ? "default" : "outline"}
                  className="justify-start h-auto p-3"
                  onClick={() => setVibe(option.value)}
                >
                  <span className="text-lg mr-2">{option.emoji}</span>
                  <span>{option.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-3">
            <Label htmlFor="title">Floq title (optional)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={selectedVenue ? `${selectedVenue.name} Hangout` : "Enter a title..."}
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to use venue name as title
            </p>
          </div>

          {/* Start Time */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Start time
            </Label>
            <DateTimePicker
              value={startsAt}
              onChange={setStartsAt}
              min={new Date(Date.now() - 60 * 60 * 1000)} // ≤ 1 h ago disabled
            />
          </div>

          <Separator />

          {/* Visibility */}
          <div className="space-y-3">
            <Label>Who can see this floq?</Label>
            <div className="grid grid-cols-1 gap-2">
              <Button
                variant={visibility === "public" ? "default" : "outline"}
                className="justify-start h-auto p-3"
                onClick={() => setVisibility("public")}
              >
                <Globe className="h-4 w-4 mr-2" />
                <div className="text-left">
                  <div className="font-medium">Public</div>
                  <div className="text-xs text-muted-foreground">Anyone nearby can see and join</div>
                </div>
              </Button>
              <Button
                variant={visibility === "friends" ? "default" : "outline"}
                className="justify-start h-auto p-3"
                onClick={() => setVisibility("friends")}
              >
                <Heart className="h-4 w-4 mr-2" />
                <div className="text-left">
                  <div className="font-medium">Friends only</div>
                  <div className="text-xs text-muted-foreground">Only your friends can see and join</div>
                </div>
              </Button>
              <Button
                variant={visibility === "invite" ? "default" : "outline"}
                className="justify-start h-auto p-3"
                onClick={() => setVisibility("invite")}
              >
                <Eye className="h-4 w-4 mr-2" />
                <div className="text-left">
                  <div className="font-medium">Invite only</div>
                  <div className="text-xs text-muted-foreground">Only invited people can see and join</div>
                </div>
              </Button>
            </div>
          </div>

          {/* Friend Selection (for invite only) */}
          {visibility === "invite" && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Invite friends
              </Label>
              {friends.length > 0 ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {friends.map((friendId) => (
                      <Button
                        key={friendId}
                        variant={selectedFriends.includes(friendId) ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          if (selectedFriends.includes(friendId)) {
                            setSelectedFriends(selectedFriends.filter(id => id !== friendId));
                          } else {
                            setSelectedFriends([...selectedFriends, friendId]);
                          }
                        }}
                        className="justify-start h-auto p-2"
                      >
                        <span className="truncate">{friendId.slice(0, 8)}...</span>
                      </Button>
                    ))}
                  </div>
                  {selectedFriends.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      <span className="text-sm text-muted-foreground">Selected:</span>
                      {selectedFriends.map((friendId) => (
                        <Badge key={friendId} variant="secondary" className="text-xs">
                          {friendId.slice(0, 6)}...
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  You need friends to use invite-only floqs. Add some friends first!
                </p>
              )}
            </div>
          )}

          {/* Create Button */}
          <div className="pt-4">
            <Button
              onClick={handleCreate}
              disabled={!canCreate || isCreating}
              className="w-full h-12 text-lg"
              size="lg"
            >
              {isCreating ? "Creating..." : "Create Floq"}
            </Button>
          </div>

          {/* Preview */}
          {selectedVenue && vibe && (
            <div className="bg-card/50 rounded-lg p-4 border border-border/30">
              <h4 className="font-medium mb-2">Preview</h4>
              <div className="text-sm space-y-1">
                <p><strong>Title:</strong> {title || selectedVenue.name}</p>
                <p><strong>Venue:</strong> {selectedVenue.name}</p>
                <p><strong>Vibe:</strong> {vibeEmoji(vibe as VibeEnum)} {vibe}</p>
                <p><strong>Visibility:</strong> {visibility}</p>
                <p><strong>Starts:</strong> {format(startsAt, "PPP 'at' p")}</p>
                {visibility === 'invite' && selectedFriends.length > 0 && (
                  <p><strong>Invitees:</strong> {selectedFriends.length} friends</p>
                )}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}