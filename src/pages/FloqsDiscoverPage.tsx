import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import UnifiedFloqCard from "@/components/Floqs/UnifiedFloqCard";
import { useFloqsDiscovery } from "@/hooks/useFloqsDiscovery";
import { useMyFloqs } from "@/hooks/useMyFloqs";
import { useFloqJoin } from "@/hooks/useFloqJoin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  Filter, 
  MapPin, 
  Users, 
  Clock, 
  Sparkles,
  Zap,
  Heart
} from "lucide-react";

const vibeFilters = [
  { id: 'all', label: 'All', icon: Sparkles },
  { id: 'social', label: 'Social', icon: Users },
  { id: 'chill', label: 'Chill', icon: Heart },
  { id: 'hype', label: 'Hype', icon: Zap }
];

const FloqCard = ({ floq, onJoin }: { floq: any; onJoin: (id: string) => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl p-4 hover:bg-white/10 transition-all"
  >
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">{floq.name || floq.title}</h3>
        <Badge variant="secondary" className="text-xs">
          {floq.privacy || 'public'}
        </Badge>
      </div>
      
      {floq.description && (
        <p className="text-sm text-white/70 line-clamp-2">{floq.description}</p>
      )}
      
      <div className="flex items-center gap-4 text-xs text-white/60">
        <div className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          {floq.member_count || 0}
        </div>
        {floq.live_count > 0 && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            {floq.live_count} live
          </div>
        )}
        <div className="flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          {floq.primary_vibe || 'social'}
        </div>
      </div>
      
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => onJoin(floq.id)}
          className="flex-1"
        >
          Join
        </Button>
        <Button
          size="sm"
          variant="outline"
          asChild
        >
          <Link to={`/floqs/${floq.id}`}>View</Link>
        </Button>
      </div>
    </div>
  </motion.div>
);

export default function FloqsDiscoverPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVibe, setSelectedVibe] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const { data: mine } = useMyFloqs();
  const { data: discover, isLoading } = useFloqsDiscovery();
  const { join } = useFloqJoin();

  const handleJoinFloq = async (floqId: string) => {
    join({ floqId });
  };

  const filteredDiscover = discover?.filter(floq => {
    const matchesSearch = !searchQuery || 
      floq.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      floq.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      floq.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesVibe = selectedVibe === 'all' || floq.primary_vibe === selectedVibe;
    
    return matchesSearch && matchesVibe;
  }) || [];

  return (
    <div className="min-h-screen bg-gradient-field text-foreground">
      <header className="sticky top-0 z-20 border-b border-white/10 backdrop-blur-xl bg-background/70">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <div className="text-lg font-semibold">Floqs</div>
                <div className="text-xs text-muted-foreground">Connect with your circles</div>
              </div>
            </div>
            <Link to="/create/floq">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Create Floq</span>
              </Button>
            </Link>
          </div>

          {/* Search and Filters */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search floqs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? 'bg-white/10' : ''}
              >
                <Filter className="w-4 h-4" />
              </Button>
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex gap-2 flex-wrap"
                >
                  {vibeFilters.map((filter) => (
                    <Button
                      key={filter.id}
                      size="sm"
                      variant={selectedVibe === filter.id ? "default" : "outline"}
                      onClick={() => setSelectedVibe(filter.id)}
                    >
                      <filter.icon className="w-3 h-3 mr-1" />
                      {filter.label}
                    </Button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        {/* Your Floqs */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Your Floqs</h2>
            {mine && mine.length > 0 && (
              <Badge variant="secondary">{mine.length}</Badge>
            )}
          </div>
          
          {!mine || mine.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl p-8 text-center"
            >
              <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-gradient-primary/20 flex items-center justify-center">
                <Plus className="w-6 h-6 text-primary" />
              </div>
              <div className="text-muted-foreground mb-4">You haven't joined any floqs yet</div>
              <Link to="/create/floq">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Floq
                </Button>
              </Link>
            </motion.div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mine.map((floq) => (
                <motion.div
                  key={floq.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <UnifiedFloqCard item={floq} />
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Discover */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Discover</h2>
            {filteredDiscover.length > 0 && (
              <Badge variant="secondary">{filteredDiscover.length}</Badge>
            )}
          </div>
          
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-white/5 border border-white/10 p-4 animate-pulse"
                >
                  <div className="space-y-3">
                    <div className="h-4 bg-white/10 rounded" />
                    <div className="h-3 bg-white/10 rounded w-3/4" />
                    <div className="flex gap-2">
                      <div className="h-6 bg-white/10 rounded flex-1" />
                      <div className="h-6 bg-white/10 rounded w-16" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredDiscover.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl p-8 text-center"
            >
              <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-muted/20 flex items-center justify-center">
                <Search className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="text-muted-foreground">
                {searchQuery ? 'No floqs match your search' : 'No discoverable floqs found'}
              </div>
            </motion.div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDiscover.map((floq, index) => (
                <motion.div
                  key={floq.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <FloqCard floq={floq} onJoin={handleJoinFloq} />
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}