import * as React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { MomentaryRail } from "./rails/MomentaryRail";
import { TribesGrid } from "./rails/TribesGrid";
import { DiscoverRail } from "./rails/DiscoverRail";
import { useFloqsHubData } from "@/hooks/useFloqsHubData";
import { ConstellationView } from "@/components/constellation/ConstellationView";
import { onIdle } from "@/lib/prewarm";
import { PrewarmProbe } from "./PrewarmProbe";
import { useGeo } from "@/hooks/useGeo";

export default function FloqsMainHub() {
  const [tab, setTab] = React.useState<"momentary" | "tribes" | "public">("momentary");
  const [constellation, setConstellation] = React.useState(false);
  const [prewarm, setPrewarm] = React.useState(false);
  const { momentaryLive, tribes, publicFloqs, discover } = useFloqsHubData();
  const { coords } = useGeo();

  React.useEffect(() => {
    const cancel = onIdle(() => setPrewarm(true), 450);
    return cancel;
  }, []);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <h1 className="relative text-4xl sm:text-5xl font-extrabold tracking-tight">
            <span className="absolute inset-0 blur-xl opacity-20 bg-[radial-gradient(ellipse_at_center,hsl(var(--accent)/.45)_0%,transparent_60%)] -z-10" />
            Your Social Constellation
          </h1>
          <Button
            variant="secondary"
            className="rounded-full bg-secondary/70 hover:bg-secondary text-secondary-foreground px-4 h-9 shadow-sm"
            onClick={() => setConstellation(true)}
          >
            Constellation
          </Button>
        </div>

        <div className="mt-6">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
            <TabsList className="grid grid-cols-3 gap-2 rounded-full bg-secondary/50 p-1">
              <TabsTrigger value="momentary" className="data-[state=active]:bg-background data-[state=active]:text-foreground rounded-full h-9">
                Momentary
              </TabsTrigger>
              <TabsTrigger value="tribes" className="data-[state=active]:bg-background data-[state=active]:text-foreground rounded-full h-9">
                Tribes
              </TabsTrigger>
              <TabsTrigger value="public" className="data-[state=active]:bg-background data-[state=active]:text-foreground rounded-full h-9">
                Public
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <Separator />

      {/* Body */}
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-6 py-4">
          {tab === "momentary" && (
            <>
              <section>
                <h2 className="px-2 mt-6 text-lg font-semibold">Active Momentary</h2>
                <MomentaryRail items={momentaryLive} />
              </section>
              <section>
                <h2 className="px-2 mt-8 text-lg font-semibold">Discover</h2>
                <DiscoverRail items={discover} />
              </section>
            </>
          )}

          {tab === "tribes" && (
            <>
              <section>
                <h2 className="px-2 text-lg font-semibold">Your Tribes</h2>
                <TribesGrid items={tribes} />
              </section>
              <section>
                <h2 className="px-2 text-lg font-semibold">Discover</h2>
                <DiscoverRail items={discover} />
              </section>
            </>
          )}

          {tab === "public" && (
            <section>
              <h2 className="px-2 text-lg font-semibold">Public Floqs</h2>
              <DiscoverRail items={publicFloqs} />
            </section>
          )}
        </div>
        <ScrollBar orientation="vertical" />
      </ScrollArea>

      {constellation && <ConstellationView onClose={() => setConstellation(false)} />}
      {prewarm && <PrewarmProbe lat={coords?.lat ?? null} lng={coords?.lng ?? null} />}
    </div>
  );
}