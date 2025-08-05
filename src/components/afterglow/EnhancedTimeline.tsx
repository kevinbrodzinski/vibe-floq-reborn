import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, useMotionValue, useTransform, useSpring, PanInfo } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface EnhancedTimelineProps {
  moments: {
    id: string;
    timestamp: string;
    title: string;
    description?: string;
    color?: string;
    moment_type?: string;
    metadata?: any;
  }[];
}

export const EnhancedTimeline: React.FC<EnhancedTimelineProps> = ({ moments }) => {
  const [visibleMoment, setVisibleMoment] = useState<string | null>(null);
  const [isCondensedView, setIsCondensedView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollX = useMotionValue(0);
  const springScrollX = useSpring(scrollX, { damping: 20, stiffness: 100 });

  // Find the most recent moment for dynamic anchoring
  const mostRecentMoment = useMemo(() => {
    if (!moments.length) return null;
    return moments.reduce((latest, current) => {
      const latestTime = new Date(latest.timestamp).getTime();
      const currentTime = new Date(current.timestamp).getTime();
      return currentTime > latestTime ? current : latest;
    });
  }, [moments]);

  // Calculate timeline offset based on most recent moment
  const timelineOffset = useMemo(() => {
    if (!mostRecentMoment) return 0;
    const mostRecentTime = new Date(mostRecentMoment.timestamp).getTime();
    const earliestTime = new Date(moments[0].timestamp).getTime();
    const timeSpan = mostRecentTime - earliestTime;
    // Convert time span to visual offset (adjust multiplier as needed)
    return Math.max(0, (timeSpan / (1000 * 60 * 60)) * 50); // hours to pixels, reduced multiplier
  }, [moments, mostRecentMoment]);

  // Smooth scroll detection with throttling
  const updateVisibleMoment = useCallback(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const containerWidth = container.offsetWidth;
    const scrollLeft = container.scrollLeft;
    const centerX = scrollLeft + containerWidth / 2;
    
    let closestMoment = null;
    let closestDistance = Infinity;
    
    moments.forEach((moment, index) => {
      const position = getCurvedPosition(index, moments.length);
      const momentX = (position.x / 100) * container.scrollWidth;
      const distance = Math.abs(momentX - centerX);
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestMoment = moment;
      }
    });
    
    if (closestMoment && closestMoment.id !== visibleMoment) {
      setVisibleMoment(closestMoment.id);
    }
  }, [moments, visibleMoment]);

  // Throttled scroll handler
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    let timeoutId: number;
    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(updateVisibleMoment, 50);
    };
    
    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutId);
    };
  }, [updateVisibleMoment]);

  // Programmatic scroll to moment
  const scrollToMoment = useCallback((momentId: string) => {
    if (!containerRef.current) return;
    
    const momentIndex = moments.findIndex(m => m.id === momentId);
    if (momentIndex === -1) return;
    
    const position = getCurvedPosition(momentIndex, moments.length);
    const container = containerRef.current;
    const containerWidth = container.offsetWidth;
    const scrollWidth = container.scrollWidth;
    
    const targetScrollLeft = (position.x / 100) * scrollWidth - containerWidth / 2;
    const maxScrollLeft = scrollWidth - containerWidth;
    
    container.scrollTo({
      left: Math.max(0, Math.min(targetScrollLeft, maxScrollLeft)),
      behavior: 'smooth'
    });
  }, [moments]);

  // Auto-lock to most recent moment on mount
  useEffect(() => {
    if (mostRecentMoment) {
      setTimeout(() => {
        scrollToMoment(mostRecentMoment.id);
        setVisibleMoment(mostRecentMoment.id);
      }, 100);
    }
  }, [moments, mostRecentMoment, scrollToMoment]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getCurvedPosition = (index: number, total: number) => {
    const x = (index / (total - 1)) * 100;
    const y = 60 + Math.sin((index / (total - 1)) * Math.PI * 2) * 20;
    return { x, y };
  };

  const handleDragEnd = (event: any, info: PanInfo) => {
    const newScrollX = scrollX.get() + info.offset.x;
    scrollX.set(newScrollX);
  };

  return (
    <div className="w-full">
      {/* View Toggle Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setIsCondensedView(!isCondensedView)}
          className="flex items-center space-x-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 rounded-lg text-white/90 text-sm font-medium transition-all duration-200 hover:scale-105"
        >
          <div className="w-4 h-4">
            {isCondensedView ? (
              <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                <path d="M8 6h8M8 12h8M8 18h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            )}
          </div>
          <span>{isCondensedView ? 'Timeline View' : 'Summary View'}</span>
        </button>
      </div>

      {/* Condensed Timeline View */}
      {isCondensedView && (
        <div className="space-y-3">
          {moments.map((moment, index) => (
            <motion.div
              key={moment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-card/95 backdrop-blur-xl rounded-lg p-4 border border-border/30 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02]"
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-3 h-3 rounded-full bg-purple-400 mt-1" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-white/90 text-sm truncate">
                      {moment.title}
                    </h3>
                    <span className="text-xs text-white/60 font-mono">
                      {formatTime(moment.timestamp)}
                    </span>
                  </div>
                  {moment.description && (
                    <p className="text-xs text-white/70 line-clamp-2 mb-2">
                      {moment.description}
                    </p>
                  )}
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-3 h-3 text-purple-400" />
                    <span className="text-xs text-white/60">
                      {moment.moment_type || 'Moment'}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Timeline View */}
      {!isCondensedView && (
        <motion.div 
          className="w-full"
          drag="x"
          dragConstraints={{ left: -1000, right: 1000 }}
          dragElastic={0.1}
          onDragEnd={handleDragEnd}
        >
          <div className="relative h-80 mb-16 w-full">
            {/* Curved Line with Fluid Motion - Dynamically anchored to most recent event */}
            <motion.div 
              className="absolute top-0 inset-x-0 w-[1200%]"
              style={{ 
                left: `-${550 + Math.min(timelineOffset, 200)}%`,
                x: useTransform(springScrollX, [0, 1000], [0, -5000 - Math.min(timelineOffset * 5, 1000)])
              }}
            >
              <svg
                viewBox="0 0 12000 200"
                className="w-full h-32"
                style={{ filter: 'drop-shadow(0 0 10px rgba(123, 97, 255, 0.3))' }}
              >
                <defs>
                  <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#7B61FF" />
                    <stop offset="25%" stopColor="#E12BFF" />
                    <stop offset="50%" stopColor="#7B61FF" />
                    <stop offset="75%" stopColor="#E12BFF" />
                    <stop offset="100%" stopColor="#7B61FF" />
                  </linearGradient>
                </defs>
                <path
                  id="flowPath"
                  d="M 0 80 Q 500 40 1000 80 Q 1500 120 2000 80 Q 2500 40 3000 80 Q 3500 120 4000 80 Q 4500 40 5000 80 Q 5500 120 6000 80 Q 6500 40 7000 80 Q 7500 120 8000 80 Q 8500 40 9000 80 Q 9500 120 10000 80 Q 10500 40 11000 80 Q 11500 120 12000 80"
                  stroke="url(#flowGradient)"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                />
                {/* Animated particles along the curve */}
                <circle r="2" fill="#E12BFF" opacity="0.6">
                  <animateMotion dur="12s" repeatCount="indefinite">
                    <mpath href="#flowPath" />
                  </animateMotion>
                </circle>
                <circle r="1.5" fill="#7B61FF" opacity="0.8">
                  <animateMotion dur="15s" repeatCount="indefinite">
                    <mpath href="#flowPath" />
                  </animateMotion>
                </circle>
                <circle r="1" fill="#E12BFF" opacity="0.4">
                  <animateMotion dur="18s" repeatCount="indefinite">
                    <mpath href="#flowPath" />
                  </animateMotion>
                </circle>
                <circle r="2.5" fill="#7B61FF" opacity="0.7">
                  <animateMotion dur="20s" repeatCount="indefinite">
                    <mpath href="#flowPath" />
                  </animateMotion>
                </circle>
              </svg>
            </motion.div>

            {/* Horizontal Scroll Container with Timeline Points and Cards - Rigidly locked */}
      <div
        ref={containerRef}
              className="flex gap-32 items-start h-full overflow-x-auto scrollbar-hide relative z-10 w-full"
              style={{ scrollSnapType: 'x proximity' }}
            >
              {moments.map((moment, index) => {
                const position = getCurvedPosition(index, moments.length);
                const isVisible = visibleMoment === moment.id;
                
                return (
                  <div key={moment.id} className="relative flex-shrink-0 w-full">
                    {/* Moment Node - Rigidly locked to curved line, no vertical movement */}
                    <div
                      data-moment-id={moment.id}
                      className="absolute z-20"
                      style={{ 
                        left: `${position.x}%`,
                        top: `${position.y}px`,
                        transform: 'translate(-50%, -50%)',
                        pointerEvents: 'none'
                      }}
                    >
                      <div
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                          isVisible 
                            ? 'border-purple-400 ring-4 ring-purple-400/30 bg-purple-500/20' 
                            : 'border-white/40 bg-white/10'
                        }`}
                      >
                        <div className="w-3 h-3 rounded-full bg-white/80" />
          </div>
                      
                      {/* Timestamp */}
                      <motion.div
                        className="absolute top-10 left-1/2 -translate-x-1/2 text-xs font-medium text-white/70 whitespace-nowrap"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: isVisible ? 1 : 0.5, y: isVisible ? 0 : -5 }}
                        transition={{ duration: 0.3 }}
                      >
                        {formatTime(moment.timestamp)}
                      </motion.div>
      </div>

                    {/* Directly Attached Card with Connecting Line - Rigidly locked to timeline point */}
                    <motion.div
                      className="absolute z-50"
                      style={{ 
                        left: `${position.x}%`,
                        top: `${position.y + 40}px`,
                        transform: 'translate(-50%, 0)',
                        pointerEvents: 'none'
                      }}
                      initial={{ opacity: 0, scale: 0.8, y: 20 }}
                      animate={{
                        opacity: isVisible ? 1 : 0,
                        scale: isVisible ? 1 : 0.8,
                        y: isVisible ? 0 : 20
                      }}
                      transition={{
                        type: "spring",
                        damping: 25,
                        stiffness: 300,
                        duration: 0.4
                      }}
                    >
                      {/* Connecting Line - Perfectly aligned with dot center */}
                      <div 
                        className="absolute top-0 w-px h-24 bg-gradient-to-b from-purple-400/80 via-purple-400/40 to-transparent" 
                        style={{ 
                          left: '0%',
                          transform: 'translateX(0)'
                        }} 
                      />
                      
                      {/* Card positioned directly below the connecting line */}
                      <div className="bg-card/95 backdrop-blur-xl rounded-xl p-4 border border-border/30 shadow-xl min-w-[280px] max-w-[320px] mt-24 ml-0">
                        <div className="flex items-start space-x-3">
                          <div className="w-2 h-2 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-white/90 text-sm mb-1 truncate">
                              {moment.title}
                            </h3>
                            {moment.description && (
                              <p className="text-xs text-white/70 line-clamp-2">
                                {moment.description}
                              </p>
                            )}
                            <div className="flex items-center space-x-2 mt-2">
                              <Sparkles className="w-3 h-3 text-purple-400" />
                              <span className="text-xs text-white/60">
                                {moment.moment_type || 'Moment'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};