import React from 'react';
import { useNavigate } from 'react-router-dom';
import { VibePill } from '@/components/vibe/VibePill';
import { HeroCarousel } from '@/components/Main/HeroCarousel/HeroCarousel.web';
import { SectionRow } from '@/components/Main/SectionRow';
import { FloatingActionButton } from '@/components/fab/FloatingActionButton.web';

type Perk = { id: string; title: string; value: string; label: string };
type FriendIn = { id: string; title: string; count: number; label: string };

export function FloqMainPage({
  vibe = "chill",
  topPerks = [],
  friendsIn = [],
  branchOut = [],
}: {
  vibe?: string;
  topPerks?: Perk[];
  friendsIn?: FriendIn[];
  branchOut?: Perk[];
}) {
  const navigate = useNavigate();
  const [fabOpen, setFabOpen] = React.useState(false);

  return (
    <div className="flex-1 min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-2 pb-1">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">floq</h1>
        <button 
          className="w-10 h-10 rounded-full bg-muted"
          onClick={() => navigate('/profile')}
          aria-label="Open profile"
        />
      </div>

      {/* Tagline + Vibe */}
      <div className="text-center pb-1">
        <p className="text-xs text-muted-foreground">discovering around you</p>
        <div className="mt-2">
          <VibePill vibe={vibe as any} />
        </div>
      </div>

      {/* Hero carousel */}
      <div className="mt-2 px-4">
        <HeroCarousel
          onOpen={(key) => {
            if (key === 'momentary') navigate('/momentary-nearby');
            if (key === 'mine') navigate('/my-floqs');
            if (key === 'clubs') navigate('/clubs');
            if (key === 'business') navigate('/business-floqs');
          }}
        />
      </div>

      {/* Sections */}
      <SectionRow
        title="Top Perks Near You"
        items={topPerks}
        onItemPress={(id) => navigate(`/business-floqs?perk=${id}`)}
      />

      <SectionRow
        title="Friends Are In"
        items={friendsIn.map((x) => ({ id: x.id, title: x.title, value: String(x.count), label: x.label }))}
        onItemPress={(id) => navigate(`/momentary-nearby?venue=${id}`)}
      />

      <SectionRow
        title="Branch Out"
        items={branchOut}
        onItemPress={(id) => navigate(`/discovery?target=${id}`)}
      />

      {/* FAB */}
      <FloatingActionButton
        open={fabOpen}
        onToggle={() => setFabOpen((o: boolean) => !o)}
        onSelect={(k) => {
          setFabOpen(false);
          if (k === 'moment') navigate('/create-moment');
          if (k === 'plan') navigate('/new-plan');
          if (k === 'business') navigate('/business-post');
        }}
        badgeCount={3}
      />
    </div>
  );
}
