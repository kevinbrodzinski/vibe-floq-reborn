
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { supabase }    from '@/integrations/supabase/client';
import type { MentionTarget } from '@/hooks/useMentionPopover';
import { zIndex } from '@/constants/z';

interface Props {
  target: MentionTarget;
  onClose: () => void;
}

export const MentionPopover: React.FC<Props> = ({ target, onClose }) => {
  const [profile, setProfile] = useState<{
    avatar_url: string | null;
    display_name: string | null;
    username: string;
    bio: string | null;
  } | null>(null);

  useEffect(() => {
    if (!target) return;
    const load = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url,display_name,username,bio')
        .eq('username', target.tag as any)      // tag is already "username" w/out @
        .maybeSingle(); // ✅ Fixed: use maybeSingle to avoid 406 errors
      
      if (error) {
        console.error('[MentionPopover] Error loading profile:', error);
      }
      setProfile((data as any) ?? null); // graceful fallback
    };
    load().catch(console.error);
  }, [target?.tag]);

  if (!target) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: .9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: .9 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      {...zIndex('modal')}
      className="pointer-events-auto absolute w-60 rounded-2xl bg-surface p-4 shadow-xl"
      style={{ top: target.y + 12, left: target.x + 12 }}
      onClick={onClose}                /* anywhere-click closes */
      onContextMenu={(e) => { e.preventDefault(); onClose(); }}
    >
      {profile ? (
        <>
          <div className="flex items-center gap-3">
            <img
              src={profile.avatar_url ?? '/placeholder.svg'}
              className="h-10 w-10 rounded-full object-cover"
            />
            <div>
              <p className="font-semibold leading-none">
                {profile.display_name || profile.username}
              </p>
              {profile.display_name && (
                <p className="text-xs opacity-60">@{profile.username}</p>
              )}
            </div>
          </div>

          {profile.bio && (
            <p className="mt-3 text-sm opacity-80">{profile.bio}</p>
          )}
        </>
      ) : (
        <p>Loading…</p>
      )}
    </motion.div>
  );
};
