import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  MapPin, 
  Shield, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Home, 
  Building, 
  Circle,
  Pentagon,
  Save,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUnifiedLocation } from '@/hooks/location/useUnifiedLocation';
import { geofencingService, type Geofence, type CircularGeofence, type PolygonGeofence } from '@/lib/location/geofencing';
import { GPSCoords } from '@/lib/location/standardGeo';

interface GeofenceManagerProps {
  onGeofencesChange?: (geofences: Geofence[]) => void;
}

type GeofenceType = 'circular' | 'polygon';
type PrivacyLevel = 'hide' | 'street' | 'area';

interface NewGeofenceForm {
  name: string;
  type: GeofenceType;
  privacyLevel: PrivacyLevel;
  // Circular properties
  center?: GPSCoords;
  radius?: number;
  // Polygon properties
  vertices?: GPSCoords[];
}

const PRIVACY_LEVEL_OPTIONS = [
  { value: 'hide' as const, label: 'Hide Location', description: 'Completely hide your location', icon: EyeOff },
  { value: 'area' as const, label: 'Approximate Area', description: 'Show general area (~1km)', icon: Circle },
  { value: 'street' as const, label: 'Street Level', description: 'Show street level (~100m)', icon: MapPin },
];

const PRESET_ZONES = [
  { name: 'Home', icon: Home, radius: 100, privacyLevel: 'hide' as const },
  { name: 'Work', icon: Building, radius: 150, privacyLevel: 'street' as const },
  { name: 'Gym', icon: Building, radius: 75, privacyLevel: 'street' as const },
];

