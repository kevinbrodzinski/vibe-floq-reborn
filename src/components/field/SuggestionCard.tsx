import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatDistance } from '@/utils/formatDistance';
import type { SocialSuggestion } from '@/hooks/useSocialSuggestions';
export default function SuggestionCard({
  suggestion
}: {
  suggestion: SocialSuggestion;
}) {
  const {
    display_name,
    vibe_tag,
    distance_m,
    avatar_url,
    friend_id
  } = suggestion;
  return;
}