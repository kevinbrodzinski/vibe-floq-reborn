import { useState } from 'react';
import { GlassCard } from '../shared/GlassCard';
import { AuroraBackground } from '../shared/AuroraBackground';
import { Smartphone, Instagram, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Friend Import Screen - Quick social graph connection
 * Shows loading → success with friend count
 */
export function FriendImportScreen() {
  const [loading, setLoading] = useState(false);
  const [imported, setImported] = useState(false);
  const [friendCount, setFriendCount] = useState(0);

  const handleImport = (method: 'phone' | 'instagram') => {
    setLoading(true);
    
    // Simulate import with progressive status
    setTimeout(() => {
      setFriendCount(12);
      setTimeout(() => {
        setFriendCount(28);
        setTimeout(() => {
          setFriendCount(47);
          setLoading(false);
          setImported(true);
        }, 600);
      }, 600);
    }, 1000);
  };

  return (
    <div className="relative min-h-screen p-6">
      <AuroraBackground />
      
      <div className="relative z-10 max-w-md mx-auto space-y-6">
        <div className="text-center mb-8 animate-fade-in">
          <h2 className="text-2xl font-bold mb-2">Find Your Crew</h2>
          <p className="text-sm text-muted-foreground">
            {imported ? 'Friends added successfully!' : 'Import contacts to see who\'s already here'}
          </p>
        </div>

        {!imported && !loading && (
          <div className="space-y-3">
            <GlassCard variant="elevated" className="hover:scale-102 transition-transform cursor-pointer">
              <button 
                onClick={() => handleImport('phone')}
                className="w-full text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Smartphone className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium mb-1">Phone Contacts</div>
                    <div className="text-xs text-muted-foreground">Find friends from your contacts</div>
                  </div>
                </div>
              </button>
            </GlassCard>

            <GlassCard variant="elevated" className="hover:scale-102 transition-transform cursor-pointer">
              <button 
                onClick={() => handleImport('instagram')}
                className="w-full text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Instagram className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium mb-1">Instagram</div>
                    <div className="text-xs text-muted-foreground">Connect your Instagram friends</div>
                  </div>
                </div>
              </button>
            </GlassCard>

            <Button variant="ghost" className="w-full text-sm text-muted-foreground">
              Skip for now
            </Button>
          </div>
        )}

        {loading && (
          <GlassCard variant="elevated" className="text-center py-12">
            <div className="relative mb-6">
              <div className="h-16 w-16 mx-auto border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
            <div className="space-y-2">
              <div className="font-medium">Scanning contacts...</div>
              <div className="text-sm text-muted-foreground">
                {friendCount > 0 ? `Found ${friendCount} friends` : 'Finding friends...'}
              </div>
            </div>
          </GlassCard>
        )}

        {imported && (
          <div className="space-y-4 animate-scale-in">
            <GlassCard variant="elevated" className="text-center py-8">
              <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
                <Check className="h-8 w-8 text-green-500" />
              </div>
              <div className="text-2xl font-bold mb-2">{friendCount} Friends</div>
              <div className="text-sm text-muted-foreground">are already on Floq</div>
            </GlassCard>

            {/* Friend avatars preview */}
            <div className="flex justify-center -space-x-2">
              {Array.from({ length: Math.min(friendCount, 8) }).map((_, i) => (
                <div 
                  key={i}
                  className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/40 to-blue-500/40 border-2 border-background"
                  style={{ animationDelay: `${i * 50}ms` }}
                />
              ))}
              {friendCount > 8 && (
                <div className="h-10 w-10 rounded-full bg-background/60 border-2 border-background flex items-center justify-center text-xs">
                  +{friendCount - 8}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
