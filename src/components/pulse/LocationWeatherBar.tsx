import React, { useState } from 'react';
import { MapPin, Edit3, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LocationWeatherBarProps {
  // Location props
  currentLocation?: string;
  onLocationChange?: (newLocation: string) => void;
  
  // Weather props  
  weather?: {
    tempF: number;
    condition: string;
    precipChancePct: number;
  };
  
  className?: string;
}

export const LocationWeatherBar: React.FC<LocationWeatherBarProps> = ({
  currentLocation = "Current Location",
  onLocationChange,
  weather,
  className
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(currentLocation);

  const handleStartEdit = () => {
    setEditValue(currentLocation);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (editValue.trim() && onLocationChange) {
      onLocationChange(editValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditValue(currentLocation);
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const formatWeatherCompact = () => {
    if (!weather) return null;
    const { tempF, condition, precipChancePct } = weather;
    return `${Math.round(tempF)}° ${condition} ${Math.round(precipChancePct)}%`;
  };

  return (
    <div className={cn(
      'flex items-center justify-between px-6 py-2 mb-4',
      className
    )}>
      {/* Location Section - Left */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <MapPin className="w-4 h-4 text-white/60 flex-shrink-0" />
        
        {isEditing ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Enter location..."
              className="flex-1 bg-white/10 text-white text-sm px-2 py-1 rounded border border-white/20 focus:border-white/40 focus:outline-none placeholder-white/40"
              autoFocus
            />
            <button
              onClick={handleSaveEdit}
              className="p-1 text-green-400 hover:text-green-300 transition-colors"
              title="Save location"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={handleCancelEdit}
              className="p-1 text-red-400 hover:text-red-300 transition-colors"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-white/80 text-sm truncate">
              {currentLocation}
            </span>
            {onLocationChange && (
              <button
                onClick={handleStartEdit}
                className="p-1 text-white/50 hover:text-white/70 transition-colors flex-shrink-0"
                title="Edit location"
              >
                <Edit3 className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Weather Section - Right */}
      {weather && (
        <div className="flex items-center gap-1 text-sm text-white/70 flex-shrink-0">
          <span>{formatWeatherCompact()}</span>
        </div>
      )}
    </div>
  );
};