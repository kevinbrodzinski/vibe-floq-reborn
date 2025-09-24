import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Route, 
  TrendingUp, 
  Clock, 
  MapPin, 
  Navigation,
  ChevronLeft,
  ChevronRight,
  X,
  Footprints,
  BarChart3
} from 'lucide-react';
import { useFlowRoute } from '@/hooks/useFlowRoute';
import { useEnhancedHaptics } from '@/hooks/useEnhancedHaptics';
import { eventBridge, Events } from '@/services/eventBridge';

interface RetracePathChipProps {
  className?: string;
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
}

export const RetracePathChip: React.FC<RetracePathChipProps> = ({ 
  className = '',
  position = 'bottom-left'
}) => {
  const { 
    flowRoute, 
    hasRecentActivity, 
    isRetracing,
    canRetrace,
    retraceProgress,
    startRetrace, 
    stopRetrace,
    navigateRetrace,
    getSuggestedNext,
    getFlowRouteStats 
  } = useFlowRoute();
  
  const haptics = useEnhancedHaptics();
  const [showMenu, setShowMenu] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const stats = getFlowRouteStats();
  const suggestion = getSuggestedNext();

  const handleRetrace = useCallback(() => {
    haptics.breadcrumb();
    if (isRetracing) {
      stopRetrace();
    } else {
      startRetrace();
      setShowMenu(false);
    }
  }, [isRetracing, startRetrace, stopRetrace, haptics]);

  const handleSuggestion = useCallback(() => {
    if (suggestion) {
      haptics.selection();
      eventBridge.emit(Events.UI_VENUE_SELECT, { 
        venueId: suggestion.venueId 
      });
      setShowMenu(false);
    }
  }, [suggestion, haptics]);

  const handleNavigateRetrace = useCallback((direction: 'next' | 'previous') => {
    haptics.light();
    navigateRetrace(direction);
  }, [navigateRetrace, haptics]);

  // Don't show if no recent activity
  if (!hasRecentActivity && !isRetracing) {
    return null;
  }

  // Format distance for display
  const formatDistance = (meters: number): string => {
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  // Format duration for display
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  // Format time ago
  const formatTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  // Position classes based on prop
  const positionClasses = {
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'top-left': 'top-20 left-4',
    'top-right': 'top-20 right-4'
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-[500] ${className}`}>
      {/* Main chip button */}
      <motion.button
        onClick={() => isRetracing ? null : setShowMenu(!showMenu)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-full
          ${isRetracing 
            ? 'bg-gradient-to-r from-pink-500/20 to-violet-500/20 border border-pink-500/30' 
            : 'bg-black/80 border border-white/10'
          }
          backdrop-blur-xl transition-all shadow-lg
          ${!isRetracing && 'hover:bg-black/90 active:scale-95'}
        `}
        whileTap={!isRetracing ? { scale: 0.95 } : undefined}
      >
        <Route className={`w-4 h-4 ${isRetracing ? 'text-pink-400' : 'text-white/70'}`} />
        <span className={`text-sm font-medium ${isRetracing ? 'text-pink-400' : 'text-white/70'}`}>
          {isRetracing ? retraceProgress : `${flowRoute.length} stops`}
        </span>
        {stats.totalDistance > 100 && !isRetracing && (
          <span className="text-xs text-white/40">
            {formatDistance(stats.totalDistance)}
          </span>
        )}
      </motion.button>

      {/* Retrace controls (shown when retracing) */}
      <AnimatePresence>
        {isRetracing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center gap-2 mt-2"
          >
            <button
              onClick={() => handleNavigateRetrace('previous')}
              className="w-8 h-8 rounded-full bg-black/80 border border-white/10 backdrop-blur-xl flex items-center justify-center text-white/70 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => handleNavigateRetrace('next')}
              className="w-8 h-8 rounded-full bg-black/80 border border-white/10 backdrop-blur-xl flex items-center justify-center text-white/70 hover:text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            
            <button
              onClick={stopRetrace}
              className="w-8 h-8 rounded-full bg-black/80 border border-white/10 backdrop-blur-xl flex items-center justify-center text-red-400 hover:text-red-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dropdown menu */}
      <AnimatePresence>
        {showMenu && !isRetracing && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute bottom-full mb-2 left-0 w-72 bg-black/95 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
          >
            {/* Trail summary header */}
            <div className="p-4 border-b border-white/5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-white">Your Flow Route</span>
                <button
                  onClick={() => setShowStats(!showStats)}
                  className="text-xs text-white/40 hover:text-white/60 transition-colors flex items-center gap-1"
                >
                  <BarChart3 className="w-3 h-3" />
                  Stats
                </button>
              </div>
              
              {/* Stats view */}
              {showStats ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/50">Distance</span>
                    <span className="text-white/80">{formatDistance(stats.totalDistance)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/50">Duration</span>
                    <span className="text-white/80">{formatDuration(stats.totalDuration)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/50">Venues</span>
                    <span className="text-white/80">{stats.uniqueVenues}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/50">Started</span>
                    <span className="text-white/80">{formatTimeAgo(stats.oldestPoint)}</span>
                  </div>
                </div>
              ) : (
                <>
                  {/* Mini trail visualization */}
                  <div className="flex items-center gap-1 mb-3">
                    {flowRoute.slice(-5).map((point, index) => (
                      <React.Fragment key={point.id}>
                        <motion.div 
                          className="relative group"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <div 
                            className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500/20 to-violet-500/20 flex items-center justify-center cursor-pointer hover:from-pink-500/30 hover:to-violet-500/30 transition-colors"
                            onClick={() => {
                              eventBridge.emit(Events.UI_MAP_FLY_TO, {
                                lng: point.position[0],
                                lat: point.position[1],
                                zoom: 18,
                                duration: 800
                              });
                              setShowMenu(false);
                            }}
                          >
                            <MapPin className="w-3.5 h-3.5 text-white/60" />
                          </div>
                          
                          {/* Tooltip */}
                          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                            <div className="px-2 py-1 bg-black/90 rounded text-[10px] text-white/80 whitespace-nowrap">
                              {point.venueName || 'Unknown'}
                            </div>
                          </div>
                        </motion.div>
                        
                        {index < flowRoute.slice(-5).length - 1 && (
                          <motion.div 
                            className="flex-1 h-px bg-gradient-to-r from-pink-500/20 to-violet-500/20"
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{ delay: index * 0.05 + 0.025 }}
                          />
                        )}
                      </React.Fragment>
                    ))}
                  </div>

                  <div className="flex gap-3 text-[11px] text-white/50">
                    <span className="flex items-center gap-1">
                      <Footprints className="w-3 h-3" />
                      {stats.points} stops
                    </span>
                    <span className="flex items-center gap-1">
                      <Route className="w-3 h-3" />
                      {formatDistance(stats.totalDistance)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(stats.totalDuration)}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="p-1">
              {/* Retrace button */}
              <button
                onClick={handleRetrace}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all text-left group"
              >
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-pink-500/20 to-violet-500/20 flex items-center justify-center group-hover:from-pink-500/30 group-hover:to-violet-500/30 transition-colors">
                  <Route className="w-4 h-4 text-pink-400" />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-white font-medium">Follow Route</div>
                  <div className="text-xs text-white/40">Navigate back through your trail</div>
                </div>
                <ChevronRight className="w-4 h-4 text-white/30" />
              </button>

              {/* Suggestion button */}
              {suggestion && (
                <button
                  onClick={handleSuggestion}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all text-left group"
                >
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500/20 to-pink-500/20 flex items-center justify-center group-hover:from-violet-500/30 group-hover:to-pink-500/30 transition-colors">
                    <TrendingUp className="w-4 h-4 text-violet-400" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-white font-medium">Continue Pattern</div>
                    <div className="text-xs text-white/40">
                      {suggestion.confidence > 0.7 ? 'Usually' : 'Sometimes'} go here next
                    </div>
                  </div>
                  <span className="text-xs text-white/30">
                    {Math.round(suggestion.confidence * 100)}%
                  </span>
                </button>
              )}

              {/* Recent venues list */}
              <div className="mt-2 pt-2 border-t border-white/5">
                <div className="px-3 py-1 text-[11px] text-white/40 font-medium">Recent Stops</div>
                {flowRoute.slice(-3).reverse().map((point, index) => (
                  <button
                    key={point.id}
                    onClick={() => {
                      eventBridge.emit(Events.UI_MAP_FLY_TO, {
                        lng: point.position[0],
                        lat: point.position[1],
                        zoom: 18,
                        duration: 800
                      });
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center">
                      <span className="text-xs text-white/50">{flowRoute.length - index}</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-white/70">
                        {point.venueName || `Stop ${flowRoute.length - index}`}
                      </div>
                      <div className="text-[10px] text-white/40 flex items-center gap-2">
                        <span>{formatTimeAgo(point.timestamp)}</span>
                        {point.duration && (
                          <>
                            <span>•</span>
                            <span>{formatDuration(point.duration)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Navigation className="w-3 h-3 text-white/30" />
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};