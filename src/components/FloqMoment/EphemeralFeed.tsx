import React, { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useMomentFeed } from '../../hooks/useMomentFeed';

export default function EphemeralFeed({ client, floqId }: { client: SupabaseClient; floqId: string }) {
  const { items, loading, error, hasMore, loadMore } = useMomentFeed(client, floqId);

  useEffect(() => {
    // TODO: subscribe to realtime on feed table filtered by floq_id and call loadMore/refetch as needed
  }, [client, floqId]);

  return (
    <div className="space-y-2 p-3">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">Live feed</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={loadMore} 
          disabled={!hasMore || loading}
        >
          Load more
        </Button>
      </div>
      
      {error && (
        <div className="text-red-500 text-sm">{String(error)}</div>
      )}
      
      <div className="space-y-2">
        {items.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium capitalize">{item.kind}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(item.created_at).toLocaleTimeString()}
                </span>
              </div>
              {item.text_content && (
                <p className="text-sm">{item.text_content}</p>
              )}
              {/* TODO: render audio/photo previews when storage_key present */}
            </CardContent>
          </Card>
        ))}
      </div>
      
      {loading && (
        <div className="text-center text-sm text-muted-foreground">Loading…</div>
      )}
    </div>
  );
}