import { useState } from "react";
import { Sheet, SheetContent, SheetClose } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Fieldset } from "@/components/ui/fieldset";
import { VenueSelect } from "@/components/venue-select";
import { DateTimePicker } from "@/components/inputs/DateTimePicker";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, X, Clock, Plus } from "lucide-react";
import { useSuggestChange } from "@/hooks/useSuggestChange";
import { getEnvironmentConfig } from "@/lib/environment";

interface Props {
  floqId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SuggestChangeSheet = ({ floqId, open, onOpenChange }: Props) => {
  // ---- local state --------------------------------------------------------
  const [venue, setVenue] = useState<{ id: string; label: string } | null>(null);
  const [when, setWhen] = useState<Date | null>(null);
  const [message, setMessage] = useState("");

  const { suggestChange, isLoading, optimisticSuggestion } = useSuggestChange();

  // ---- helpers ------------------------------------------------------------
  const ready = Boolean(venue || when || message.trim());
  const isOffline = getEnvironmentConfig().presenceMode === "offline";

  const reset = () => {
    setVenue(null);
    setWhen(null);
    setMessage("");
  };

  const handleQuickTime = (minutes: number) => {
    const newTime = new Date();
    newTime.setTime(newTime.getTime() + minutes * 60 * 1000);
    setWhen(newTime);
  };

  const handleSend = () => {
    if (!ready || isLoading) return;

    suggestChange({
      floq_id: floqId,
      venue_id: venue?.id === "current" ? null : venue?.id,
      at: when?.toISOString() ?? null,
      note: message.trim() || null,
    });

    reset();
    onOpenChange(false);
  };

  // ---- render -------------------------------------------------------------
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[85vh] rounded-t-3xl bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:mx-auto sm:max-w-md"
      >
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 backdrop-blur-lg">
          <h2 className="text-lg font-semibold tracking-tight">Suggest changes</h2>
          <SheetClose asChild>
            <button className="p-2 -m-2 min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Close">
              <X className="size-5" />
            </button>
          </SheetClose>
        </header>

        {/* Scrollable body */}
        <ScrollArea className="px-6 pb-40 space-y-6">
          {/* Quick time picks */}
          <Fieldset legend="Quick time picks">
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickTime(0)}
                className="h-8 text-xs"
              >
                Now
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickTime(30)}
                className="h-8 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                30 min
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickTime(120)}
                className="h-8 text-xs"
              >
                Tonight 7 PM
              </Button>
            </div>
          </Fieldset>

          {/* Venue */}
          <Fieldset legend="Venue" className="space-y-3">
            <VenueSelect value={venue} onChange={setVenue} />
          </Fieldset>

          {/* Time */}
          <Fieldset legend="Time" className="space-y-3">
            <DateTimePicker
              value={when}
              onChange={setWhen}
              min={new Date(Date.now() - 60 * 60 * 1000)} // Allow up to 1 hour ago
            />
          </Fieldset>

          {/* Notes */}
          <Fieldset legend="Notes (optional)" className="space-y-3">
            <Textarea
              rows={3}
              maxLength={240}
              placeholder="Anything else to add…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="resize-none"
            />
            <p className="text-sm text-muted-foreground text-right">
              {message.length}/240
            </p>
          </Fieldset>

          {/* Optimistic feedback */}
          {optimisticSuggestion && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
                <span className="text-sm text-primary font-medium">
                  Sending: {optimisticSuggestion}
                </span>
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <footer className="fixed inset-x-0 bottom-[env(safe-area-inset-bottom)] px-6 py-4 bg-background/90 backdrop-blur-lg">
          <div className="flex gap-3 sm:max-w-md sm:mx-auto">
            <Button
              variant="ghost"
              className="flex-1 min-h-[44px]"
              disabled={isLoading}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 min-h-[44px]"
              disabled={!ready || isLoading || isOffline}
              onClick={handleSend}
              title={isOffline ? "Suggestions disabled in offline mode" : undefined}
            >
              {isLoading ? "Sending…" : (
                <>
                  <Send className="mr-2 size-4" /> Send
                </>
              )}
            </Button>
          </div>
          {isOffline && (
            <p className="text-xs text-muted-foreground text-center mt-2 sm:max-w-md sm:mx-auto">
              Suggestions are disabled in offline mode
            </p>
          )}
        </footer>
      </SheetContent>
    </Sheet>
  );
};