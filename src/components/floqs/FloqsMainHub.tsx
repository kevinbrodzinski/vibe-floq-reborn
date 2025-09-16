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
          <h1
            className="text-2xl font-bold tracking-tight hover:opacity-90 cursor-pointer"
            aria-label="Open constellation view"
            onClick={() => setConstellation(true)}
          >
            Your Social Constellation
          </h1>
          <Button variant="secondary" size="sm" onClick={() => setConstellation(true)}>
            Constellation
          </Button>
        </div>

        <div className="mt-3">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
            <TabsList className="grid grid-cols-3 gap-2 w-full">
              <TabsTrigger value="momentary">Momentary</TabsTrigger>
              <TabsTrigger value="tribes">Tribes</TabsTrigger>
              <TabsTrigger value="public">Public</TabsTrigger>
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
                <h2 className="px-2 text-lg font-semibold">Active Momentary</h2>
                <MomentaryRail items={momentaryLive} />
              </section>
              <section>
                <h2 className="px-2 text-lg font-semibold">Discover</h2>
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