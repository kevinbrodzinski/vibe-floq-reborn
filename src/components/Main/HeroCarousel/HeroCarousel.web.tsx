import React, { useRef } from 'react';
import { HeroCard } from '../HeroCard';
import { ParticleField } from '@/components/effects/ParticleField/ParticleField.web';

export function HeroCarousel({
  onOpen,
  color,
}: {
  onOpen: (key: 'momentary' | 'mine' | 'clubs' | 'business') => void;
  color?: string; // VIBE token color
}) {
  const scroller = useRef<HTMLDivElement>(null);

  return (
    <>
      <div
        ref={scroller}
        className="flex gap-4 overflow-x-auto no-scrollbar pr-10"
        style={{ scrollSnapType: 'x mandatory', height: 300 }}
      >
        <div style={{ scrollSnapAlign: 'start' }}>
          <HeroCard
            title="Happening Now"
            subtitle="Live momentary floqs forming"
            stats={[
              { v: '12', l: 'Active' },
              { v: '3', l: 'Near You' },
              { v: '47', l: 'People' },
            ]}
            onPress={() => onOpen('momentary')}
            particleField={<ParticleField color={color} />}
          />
        </div>
        <div style={{ scrollSnapAlign: 'start' }}>
          <HeroCard title="My Floqs" subtitle="Your persistent groups" stats={[{ v: '5', l: 'Groups' }]} onPress={() => onOpen('mine')} peek />
        </div>
        <div style={{ scrollSnapAlign: 'start' }}>
          <HeroCard title="Clubs" subtitle="Crews & scenes" onPress={() => onOpen('clubs')} peek />
        </div>
        <div style={{ scrollSnapAlign: 'start' }}>
          <HeroCard title="Business" subtitle="Venue perks & posts" onPress={() => onOpen('business')} peek />
        </div>
      </div>

      <div className="mt-2 flex items-center justify-center gap-2">
        <Dot active />
        <Dot />
        <Dot />
        <Dot />
      </div>
    </>
  );
}

function Dot({ active }: { active?: boolean }) {
  return (
    <div
      className={
        active
          ? 'h-2 w-6 rounded bg-[hsl(var(--primary))]'
          : 'h-2 w-2 rounded-full bg-[hsl(var(--muted-foreground)/.25)]'
      }
    />
  );
}