export type LiveScope = 'friends' | 'mutuals' | 'none';
export type LiveWhen = 'always' | 'in_floq' | 'at_venue' | 'walking';
export type Accuracy = 'exact' | 'street' | 'area';

export interface LiveSettings {
    live_scope: LiveScope;
    live_auto_when: LiveWhen[];
    live_accuracy: Accuracy;
    live_muted_until: string | null;        // ISO
    live_smart_flags: {
        auto_checkin?: boolean;
        share_eta?: boolean;
        allow_location_req?: boolean;
    };
}

// UI helper options
export const scopeOpts = [
    { value: 'friends', label: 'Friends only' },
    { value: 'mutuals', label: 'Mutuals only' },
    { value: 'none', label: 'Nobody' },
] as const;

export const whenOpts = [
    { value: 'always', label: 'Always (default)' },
    { value: 'in_floq', label: 'Inside a Floq' },
    { value: 'at_venue', label: 'At a Venue/Event' },
    { value: 'walking', label: 'Walking (<8 km/h)' },
] as const;

export const accOpts = [
    { value: 'exact', label: 'Exact (blue-dot)' },
    { value: 'street', label: 'Street level' },
    { value: 'area', label: 'Approximate area' },
] as const; 