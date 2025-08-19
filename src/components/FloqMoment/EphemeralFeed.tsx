import React, { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useMomentFeed } from '../../hooks/useMomentFeed';

export default function EphemeralFeed({ client, floqId }: { client: SupabaseClient; floqId: string }) {
  const { items, loading, error, hasMore, loadMore } = useMomentFeed(client, floqId, { pageSize: 30 });

  useEffect(() => {
    // TODO: subscribe to realtime on feed table filtered by floq_id and call loadMore/refetch as needed
  }, [client, floqId]);

  return (
    <div className="space-y-2 p-3">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">Live feed</h3>
        <Button size="sm" onClick={loadMore} disabled={!hasMore || loading}>Load more</Button>
      </div>
      {error && <p className="text-destructive text-sm">{error.message}</p>}
      {items.map((it) => (
        <Card key={it.id}>
          <CardContent className="p-3">
            <div className="flex justify-between items-center">
              <span className="capitalize">{it.kind}</span>
              <span className="text-sm text-muted-foreground">{new Date(it.created_at).toLocaleTimeString()}</span>
            </div>
            {it.text_content && <p className="mt-2">{it.text_content}</p>}
            {/* TODO: render audio/photo previews when storage_key present */}
          </CardContent>
        </Card>
      ))}
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
    </div>
  );
}