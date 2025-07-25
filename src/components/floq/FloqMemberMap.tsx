import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  Navigation, 
  Compass, 
  Users, 
  Activity, 
  Zap, 
  Target,
  Clock,
  Wifi,
  Smartphone,
  Building,
  Coffee,
  Home,
  Train,
  Plane,
  Car,
  Bike,
  Eye,
  EyeOff
} from 'lucide-react';
import { useFloqMembers } from '@/hooks/useFloqMembers';
import { cn } from '@/lib/utils';

interface MemberLocation {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  location: {
    name: string;
    type: 'venue' | 'home' | 'work' | 'transit' | 'outdoor' | 'unknown';
    coordinates: { lat: number; lng: number };
    accuracy: number;
  };
  distance: number;
  lastUpdate: Date;
  isMoving: boolean;
  speed: number; // km/h
  direction: number; // degrees
  device: 'mobile' | 'desktop' | 'tablet';
  battery: number;
  signal: 'excellent' | 'good' | 'fair' | 'poor';
  activity: {
    type: 'typing' | 'viewing' | 'interacting' | 'idle';
    intensity: number;
  };
}

interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export function FloqMemberMap({ floqId }: { floqId: string }) {
  const { data: members, isLoading, error } = useFloqMembers(floqId);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 37.7749, lng: -122.4194 });
  const [zoom, setZoom] = useState(12);
  const [showOffline, setShowOffline] = useState(true);
  const [showActivity, setShowActivity] = useState(true);
  const [autoFollow, setAutoFollow] = useState(false);

  // Generate mock location data for members
  const memberLocations = useMemo((): MemberLocation[] => {
    if (!members) return [];

    const locations = [
      { name: 'Blue Bottle Coffee', type: 'venue' as const, coordinates: { lat: 37.7749, lng: -122.4194 } },
      { name: 'Home', type: 'home' as const, coordinates: { lat: 37.7849, lng: -122.4094 } },
      { name: 'Work Office', type: 'work' as const, coordinates: { lat: 37.7649, lng: -122.4294 } },
      { name: 'BART Station', type: 'transit' as const, coordinates: { lat: 37.7549, lng: -122.4394 } },
      { name: 'Golden Gate Park', type: 'outdoor' as const, coordinates: { lat: 37.7694, lng: -122.4862 } },
      { name: 'Mission District', type: 'venue' as const, coordinates: { lat: 37.7599, lng: -122.4148 } },
      { name: 'Fisherman\'s Wharf', type: 'venue' as const, coordinates: { lat: 37.8080, lng: -122.4177 } },
      { name: 'Alcatraz', type: 'outdoor' as const, coordinates: { lat: 37.8270, lng: -122.4230 } }
    ];

    return members.map((member, index) => {
      const location = locations[index % locations.length];
      const isMoving = Math.random() > 0.7;
      
      return {
        id: member.user_id,
        name: member.profile.display_name || member.profile.username,
        avatar: member.profile.avatar_url,
        status: ['online', 'away', 'busy', 'offline'][Math.floor(Math.random() * 4)] as any,
        location,
        distance: Math.floor(Math.random() * 5000),
        lastUpdate: new Date(Date.now() - Math.random() * 300000), // Random time within last 5 minutes
        isMoving,
        speed: isMoving ? Math.floor(Math.random() * 50) : 0,
        direction: Math.floor(Math.random() * 360),
        device: ['mobile', 'desktop', 'tablet'][Math.floor(Math.random() * 3)] as any,
        battery: Math.floor(Math.random() * 100),
        signal: ['excellent', 'good', 'fair', 'poor'][Math.floor(Math.random() * 4)] as any,
        activity: {
          type: ['typing', 'viewing', 'interacting', 'idle'][Math.floor(Math.random() * 4)] as any,
          intensity: Math.floor(Math.random() * 100)
        }
      };
    });
  }, [members]);

  // Calculate map bounds
  const mapBounds = useMemo((): MapBounds => {
    if (memberLocations.length === 0) {
      return { north: 37.8, south: 37.7, east: -122.4, west: -122.5 };
    }

    const lats = memberLocations.map(m => m.location.coordinates.lat);
    const lngs = memberLocations.map(m => m.location.coordinates.lng);

    return {
      north: Math.max(...lats) + 0.01,
      south: Math.min(...lats) - 0.01,
      east: Math.max(...lngs) + 0.01,
      west: Math.min(...lngs) - 0.01
    };
  }, [memberLocations]);

  // Auto-follow moving members
  useEffect(() => {
    if (!autoFollow) return;

    const movingMembers = memberLocations.filter(m => m.isMoving);
    if (movingMembers.length > 0) {
      const centerMember = movingMembers[0];
      setMapCenter(centerMember.location.coordinates);
    }
  }, [memberLocations, autoFollow]);

  // Helper functions
  const getLocationIcon = (type: MemberLocation['location']['type']) => {
    switch (type) {
      case 'venue': return <Coffee className="w-4 h-4" />;
      case 'home': return <Home className="w-4 h-4" />;
      case 'work': return <Building className="w-4 h-4" />;
      case 'transit': return <Train className="w-4 h-4" />;
      case 'outdoor': return <Compass className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: MemberLocation['status']) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getDeviceIcon = (device: MemberLocation['device']) => {
    switch (device) {
      case 'mobile': return <Smartphone className="w-3 h-3" />;
      case 'desktop': return <Building className="w-3 h-3" />;
      case 'tablet': return <Smartphone className="w-3 h-3" />;
      default: return <Smartphone className="w-3 h-3" />;
    }
  };

  const formatDistance = (distance: number) => {
    if (distance < 1000) return `${distance}m`;
    return `${(distance / 1000).toFixed(1)}km`;
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    return `${diffInMinutes}m ago`;
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <div className="h-64 bg-muted rounded-lg animate-pulse" />
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (error || !members) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center py-8">
          <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h4 className="font-medium mb-2">Unable to load member locations</h4>
          <p className="text-sm text-muted-foreground">
            {error?.message || 'Something went wrong loading the member map.'}
          </p>
        </div>
      </div>
    );
  }

  const visibleMembers = showOffline 
    ? memberLocations 
    : memberLocations.filter(m => m.status !== 'offline');

  return (
    <div className="h-full flex flex-col">
      {/* Map Controls */}
      <div className="flex items-center justify-between p-4 border-b border-border/30">
        <div className="flex space-x-2">
          <Button
            variant={showOffline ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowOffline(!showOffline)}
          >
            <Eye className="w-4 h-4 mr-2" />
            {showOffline ? 'Hide Offline' : 'Show Offline'}
          </Button>
          <Button
            variant={showActivity ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowActivity(!showActivity)}
          >
            <Activity className="w-4 h-4 mr-2" />
            {showActivity ? 'Hide Activity' : 'Show Activity'}
          </Button>
          <Button
            variant={autoFollow ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoFollow(!autoFollow)}
          >
            <Target className="w-4 h-4 mr-2" />
            {autoFollow ? 'Stop Following' : 'Auto Follow'}
          </Button>
        </div>

        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>{visibleMembers.length} members visible</span>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative bg-muted overflow-hidden">
        {/* Mock Map Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-green-50">
          <div className="absolute inset-0 opacity-20">
            {/* Grid pattern */}
            <div className="absolute inset-0" style={{
              backgroundImage: `
                linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px'
            }} />
          </div>
        </div>

        {/* Member Markers */}
        <AnimatePresence>
          {visibleMembers.map((member) => {
            const x = ((member.location.coordinates.lng - mapBounds.west) / (mapBounds.east - mapBounds.west)) * 100;
            const y = ((member.location.coordinates.lat - mapBounds.south) / (mapBounds.north - mapBounds.south)) * 100;

            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute cursor-pointer"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
                onClick={() => setSelectedMember(selectedMember === member.id ? null : member.id)}
              >
                {/* Member Marker */}
                <div className="relative">
                  <div className={cn(
                    "w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center",
                    getStatusColor(member.status)
                  )}>
                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs font-medium">
                      {member.name.charAt(0)}
                    </div>
                  </div>

                  {/* Moving indicator */}
                  {member.isMoving && (
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="absolute inset-0 rounded-full border-2 border-blue-400"
                    />
                  )}

                  {/* Activity indicator */}
                  {showActivity && member.activity.type === 'typing' && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                  )}
                </div>

                {/* Member Info Popup */}
                <AnimatePresence>
                  {selectedMember === member.id && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-10"
                    >
                      <Card className="w-64 p-3 shadow-lg">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center">
                              {member.name.charAt(0)}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-sm">{member.name}</div>
                              <div className="text-xs text-muted-foreground capitalize">
                                {member.status}
                              </div>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {formatDistance(member.distance)}
                            </Badge>
                          </div>

                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            {getLocationIcon(member.location.type)}
                            <span>{member.location.name}</span>
                          </div>

                          {member.isMoving && (
                            <div className="flex items-center space-x-2 text-xs text-blue-600">
                              <Navigation className="w-3 h-3" />
                              <span>Moving {member.speed} km/h</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center space-x-2">
                              {getDeviceIcon(member.device)}
                              <span>{member.device}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Wifi className="w-3 h-3" />
                              <span>{member.signal}</span>
                            </div>
                          </div>

                          <div className="text-xs text-muted-foreground">
                            Updated {formatTimeAgo(member.lastUpdate)}
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Map Legend */}
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
          <div className="text-xs font-medium mb-2">Legend</div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>Online</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span>Away</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>Busy</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-gray-500" />
              <span>Offline</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 