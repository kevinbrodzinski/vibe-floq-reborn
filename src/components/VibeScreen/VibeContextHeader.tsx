import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Switch } from '@/components/ui/switch';
import { FilterChip } from '@/components/ui/FilterChip';
import { useFriendVibeMatches } from '@/hooks/useFriendVibeMatches';
import { getVibeIcon } from '@/utils/vibeIcons';
import { Zap, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

export const VibeContextHeader: React.FC = () => {
  const { data: friends } = useFriendVibeMatches();
  const [autoVibeEnabled, setAutoVibeEnabled] = useState(false);
  
  // Mock data for demo - would come from real hooks
  const currentVibe = 'flowing';
  const friendCount = friends.length;
  const venueCount = 12;
  const matchPercentage = 78;
  const hotspotCount = 3;
  const peakProgress = 65; // 65% through the 45min window

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mb-3 rounded-xl bg-black/40 backdrop-blur-sm border border-white/10 p-4"
    >
      {/* Narrative headline */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{getVibeIcon(currentVibe)}</span>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-white">
            Flowing wave right now
          </h2>
          <p className="text-sm text-white/70">
            {friendCount} friends • {venueCount} venues aligned
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-white/60">Peak overlap window</span>
          <span className="text-xs text-white/60">16 min left</span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${peakProgress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Action ribbon */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Vibe chip */}
        <FilterChip 
          active={true}
          onClick={() => console.log('Show vibe selector')}
          className="min-w-[80px] bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 text-cyan-300"
        >
          {getVibeIcon(currentVibe)} Flowing
        </FilterChip>

        {/* Match percentage chip */}
        <FilterChip 
          active={false}
          onClick={() => console.log('Show match details')}
          className="min-w-[80px] border-purple-400/30 text-purple-300"
        >
          {matchPercentage}% match
        </FilterChip>

        {/* Hotspots chip */}
        <FilterChip 
          active={false}
          onClick={() => console.log('Show hotspots map')}
          className="min-w-[90px] border-yellow-400/30 text-yellow-300"
        >
          <MapPin className="w-3 h-3" />
          {hotspotCount} hotspots
        </FilterChip>

        {/* Auto-Vibe toggle */}
        <div className="flex items-center gap-2 ml-auto">
          <Zap className={cn(
            "w-4 h-4 transition-colors",
            autoVibeEnabled ? "text-yellow-400" : "text-white/40"
          )} />
          <Switch 
            checked={autoVibeEnabled}
            onCheckedChange={setAutoVibeEnabled}
            className="data-[state=checked]:bg-yellow-500"
          />
          <span className="text-xs text-white/70 whitespace-nowrap">Auto-Vibe</span>
        </div>
      </div>
    </motion.div>
  );
};