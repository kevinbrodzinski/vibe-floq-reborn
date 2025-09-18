import React, { useState } from "react";
import { Glass } from "@/components/Common/Glass";
import { NeonPill } from "@/components/Common/NeonPill";
import { Sparkles, Users, Heart, Zap, Search } from "lucide-react";
import { useMyFloqs } from "@/hooks/useMyFloqs";
import { useFloqsDiscovery } from "@/hooks/useFloqsDiscovery";
import { Link } from "react-router-dom";
import { useFloqJoin } from "@/hooks/useFloqJoin";
import UnifiedFloqCard from "@/components/Floqs/UnifiedFloqCard";

const vibeFilters = [
  { id: "all", label: "All", icon: Sparkles },
  { id: "social", label: "Social", icon: Users },
  { id: "chill", label: "Chill", icon: Heart },
  { id: "hype", label: "Hype", icon: Zap },
];

export default function FloqsDiscoverPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVibe, setSelectedVibe] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const { data: mine = [] } = useMyFloqs();
  const { data: discover = [], isLoading } = useFloqsDiscovery();
  const { join } = useFloqJoin();

  const handleJoinFloq = (floqId: string) => {
    join({ floqId });
  };

  const filteredDiscover = discover?.filter((floq: any) => {
    const name = (floq.name || floq.title || "").toLowerCase();
    const description = (floq.description || "").toLowerCase();
    const matchesSearch = !searchQuery || 
      name.includes(searchQuery.toLowerCase()) || 
      description.includes(searchQuery.toLowerCase());
    const matchesVibe = selectedVibe === "all" || 
      (floq.primary_vibe || "").toLowerCase() === selectedVibe;
    const notMine = !mine.some((m: any) => m.id === floq.id);
    return matchesSearch && matchesVibe && notMine;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Floqs</h1>
            <p className="text-[12px] text-white/60">Connect with your circles</p>
          </div>
          <Link 
            to="/create/floq" 
            className="px-4 py-2 rounded-xl neon-pill text-[12px] hover:bg-white/15 transition neon-ring"
          >
            Create Floq
          </Link>
        </div>

        {/* Search & Filters */}
        <Glass className="p-3 flex items-center gap-3 mb-6">
          <Search className="h-4 w-4 text-white/50" />
          <input
            aria-label="Search floqs"
            className="flex-1 bg-transparent outline-none text-[13px] placeholder-white/40"
            placeholder="Search floqs, vibes, or topics…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button 
            type="button" 
            className={`px-3 py-1 rounded-lg text-[11px] transition ${
              showFilters ? "neon-pill neon-ring" : "bg-white/5 border border-white/10 hover:bg-white/10"
            }`}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters
          </button>
        </Glass>

        {/* Vibe Filters */}
        {showFilters && (
          <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-none">
            {vibeFilters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setSelectedVibe(filter.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] border transition whitespace-nowrap ${
                  selectedVibe === filter.id 
                    ? "bg-white/15 border-white/20" 
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                }`}
              >
                <filter.icon className="h-3.5 w-3.5" />
                {filter.label}
              </button>
            ))}
          </div>
        )}

        {/* My Floqs Section */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-[14px] font-semibold text-white/90">Your Floqs</h2>
            {mine.length > 0 && (
              <NeonPill className="text-[10px]">{mine.length}</NeonPill>
            )}
          </div>

          {mine.length === 0 ? (
            <Glass className="p-6 text-center">
              <div className="text-[13px] text-white/70 mb-3">
                You haven't joined any floqs yet
              </div>
              <Link 
                to="/create/floq" 
                className="text-[12px] text-white/90 hover:text-white underline"
              >
                Create your first floq
              </Link>
            </Glass>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mine.map((floq: any) => (
                <UnifiedFloqCard key={floq.id} item={floq} />
              ))}
            </div>
          )}
        </section>

        {/* Discover Section */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-[14px] font-semibold text-white/90">Discover</h2>
            {filteredDiscover && filteredDiscover.length > 0 && (
              <NeonPill className="text-[10px]">{filteredDiscover.length}</NeonPill>
            )}
          </div>

          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div 
                  key={i} 
                  className="h-32 rounded-xl glass animate-pulse"
                />
              ))}
            </div>
          ) : !filteredDiscover || filteredDiscover.length === 0 ? (
            <Glass className="p-6 text-center">
              <div className="text-[13px] text-white/70">
                {searchQuery || selectedVibe !== "all" 
                  ? "No floqs match your search criteria" 
                  : "No discoverable floqs found"
                }
              </div>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedVibe("all");
                  }}
                  className="mt-2 text-[12px] text-white/90 hover:text-white underline"
                >
                  Clear filters
                </button>
              )}
            </Glass>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDiscover.map((floq: any) => (
                <div key={floq.id} className="relative">
                  <UnifiedFloqCard item={floq} showJoinButton />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}