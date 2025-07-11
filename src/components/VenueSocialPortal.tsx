import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, 
  TrendingUp, 
  Zap, 
  MessageCircle,
  Navigation
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useVenueDetails } from "@/hooks/useVenueDetails";
import { useVenueJoin } from "@/hooks/useVenueJoin";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useVenueEnergy } from "@/hooks/useVenueEnergy";
import { vibeEmoji } from "@/utils/vibe";
import { VenueEnergyTab } from "@/components/VenueEnergyTab";
import { VenuePeopleTab } from "@/components/VenuePeopleTab";
import { VenuePostsTab } from "@/components/VenuePostsTab";

interface VenueSocialPortalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venueId: string | null;
}

export function VenueSocialPortal({ open, onOpenChange, venueId }: VenueSocialPortalProps) {
  const { data: venue } = useVenueDetails(venueId);
  const { data: energyData } = useVenueEnergy(venueId);
  const { lat, lng } = useGeolocation();
  const { join, joinPending } = useVenueJoin(venue?.id ?? null, lat, lng);
  const [activeTab, setActiveTab] = useState<'energy' | 'people' | 'posts'>('energy');

  // Handle browser back button with cleanup
  useEffect(() => {
    if (!open) return;

    const handlePopState = () => {
      onOpenChange(false);
    };

    window.addEventListener("popstate", handlePopState);
    
    // Push single dummy state
    const currentPath = window.location.pathname + window.location.search;
    window.history.pushState({ venueSocial: venueId }, "", currentPath);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      // Clean up history state on unmount
      try {
        if (window.history.state?.venueSocial === venueId) {
          window.history.back();
        }
      } catch (e) {
        console.warn("History cleanup failed:", e);
      }
    };
  }, [open, onOpenChange, venueId]);

  const handleJoin = async () => {
    try {
      await join({ vibeOverride: venue?.vibe });
    } catch (error) {
      console.error("Failed to join venue:", error);
    }
  };

  const handleDirections = () => {
    if (venue) {
      const url = `https://maps.google.com/maps?daddr=${venue.lat},${venue.lng}`;
      window.open(url, "_blank");
    }
  };

  if (!venue || !energyData) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] overflow-hidden p-0">
        {/* Hero Section */}
        <div className="relative h-64 gradient-primary overflow-hidden">
          <motion.div
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 bg-gradient-to-br from-black/40 to-transparent"
          />
          
          {/* Floating energy particles */}
          <div className="absolute inset-0">
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-white/30 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  y: [-20, 20],
                  opacity: [0.3, 0.8, 0.3],
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              />
            ))}
          </div>

          {/* Venue Header */}
          <div className="absolute bottom-6 left-6 right-6">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-end justify-between"
            >
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-4xl">{vibeEmoji(venue.vibe)}</span>
                  <div className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-white">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      <span className="text-sm font-medium">{energyData.people_count} here now</span>
                    </div>
                  </div>
                </div>
                <h1 className="text-3xl font-bold text-white mb-1">{venue.name}</h1>
                <p className="text-white/80 text-lg">{energyData.socialTexture.moodDescription}</p>
              </div>
              
              {/* Energy Level Indicator */}
              <div className="text-right">
                <div className="flex items-center gap-2 text-white mb-1">
                  <Zap className="w-5 h-5" />
                  <span className="text-lg font-semibold">{Math.round(energyData.energy_level)}%</span>
                </div>
                <div className="w-20 h-2 bg-white/20 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-yellow-400 to-red-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${energyData.energy_level}%` }}
                    transition={{ delay: 0.5, duration: 1 }}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Tab Navigation */}
          <div className="flex border-b border-border/50 bg-card/50 backdrop-blur-sm" role="tablist">
            {[
              { id: 'energy', label: 'Energy', icon: TrendingUp },
              { id: 'people', label: 'People', icon: Users },
              { id: 'posts', label: 'Posts', icon: MessageCircle },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                role="tab"
                aria-selected={activeTab === id}
                aria-controls={`tabpanel-${id}`}
                onClick={() => setActiveTab(id as any)}
                className={`flex-1 flex items-center justify-center gap-2 py-4 transition-all ${
                  activeTab === id
                    ? 'text-primary border-b-2 border-primary bg-primary/5'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium">{label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              {activeTab === 'energy' && (
                <div
                  role="tabpanel"
                  id="tabpanel-energy"
                  aria-labelledby="tab-energy"
                >
                  <VenueEnergyTab venueId={venueId!} />
                </div>
              )}

              {activeTab === 'people' && (
                <div
                  role="tabpanel"
                  id="tabpanel-people"
                  aria-labelledby="tab-people"
                >
                  <VenuePeopleTab venueId={venueId!} />
                </div>
              )}

              {activeTab === 'posts' && (
                <div
                  role="tabpanel"
                  id="tabpanel-posts"
                  aria-labelledby="tab-posts"
                >
                  <VenuePostsTab venueId={venueId!} />
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Action Bar */}
          <div className="p-6 border-t border-border/50 bg-card/50 backdrop-blur-sm">
            <div className="grid grid-cols-2 gap-3">
              <Button
                size="lg"
                className="gradient-primary text-white font-semibold glow-primary"
                disabled={joinPending}
                onClick={handleJoin}
              >
                <Users className="w-4 h-4 mr-2" />
                {joinPending ? "Joining…" : "Join the Vibe"}
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                onClick={handleDirections}
                className="font-semibold"
              >
                <Navigation className="w-4 h-4 mr-2" />
                Directions
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}