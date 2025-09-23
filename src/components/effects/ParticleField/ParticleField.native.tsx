import { useEffect } from 'react';
import { View, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface ParticleFieldProps {
  count?: number;
  hue?: number;
}

export const ParticleField = ({ 
  count = 12, 
  hue = 280 
}: ParticleFieldProps) => {
  const { width, height } = Dimensions.get('window');
  
  // Create particle data
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 6 + 2,
    opacity: Math.random() * 0.6 + 0.3,
    hue: hue + (Math.random() - 0.5) * 60,
    duration: Math.random() * 8000 + 4000, // 4-12 seconds
  }));

  const animatedValues = particles.map(() => ({
    translateX: useSharedValue(0),
    translateY: useSharedValue(0),
    opacity: useSharedValue(0),
  }));

  useEffect(() => {
    particles.forEach((particle, index) => {
      const values = animatedValues[index];
      
      // Start with fade in
      values.opacity.value = withTiming(particle.opacity, {
        duration: 1000,
        easing: Easing.ease,
      });
      
      // Animate movement
      values.translateX.value = withRepeat(
        withTiming(
          Math.random() * 100 - 50, 
          { 
            duration: particle.duration,
            easing: Easing.inOut(Easing.ease) 
          }
        ),
        -1,
        true
      );
      
      values.translateY.value = withRepeat(
        withTiming(
          Math.random() * 100 - 50,
          { 
            duration: particle.duration * 1.1,
            easing: Easing.inOut(Easing.ease) 
          }
        ),
        -1,
        true
      );
    });
  }, []);

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width,
        height,
        opacity: 0.7,
        zIndex: -1,
      }}
    >
      {particles.map((particle, index) => {
        const values = animatedValues[index];
        
        const animatedStyle = useAnimatedStyle(() => ({
          translateX: values.translateX.value,
          translateY: values.translateY.value,
          opacity: values.opacity.value,
        }));

        return (
          <Animated.View
            key={particle.id}
            style={[
              {
                position: 'absolute',
                left: particle.x - particle.size,
                top: particle.y - particle.size,
                width: particle.size * 2,
                height: particle.size * 2,
                borderRadius: particle.size,
                backgroundColor: `hsl(${particle.hue}, 70%, 60%)`,
              },
              animatedStyle,
            ]}
          />
        );
      })}
    </View>
  );
};