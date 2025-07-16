import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  FolderOpen,
  Search,
  Trash2,
  Loader2,
  Calendar,
  Zap,
  MapPin,
  Users
} from 'lucide-react';
import {
  getCollectionItems,
  removeFromCollection,
  Collection
} from '@/lib/supabase-helpers';
import { AfterglowCard } from '@/components/archive/AfterglowCard';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, format } from 'date-fns';

interface CollectionViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection: Collection | null;
  onAddToCollection: (afterglowId: string) => void;
  onViewDetails: (afterglowId: string) => void;
  onFavorite: (afterglowId: string) => void;
  isFavorited: (afterglowId: string) => boolean;
}

export function CollectionView({
  open,
  onOpenChange,
  collection,
  onAddToCollection,
  onViewDetails,
  onFavorite,
  isFavorited
}: CollectionViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [removeItemId, setRemoveItemId] = useState<string | null>(null);

  // Fetch collection items
  const { data: items, isLoading } = useQuery({
    queryKey: ['collection-items', collection?.id],
    queryFn: () => collection ? getCollectionItems(collection.id) : Promise.resolve([]),
    enabled: open && !!collection
  });

  // Remove from collection mutation
  const removeMutation = useMutation({
    mutationFn: async (afterglowId: string) => {
      if (!collection) throw new Error('No collection selected');
      await removeFromCollection(collection.id, afterglowId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection-items', collection?.id] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      setRemoveItemId(null);
      toast({ title: 'Removed from collection' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to remove from collection',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  if (!collection) return null;

  const filteredItems = items?.filter(item => {
    const afterglow = item.daily_afterglow;
    if (!afterglow) return false;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      afterglow.summary_text?.toLowerCase().includes(searchLower) ||
      afterglow.dominant_vibe?.toLowerCase().includes(searchLower) ||
      format(new Date(afterglow.date), 'PPP').toLowerCase().includes(searchLower)
    );
  }) || [];

  const handleRemoveConfirm = () => {
    if (removeItemId) {
      removeMutation.mutate(removeItemId);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div
                className="w-5 h-5 rounded-full mt-0.5 flex-shrink-0"
                style={{ backgroundColor: collection.color }}
              />
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-xl">{collection.name}</DialogTitle>
                {collection.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {collection.description}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FolderOpen className="w-3 h-3" />
                    {items?.length || 0} items
                  </span>
                  {collection.created_at && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Created {formatDistanceToNow(new Date(collection.created_at), { addSuffix: true })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search in collection..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Items */}
            <ScrollArea className="h-96">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>
                    {searchTerm ? 'No matching items found' : 'No items in this collection yet'}
                  </p>
                  <p className="text-sm">
                    {searchTerm ? 'Try a different search term' : 'Add afterglows to this collection from your archive'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-1">
                  {filteredItems.map((item) => (
                    item.daily_afterglow && (
                      <div key={item.id} className="relative group">
                        <AfterglowCard
                          afterglow={item.daily_afterglow as any}
                          onFavorite={onFavorite}
                          onAddToCollection={onAddToCollection}
                          onViewDetails={onViewDetails}
                          isFavorited={isFavorited(item.daily_afterglow.id)}
                        />
                        
                        {/* Remove button overlay */}
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity gap-1"
                          onClick={() => setRemoveItemId(item.daily_afterglow!.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                          Remove
                        </Button>
                      </div>
                    )
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove confirmation dialog */}
      <AlertDialog open={!!removeItemId} onOpenChange={() => setRemoveItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Collection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this afterglow from "{collection.name}"? 
              This won't delete the afterglow itself, just remove it from this collection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}