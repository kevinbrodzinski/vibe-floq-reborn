import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ImageHeight = 'h-20' | 'h-24' | 'h-28' | 'h-32' | 'h-36' | 'h-40';

interface BaseVenueCardProps {
  // Core venue data
  name: string;
  imageUrl?: string;
  category?: string;
  rating?: number | null;
  
  // Layout slots
  headerBadge?: React.ReactNode;
  distanceBadge?: React.ReactNode;
  metadataExtra?: React.ReactNode;
  rightBadge?: React.ReactNode;
  contentSections?: React.ReactNode[];
  actionButtons?: React.ReactNode;
  expandableContent?: React.ReactNode;
  
  // Styling
  className?: string;
  imageHeight?: ImageHeight;
  
  // Interaction
  onClick?: () => void;
}

export const BaseVenueCard = React.forwardRef<HTMLDivElement, BaseVenueCardProps>(({
  name,
  imageUrl,
  category,
  rating,
  headerBadge,
  distanceBadge,
  metadataExtra,
  rightBadge,
  contentSections = [],
  actionButtons,
  expandableContent,
  className = "",
  imageHeight = "h-24",
  onClick
}, ref) => {
  const renderStars = (rating: number | null) => {
    if (rating == null) return null;
    
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={cn(
          "w-3 h-3",
          i < Math.floor(rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
        )} 
      />
    ));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && onClick) {
      e.preventDefault();
      onClick();
    }
  };

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      className={className}
      ref={ref}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
    >
      <Card className="overflow-hidden">
        {/* Header Image with Overlays */}
        {imageUrl ? (
          <div className={cn("relative overflow-hidden", imageHeight)}>
            <img 
              src={imageUrl} 
              alt={`Venue photo of ${name}`}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
            />
            {headerBadge && (
              <div className="absolute top-1 right-1 sm:top-2 sm:right-2">
                {headerBadge}
              </div>
            )}
            {distanceBadge && (
              <div className="absolute bottom-1 left-1 sm:bottom-2 sm:left-2">
                {distanceBadge}
              </div>
            )}
          </div>
        ) : (
          <div className={cn("relative overflow-hidden bg-gradient-to-br from-muted to-muted-foreground/20", imageHeight)}>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-muted-foreground text-sm font-medium">{name}</div>
            </div>
            {headerBadge && (
              <div className="absolute top-1 right-1 sm:top-2 sm:right-2">
                {headerBadge}
              </div>
            )}
            {distanceBadge && (
              <div className="absolute bottom-1 left-1 sm:bottom-2 sm:left-2">
                {distanceBadge}
              </div>
            )}
          </div>
        )}

        <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base sm:text-lg truncate">{name}</CardTitle>
              <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground mt-1">
                {category && <span className="truncate">{category}</span>}
                {category && typeof rating === 'number' && <span className="hidden sm:inline">•</span>}
                {typeof rating === 'number' && (
                  <div className="flex items-center gap-1">
                    {renderStars(rating)}
                    <span className="text-xs">({rating.toFixed(1)})</span>
                  </div>
                )}
                {metadataExtra}
              </div>
            </div>
            {rightBadge && (
              <div className="flex items-center gap-1 text-green-600 text-xs p-1 bg-green-50 rounded">
                {rightBadge}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-3 px-3 sm:px-6 pb-3 sm:pb-6">
          {/* Content Sections */}
          {contentSections.map((section, index) => (
            <div key={index}>
              {section}
            </div>
          ))}

          {/* Action Buttons */}
          {actionButtons && (
            <div className="flex gap-2" onClick={handleActionClick}>
              {actionButtons}
            </div>
          )}

          {/* Expandable Content */}
          {expandableContent && (
            <div onClick={handleActionClick}>
              {expandableContent}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
});

BaseVenueCard.displayName = "BaseVenueCard";

// Helper components for common patterns
export const VenueStatGrid: React.FC<{
  stats: Array<{ label: string; value: string | number; color?: string }>
}> = ({ stats }) => (
  <div className={cn("grid gap-2 sm:gap-4 text-center", `grid-cols-${stats.length}`)}>
    {stats.map((stat, index) => (
      <div key={index}>
        <div className={cn("text-sm sm:text-lg font-semibold", stat.color || "text-primary")}>
          {stat.value}
        </div>
        <div className="text-xs text-muted-foreground leading-tight">{stat.label}</div>
      </div>
    ))}
  </div>
);

export const VenueHighlight: React.FC<{
  icon: React.ReactNode;
  title: string;
  items: string[];
  iconColor?: string;
}> = ({ icon, title, items, iconColor = "text-primary" }) => (
  <div className="flex items-start gap-2">
    <div className={cn("w-4 h-4 mt-0.5", iconColor)}>
      {icon}
    </div>
    <div>
      <div className="text-sm font-medium">{title}</div>
      {items.map((item, idx) => (
        <div key={idx} className="text-sm text-muted-foreground">• {item}</div>
      ))}
    </div>
  </div>
);

export const VenueWarning: React.FC<{
  icon: React.ReactNode;
  title: string;
  items: string[];
}> = ({ icon, title, items }) => (
  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
    <div className="flex items-start gap-2">
      <div className="w-4 h-4 text-orange-600 mt-0.5">
        {icon}
      </div>
      <div>
        <div className="text-sm font-medium text-orange-800">{title}</div>
        {items.map((item, idx) => (
          <div key={idx} className="text-sm text-orange-700">• {item}</div>
        ))}
      </div>
    </div>
  </div>
);