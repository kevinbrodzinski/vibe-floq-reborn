import { useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

// Vibe to emoji mapping
const getVibeEmoji = (vibe: string | null | undefined): string => {
  if (!vibe) return "";
  const emojiMap: Record<string, string> = {
    chill: "😌",
    hype: "🔥",
    curious: "🤔",
    social: "👥",
    solo: "🧘",
    romantic: "💕",
    weird: "🤪",
    down: "😔",
    flowing: "🌊",
    open: "🌟"
  };
  return emojiMap[vibe.toLowerCase()] || "✨";
};

interface EventDetailsSheetProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  event: {
    id: string;
    name: string;
    vibe?: string | null;
    radius_m: number;
    people?: number;          // optional - show "X people here"
  } | null;
}

export const EventDetailsSheet = ({
  open,
  onOpenChange,
  event,
}: EventDetailsSheetProps) => {
  /* back-button consumption */
  useEffect(() => {
    if (!open) return;
    const handler = () => {
      onOpenChange(false);
      return true; // swallow android back
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [open, onOpenChange]);

  if (!event) return null;

  const peopleCount = event.people ?? 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent 
        side="bottom" 
        className="pb-8"
        aria-describedby="event-description"
      >
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <span 
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent/20"
              aria-hidden="true"
            >
              <MapPin className="h-5 w-5 text-accent" />
            </span>
            {event.name}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Event details">
            <Badge variant="secondary" aria-label={`Event radius approximately ${Math.round(event.radius_m)} meters`}>
              Radius ≈ {Math.round(event.radius_m)} m
            </Badge>
            {event.vibe && (
              <Badge aria-label={`Event vibe is ${event.vibe}`}>
                {getVibeEmoji(event.vibe)} {event.vibe}
              </Badge>
            )}
            <Badge variant="outline" aria-label={`${peopleCount} ${peopleCount === 1 ? 'person' : 'people'} currently here`}>
              {peopleCount} {peopleCount === 1 ? 'person' : 'people'} here
            </Badge>
          </div>

          <p 
            id="event-description" 
            className="text-sm text-muted-foreground"
          >
            Quick blurb goes here. We can hydrate this later with the event's
            description or AI-summary.
          </p>

          <div className="mt-6 grid gap-3" role="group" aria-label="Event actions">
            <Button 
              size="lg" 
              className="w-full"
              aria-label={`Join the ${event.name} floq`}
            >
              Join floq
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={() =>
                window.open(
                  `https://maps.google.com/?q=${event.name}`,
                  "_blank",
                )
              }
              aria-label={`Get directions to ${event.name}`}
            >
              Directions
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};