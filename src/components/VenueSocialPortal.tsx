import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MapPin, 
  Users, 
  TrendingUp, 
  Zap, 
  Heart, 
  MessageCircle,
  UserPlus,
  Navigation,
  Sparkles,
  Clock,
  Activity
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useVenueDetails } from "@/hooks/useVenueDetails";
import { useEnhancedVenueDetails } from "@/hooks/useEnhancedVenueDetails";
import { useVenueJoin } from "@/hooks/useVenueJoin";
import { useGeolocation } from "@/hooks/useGeolocation";
import { vibeEmoji } from "@/utils/vibe";
import { getVibeColor } from "@/utils/getVibeColor";

interface VenueSocialPortalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venueId: string | null;
}

export function VenueSocialPortal({ open, onOpenChange, venueId }: VenueSocialPortalProps) {
  const { data: venue } = useVenueDetails(venueId);
  const { data: socialData, isLoading } = useEnhancedVenueDetails(venueId);
  const { lat, lng } = useGeolocation();
  const { join, joinPending } = useVenueJoin(venue?.id ?? null, lat, lng);
  const [activeTab, setActiveTab] = useState<'energy' | 'people' | 'posts'>('energy');

  // Handle browser back button
  useEffect(() => {
    const handlePopState = () => {
      if (open) {
        onOpenChange(false);
      }
    };

    if (open) {
      window.addEventListener("popstate", handlePopState);
      window.history.pushState(null, "", window.location.href);
    }

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [open, onOpenChange]);

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

  if (!venue || !socialData) return null;

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
                      <span className="text-sm font-medium">{socialData.people_count} here now</span>
                    </div>
                  </div>
                </div>
                <h1 className="text-3xl font-bold text-white mb-1">{venue.name}</h1>
                <p className="text-white/80 text-lg">{socialData.socialTexture.moodDescription}</p>
              </div>
              
              {/* Energy Level Indicator */}
              <div className="text-right">
                <div className="flex items-center gap-2 text-white mb-1">
                  <Zap className="w-5 h-5" />
                  <span className="text-lg font-semibold">{Math.round(socialData.energy_level)}%</span>
                </div>
                <div className="w-20 h-2 bg-white/20 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-yellow-400 to-red-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${socialData.energy_level}%` }}
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
          <div className="flex border-b border-border/50 bg-card/50 backdrop-blur-sm">
            {[
              { id: 'energy', label: 'Energy', icon: TrendingUp },
              { id: 'people', label: 'People', icon: Users },
              { id: 'posts', label: 'Posts', icon: MessageCircle },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
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
                <motion.div
                  key="energy"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="p-6 space-y-6"
                >
                  {/* Social Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-medium">Vibe Diversity</span>
                      </div>
                      <div className="text-2xl font-bold">{Math.round(socialData.vibe_diversity_score * 100)}%</div>
                      <Progress value={socialData.vibe_diversity_score * 100} className="mt-2" />
                    </div>

                    <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-medium">Avg Session</span>
                      </div>
                      <div className="text-2xl font-bold">{socialData.avg_session_minutes}m</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {socialData.socialTexture.socialDynamics.sessionIntensity}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-green-400" />
                        <span className="text-sm font-medium">Active Floqs</span>
                      </div>
                      <div className="text-2xl font-bold">{socialData.active_floq_count}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {socialData.total_floq_members} total members
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-orange-400" />
                        <span className="text-sm font-medium">Dominant Vibe</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{vibeEmoji(socialData.dominant_vibe)}</span>
                        <span className="text-lg font-bold capitalize">{socialData.dominant_vibe}</span>
                      </div>
                    </div>
                  </div>

                  {/* Timing Insights */}
                  <div className="p-4 rounded-xl bg-card/50 border border-border/50">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Social Insights
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Crowd Size</span>
                        <span className="text-sm font-medium">{socialData.socialTexture.socialDynamics.crowdSize}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Vibe Stability</span>
                        <div className="flex items-center gap-2">
                          <Progress value={socialData.socialTexture.socialDynamics.vibeStability * 100} className="w-16" />
                          <span className="text-sm font-medium">{Math.round(socialData.socialTexture.socialDynamics.vibeStability * 100)}%</span>
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                        <p className="text-sm text-primary font-medium">
                          💡 {socialData.socialTexture.timingInsights.recommendation}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'people' && (
                <motion.div
                  key="people"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="p-6 space-y-4"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Who's Here Now</h3>
                    <Badge variant="secondary">{socialData.livePresence.length} people</Badge>
                  </div>

                  <div className="space-y-3">
                    {socialData.livePresence.map((person) => (
                      <motion.div
                        key={person.user_id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between p-3 rounded-lg bg-card/50 border border-border/50 hover:bg-card/80 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={person.profiles.avatar_url} />
                            <AvatarFallback>
                              {person.profiles.display_name?.charAt(0) || person.profiles.username.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{person.profiles.display_name || person.profiles.username}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span className="text-lg">{vibeEmoji(person.vibe)}</span>
                              <span>{person.session_duration}</span>
                            </div>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost">
                          <UserPlus className="w-4 h-4" />
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === 'posts' && (
                <motion.div
                  key="posts"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="p-6 space-y-4"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Recent Activity</h3>
                    <Badge variant="secondary">{socialData.recentPosts.length} posts</Badge>
                  </div>

                  <div className="space-y-4">
                    {socialData.recentPosts.map((post) => (
                      <motion.div
                        key={post.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-lg bg-card/50 border border-border/50"
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={post.profiles.avatar_url} />
                            <AvatarFallback className="text-xs">
                              {post.profiles.display_name?.charAt(0) || post.profiles.username.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-sm">{post.profiles.display_name || post.profiles.username}</p>
                              <span className="text-lg">{vibeEmoji(post.vibe)}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(post.created_at).toLocaleTimeString()}
                              </span>
                            </div>
                            {post.text_content && (
                              <p className="text-sm text-muted-foreground mb-2">{post.text_content}</p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Heart className="w-3 h-3" />
                                <span>{post.reaction_count || 0}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span>{post.view_count || 0} views</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
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