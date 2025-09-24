import * as React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { MomentaryRail } from "./rails/MomentaryRail";
import { TribesRail } from "./rails/TribesRail";
import { PublicRail } from "./rails/PublicRail";
import { DiscoverRail } from "./rails/DiscoverRail";
import { useFloqsHubData } from "@/hooks/useFloqsHubData";
import { ConstellationView } from "@/components/constellation/ConstellationView";
import { onIdle } from "@/lib/prewarm";
import { PrewarmProbe } from "./PrewarmProbe";
import { useGeo } from "@/hooks/useGeo";
import { FloqPeekSheet } from "./FloqPeekSheet";
import { MockHotkeys } from "@/components/dev/MockHotkeys";
import { ActiveMomentaryRail } from "./rails/ActiveMomentaryRail";
import { PerfectTimingCard } from "./cards/PerfectTimingCard";
import { MomentaryFiltersBar } from "./filters/MomentaryFilters";
import { useMomentaryFilters } from "@/hooks/useMomentaryFilters";
import { useUserVibe } from "@/hooks/useUserVibe";
import type { VibeKey } from "@/hooks/useMomentaryFilters";
import { JoinIntentBar } from "./wcc/JoinIntentBar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { similarity } from "@/lib/vibe/similarity";
import { OrbitIndicators } from "./constellation/OrbitIndicators";
import { LocationPermissionPrompt } from "../LocationPermissionPrompt";

