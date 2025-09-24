import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Small pill-switch that lets the current user decide whether a given friend
 * can see her live location.
 *
 * Props
 * ─────
 * friendId  – UUID of the friend to grant / revoke access
 * initial   – current preference fetched from friend_share_pref
 */
export function FriendShareToggle({
    friendId,
    initial,
}: {
    friendId: string;
    initial: boolean;
}) {
    const [on, setOn] = useState(initial);
    const [saving, setSaving] = useState(false);
    const queryClient = useQueryClient();

    const toggle = async (val: boolean) => {
        setOn(val);
        setSaving(true);

        try {
            // RPC wrapper keeps RLS nice and tight.
            const { error } = await supabase.rpc('set_live_share_bulk', {
                _friend_ids: [friendId],
                _on: val,
                _auto_when: ['always']
            });

            if (error) {
                // roll back UI on failure
                console.error('[FriendShareToggle] save failed →', error);
                setOn(!val);
            } else {
                // Invalidate related queries to refresh the UI
                queryClient.invalidateQueries({ queryKey: ['share-prefs'] });
                queryClient.invalidateQueries({ queryKey: ['share-pref', friendId] });
                queryClient.invalidateQueries({ queryKey: ['live-share-friends'] });
            }
        } catch (error) {
            console.error('[FriendShareToggle] unexpected error →', error);
            setOn(!val);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Switch
            checked={on}
            disabled={saving}
            onCheckedChange={toggle}
            className="data-[state=unchecked]:bg-gray-600 data-[state=checked]:bg-primary"
        />
    );
} 