import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Plus,
  FolderPlus,
  Check,
  Search,
  Loader2
} from 'lucide-react';
import {
  getCollections,
  createCollection,
  addToCollection,
  Collection
} from '@/lib/supabase-helpers';
import { useToast } from '@/hooks/use-toast';

interface CollectionPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  afterglowId: string;
  afterglowTitle?: string;
}

export function CollectionPicker({ 
  open, 
  onOpenChange, 
  afterglowId, 
  afterglowTitle 
}: CollectionPickerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCollection, setNewCollection] = useState({
    name: '',
    description: '',
    color: '#3b82f6'
  });

  // Fetch collections
  const { data: collections, isLoading } = useQuery({
    queryKey: ['collections'],
    queryFn: getCollections,
    enabled: open
  });

  // Create collection mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const collection = await createCollection(
        newCollection.name,
        newCollection.description,
        newCollection.color
      );
      return collection;
    },
    onSuccess: (collection) => {
      setNewCollection({ name: '', description: '', color: '#3b82f6' });
      setShowCreateForm(false);
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      toast({ title: 'Collection created successfully' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to create collection',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Add to collection mutation
  const addMutation = useMutation({
    mutationFn: (collectionId: string) => addToCollection(collectionId, afterglowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['archive-search'] });
      onOpenChange(false);
      toast({ title: 'Added to collection successfully' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to add to collection',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const filteredCollections = collections?.filter(collection =>
    collection.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    collection.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleCreateCollection = () => {
    if (!newCollection.name.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a collection name',
        variant: 'destructive'
      });
      return;
    }
    createMutation.mutate();
  };

  const colorOptions = [
    '#3b82f6', '#ef4444', '#22c55e', '#f59e0b',
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Collection</DialogTitle>
          {afterglowTitle && (
            <p className="text-sm text-muted-foreground">
              Adding "{afterglowTitle}" to a collection
            </p>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search collections..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Create New Collection Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="w-full gap-2"
          >
            <FolderPlus className="w-4 h-4" />
            {showCreateForm ? 'Cancel' : 'Create New Collection'}
          </Button>

          {/* Create Collection Form */}
          {showCreateForm && (
            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
              <div>
                <Label htmlFor="collection-name">Name</Label>
                <Input
                  id="collection-name"
                  placeholder="Collection name"
                  value={newCollection.name}
                  onChange={(e) => setNewCollection(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="collection-description">Description (optional)</Label>
                <Textarea
                  id="collection-description"
                  placeholder="What's this collection about?"
                  value={newCollection.description}
                  onChange={(e) => setNewCollection(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                />
              </div>

              <div>
                <Label>Color</Label>
                <div className="flex gap-2 mt-1">
                  {colorOptions.map((color) => (
                    <input
                      key={color}
                      type="radio"
                      name="collection-color"
                      className={`w-6 h-6 rounded-full border-2 cursor-pointer ${
                        newCollection.color === color ? 'border-foreground' : 'border-border'
                      }`}
                      style={{ backgroundColor: color }}
                      onChange={() => setNewCollection(prev => ({ ...prev, color }))}
                      checked={newCollection.color === color}
                    />
                  ))}
                </div>
              </div>

              <Button
                onClick={handleCreateCollection}
                disabled={createMutation.isPending}
                size="sm"
                className="w-full gap-2"
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Create Collection
              </Button>
            </div>
          )}

          <Separator />

          {/* Collections List */}
          <div>
            <Label className="text-sm font-medium">Select Collection</Label>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : filteredCollections.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FolderPlus className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {searchTerm ? 'No collections found' : 'No collections yet'}
                </p>
                <p className="text-xs">
                  {searchTerm ? 'Try a different search term' : 'Create your first collection above'}
                </p>
              </div>
            ) : (
              <ScrollArea className="h-48 mt-2">
                <div className="space-y-2">
                  {filteredCollections.map((collection) => (
                    <button
                      key={collection.id}
                      onClick={() => addMutation.mutate(collection.id)}
                      disabled={addMutation.isPending}
                      className="w-full p-3 text-left border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-4 h-4 rounded-full mt-0.5 flex-shrink-0"
                          style={{ backgroundColor: collection.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{collection.name}</div>
                          {collection.description && (
                            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {collection.description}
                            </div>
                          )}
                        </div>
                        {addMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4 opacity-0 group-hover:opacity-100" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}