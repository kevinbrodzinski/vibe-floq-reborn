import React from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { YStack, XStack, Text } from 'tamagui';
import { useRipplesNear } from '../../hooks/useRipplesNear';

export default function RipplesList({ client, lat, lng }: { client: SupabaseClient; lat: number; lng: number }) {
  const { data: ripples, loading } = useRipplesNear(client, { lat, lng });
  return (
    <YStack gap="$2" padding="$3">
      <Text fontSize="$7" fontWeight="700">Ripples</Text>
      {(ripples ?? []).map(r => (
        <XStack key={r.ripple_id} jc="space-between">
          <Text>{r.includes_friend ? (r.both_friends ? 'Both friends' : 'Friend + 1') : 'Nearby pair'}</Text>
          <Text>{Math.round(r.distance_m)} m</Text>
        </XStack>
      ))}
      {loading && <Text opacity={0.7}>Loading…</Text>}
    </YStack>
  );
}