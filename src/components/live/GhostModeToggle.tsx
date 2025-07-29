import { Switch } from '@/components/ui/switch';
import dayjs from '@/lib/dayjs';

export const GhostModeToggle = () => {
    const { data, save, isLoading } = useLiveSettings();

    if (!data) return null;

    const active = data.live_muted_until && dayjs(data.live_muted_until).isAfter(dayjs());

    const toggle = async () => {
        try {
            await save({
                live_muted_until: active ? null : dayjs().add(1, 'hour').toISOString(),
            });
        } catch (error) {
            console.error('Failed to toggle ghost mode:', error);
        }
    };

    return (
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <p className="text-sm font-medium">Ghost Mode</p>
                <p className="text-xs text-muted-foreground">
                    {active
                        ? `Hidden until ${dayjs(data.live_muted_until).format('h:mm A')}`
                        : 'Your location is visible to friends'
                    }
                </p>
            </div>
            <Switch
                checked={active}
                disabled={isLoading}
                onCheckedChange={toggle}
                className="data-[state=unchecked]:bg-gray-600 data-[state=checked]:bg-red-500"
            />
        </div>
    );
}; 