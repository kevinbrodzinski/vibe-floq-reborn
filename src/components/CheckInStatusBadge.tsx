import { CheckCircle, Clock, MapPin } from 'lucide-react';

interface CheckInStatusBadgeProps {
  status: 'checked-in' | 'nearby' | 'away' | 'offline';
  className?: string;
}

const statusConfig = {
  'checked-in': {
    icon: CheckCircle,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    label: 'Checked In'
  },
  'nearby': {
    icon: MapPin,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    label: 'Nearby'
  },
  'away': {
    icon: Clock,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    label: 'Away'
  },
  'offline': {
    icon: Clock,
    color: 'text-muted-foreground',
    bg: 'bg-muted/20',
    label: 'Offline'
  }
};

export const CheckInStatusBadge = ({ status, className = "" }: CheckInStatusBadgeProps) => {
  const config = statusConfig[status];
  const IconComponent = config.icon;

  return (
    <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color} ${className}`}>
      <IconComponent className="w-3 h-3" />
      <span>{config.label}</span>
    </div>
  );
};