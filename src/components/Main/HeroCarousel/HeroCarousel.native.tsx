import { useState } from 'react';
import { ScrollView, Dimensions, View } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  interpolate, 
  useSharedValue 
} from 'react-native-reanimated';
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

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = screenWidth - 32; // Account for padding

export const HeroCarousel = ({ items }: HeroCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useSharedValue(0);

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    scrollX.value = offsetX;
    
    const newIndex = Math.round(offsetX / CARD_WIDTH);
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
    }
  };

  return (
    <View>
      {/* Carousel */}
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        snapToInterval={CARD_WIDTH + 16} // Card width + gap
        decelerationRate="fast"
      >
        {items.map((item, index) => (
          <View 
            key={item.id}
            style={{ 
              width: CARD_WIDTH,
              marginRight: index < items.length - 1 ? 16 : 0 
            }}
          >
            <HeroCard
              title={item.title}
              vibe={item.vibe}
              onPress={item.onPress}
              isActive={index === currentIndex}
              showParticles={item.showParticles && index === currentIndex}
            />
          </View>
        ))}
      </ScrollView>

      {/* Page Indicators */}
      {items.length > 1 && (
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'center', 
          marginTop: 16,
          paddingHorizontal: 8 
        }}>
          {items.map((_, index) => {
            const animatedStyle = useAnimatedStyle(() => {
              const inputRange = [
                (index - 1) * CARD_WIDTH,
                index * CARD_WIDTH,
                (index + 1) * CARD_WIDTH,
              ];

              const scale = interpolate(
                scrollX.value,
                inputRange,
                [0.8, 1.2, 0.8],
                'clamp'
              );

              const opacity = interpolate(
                scrollX.value,
                inputRange,
                [0.3, 1, 0.3],
                'clamp'
              );

              return {
                transform: [{ scale }],
                opacity,
              };
            });

            return (
              <Animated.View
                key={index}
                style={[
                  {
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: index === currentIndex ? '#FFFFFF' : '#71717A',
                    marginHorizontal: 4,
                  },
                  animatedStyle,
                ]}
              />
            );
          })}
        </View>
      )}
    </View>
  );
};