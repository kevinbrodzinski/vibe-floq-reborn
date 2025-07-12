import { useState } from "react";
import { Check, ChevronDown, MapPin, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Venue {
  id: string;
  label: string;
  description?: string;
}

interface VenueSelectProps {
  value: Venue | null;
  onChange: (venue: Venue | null) => void;
  className?: string;
}

// Mock venues for demo - replace with real venue data source
const mockVenues: Venue[] = [
  { id: "1", label: "Bestia", description: "Arts District • Italian" },
  { id: "2", label: "Guelaguetza", description: "Koreatown • Mexican" },
  { id: "3", label: "Night + Market", description: "West Hollywood • Thai" },
  { id: "4", label: "Republique", description: "Mid-City • French" },
  { id: "5", label: "Griffith Observatory", description: "Los Feliz • Attraction" },
  { id: "current", label: "Use current location", description: "📍 Where you are now" },
];

export function VenueSelect({ value, onChange, className }: VenueSelectProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between h-auto py-3 px-4",
            !value && "text-muted-foreground",
            className
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            {value?.id === "current" ? (
              <MapPin className="h-4 w-4 text-primary" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            <div className="text-left min-w-0">
              <div className="font-medium truncate">
                {value ? value.label : "Search venues..."}
              </div>
              {value?.description && (
                <div className="text-xs text-muted-foreground truncate">
                  {value.description}
                </div>
              )}
            </div>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search venues..." />
          <CommandList>
            <CommandEmpty>No venues found.</CommandEmpty>
            <CommandGroup>
              {mockVenues.map((venue) => (
                <CommandItem
                  key={venue.id}
                  value={venue.label}
                  onSelect={() => {
                    onChange(venue.id === value?.id ? null : venue);
                    setOpen(false);
                  }}
                  className="flex items-center gap-3 p-3"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {venue.id === "current" ? (
                      <MapPin className="h-4 w-4 text-primary" />
                    ) : (
                      <div className="h-4 w-4 rounded bg-muted" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{venue.label}</div>
                      {venue.description && (
                        <div className="text-xs text-muted-foreground truncate">
                          {venue.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <Check
                    className={cn(
                      "h-4 w-4",
                      value?.id === venue.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}