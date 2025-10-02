import { useState } from 'react';
import { GlassCard } from '../shared/GlassCard';
import { AuroraBackground } from '../shared/AuroraBackground';
import { MapPin, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

const VIBES = [
  { id: 'chill', label: 'Chill', color: 'from-blue-500 to-cyan-500' },
  { id: 'social', label: 'Social', color: 'from-purple-500 to-pink-500' },
  { id: 'hype', label: 'Hype', color: 'from-orange-500 to-red-500' },
  { id: 'flowing', label: 'Flowing', color: 'from-green-500 to-emerald-500' },
  { id: 'curious', label: 'Curious', color: 'from-indigo-500 to-violet-500' },
  { id: 'romantic', label: 'Romantic', color: 'from-pink-500 to-rose-500' },
];

const CREW_SIZES = [
  { id: 'solo', label: 'Solo', icon: '👤' },
  { id: 'duo', label: '2-3', icon: '👥' },
  { id: 'squad', label: '4-6', icon: '👨‍👩‍👧' },
  { id: 'party', label: '7+', icon: '🎉' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const YEARS = Array.from({ length: 60 }, (_, i) => new Date().getFullYear() - 18 - i);

/**
 * Setup Screen - 60-second onboarding
 * Location, birthday, vibes, crew size
 */
export function SetupScreen() {
  const [location, setLocation] = useState<string | null>(null);
  const [birthMonth, setBirthMonth] = useState<string>('');
  const [birthYear, setBirthYear] = useState<string>('');
  const [selectedVibes, setSelectedVibes] = useState<Set<string>>(new Set());
  const [crewSize, setCrewSize] = useState<string | null>(null);

  const detectLocation = () => {
    // Simulate location detection
    setTimeout(() => setLocation('Venice Beach, CA'), 800);
  };

  const toggleVibe = (id: string) => {
    setSelectedVibes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="relative min-h-screen p-6">
      <AuroraBackground />
      
      <div className="relative z-10 max-w-md mx-auto space-y-6">
        <div className="text-center mb-8 animate-fade-in">
          <h2 className="text-2xl font-bold mb-2">60-Second Setup</h2>
          <p className="text-sm text-muted-foreground">Help us tailor your experience</p>
        </div>

        {/* Location */}
        <GlassCard variant="elevated" className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <MapPin className="h-4 w-4 text-primary" />
            <span>Location</span>
          </div>
          
          {location ? (
            <div className="text-foreground">{location}</div>
          ) : (
            <Button onClick={detectLocation} variant="outline" size="sm" className="w-full">
              Detect Location
            </Button>
          )}
        </GlassCard>

        {/* Birthday */}
        <GlassCard variant="elevated" className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="h-4 w-4 text-primary" />
            <span>Birth Date</span>
          </div>
          
          <div className="flex gap-2">
            <select 
              value={birthMonth}
              onChange={e => setBirthMonth(e.target.value)}
              className="flex-1 bg-background/40 border border-white/10 rounded-lg px-3 py-2 text-sm backdrop-blur-md"
            >
              <option value="">Month</option>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            
            <select 
              value={birthYear}
              onChange={e => setBirthYear(e.target.value)}
              className="flex-1 bg-background/40 border border-white/10 rounded-lg px-3 py-2 text-sm backdrop-blur-md"
            >
              <option value="">Year</option>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </GlassCard>

        {/* Vibes */}
        <GlassCard variant="elevated" className="space-y-3">
          <div className="text-sm font-medium">What vibes match your style?</div>
          
          <div className="grid grid-cols-2 gap-2">
            {VIBES.map((vibe, i) => (
              <button
                key={vibe.id}
                onClick={() => toggleVibe(vibe.id)}
                className={`
                  relative p-3 rounded-lg border transition-all
                  ${selectedVibes.has(vibe.id) 
                    ? 'border-primary bg-primary/10 scale-105' 
                    : 'border-white/10 bg-background/20 hover:scale-102'}
                `}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${vibe.color} opacity-0 rounded-lg transition-opacity ${selectedVibes.has(vibe.id) ? 'opacity-20' : ''}`} />
                <span className="relative text-sm font-medium">{vibe.label}</span>
              </button>
            ))}
          </div>
        </GlassCard>

        {/* Crew Size */}
        <GlassCard variant="elevated" className="space-y-3">
          <div className="text-sm font-medium">Typical crew size?</div>
          
          <div className="grid grid-cols-4 gap-2">
            {CREW_SIZES.map(crew => (
              <button
                key={crew.id}
                onClick={() => setCrewSize(crew.id)}
                className={`
                  p-3 rounded-lg border transition-all
                  ${crewSize === crew.id 
                    ? 'border-primary bg-primary/10 scale-105' 
                    : 'border-white/10 bg-background/20 hover:scale-102'}
                `}
              >
                <div className="text-2xl mb-1">{crew.icon}</div>
                <div className="text-xs">{crew.label}</div>
              </button>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
