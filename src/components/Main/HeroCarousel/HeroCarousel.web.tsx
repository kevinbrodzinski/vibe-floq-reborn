import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeroCard } from '../HeroCard';

interface HeroCard {
  id: string;
  title: string;
  subtitle: string;
  action: () => void;
  showParticles?: boolean;
}

interface HeroCarouselProps {
  cards: HeroCard[];
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({ cards }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % cards.length);
  };

  const handlePrevious = () => {
    setActiveIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  return (
    <div className="px-6 py-8">
      {/* Main Carousel */}
      <div className="relative">
        <div className="overflow-hidden">
          <motion.div
            className="flex gap-4"
            animate={{ x: -activeIndex * 320 }}
            transition={{ type: "spring", damping: 20, stiffness: 100 }}
          >
            {cards.map((card, index) => (
              <div key={card.id} className="w-80 flex-shrink-0">
                <HeroCard
                  title={card.title}
                  subtitle={card.subtitle}
                  isActive={index === activeIndex}
                  onPress={card.action}
                  showParticles={card.showParticles && index === activeIndex}
                />
              </div>
            ))}
          </motion.div>
        </div>

        {/* Navigation Arrows */}
        {cards.length > 1 && (
          <>
            <button
              onClick={handlePrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[color:var(--card)] border border-[color:var(--border)] flex items-center justify-center hover:bg-[color:var(--accent)] transition-colors"
            >
              <svg className="w-5 h-5 text-[color:var(--foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[color:var(--card)] border border-[color:var(--border)] flex items-center justify-center hover:bg-[color:var(--accent)] transition-colors"
            >
              <svg className="w-5 h-5 text-[color:var(--foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Pager Dots */}
      {cards.length > 1 && (
        <div className="flex justify-center mt-6 gap-2">
          {cards.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === activeIndex
                  ? 'bg-[color:var(--primary)]'
                  : 'bg-[color:var(--muted-foreground)]/30'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};