import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Dimensions } from 'react-native';
import { HeroCard } from '../HeroCard';

const { width: screenWidth } = Dimensions.get('window');
const cardWidth = screenWidth - 48; // Account for padding

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

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / cardWidth);
    setActiveIndex(index);
  };

  return (
    <View style={{ paddingHorizontal: 24, paddingVertical: 32 }}>
      {/* Main Carousel */}
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        contentContainerStyle={{ paddingHorizontal: 8 }}
      >
        {cards.map((card, index) => (
          <View key={card.id} style={{ width: cardWidth, paddingHorizontal: 8 }}>
            <HeroCard
              title={card.title}
              subtitle={card.subtitle}
              isActive={index === activeIndex}
              onPress={card.action}
              showParticles={card.showParticles && index === activeIndex}
            />
          </View>
        ))}
      </ScrollView>

      {/* Pager Dots */}
      {cards.length > 1 && (
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'center', 
          marginTop: 24, 
          gap: 8 
        }}>
          {cards.map((_, index) => (
            <Pressable
              key={index}
              onPress={() => setActiveIndex(index)}
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: index === activeIndex 
                  ? '#007AFF' // var(--primary) equivalent
                  : 'rgba(128, 128, 128, 0.3)' // var(--muted-foreground)/30 equivalent
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
};