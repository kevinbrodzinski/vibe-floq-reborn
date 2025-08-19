import React, { useEffect } from 'react';
import { YStack, XStack, Text, Button, Card } from 'tamagui';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useMomentFeed } from '../../hooks/useMomentFeed';

export default function EphemeralFeed({ client, floqId }: { client: SupabaseClient; floqId: string }) {
  const { items, loading, error, hasMore, loadMore } = useMomentFeed(client, floqId, { pageSize: 30 });

  useEffect(() => {
    // TODO: subscribe to realtime on feed table filtered by floq_id and call loadMore/refetch as needed
  }, [client, floqId]);

  return (
    <YStack gap="$2" padding="$3">
      <XStack jc="space-between" ai="center">
        <Text fontSize="$7" fontWeight="700">Live feed</Text>
        <Button size="$2" onPress={loadMore} disabled={!hasMore || loading}>Load more</Button>
      </XStack>
      {error && <Text color="$red10">{error.message}</Text>}
      {items.map((it) => (
        <Card key={it.id} padding="$3">
          <XStack jc="space-between" ai="center">
            <Text>{it.kind}</Text>
            <Text opacity={0.7}>{new Date(it.created_at).toLocaleTimeString()}</Text>
          </XStack>
          {it.text_content && <Text>{it.text_content}</Text>}
          {/* TODO: render audio/photo previews when storage_key present */}
        </Card>
      ))}
      {loading && <Text opacity={0.7}>Loading…</Text>}
    </YStack>
  );
}