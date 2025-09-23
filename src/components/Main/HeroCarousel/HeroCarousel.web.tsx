import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { HeroCard } from '@/components/Main/HeroCard';

interface HeroItem {
  id: string;
  title: string;
  vibe: string;
  onPress: () => void;
  showParticles?: boolean;
}

interface HeroCarouselProps {
  items: HeroItem[];
}

export const HeroCarousel = ({ items }: HeroCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    
    const { scrollLeft, clientWidth } = scrollRef.current;
    const newIndex = Math.round(scrollLeft / clientWidth);
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
    }
  };

  return (
    <div className="relative">
      {/* Carousel Container */}
      <div 
        ref={scrollRef}
        className="flex overflow-x-auto scroll-smooth snap-x snap-mandatory gap-4 scrollbar-hide"
        style={{ 
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
        onScroll={handleScroll}
      >
        {items.map((item, index) => (
          <div 
            key={item.id}
            className="min-w-full snap-center snap-always"
            style={{ scrollSnapAlign: 'center' }}
          >
            <div className="px-4">
              <HeroCard
                title={item.title}
                vibe={item.vibe}
                onPress={item.onPress}
                isActive={index === currentIndex}
                showParticles={item.showParticles && index === currentIndex}
              />
            </div>
          </div>
        ))}
        
        {/* Peek card (15% of next card visible) */}
        {items.length > 1 && currentIndex < items.length - 1 && (
          <div 
            className="min-w-[15%] snap-center opacity-60"
            style={{ marginLeft: '-85%' }}
          >
            <div className="px-4">
              <HeroCard
                title={items[currentIndex + 1]?.title || ''}
                vibe={items[currentIndex + 1]?.vibe || 'chill'}
                onPress={() => {}}
                isActive={false}
                showParticles={false}
              />
            </div>
          </div>
        )}
      </div>

      {/* Page Indicators */}
      {items.length > 1 && (
        <div className="flex justify-center mt-4 space-x-2">
          {items.map((_, index) => (
            <motion.div
              key={index}
              className={`w-2 h-2 rounded-full cursor-pointer ${
                index === currentIndex 
                  ? 'bg-primary' 
                  : 'bg-muted-foreground/30'
              }`}
              animate={{
                scale: index === currentIndex ? 1.2 : 1,
                opacity: index === currentIndex ? 1 : 0.5,
              }}
              transition={{ duration: 0.2 }}
              onClick={() => {
                if (scrollRef.current) {
                  scrollRef.current.scrollTo({
                    left: index * scrollRef.current.clientWidth,
                    behavior: 'smooth'
                  });
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};