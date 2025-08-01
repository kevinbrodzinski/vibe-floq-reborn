import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BaseVenueCardProps {
  // Core venue data
  id: string;
  name: string;
  imageUrl?: string;
  category?: string;
  rating?: number;
  
  // Layout slots
  headerBadge?: React.ReactNode;
  distanceBadge?: React.ReactNode;
  metadataExtra?: React.ReactNode;
  scoreIndicator?: React.ReactNode;
  contentSections?: React.ReactNode[];
  actionButtons?: React.ReactNode;
  expandableContent?: React.ReactNode;
  
  // Styling
  className?: string;
  imageHeight?: string;
  
  // Interaction
  onClick?: () => void;
}

export const BaseVenueCard: React.FC<BaseVenueCardProps> = ({
  id,
  name,
  imageUrl,
  category,
  rating,
  headerBadge,
  distanceBadge,
  metadataExtra,
  scoreIndicator,
  contentSections = [],
  actionButtons,
  expandableContent,
  className = "",
  imageHeight = "h-24 sm:h-32",
  onClick
}) => {
  const renderStars = (rating: number) => {
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

  return (
    <motion.div
      layout
      initial={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      className={className}
    >
      <Card className="overflow-hidden" onClick={onClick}>
        {/* Header Image with Overlays */}
        {imageUrl && (
          <div className={cn("relative overflow-hidden", imageHeight)}>
            <img 
              src={imageUrl} 
              alt={name}
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
        )}

        <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base sm:text-lg truncate">{name}</CardTitle>
              <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground mt-1 flex-wrap">
                {category && <span className="truncate">{category}</span>}
                {category && rating && <span className="hidden sm:inline">•</span>}
                {rating && (
                  <div className="flex items-center gap-1">
                    {renderStars(rating)}
                    <span className="text-xs">({rating})</span>
                  </div>
                )}
                {metadataExtra}
              </div>
            </div>
            {scoreIndicator}
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
            <div className="flex gap-2">
              {actionButtons}
            </div>
          )}

          {/* Expandable Content */}
          {expandableContent}
        </CardContent>
      </Card>
    </motion.div>
  );
};

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