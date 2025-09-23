import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HeroCarousel } from './HeroCarousel/HeroCarousel.web';
import { SectionRow } from './SectionRow';
import { ParticleField } from '../effects/ParticleField/ParticleField.web';
import { FloatingActionButton } from '@/components/fab/FloatingActionButton.web';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface FloqMainPageProps {
  vibe?: string;
  onOpenVibe?: () => void;
  topPerks?: Array<{id: string; title: string; value: string; label: string}>;
  friendsIn?: Array<{id: string; title: string; count: number; label: string}>;
  branchOut?: Array<{id: string; title: string; value: string; label: string}>;
}

export const FloqMainPage: React.FC<FloqMainPageProps> = ({
  vibe = 'chill',
  onOpenVibe,
  topPerks = [],
  friendsIn = [],
  branchOut = []
}) => {
  const navigate = useNavigate();
  const [fabOpen, setFabOpen] = useState(false);

  const heroCards = [
    {
      id: 'happening-now',
      title: 'Happening Now',
      vibe: 'energetic',
      onPress: () => navigate('/momentary-nearby'),
      showParticles: true
    },
    {
      id: 'my-floqs',
      title: 'My Floqs',
      vibe: 'chill',
      onPress: () => navigate('/my-floqs')
    },
    {
      id: 'clubs',
      title: 'Clubs',
      vibe: 'social',
      onPress: () => navigate('/clubs')
    },
    {
      id: 'business',
      title: 'Business',
      vibe: 'focused',
      onPress: () => navigate('/business-floqs')
    }
  ];

  const handleFabSelect = (key: 'moment' | 'plan' | 'business') => {
    setFabOpen(false);
    switch (key) {
      case 'moment':
        navigate('/create/moment');
        break;
      case 'plan':
        navigate('/create/plan');
        break;
      case 'business':
        navigate('/create/business');
        break;
    }
  };

  const handleSectionItemPress = (sectionType: string, item: any) => {
    switch (sectionType) {
      case 'perks':
        navigate(`/business-floqs?perkId=${item.id}`);
        break;
      case 'friends':
        navigate(`/momentary-nearby?venueId=${item.id}`);
        break;
      case 'discovery':
        navigate(`/discovery?targetId=${item.id}`);
        break;
    }
  };

  return (
    <div className="min-h-screen bg-[color:var(--background)] relative">
      {/* Header */}
      <motion.div 
        className="sticky top-0 z-50 bg-[color:var(--background)]/80 backdrop-blur-sm"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between px-6 py-4">
          <h1 className="text-2xl font-bold text-[color:var(--foreground)] select-none">
            floq
          </h1>
          
          {/* Avatar with glow effect */}
          <button 
            onClick={() => navigate('/profile')}
            className="relative group"
            aria-label="Open profile"
          >
            <div className="absolute inset-0 -m-2 rounded-full bg-[color:var(--primary)]/35 blur-md pointer-events-none group-hover:bg-[color:var(--primary)]/50 transition-colors" />
            <Avatar className="h-10 w-10 border border-[color:var(--border)] relative z-10">
              <AvatarImage src="/placeholder.svg" />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
          </button>
        </div>
      </motion.div>

      {/* Vibe pill section */}
      <motion.div 
        className="text-center pb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <p className="text-xs text-[color:var(--muted-foreground)] mb-2">
          discovering around you
        </p>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full border-[color:var(--primary)] bg-[color:var(--background)]/70 backdrop-blur hover:shadow"
          onClick={onOpenVibe}
        >
          <span className="text-xs text-[color:var(--muted-foreground)] mr-2">vibe</span>
          <span className="text-xs font-semibold text-[color:var(--primary)]">{vibe}</span>
        </Button>
      </motion.div>

      {/* Hero Carousel with Particle Field */}
      <motion.div 
        className="relative px-6 mb-6"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <ParticleField />
        <HeroCarousel items={heroCards} />
      </motion.div>

      {/* Data Sections */}
      <div className="px-6 py-4 space-y-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <SectionRow
            title="Top Perks Near You"
            items={topPerks}
            onItemPress={(item) => handleSectionItemPress('perks', item)}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {/* Transform friendsIn data to match SectionItem interface */}
          {(() => {
            const friendsInData = friendsIn?.map(item => ({
              id: item.id,
              title: item.title,
              value: String(item.count),
              label: item.label
            })) || [];
            
            return (
              <SectionRow
                title="Friends Are In"
                items={friendsInData}
                onItemPress={(item) => handleSectionItemPress('friends', item)}
              />
            );
          })()}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <SectionRow
            title="Branch Out"
            items={branchOut}
            onItemPress={(item) => handleSectionItemPress('discovery', item)}
          />
        </motion.div>
      </div>

      {/* FAB */}
      <FloatingActionButton
        open={fabOpen}
        onToggle={() => setFabOpen(!fabOpen)}
        onSelect={handleFabSelect}
        badgeCount={3}
      />
    </div>
  );
};