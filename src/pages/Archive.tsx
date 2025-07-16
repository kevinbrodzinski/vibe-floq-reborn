import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Archive as ArchiveIcon,
  Search,
  Download,
  Heart,
  FolderOpen,
  Plus,
  Loader2,
  Trash2
} from 'lucide-react';
import { ArchiveSearchFilters } from '@/components/archive/ArchiveSearchFilters';
import { ArchiveStatsCard } from '@/components/archive/ArchiveStatsCard';
import { AfterglowCard } from '@/components/archive/AfterglowCard';
import { CollectionPicker } from '@/components/collections/CollectionPicker';
import { CollectionCard } from '@/components/collections/CollectionCard';
import { CollectionDialog } from '@/components/collections/CollectionDialog';
import { CollectionView } from '@/components/collections/CollectionView';
import { 
  searchAfterglows,
  getArchiveStats,
  exportAfterglowData,
  getFavorites,
  addToFavorites,
  removeFromFavorites,
  getCollections,
  deleteCollection,
  SearchAfterglowsParams,
  Collection
} from '@/lib/supabase-helpers';
import { useToast } from '@/hooks/use-toast';

export default function Archive() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchFilters, setSearchFilters] = useState<SearchAfterglowsParams>({});
  const [hasSearched, setHasSearched] = useState(false);
  
  // Collection states
  const [collectionPickerOpen, setCollectionPickerOpen] = useState(false);
  const [selectedAfterglowId, setSelectedAfterglowId] = useState<string>('');
  const [selectedAfterglowTitle, setSelectedAfterglowTitle] = useState<string>('');
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [collectionViewOpen, setCollectionViewOpen] = useState(false);
  const [viewingCollection, setViewingCollection] = useState<Collection | null>(null);
  const [deleteCollectionId, setDeleteCollectionId] = useState<string | null>(null);

  // Queries
  const { data: searchResults, isLoading: searchLoading, refetch: refetchSearch } = useQuery({
    queryKey: ['archive-search', searchFilters],
    queryFn: () => searchAfterglows(searchFilters),
    enabled: hasSearched
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['archive-stats'],
    queryFn: getArchiveStats
  });

  const { data: favorites, isLoading: favoritesLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: getFavorites
  });

  const { data: collections, isLoading: collectionsLoading } = useQuery({
    queryKey: ['collections'],
    queryFn: getCollections
  });

  // Mutations
  const favoriteMutation = useMutation({
    mutationFn: async ({ afterglowId, isFavorited }: { afterglowId: string; isFavorited: boolean }) => {
      if (isFavorited) {
        await removeFromFavorites(afterglowId);
      } else {
        await addToFavorites(afterglowId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      queryClient.invalidateQueries({ queryKey: ['archive-search'] });
      toast({ title: 'Favorites updated successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Error updating favorites', 
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const exportMutation = useMutation({
    mutationFn: (params: { startDate?: string; endDate?: string }) => 
      exportAfterglowData(params),
    onSuccess: (data) => {
      // Create and download JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `afterglow-export-${new Date().toISOString().split('T')[0]}.json`;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({ title: 'Export downloaded successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Export failed', 
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const deleteCollectionMutation = useMutation({
    mutationFn: deleteCollection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      setDeleteCollectionId(null);
      toast({ title: 'Collection deleted successfully' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to delete collection',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const handleSearch = () => {
    setHasSearched(true);
    refetchSearch();
  };

  const handleClearFilters = () => {
    setSearchFilters({});
    setHasSearched(false);
  };

  const handleFavorite = (afterglowId: string) => {
    const isFavorited = favorites?.some(fav => fav.daily_afterglow?.id === afterglowId);
    favoriteMutation.mutate({ afterglowId, isFavorited: !!isFavorited });
  };

  const handleAddToCollection = (afterglowId: string, afterglowTitle?: string) => {
    setSelectedAfterglowId(afterglowId);
    setSelectedAfterglowTitle(afterglowTitle || '');
    setCollectionPickerOpen(true);
  };

  const handleViewDetails = (afterglowId: string) => {
    // TODO: Navigate to detailed afterglow view
    toast({ title: 'Detailed view coming soon!' });
  };

  const handleExport = () => {
    exportMutation.mutate({ startDate: undefined, endDate: undefined });
  };

  const isFavorited = (afterglowId: string) => {
    return favorites?.some(fav => fav.daily_afterglow?.id === afterglowId) || false;
  };

  // Collection handlers
  const handleCreateCollection = () => {
    setEditingCollection(null);
    setCollectionDialogOpen(true);
  };

  const handleEditCollection = (collection: Collection) => {
    setEditingCollection(collection);
    setCollectionDialogOpen(true);
  };

  const handleViewCollection = (collection: Collection) => {
    setViewingCollection(collection);
    setCollectionViewOpen(true);
  };

  const handleDeleteCollection = (id: string) => {
    setDeleteCollectionId(id);
  };

  const confirmDeleteCollection = () => {
    if (deleteCollectionId) {
      deleteCollectionMutation.mutate(deleteCollectionId);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ArchiveIcon className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Archive</h1>
                <p className="text-muted-foreground">Search, organize, and explore your afterglow history</p>
              </div>
            </div>
            
            <Button 
              onClick={handleExport}
              disabled={exportMutation.isPending}
              className="gap-2"
            >
              {exportMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Export Data
            </Button>
          </div>
        </div>
      </div>

      <div className="container max-w-7xl mx-auto px-4 py-6">
        <Tabs defaultValue="search" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="search" className="gap-2">
              <Search className="w-4 h-4" />
              Search
            </TabsTrigger>
            <TabsTrigger value="favorites" className="gap-2">
              <Heart className="w-4 h-4" />
              Favorites
            </TabsTrigger>
            <TabsTrigger value="collections" className="gap-2">
              <FolderOpen className="w-4 h-4" />
              Collections
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Filters Sidebar */}
              <div className="lg:col-span-1">
                <ArchiveSearchFilters
                  filters={searchFilters}
                  onFiltersChange={setSearchFilters}
                  onSearch={handleSearch}
                  onClear={handleClearFilters}
                />
              </div>

              {/* Results Area */}
              <div className="lg:col-span-3 space-y-6">
                {/* Stats Card */}
                {stats && (
                  <ArchiveStatsCard stats={stats} />
                )}

                {/* Search Results */}
                {hasSearched && (
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">
                        Search Results {searchResults && `(${searchResults.length})`}
                      </h3>
                    </div>

                    {searchLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                    ) : searchResults && searchResults.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {searchResults.map((afterglow) => (
                          <AfterglowCard
                            key={afterglow.id}
                            afterglow={afterglow}
                            onFavorite={handleFavorite}
                            onAddToCollection={(id) => handleAddToCollection(id, afterglow.summary_text)}
                            onViewDetails={handleViewDetails}
                            isFavorited={isFavorited(afterglow.id)}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        No results found. Try adjusting your search filters.
                      </div>
                    )}
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="favorites" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Heart className="w-5 h-5" />
                  Favorites {favorites && `(${favorites.length})`}
                </h3>
              </div>

              {favoritesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : favorites && favorites.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {favorites.map((favorite) => (
                    favorite.daily_afterglow && (
                        <AfterglowCard
                          key={favorite.id}
                          afterglow={favorite.daily_afterglow as any}
                          onFavorite={handleFavorite}
                          onAddToCollection={(id) => handleAddToCollection(id, favorite.daily_afterglow?.summary_text)}
                          onViewDetails={handleViewDetails}
                          isFavorited={true}
                        />
                    )
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Heart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No favorites yet</p>
                  <p className="text-sm">Heart your favorite afterglows to see them here</p>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="collections" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FolderOpen className="w-5 h-5" />
                  Collections {collections && `(${collections.length})`}
                </h3>
                <Button size="sm" className="gap-2" onClick={handleCreateCollection}>
                  <Plus className="w-4 h-4" />
                  New Collection
                </Button>
              </div>

              {collectionsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : collections && collections.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {collections.map((collection) => (
                    <CollectionCard
                      key={collection.id}
                      collection={collection}
                      onEdit={handleEditCollection}
                      onDelete={handleDeleteCollection}
                      onView={() => handleViewCollection(collection)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No collections yet</p>
                  <p className="text-sm">Create your first collection to organize your afterglows</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4 gap-2"
                    onClick={handleCreateCollection}
                  >
                    <Plus className="w-4 h-4" />
                    Create Collection
                  </Button>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Collection Picker Dialog */}
      <CollectionPicker
        open={collectionPickerOpen}
        onOpenChange={setCollectionPickerOpen}
        afterglowId={selectedAfterglowId}
        afterglowTitle={selectedAfterglowTitle}
      />

      {/* Collection Create/Edit Dialog */}
      <CollectionDialog
        open={collectionDialogOpen}
        onOpenChange={setCollectionDialogOpen}
        collection={editingCollection}
        mode={editingCollection ? 'edit' : 'create'}
      />

      {/* Collection View Dialog */}
      <CollectionView
        open={collectionViewOpen}
        onOpenChange={setCollectionViewOpen}
        collection={viewingCollection}
        onAddToCollection={(id) => handleAddToCollection(id)}
        onViewDetails={handleViewDetails}
        onFavorite={handleFavorite}
        isFavorited={isFavorited}
      />

      {/* Delete Collection Confirmation */}
      <AlertDialog 
        open={!!deleteCollectionId} 
        onOpenChange={() => setDeleteCollectionId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Collection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this collection? This action cannot be undone.
              All afterglows in this collection will remain in your archive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteCollection}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}