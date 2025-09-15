import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Clock, Users, Star } from 'lucide-react';

interface ConvergeSuggestion {
  id: string;
  name: string;
  category?: string;
  lngLat: { lng: number; lat: number };
  etaMe: number; // minutes
  etaFriend: number; // minutes
  score: number; // 0-1
  openNow?: boolean;
  vibeMatch?: number; // 0-1
}

interface Props {
  friendId: string;
  friendName: string;
  myLocation: { lng: number; lat: number };
  friendLocation: { lng: number; lat: number };
  onRequest: (suggestion: ConvergeSuggestion) => void;
  onClose: () => void;
}

export const ConvergeSuggestions: React.FC<Props> = ({
  friendId,
  friendName,
  myLocation,
  friendLocation,
  onRequest,
  onClose
}) => {
  const [suggestions, setSuggestions] = useState<ConvergeSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching convergence suggestions
    // In reality, this would call your venue ranking API
    const fetchSuggestions = async () => {
      setLoading(true);
      
      // Mock data - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const mockSuggestions: ConvergeSuggestion[] = [
        {
          id: 'cafe-1',
          name: 'The Grind Coffee',
          category: 'Cafe',
          lngLat: { lng: (myLocation.lng + friendLocation.lng) / 2, lat: (myLocation.lat + friendLocation.lat) / 2 },
          etaMe: 8,
          etaFriend: 12,
          score: 0.92,
          openNow: true,
          vibeMatch: 0.85
        },
        {
          id: 'bar-1', 
          name: 'Rooftop Lounge',
          category: 'Bar',
          lngLat: { lng: myLocation.lng + 0.001, lat: myLocation.lat + 0.001 },
          etaMe: 5,
          etaFriend: 18,
          score: 0.78,
          openNow: true,
          vibeMatch: 0.70
        },
        {
          id: 'park-1',
          name: 'Meridian Hill Park',
          category: 'Park',
          lngLat: { lng: friendLocation.lng - 0.001, lat: friendLocation.lat - 0.001 },
          etaMe: 15,
          etaFriend: 6,
          score: 0.65,
          openNow: true,
          vibeMatch: 0.60
        }
      ];
      
      setSuggestions(mockSuggestions);
      setLoading(false);
    };

    fetchSuggestions();
  }, [myLocation, friendLocation]);

  const handleRequest = (suggestion: ConvergeSuggestion) => {
    onRequest(suggestion);
    onClose();
    
    // Analytics
    window.dispatchEvent(new CustomEvent('ui_card_action', {
      detail: { kind: 'convergence', action: 'request', id: suggestion.id }
    }));
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[80] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        
        {/* Modal */}
        <motion.div
          className="relative w-full max-w-lg bg-background border border-border rounded-2xl shadow-xl overflow-hidden"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Meet with {friendName}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Suggested convergence points
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Finding the best spots...</p>
              </div>
            ) : suggestions.length === 0 ? (
              <div className="p-6 text-center">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No convergence points found nearby.</p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {suggestions.map((suggestion) => (
                  <motion.button
                    key={suggestion.id}
                    onClick={() => handleRequest(suggestion)}
                    className="w-full p-4 text-left rounded-xl border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors group"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                          {suggestion.name}
                        </h3>
                        {suggestion.category && (
                          <p className="text-sm text-muted-foreground">
                            {suggestion.category}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs font-medium text-primary">
                        <Star size={12} className="fill-current" />
                        {Math.round(suggestion.score * 100)}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-xs">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock size={12} />
                        <span>You: {suggestion.etaMe}m</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock size={12} />
                        <span>{friendName}: {suggestion.etaFriend}m</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Users size={12} />
                        <span>{suggestion.openNow ? 'Open' : 'Closed'}</span>
                      </div>
                    </div>

                    {suggestion.vibeMatch && suggestion.vibeMatch > 0.7 && (
                      <div className="mt-2 text-xs text-primary font-medium">
                        Great vibe match
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border bg-muted/30">
            <p className="text-xs text-muted-foreground text-center">
              Suggestions are ranked by travel time, vibe compatibility, and venue openness
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};