# Close Friends System Integration Guide

## Overview

The Close Friends system has been integrated into your Floq social platform, leveraging the existing `is_close` field in your `friendships` table. This feature allows users to designate special friends for enhanced sharing and content filtering.

## Architecture

### Database Layer

The system builds on your existing friendship infrastructure:

- **Table**: `friendships` (already exists)
- **Key Field**: `is_close` boolean (already exists)
- **Friend States**: `pending`, `accepted`, `blocked`, `close`

### New Database Functions

#### `toggle_close_friend(target_user_id, is_close_friend)`
- Toggles close friend status for accepted friendships
- Returns boolean indicating success
- Includes proper authentication and validation

#### `get_close_friends(user_id)`
- Returns list of close friends with profile information
- Includes friendship metadata and timestamps
- Optimized with proper indexing

### Enhanced Indexes
- `idx_friendships_close_friends`: Optimized for close friends queries
- `idx_friendships_close_friends_reverse`: Reverse lookup optimization

## Frontend Components

### Core Components

#### 1. `CloseFriendToggle`
```tsx
import { CloseFriendToggle } from '@/components/CloseFriends/CloseFriendToggle';

<CloseFriendToggle 
  friendId="user-id"
  friendName="John Doe"
  variant="default" // 'default' | 'icon' | 'minimal'
  size="md" // 'sm' | 'md' | 'lg'
/>
```

#### 2. `CloseFriendsList`
```tsx
import { CloseFriendsList } from '@/components/CloseFriends/CloseFriendsList';

<CloseFriendsList 
  onSelectFriend={(friend) => console.log(friend)}
  showActions={true}
  maxDisplay={5}
  variant="list" // 'card' | 'list' | 'grid'
/>
```

#### 3. `CloseFriendsPrivacyControls`
```tsx
import { CloseFriendsPrivacyControls } from '@/components/CloseFriends/CloseFriendsPrivacyControls';

<CloseFriendsPrivacyControls 
  settings={privacySettings}
  onSettingsChange={handleSettingsChange}
/>
```

#### 4. `CloseFriendsContentFilter`
```tsx
import { CloseFriendsContentFilter } from '@/components/CloseFriends/CloseFriendsContentFilter';

<CloseFriendsContentFilter 
  showCloseFriendsOnly={showCloseFriendsOnly}
  onToggleCloseFriendsOnly={setShowCloseFriendsOnly}
  variant="button" // 'button' | 'switch' | 'badge'
/>
```

### React Hooks

#### `useCloseFriends()`
```tsx
const { data: closeFriends, isLoading, error } = useCloseFriends();
```

#### `useToggleCloseFriend()`
```tsx
const toggleCloseFriend = useToggleCloseFriend();

toggleCloseFriend.mutate({
  friendId: 'user-id',
  isCloseFriend: true
});
```

#### `useIsCloseFriend(friendId)`
```tsx
const { data: isCloseFriend } = useIsCloseFriend(friendId);
```

#### `useCloseFriendsFilter()`
```tsx
const { 
  closeFriendIds, 
  filterForCloseFriends, 
  isFromCloseFriend 
} = useCloseFriendsFilter();
```

## Integration Points

### 1. Friend Profile Pages
Add the close friend toggle to user profile pages:

```tsx
// In your profile component
import { CloseFriendToggle } from '@/components/CloseFriends/CloseFriendToggle';

<div className="profile-actions">
  <CloseFriendToggle 
    friendId={profile.id}
    friendName={profile.name}
    variant="default"
  />
</div>
```

### 2. Friends List/Directory
Enhance your friends list with close friend indicators:

```tsx
// In your friends list component
import { useIsCloseFriend } from '@/hooks/useCloseFriends';

const FriendItem = ({ friend }) => {
  const { data: isCloseFriend } = useIsCloseFriend(friend.id);
  
  return (
    <div className="friend-item">
      <span>{friend.name}</span>
      {isCloseFriend && <Heart className="text-red-500 fill-current" />}
      <CloseFriendToggle friendId={friend.id} friendName={friend.name} variant="icon" />
    </div>
  );
};
```

### 3. Content Feeds
Add close friends filtering to your feeds:

```tsx
// In your feed component
import { FeedCloseFriendsControls } from '@/components/CloseFriends/CloseFriendsContentFilter';

const [showCloseFriendsOnly, setShowCloseFriendsOnly] = useState(false);
const { filterForCloseFriends } = useCloseFriendsFilter();

const filteredPosts = showCloseFriendsOnly 
  ? filterForCloseFriends(posts) 
  : posts;

return (
  <div>
    <FeedCloseFriendsControls 
      showCloseFriendsOnly={showCloseFriendsOnly}
      onToggleCloseFriendsOnly={setShowCloseFriendsOnly}
    />
    {/* Render filtered posts */}
  </div>
);
```

