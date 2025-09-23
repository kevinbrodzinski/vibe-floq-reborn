import React from 'react';
import { useNavigate } from 'react-router-dom';
import { VibePill } from '@/components/floq/VibePill';
import { HeroCarousel } from '@/components/Main/HeroCarousel/HeroCarousel.web';
import { SectionRow } from '@/components/Main/SectionRow';
import { FloatingActionButton } from '@/components/fab/FloatingActionButton.web';
import { AvatarWithGlow } from '@/components/Main/AvatarWithGlow';
import { FabAmbientParticles } from '@/components/fab/FabAmbientParticles.web';
import { FabOrbitParticles } from '@/components/fab/FabOrbitParticles.web';
import { vibeToHex, vibeToHue } from '@/lib/vibe/hsl';
import type { Vibe } from '@/lib/vibes';

type Perk = { id: string; title: string; value: string; label: string };
type FriendIn = { id: string; title: string; count: number; label: string };

export function FloqMainPage({
  vibe = 'chill',
  topPerks = [],
  friendsIn = [],
  branchOut = [],
}: {
  vibe?: Vibe | string;
  topPerks?: Perk[];
  friendsIn?: FriendIn[];
  branchOut?: Perk[];
}) {
  const navigate = useNavigate();
  const [fabOpen, setFabOpen] = React.useState(false);

  // Token-driven colors: hex for UI accents, hue for atmospheric effects
  const safeVibe = (vibe && typeof vibe === 'string' ? vibe : 'chill') as Vibe;
  const vibeColor = vibeToHex(safeVibe);  // Brand-consistent token color
  const vibeHue = vibeToHue(safeVibe);    // Derived hue for atmospheric effects

  const handleHeroOpen = (key: 'momentary' | 'mine' | 'clubs' | 'business') => {
    if (key === 'momentary') navigate('/momentary-nearby');
    if (key === 'mine') navigate('/my-floqs');
    if (key === 'clubs') navigate('/clubs');
    if (key === 'business') navigate('/business-floqs');
  };

  return (
    <div className="min-h-dvh bg-[hsl(var(--background))] text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-2 pb-1">
        <h1 className="text-2xl font-bold tracking-tight select-none">floq</h1>
        <AvatarWithGlow color={vibeColor} />
      </header>

      {/* Tagline + Vibe */}
      <div className="flex flex-col items-center pb-1">
        <div className="text-[12px] text-[hsl(var(--muted-foreground))]">
          discovering around you
        </div>
        <div className="mt-2">
          <VibePill vibe={vibe as any} />
        </div>
      </div>

      {/* Hero carousel (Version 1: Particle Field) */}
      <div className="mt-2 px-4">
        <HeroCarousel 
          color={vibeColor} 
          hue={vibeHue}
          onOpen={handleHeroOpen} 
        />
      </div>

      {/* Sections */}
      <SectionRow
        title="Top Perks Near You"
        meta="Social graph"
        items={topPerks}
        onPressItem={(id) => navigate(`/business-floqs?perkId=${id}`)}
      />

      <SectionRow
        title="Friends Are In"
        meta="Live floqs"
        items={friendsIn.map((x) => ({
          id: x.id,
          title: x.title,
          value: String(x.count),
          label: x.label,
        }))}
        onPressItem={(id) => navigate(`/momentary-nearby?venueId=${id}`)}
      />

      <SectionRow
        title="Branch Out"
        meta="Discovery"
        items={branchOut}
        onPressItem={(id) => navigate(`/discovery?targetId=${id}`)}
      />

      {/* Ambient & Orbit Particles - Pause when FAB is open */}
      <FabAmbientParticles color={vibeColor} enabled={!fabOpen} />
      <FabOrbitParticles color={vibeColor} enabled={!fabOpen} />

      {/* FAB */}
      <FloatingActionButton
        open={fabOpen}
        onToggle={() => setFabOpen((o) => !o)}
        onSelect={(k) => {
          setFabOpen(false);
          if (k === 'moment') navigate('/create/moment');
          if (k === 'plan') navigate('/create/plan');
          if (k === 'business') navigate('/create/business');
        }}
        badgeCount={3}
      />
    </div>
  );
}
