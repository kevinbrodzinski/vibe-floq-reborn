import * as React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useMomentFeed } from '@/hooks/useMomentFeed';

export function EphemeralFeed({ floqId }: { floqId: string }) {
  const { items, loading, error, hasMore, loadMore } = useMomentFeed(floqId, { pageSize: 30 });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-3">
        <div className="text-lg font-semibold">Live feed</div>
        <Button size="sm" variant="secondary" onClick={loadMore} disabled={!hasMore || loading}>Load more</Button>
      </div>
      {error && <div className="px-3 text-sm text-destructive">{String(error)}</div>}
      <Separator />
      {items.map((it) => (
        <Card key={it.id}>
          <CardHeader className="py-2 flex flex-row items-center justify-between">
            <div className="text-sm font-medium capitalize">{it.kind}</div>
            <div className="text-xs text-muted-foreground tabular-nums">{new Date(it.created_at).toLocaleTimeString()}</div>
          </CardHeader>
          <CardContent>
            {it.text_content && <div className="text-sm">{it.text_content}</div>}
            {/* TODO: render audio/photo previews when storage_key present */}
          </CardContent>
        </Card>
      ))}
      {loading && <div className="px-3 text-sm text-muted-foreground">Loading…</div>}
    </div>
  );
}