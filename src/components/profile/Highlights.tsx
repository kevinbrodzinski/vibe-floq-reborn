import { GlassCard } from './GlassCard';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MapPin, Clock, ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface HighlightsProps {
  profileId: string;
  isFriend: boolean;
}

const mockHighlights = {
  recentVibes: [
    { vibe: 'hype', text: 'Amazing night out!', timestamp: '2h ago' },
    { vibe: 'chill', text: 'Peaceful park walk', timestamp: '5h ago' },
    { vibe: 'social', text: 'Coffee with friends', timestamp: '1d ago' },
  ],
  topLocations: [
    { name: 'Blue Bottle Coffee', visits: 12, vibe: 'social' },
    { name: 'Golden Gate Park', visits: 8, vibe: 'chill' },
    { name: 'Mission District', visits: 6, vibe: 'hype' },
  ],
  recentFloqs: [
    { title: 'Coffee & Code', status: 'active', vibe: 'social' },
    { title: 'Sunset Walk', status: 'completed', vibe: 'chill' },
    { title: 'Late Night Vibes', status: 'completed', vibe: 'hype' },
  ],
};

export const Highlights = ({ profileId, isFriend }: HighlightsProps) => {
  const [openSections, setOpenSections] = useState<string[]>(['vibes']);

  const toggleSection = (section: string) => {
    setOpenSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const getVibeColor = (vibe: string) => {
    const colors = {
      hype: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
      chill: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      social: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
      flowing: 'bg-green-500/20 text-green-300 border-green-500/40',
    };
    return colors[vibe as keyof typeof colors] || colors.social;
  };

  return (
    <GlassCard>
      <h3 className="text-lg font-light text-white mb-4">Highlights</h3>
      
      <div className="space-y-4">
        {/* Recent Vibes */}
        <Collapsible 
          open={openSections.includes('vibes')}
          onOpenChange={() => toggleSection('vibes')}
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full text-left">
            <span className="text-sm font-medium text-white">Recent Vibes</span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${
              openSections.includes('vibes') ? 'rotate-180' : ''
            }`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2">
            {mockHighlights.recentVibes.map((item, index) => (
              <div key={index} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-current" style={{
                    color: item.vibe === 'hype' ? '#ec4899' : 
                           item.vibe === 'chill' ? '#3b82f6' : '#f97316'
                  }} />
                  <span className="text-sm text-white">{item.text}</span>
                </div>
                <span className="text-xs text-muted-foreground">{item.timestamp}</span>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Top Locations */}
        <Collapsible 
          open={openSections.includes('locations')}
          onOpenChange={() => toggleSection('locations')}
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full text-left">
            <span className="text-sm font-medium text-white">Top Locations</span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${
              openSections.includes('locations') ? 'rotate-180' : ''
            }`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2">
            {mockHighlights.topLocations.map((location, index) => (
              <div key={index} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm text-white">{location.name}</span>
                </div>
                <Badge variant="outline" className="text-xs border-white/20 text-muted-foreground">
                  {location.visits} visits
                </Badge>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Recent Floqs */}
        <Collapsible 
          open={openSections.includes('floqs')}
          onOpenChange={() => toggleSection('floqs')}
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full text-left">
            <span className="text-sm font-medium text-white">Recent Floqs</span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${
              openSections.includes('floqs') ? 'rotate-180' : ''
            }`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2">
            {mockHighlights.recentFloqs.map((floq, index) => (
              <div key={index} className="flex items-center justify-between py-2">
                <span className="text-sm text-white">{floq.title}</span>
                <div className="flex items-center gap-2">
                  <Badge className={getVibeColor(floq.vibe)}>
                    {floq.vibe}
                  </Badge>
                  <Badge variant="outline" className={
                    floq.status === 'active' 
                      ? 'border-green-500 text-green-300'
                      : 'border-white/20 text-muted-foreground'
                  }>
                    {floq.status}
                  </Badge>
                </div>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      </div>
    </GlassCard>
  );
};