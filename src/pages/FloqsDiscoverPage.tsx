import React from "react";
import { Link } from "react-router-dom";
import UnifiedFloqCard from "@/components/Floqs/UnifiedFloqCard";
import { useFloqsDiscovery } from "@/hooks/useFloqsDiscovery";
import { useMyFloqs } from "@/hooks/useMyFloqs";
import Btn from "@/components/Common/Btn";
import { Plus, Search, Filter } from "lucide-react";

export default function FloqsDiscoverPage() {
  const { data: mine } = useMyFloqs();
  const { data: discover, isLoading } = useFloqsDiscovery();

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 backdrop-blur-xl bg-zinc-950/70">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-lg font-semibold">Floqs</div>
            <div className="text-[11px] text-white/60">Your collaborative spaces</div>
          </div>
          <div className="flex items-center gap-2">
            <Btn ariaLabel="Search floqs"><Search className="h-4 w-4" /></Btn>
            <Btn ariaLabel="Filter"><Filter className="h-4 w-4" /></Btn>
            <Link to="/create/floq">
              <Btn ariaLabel="Create floq">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Create</span>
              </Btn>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-5">
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold text-white/90">Your Floqs</div>
            {mine && mine.length > 0 && (
              <div className="text-[11px] text-white/60">{mine.length} floqs</div>
            )}
          </div>
          
          {!mine || mine.length === 0 ? (
            <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl p-8 text-center">
              <div className="text-[13px] text-white/70 mb-3">You haven't joined any floqs yet</div>
              <Link to="/create/floq">
                <Btn>
                  <Plus className="h-4 w-4 mr-1" />
                  Create Your First Floq
                </Btn>
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mine.map((f) => <UnifiedFloqCard key={f.id} item={f} />)}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold text-white/90">Discover</div>
            {discover && discover.length > 0 && (
              <div className="text-[11px] text-white/60">{discover.length} floqs</div>
            )}
          </div>
          
          {isLoading ? (
            <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl p-8 text-center">
              <div className="text-[13px] text-white/60">Loading floqs…</div>
            </div>
          ) : !discover || discover.length === 0 ? (
            <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl p-8 text-center">
              <div className="text-[13px] text-white/70">No discoverable floqs found</div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {discover.map((f) => <UnifiedFloqCard key={f.id} item={f} />)}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}