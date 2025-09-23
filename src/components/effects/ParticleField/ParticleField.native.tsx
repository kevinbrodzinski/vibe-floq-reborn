import React, { useEffect, useRef } from 'react';
import { View, Animated, Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface ParticleFieldProps {
  particleCount?: number;
  color?: string;
}

export const ParticleField: React.FC<ParticleFieldProps> = ({
  particleCount = 12,
  color = '#007AFF' // var(--primary) equivalent
}) => {
  const particles = useRef<Animated.Value[]>([]);
  const animations = useRef<Animated.CompositeAnimation[]>([]);

  useEffect(() => {
    // Initialize particles
    particles.current = [];
    animations.current = [];

    for (let i = 0; i < particleCount; i++) {
      const animatedValue = new Animated.Value(0);
      particles.current.push(animatedValue);

      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 3000 + Math.random() * 2000,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );

      animations.current.push(animation);
      animation.start();
    }

    return () => {
      animations.current.forEach(animation => animation.stop());
    };
  }, [particleCount]);

  return (
    <View style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: 'none'
    }}>
      {particles.current.map((particle, index) => (
        <Animated.View
          key={index}
          style={{
            position: 'absolute',
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: color,
            left: Math.random() * screenWidth,
            top: Math.random() * screenHeight,
            opacity: particle.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, 0.6, 0]
            }),
            transform: [{
              scale: particle.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.5, 1.5, 0.5]
              })
            }]
          }}
        />
      ))}
    </View>
  );
};