export function GeofenceManager({ onGeofencesChange }: GeofenceManagerProps) {
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newGeofence, setNewGeofence] = useState<NewGeofenceForm>({
    name: '',
    type: 'circular',
    privacyLevel: 'street',
    radius: 100,
  });
  const [isDrawingPolygon, setIsDrawingPolygon] = useState(false);
  const [polygonVertices, setPolygonVertices] = useState<GPSCoords[]>([]);
  
  const { coords } = useUnifiedLocation({
    enableTracking: false,
    enablePresence: false,
    hookId: 'geofence-manager'
  });
  const pos = coords; // Compatibility alias
  const { toast } = useToast();

  // Load geofences on mount
  useEffect(() => {
    const loadedGeofences = geofencingService.getGeofences();
    setGeofences(loadedGeofences);
  }, []);

  // Notify parent when geofences change
  useEffect(() => {
    onGeofencesChange?.(geofences);
  }, [geofences, onGeofencesChange]);

  const handleCreateGeofence = useCallback(() => {
    if (!newGeofence.name.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter a name for your privacy zone.',
        variant: 'destructive',
      });
      return;
    }

    if (newGeofence.type === 'circular') {
      if (!newGeofence.center || !newGeofence.radius) {
        toast({
          title: 'Location Required',
          description: 'Please set a center location and radius.',
          variant: 'destructive',
        });
        return;
      }

      const geofence = geofencingService.constructor.createCircularGeofence(
        `geofence_${Date.now()}`,
        newGeofence.name,
        newGeofence.center,
        newGeofence.radius,
        newGeofence.privacyLevel
      );

      geofencingService.addGeofence(geofence);
    } else {
      if (!newGeofence.vertices || newGeofence.vertices.length < 3) {
        toast({
          title: 'Invalid Polygon',
          description: 'Please draw a polygon with at least 3 points.',
          variant: 'destructive',
        });
        return;
      }

      const geofence = geofencingService.constructor.createPolygonGeofence(
        `geofence_${Date.now()}`,
        newGeofence.name,
        newGeofence.vertices,
        newGeofence.privacyLevel
      );

      geofencingService.addGeofence(geofence);
    }

    setGeofences(geofencingService.getGeofences());
    setIsCreating(false);
    setNewGeofence({
      name: '',
      type: 'circular',
      privacyLevel: 'street',
      radius: 100,
    });
    setPolygonVertices([]);

    toast({
      title: 'Privacy Zone Created',
      description: `${newGeofence.name} has been added to your privacy zones.`,
    });
  }, [newGeofence, toast]);

  const handleDeleteGeofence = useCallback((id: string) => {
    geofencingService.removeGeofence(id);
    setGeofences(geofencingService.getGeofences());
    toast({
      title: 'Privacy Zone Deleted',
      description: 'The privacy zone has been removed.',
    });
  }, [toast]);

  const handleToggleGeofence = useCallback((id: string) => {
    const geofence = geofences.find(g => g.id === id);
    if (geofence) {
      const updated = { ...geofence, isActive: !geofence.isActive };
      geofencingService.addGeofence(updated);
      setGeofences(geofencingService.getGeofences());
    }
  }, [geofences]);

  const handleUseCurrentLocation = useCallback(() => {
    if (pos) {
      setNewGeofence(prev => ({
        ...prev,
        center: { lat: pos.lat, lng: pos.lng }
      }));
    } else {
      toast({
        title: 'Location Unavailable',
        description: 'Unable to get your current location. Please enable location services.',
        variant: 'destructive',
      });
    }
  }, [pos, toast]);

  const handlePresetZone = useCallback((preset: typeof PRESET_ZONES[0]) => {
    if (!pos) {
      toast({
        title: 'Location Required',
        description: 'Please enable location services to create a preset zone.',
        variant: 'destructive',
      });
      return;
    }

    setNewGeofence({
      name: preset.name,
      type: 'circular',
      privacyLevel: preset.privacyLevel,
      center: { lat: pos.lat, lng: pos.lng },
      radius: preset.radius,
    });
    setIsCreating(true);
  }, [pos, toast]);

  const renderGeofenceCard = (geofence: Geofence) => {
    const privacyOption = PRIVACY_LEVEL_OPTIONS.find(opt => opt.value === geofence.privacyLevel);
    const IconComponent = privacyOption?.icon || Shield;

    return (
      <Card key={geofence.id} className={`${geofence.isActive ? 'border-green-200 bg-green-50/10' : 'border-gray-200 bg-gray-50/10'}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <IconComponent className="h-4 w-4" />
                <h3 className="font-medium">{geofence.name}</h3>
                <Badge variant={geofence.isActive ? 'default' : 'secondary'}>
                  {geofence.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Type: {geofence.type === 'circular' ? 'Circle' : 'Polygon'}</p>
                {geofence.type === 'circular' && (
                  <p>Radius: {(geofence as CircularGeofence).radius}m</p>
                )}
                <p>Privacy: {privacyOption?.label}</p>
                <p>Created: {new Date(geofence.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1 ml-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleGeofence(geofence.id)}
              >
                {geofence.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingId(geofence.id)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteGeofence(geofence.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Privacy Zones</h2>
        <p className="text-muted-foreground">
          Create zones where your location is automatically hidden or degraded for privacy.
        </p>
      </div>

      {/* Quick Presets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Setup</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {PRESET_ZONES.map((preset) => {
              const IconComponent = preset.icon;
              return (
                <Button
                  key={preset.name}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center gap-2"
                  onClick={() => handlePresetZone(preset)}
                  disabled={!pos}
                >
                  <IconComponent className="h-6 w-6" />
                  <span className="font-medium">{preset.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {preset.radius}m • {PRIVACY_LEVEL_OPTIONS.find(opt => opt.value === preset.privacyLevel)?.label}
                  </span>
                </Button>
              );
            })}
          </div>
          {!pos && (
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Enable location services to use quick setup
            </p>
          )}
        </CardContent>
      </Card>

      {/* Create New Geofence */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Custom Privacy Zone</CardTitle>
            <Dialog open={isCreating} onOpenChange={setIsCreating}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Zone
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create Privacy Zone</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name">Zone Name</Label>
                    <Input
                      id="name"
                      value={newGeofence.name}
                      onChange={(e) => setNewGeofence(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Home, Office, Gym"
                    />
                  </div>

                  {/* Type */}
                  <div className="space-y-2">
                    <Label>Zone Type</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={newGeofence.type === 'circular' ? 'default' : 'outline'}
                        onClick={() => setNewGeofence(prev => ({ ...prev, type: 'circular' }))}
                        className="justify-start"
                      >
                        <Circle className="h-4 w-4 mr-2" />
                        Circular
                      </Button>
                      <Button
                        variant={newGeofence.type === 'polygon' ? 'default' : 'outline'}
                        onClick={() => setNewGeofence(prev => ({ ...prev, type: 'polygon' }))}
                        className="justify-start"
                      >
                        <Pentagon className="h-4 w-4 mr-2" />
                        Polygon
                      </Button>
                    </div>
                  </div>

                  {/* Privacy Level */}
                  <div className="space-y-2">
                    <Label>Privacy Level</Label>
                    <Select
                      value={newGeofence.privacyLevel}
                      onValueChange={(value: PrivacyLevel) => setNewGeofence(prev => ({ ...prev, privacyLevel: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIVACY_LEVEL_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <option.icon className="h-4 w-4" />
                              <div>
                                <div className="font-medium">{option.label}</div>
                                <div className="text-xs text-muted-foreground">{option.description}</div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Circular Zone Settings */}
                  {newGeofence.type === 'circular' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Center Location</Label>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={handleUseCurrentLocation}
                            disabled={!pos}
                            className="flex-1"
                          >
                            <MapPin className="h-4 w-4 mr-2" />
                            Use Current Location
                          </Button>
                        </div>
                        {newGeofence.center && (
                          <p className="text-xs text-muted-foreground">
                            {newGeofence.center.lat.toFixed(6)}, {newGeofence.center.lng.toFixed(6)}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="radius">Radius (meters)</Label>
                        <Input
                          id="radius"
                          type="number"
                          value={newGeofence.radius || ''}
                          onChange={(e) => setNewGeofence(prev => ({ ...prev, radius: parseInt(e.target.value) || 0 }))}
                          min="10"
                          max="2000"
                          placeholder="100"
                        />
                      </div>
                    </div>
                  )}

                  {/* Polygon Zone Settings */}
                  {newGeofence.type === 'polygon' && (
                    <div className="space-y-2">
                      <Label>Polygon Vertices</Label>
                      <p className="text-sm text-muted-foreground">
                        Polygon drawing not yet implemented. Use circular zones for now.
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsCreating(false)}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreateGeofence}
                      disabled={newGeofence.type === 'polygon'} // Disable polygon for now
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Create Zone
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Existing Geofences */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Your Privacy Zones</h3>
          <Badge variant="outline">
            {geofences.filter(g => g.isActive).length} of {geofences.length} active
          </Badge>
        </div>

        {geofences.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Privacy Zones</h3>
              <p className="text-muted-foreground mb-4">
                Create privacy zones to automatically protect your location in sensitive areas.
              </p>
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Zone
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {geofences.map(renderGeofenceCard)}
          </div>
        )}
      </div>
    </div>
  );
}