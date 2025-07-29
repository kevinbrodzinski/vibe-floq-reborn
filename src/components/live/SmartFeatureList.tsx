import { Switch } from '@/components/ui/switch';
import { useLiveSettings } from '@/hooks/useLiveSettings';
import { Settings, MapPin, Clock, Users } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';

export const SmartFeatureList = () => {
    const { data, save, isLoading } = useLiveSettings();

    // Debounced save function to prevent excessive database writes
    const debouncedSave = useDebouncedCallback(
        (patch: any) => save(patch),
        500 // 500ms delay
    );

    if (!data) return null;

    const safe = {
        auto_checkin: false,
        share_eta: false,
        allow_location_req: false,
        ...data.live_smart_flags
    };

    const toggleFeature = async (feature: keyof typeof safe) => {
        try {
            await debouncedSave({
                live_smart_flags: {
                    ...safe,
                    [feature]: !safe[feature]
                }
            });
        } catch (error) {
            console.error(`Failed to toggle ${feature}:`, error);
        }
    };

    const features = [
        {
            key: 'auto_checkin' as const,
            title: 'Auto Check-in',
            description: 'Automatically check in when you arrive at venues',
            icon: MapPin,
            enabled: safe.auto_checkin
        },
        {
            key: 'share_eta' as const,
            title: 'Share ETA',
            description: 'Let friends know when you\'ll arrive',
            icon: Clock,
            enabled: safe.share_eta
        },
        {
            key: 'allow_location_req' as const,
            title: 'Allow Location Requests',
            description: 'Friends can request your location',
            icon: Users,
            enabled: safe.allow_location_req
        }
    ];

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Smart Features</h3>
            </div>

            <div className="space-y-3">
                {features.map((feature) => {
                    const Icon = feature.icon;
                    return (
                        <div key={feature.key} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <Icon className="h-5 w-5 text-muted-foreground" />
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">{feature.title}</p>
                                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                                </div>
                            </div>
                            <Switch
                                checked={feature.enabled}
                                disabled={isLoading}
                                onCheckedChange={() => toggleFeature(feature.key)}
                                className="data-[state=unchecked]:bg-gray-600 data-[state=checked]:bg-primary"
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}; 