export default function FloqsMainHub() {
  const [tab, setTab] = React.useState<"momentary" | "tribes" | "public">("momentary");
  const [constellation, setConstellation] = React.useState(false);
  const [prewarm, setPrewarm] = React.useState(false);
  const hubData = useFloqsHubData();
  const { coords } = useGeo();
  const { filters } = useMomentaryFilters();
  const userVibe = useUserVibe();

  function computeSmartFlags(f: any) {
    // Matches my vibe: use real vector sim if present, else fallback to recsys / vibe_delta
    const sim = similarity(userVibe.vector, f);
    const fallback = (f.recsys_score ?? (1 - (f.vibe_delta ?? 0.3)));
    const matchVibe = sim >= 0.75 || fallback >= 0.75;

    // Low friction: same as before
    const vibeGap = Math.max(0, Math.min(1, f.vibe_delta ?? 0.2));
    const eta = Math.min(1, (f.eta_minutes ?? 0) / 30);
    const door = f.door_policy === "line" ? 0.35 : f.door_policy === "cover" ? 0.25 : f.door_policy === "guest" ? 0.15 : 0;
    const friction = Math.min(1, 0.5*eta + 0.3*door + 0.2*vibeGap);
    const lowFriction = friction <= 0.35;

    // Building energy: as before
    const energyNow = f.energy_now ?? 0.5;
    const peak = Math.max(energyNow, f.energy_peak ?? 0.6);
    const peakRatio = peak > 0 ? energyNow / peak : 0.0;
    const buildingEnergy = energyNow >= 0.5 && peakRatio >= 0.75;

    return { matchVibe, lowFriction, buildingEnergy };
  }

  function applyMomentaryFilters(list: any[]) {
    const now = Date.now();
    const endsSoonCutoff = now + 30 * 60 * 1000;

    return list.filter((f) => {
      // vibe chips
      const vibe: string | undefined = f.vibe?.toLowerCase?.();
      const vibeOk = !filters.vibes.length || (vibe && filters.vibes.includes(vibe as VibeKey));

      // ends soon
      const endTs = f.ends_at ? +new Date(f.ends_at) : undefined;
      const soonOk = !filters.endsSoon || (endTs !== undefined && endTs <= endsSoonCutoff);

      // smart filters (all selected must pass)
      const s = computeSmartFlags(f);
      const smartOk = !filters.smart.length || filters.smart.every((k) => s[k]);

      return vibeOk && soonOk && smartOk;
    });
  }
  
  // Debug logging for data issues (dev only)
  React.useEffect(() => {
    if (typeof window !== "undefined" && !import.meta.env.PROD) {
      console.log("[FloqsMainHub] Hub data:", {
        momentaryLive: hubData.momentaryLive.length,
        tribes: hubData.tribes.length,
        publicFloqs: hubData.publicFloqs.length,
        discover: hubData.discover.length,
        coords,
        hasValidLocation: (hubData as any).hasValidLocation,
        locationError: (hubData as any).locationError
      });
    }
  }, [hubData, coords]);

  // Show location prompt if no location and user is viewing location-dependent tabs
  const showLocationPrompt = !(hubData as any).hasValidLocation && 
                           (tab === 'momentary' || tab === 'public') && 
                           coords && coords.lat === 0 && coords.lng === 0;

  React.useEffect(() => {
    const cancel = onIdle(() => setPrewarm(true), 450);
    return cancel;
  }, []);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="relative flex min-h-dvh flex-col overflow-hidden">
        {/* Atmospheric Background */}
        <div className="absolute inset-0 bg-[var(--gradient-field)] -z-20" />
        <div className="absolute inset-0 bg-[var(--gradient-vibe)] opacity-5 -z-10" />
        

        {/* Header */}
        <div className="relative px-4 pt-4 pb-2 bg-background/30 backdrop-blur-md border-b border-border/20">
          <div className="flex items-center justify-between">
            <h1 className="relative text-4xl sm:text-5xl font-extrabold tracking-tight">
              <span className="absolute inset-0 blur-2xl opacity-40 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text -z-10" />
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                Your Social Constellation
              </span>
            </h1>
            <Button
              variant="secondary"
              className="relative rounded-full bg-secondary/40 hover:bg-secondary/60 text-secondary-foreground px-4 h-9 backdrop-blur-sm border border-border/30 shadow-lg hover:shadow-[var(--glow-secondary)] transition-all duration-300 hover:scale-105"
              onClick={() => setConstellation(true)}
              aria-label="Open constellation view"
            >
              <span className="relative z-10">Constellation</span>
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-full opacity-0 hover:opacity-100 transition-opacity duration-300" />
            </Button>
          </div>

          <OrbitIndicators 
            activeTab={tab}
            momentaryCount={applyMomentaryFilters(hubData.momentaryLive).length}
            tribesCount={hubData.tribes.length}
            publicCount={hubData.publicFloqs.length}
          />

          <div className="mt-6">
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
              <TabsList className="relative grid grid-cols-3 gap-2 rounded-full bg-background/20 backdrop-blur-md border border-border/30 p-1 shadow-lg">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 opacity-60" />
                <TabsTrigger value="momentary" className="relative data-[state=active]:bg-background/80 data-[state=active]:text-foreground data-[state=active]:shadow-[var(--glow-active)] rounded-full h-9 transition-all duration-300 hover:bg-background/40">
                  Momentary
                </TabsTrigger>
                <TabsTrigger value="tribes" className="relative data-[state=active]:bg-background/80 data-[state=active]:text-foreground data-[state=active]:shadow-[var(--glow-active)] rounded-full h-9 transition-all duration-300 hover:bg-background/40">
                  Tribes
                </TabsTrigger>
                <TabsTrigger value="public" className="relative data-[state=active]:bg-background/80 data-[state=active]:text-foreground data-[state=active]:shadow-[var(--glow-active)] rounded-full h-9 transition-all duration-300 hover:bg-background/40">
                  Public
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <Separator className="bg-border/30" />

        {/* Body */}
        <ScrollArea className="flex-1 px-2">
          <div className="relative space-y-6 py-4">
            {/* Dynamic content glow based on active tab */}
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-accent/5 pointer-events-none opacity-60" />
            
            {/* Location Permission Prompt */}
            {showLocationPrompt && (
              <LocationPermissionPrompt 
                onLocationGranted={() => window.location.reload()}
                onSkip={() => setTab('tribes')}
              />
            )}
            {tab === "momentary" && (
              <>
                <section className="relative">
                  <h2 className="relative px-2 mt-6 text-lg font-semibold">
                    <span className="relative z-10">Active Momentary</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent h-px bottom-0" />
                  </h2>
                  <MomentaryFiltersBar />
                  {applyMomentaryFilters(hubData.momentaryLive).length > 0 ? (
                    <ActiveMomentaryRail items={applyMomentaryFilters(hubData.momentaryLive)} />
                  ) : (
                    <div className="px-2 py-6 text-sm text-muted-foreground/80">
                      {!(hubData as any).hasValidLocation 
                        ? "Enable location to discover nearby momentary floqs"
                        : "No momentary floqs match your filters"
                      }
                    </div>
                  )}
                </section>
                <section className="relative">
                  <h2 className="relative px-2 mt-8 text-lg font-semibold">
                    <span className="relative z-10">Discover</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent/20 to-transparent h-px bottom-0" />
                  </h2>
                  <div className="px-2 mt-3">
                    <PerfectTimingCard />
                  </div>
                </section>
              </>
            )}

            {tab === "tribes" && (
              <>
                <section className="relative">
                  <h2 className="relative px-2 text-lg font-semibold">
                    <span className="relative z-10">Your Tribes</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent h-px bottom-0" />
                  </h2>
                  {hubData.tribes.length ? (
                    <TribesRail items={hubData.tribes as any} />
                  ) : (
                    <div className="px-2 py-6 text-sm text-muted-foreground/80">
                      You haven't joined any tribes yet
                    </div>
                  )}
                </section>
              </>
            )}

            {tab === "public" && (
              <>
                <section className="relative">
                  <h2 className="relative px-2 text-lg font-semibold">
                    <span className="relative z-10">Public Floqs</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent/20 to-transparent h-px bottom-0" />
                  </h2>
                  {hubData.publicFloqs.length ? (
                    <PublicRail items={hubData.publicFloqs as any} />
                  ) : (
                    <div className="px-2 py-6 text-sm text-muted-foreground/80">
                      {!(hubData as any).hasValidLocation 
                        ? "Enable location to discover public floqs nearby"
                        : "No public floqs found nearby"
                      }
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      </div>

      {constellation && (
        <ConstellationView
          onClose={() => setConstellation(false)}
          nodes={hubData.constellationNodes}
          edges={hubData.constellationEdges}
        />
      )}
      {prewarm && <PrewarmProbe lat={coords?.lat ?? null} lng={coords?.lng ?? null} />}
      
      {/* Dev: keyboard mocks toggle (⌘⌥M / Ctrl+Alt+M) */}
      {!import.meta.env.PROD && <MockHotkeys />}
      
      {/* Mount Peek Sheet once */}
      <FloqPeekSheet />
    </TooltipProvider>
  );
}