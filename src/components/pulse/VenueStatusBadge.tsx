import React from 'react';
import { Clock, MapPin } from 'lucide-react';
import { getVenueStatus, type VenueData } from '@/lib/utils/contextualFiltering';

interface VenueStatusBadgeProps {
  venue: VenueData;
  className?: string;
}

export const VenueStatusBadge: React.FC<VenueStatusBadgeProps> = ({ 
  venue, 
  className = '' 
}) => {
  const status = getVenueStatus(venue);
  
  if (status.status === 'unknown') return null;
  
  const getStatusColor = () => {
    switch (status.status) {
      case 'open':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'closed':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'closing_soon':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'opening_soon':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };
  
  const getStatusText = () => {
    switch (status.status) {
      case 'open':
        return 'Open';
      case 'closed':
        return 'Closed';
      case 'closing_soon':
        return `Closing in ${status.timeUntilChange}m`;
      case 'opening_soon':
        return `Opens in ${status.timeUntilChange}m`;
      default:
        return 'Unknown';
    }
  };
  
  const getStatusIcon = () => {
    switch (status.status) {
      case 'open':
        return '🟢';
      case 'closed':
        return '🔴';
      case 'closing_soon':
        return '🟡';
      case 'opening_soon':
        return '🔵';
      default:
        return '⚪';
    }
  };
  
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor()} ${className}`}>
      <span className="text-xs">{getStatusIcon()}</span>
      <Clock className="w-3 h-3" />
      <span>{getStatusText()}</span>
    </div>
  );
};

export default VenueStatusBadge;