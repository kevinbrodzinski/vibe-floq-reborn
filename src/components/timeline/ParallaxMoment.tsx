import React, { memo } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useHaptic } from '@/hooks/useHaptic';
import { TimelineItem, TimelineSeparator, TimelineDot, TimelineConnector, TimelineContent } from '@/components/ui/timeline';
import { Chip } from '@/components/ui/Chip';
import { getMomentIcon, getColorFromHex, formatMomentType } from '@/constants/moments';
import { format } from 'date-fns';

interface ParallaxMomentProps {
  moment: any;
  index: number;
  isLast: boolean;
  containerRef: React.RefObject<HTMLElement>;
}

const ParallaxMoment = memo(({ moment, index, isLast, containerRef }: ParallaxMomentProps) => {
  const prefersReduced = usePrefersReducedMotion();
  const { triggerHaptic } = useHaptic();
  
  // Guard against null containerRef to avoid Framer warnings
  const { scrollYProgress } = useScroll({
    target: containerRef?.current ? containerRef : undefined,
    offset: ["start end", "end start"]
  });

  // Create parallax transforms (disabled if user prefers reduced motion)
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    prefersReduced ? [0, 0] : [-20 * index, 20 * index]
  );
  
  const opacity = useTransform(
    scrollYProgress,
    [0, 0.2, 0.8, 1],
    [0.6, 1, 1, 0.6]
  );

  const color = getColorFromHex(moment.color);
  const IconComponent = getMomentIcon(moment.moment_type);
  const formattedType = formatMomentType(moment.moment_type);

  const handleMomentClick = () => {
    // Only trigger haptics on native platforms
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      triggerHaptic('light');
    }
  };

  if (prefersReduced) {
    return (
      <div onClick={handleMomentClick} className="cursor-pointer hover:bg-muted/5 rounded-lg p-2 transition-colors">
        <TimelineItem>
          <TimelineSeparator>
            <TimelineDot color={moment.color ?? "#6b7280"} />
            {!isLast && <TimelineConnector />}
          </TimelineSeparator>
          
          <TimelineContent className="ml-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-muted-foreground w-16 font-mono">
                {format(new Date(moment.timestamp), 'p')}
              </span>
              
              <Chip color={color} icon={<IconComponent className="h-3 w-3" />}>
                {formattedType}
              </Chip>
              
              {moment.metadata?.venue_name && (
                <Chip key="venue" color="blue">
                  {moment.metadata.venue_name}
                </Chip>
              )}
              
              {moment.metadata?.vibe && (
                <Chip key="vibe" color="emerald">
                  {moment.metadata.vibe}
                </Chip>
              )}
            </div>

            <div className="pb-6">
              <h3 className="font-medium text-foreground">{moment.title}</h3>
              {moment.description && (
                <p className="text-sm text-muted-foreground mt-1">{moment.description}</p>
              )}
            </div>
          </TimelineContent>
        </TimelineItem>
      </div>
    );
  }

  return (
    <motion.div
      style={{ y, opacity }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: index * 0.1,
        type: "spring",
        stiffness: 100,
        damping: 15
      }}
      onClick={handleMomentClick} 
      className="cursor-pointer hover:bg-muted/5 rounded-lg p-2 transition-colors"
    >
      <TimelineItem>
        <TimelineSeparator>
          <TimelineDot color={moment.color ?? "#6b7280"} />
          {!isLast && <TimelineConnector />}
        </TimelineSeparator>
        
        <TimelineContent className="ml-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-muted-foreground w-16 font-mono">
              {format(new Date(moment.timestamp), 'p')}
            </span>
            
            <Chip color={color} icon={<IconComponent className="h-3 w-3" />}>
              {formattedType}
            </Chip>
            
            {moment.metadata?.venue_name && (
              <Chip key="venue" color="blue">
                {moment.metadata.venue_name}
              </Chip>
            )}
            
            {moment.metadata?.vibe && (
              <Chip key="vibe" color="emerald">
                {moment.metadata.vibe}
              </Chip>
            )}
          </div>

          <div className="pb-6">
            <h3 className="font-medium text-foreground">{moment.title}</h3>
            {moment.description && (
              <p className="text-sm text-muted-foreground mt-1">{moment.description}</p>
            )}
          </div>
        </TimelineContent>
      </TimelineItem>
    </motion.div>
  );
});

ParallaxMoment.displayName = 'ParallaxMoment';

export { ParallaxMoment };