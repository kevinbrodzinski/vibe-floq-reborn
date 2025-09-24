import React from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  FolderOpen,
  MoreVertical,
  Edit3,
  Trash2,
  Eye
} from 'lucide-react';
import { Collection } from '@/lib/supabase-helpers';

interface CollectionCardProps {
  collection: Collection & { itemCount?: number };
  onEdit: (collection: Collection) => void;
  onDelete: (id: string) => void;
  onView: (id: string) => void;
}

export function CollectionCard({ 
  collection, 
  onEdit, 
  onDelete, 
  onView 
}: CollectionCardProps) {
  return (
    <Card className="group hover:shadow-md transition-all duration-200 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: collection.color }}
            />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm truncate">
                {collection.name}
              </h3>
              {collection.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {collection.description}
                </p>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(collection.id)}>
                <Eye className="w-4 h-4 mr-2" />
                View Collection
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(collection)}>
                <Edit3 className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(collection.id)}
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <FolderOpen className="w-3 h-3" />
              {(collection.itemCount ?? 0)} items
            </span>
          </div>
          
          {collection.updated_at && (
            <span>
              Updated {formatDistanceToNow(new Date(collection.updated_at), { addSuffix: true })}
            </span>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onView(collection.id)}
          className="w-full mt-3 h-8 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
        >
          View Collection
        </Button>
      </div>
    </Card>
  );
}