### 4. Enhanced Relationship Component
Your existing `FriendRelationshipStrength` component has been enhanced with:
- Close friend status indicator
- Toggle functionality
- Special insights for close friends

### 5. Settings/Privacy Page
Add close friends privacy controls:

```tsx
// In your settings page
import { CloseFriendsPrivacyControls } from '@/components/CloseFriends/CloseFriendsPrivacyControls';

<CloseFriendsPrivacyControls 
  settings={userPrivacySettings}
  onSettingsChange={updatePrivacySettings}
/>
```

## Content Filtering Patterns

### Higher-Order Component Pattern
```tsx
import { withCloseFriendsFilter } from '@/components/CloseFriends/CloseFriendsContentFilter';

const EnhancedPostList = withCloseFriendsFilter(PostList);

<EnhancedPostList items={posts} showCloseFriendsOnly={true} />
```

### Manual Filtering
```tsx
const { filterForCloseFriends, isFromCloseFriend } = useCloseFriendsFilter();

// Filter array of items
const closeFriendsPosts = filterForCloseFriends(posts);

// Check individual item
if (isFromCloseFriend(post.author_id)) {
  // Handle close friend content
}
```

## Privacy & Security

### Row Level Security
The system includes RLS policies that ensure:
- Users can only see their own close friend relationships
- Close friends can see mutual close friend status
- Proper authentication is enforced

### Privacy Controls
Users can control what close friends can see:
- Location sharing
- Activity status  
- Future plans
- Notifications when added as close friend

## Migration & Deployment

### 1. Run Database Migration
```sql
-- Apply the close friends enhancement
\i sql/close_friends_enhancements.sql
```

### 2. Update Types
```bash
# Regenerate Supabase types
npm run gen:types
```

### 3. Import Components
Update your main component exports:

```tsx
// src/components/index.ts
export { CloseFriendToggle } from './CloseFriends/CloseFriendToggle';
export { CloseFriendsList } from './CloseFriends/CloseFriendsList';
export { CloseFriendsPrivacyControls } from './CloseFriends/CloseFriendsPrivacyControls';
export { 
  CloseFriendsContentFilter,
  FeedCloseFriendsControls,
  CloseFriendsContentIndicator 
} from './CloseFriends/CloseFriendsContentFilter';
```

## Testing

### Unit Tests
Test the core hooks and components:

```tsx
// Example test for useIsCloseFriend hook
import { renderHook } from '@testing-library/react';
import { useIsCloseFriend } from '@/hooks/useCloseFriends';

test('should return false for non-close friend', async () => {
  const { result } = renderHook(() => useIsCloseFriend('friend-id'));
  expect(result.current.data).toBe(false);
});
```

### Integration Tests
Test the complete flow:
1. Add friend as close friend
2. Verify close friend status
3. Test content filtering
4. Test privacy controls

## Performance Considerations

### Indexing
The system includes optimized indexes for:
- Close friends lookups
- Reverse relationship queries
- State-based filtering

### Caching
React Query provides automatic caching for:
- Close friends lists (5 minutes)
- Individual close friend status (2 minutes)
- Friendship data (5 minutes)

### Batch Operations
Consider implementing batch operations for:
- Adding multiple close friends
- Bulk privacy updates
- Mass content filtering

## Future Enhancements

### Potential Features
1. **Close Friend Groups**: Organize close friends into custom groups
2. **Temporary Close Friends**: Time-limited close friend status
3. **Close Friend Stories**: Special story visibility for close friends
4. **Activity Insights**: Analytics on close friend interactions
5. **Smart Suggestions**: AI-powered close friend recommendations

### API Extensions
Consider adding:
- Bulk close friend operations
- Close friend activity feeds
- Close friend recommendation engine
- Advanced privacy granularity

## Troubleshooting

### Common Issues

#### 1. Close Friend Toggle Not Working
- Check authentication status
- Verify friendship exists and is accepted
- Check network connectivity
- Review browser console for errors

#### 2. Close Friends List Empty
- Confirm user has marked friends as close
- Check database indexes are created
- Verify RLS policies are correct

#### 3. Content Filtering Not Working
- Ensure proper `author_id` or `user_id` fields exist
- Check close friends data is loaded
- Verify filtering logic in components

### Debug Tools
```tsx
// Add to development builds for debugging
const DebugCloseFriends = () => {
  const { data: closeFriends } = useCloseFriends();
  const { closeFriendIds } = useCloseFriendsFilter();
  
  return (
    <div className="debug-panel">
      <h3>Close Friends Debug</h3>
      <p>Count: {closeFriends?.length || 0}</p>
      <p>IDs: {closeFriendIds.join(', ')}</p>
    </div>
  );
};
```

## Support

For issues or questions:
1. Check this documentation
2. Review component props and hook APIs
3. Test database functions directly
4. Check browser network and console logs
5. Verify authentication and permissions

The close friends system is now fully integrated and ready for use across your Floq platform!