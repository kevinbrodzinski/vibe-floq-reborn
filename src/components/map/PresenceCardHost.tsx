import * as React from 'react';
import { PresenceInfoCard, PresencePayload } from './PresenceInfoCard';

export const PresenceCardHost: React.FC = () => {
  const [data, setData] = React.useState<PresencePayload | null>(null);

  React.useEffect(() => {
    const onFriend = (e: Event) => setData((e as CustomEvent).detail);
    const onVenue  = (e: Event) => setData((e as CustomEvent).detail);

    window.addEventListener('friends:select', onFriend as EventListener);
    window.addEventListener('venues:select',  onVenue  as EventListener);

    return () => {
      window.removeEventListener('friends:select', onFriend as EventListener);
      window.removeEventListener('venues:select',  onVenue  as EventListener);
    };
  }, []);

  return <PresenceInfoCard data={data} onClose={() => setData(null)} />;
};