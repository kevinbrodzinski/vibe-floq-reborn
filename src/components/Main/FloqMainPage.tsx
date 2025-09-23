import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HeroCarousel } from './HeroCarousel/HeroCarousel.web';
import { SectionRow } from './SectionRow';
import { ParticleField } from '../effects/ParticleField/ParticleField.web';
import { AvatarDropdown } from '../AvatarDropdown';

interface FloqMainPageProps {
  vibe?: string;
  topPerks?: Array<{id: string; title: string; value: string; label: string}>;
  friendsIn?: Array<{id: string; title: string; count: number; label: string}>;
  branchOut?: Array<{id: string; title: string; value: string; label: string}>;
}

export const FloqMainPage: React.FC<FloqMainPageProps> = ({
  vibe = 'chill',
  topPerks = [],
  friendsIn = [],
  branchOut = []
}) => {
  const navigate = useNavigate();

  const heroCards = [
    {
      id: 'happening-now',
      title: 'Happening Now',
      subtitle: 'Live moments near you',
      action: () => navigate('/floqs-hub?tab=momentary'),
      showParticles: true
    },
    {
      id: 'my-floqs',
      title: 'My Floqs',
      subtitle: 'Your saved events',
      action: () => navigate('/floqs/discover')
    },
    {
      id: 'clubs',
      title: 'Clubs & Tribes',
      subtitle: 'Join communities',
      action: () => navigate('/floqs-hub?tab=tribes')
    },
    {
      id: 'business',
      title: 'Business Events',
      subtitle: 'Professional networking',
      action: () => navigate('/business-floqs')
    }
  ];

  return (
    <div className="min-h-screen bg-[color:var(--background)]">
      {/* Header */}
      <motion.div 
        className="sticky top-0 z-50 bg-[color:var(--background)]/80 backdrop-blur-sm"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-[color:var(--foreground)]">
              Floq
            </h1>
            <p className="text-sm text-[color:var(--muted-foreground)]">
              Discover, connect, experience
            </p>
          </div>
          <AvatarDropdown />
        </div>
      </motion.div>

      {/* Hero Carousel with Particle Field */}
      <motion.div 
        className="relative"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <ParticleField />
        <HeroCarousel cards={heroCards} />
      </motion.div>

      {/* Data Sections */}
      <div className="px-6 py-8 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <SectionRow
            title="Top Perks Near You"
            items={topPerks}
            onItemPress={(item) => navigate(`/perk/${item.id}`)}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <SectionRow
            title="Friends Are In"
            items={friendsIn}
            onItemPress={(item) => navigate(`/floq/${item.id}`)}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <SectionRow
            title="Branch Out & Explore"
            items={branchOut}
            onItemPress={(item) => navigate(`/explore/${item.id}`)}
          />
        </motion.div>
      </div>
    </div>
  );
};