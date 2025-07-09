import { useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent side="bottom" className="pb-8">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent/20">
              <MapPin className="h-5 w-5 text-accent" />
            </span>
            {event.name}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              Radius ≈ {Math.round(event.radius_m)} m
            </Badge>
            {event.vibe && <Badge>{event.vibe}</Badge>}
            {event.people && event.people > 0 && (
              <Badge variant="outline">{event.people} people here</Badge>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            Quick blurb goes here. We can hydrate this later with the event's
            description or AI-summary.
          </p>

          <div className="mt-6 grid gap-3">
            <Button size="lg" className="w-full">
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
            >
              Directions
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};