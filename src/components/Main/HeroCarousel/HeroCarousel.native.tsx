import React from 'react';
import { View, ScrollView, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { HeroCard } from '../HeroCard';
import { ParticleField } from '@/components/effects/ParticleField/ParticleField.native';
import { colors } from '@/lib/theme-tokens.native';

export function HeroCarousel({ onOpen }: { onOpen: (key: 'momentary'|'mine'|'clubs'|'business') => void }) {
  const [index, setIndex] = React.useState(0);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / 316);
    if (i !== index) setIndex(i);
  };

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={316}
        decelerationRate="fast"
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingHorizontal: 16, columnGap: 16 }}
        style={{ height: 300 }}
      >
        <HeroCard
          title="Happening Now"
          subtitle="Live momentary floqs forming"
          stats={[{ v: '12', l: 'Active' }, { v: '3', l: 'Near You' }, { v: '47', l: 'People' }]}
          onPress={() => onOpen('momentary')}
          particleField={<ParticleField />}
        />
        <HeroCard title="My Floqs" subtitle="Your persistent groups" stats={[{ v: '5', l: 'Groups' }]} onPress={() => onOpen('mine')} peek />
        <HeroCard title="Clubs" subtitle="Crews & scenes" onPress={() => onOpen('clubs')} peek />
        <HeroCard title="Business" subtitle="Venue perks & posts" onPress={() => onOpen('business')} peek />
      </ScrollView>

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 8 }}>
        <Dot active={index === 0} />
        <Dot active={index === 1} />
        <Dot active={index === 2} />
        <Dot active={index === 3} />
      </View>
    </>
  );
}

function Dot({ active }: { active?: boolean }) {
  return (
    <View
      style={{
        width: active ? 20 : 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: active ? colors.primary : 'rgba(255,255,255,0.25)',
      }}
    />
  );
}