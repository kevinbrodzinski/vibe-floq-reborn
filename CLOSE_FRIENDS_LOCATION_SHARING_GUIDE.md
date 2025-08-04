# Close Friends Location Sharing Integration Guide

## Overview

The Close Friends Location Sharing system provides a seamless way for users to automatically share their location with all close friends. This builds on your existing location sharing infrastructure and close friends system to provide a "one-click" solution for enhanced location privacy and sharing.

## Key Features

- **Automatic Sync**: Close friends are automatically added/removed from location sharing
- **Granular Privacy**: Choose between exact, approximate, or city-level location accuracy
- **Conditional Sharing**: Set when location should be shared (always, at venues, while walking, etc.)
- **Seamless Integration**: Works with your existing location tracking and friend systems
- **Real-time Updates**: Changes take effect immediately

## Architecture

### Database Layer

#### New Columns in `profiles` Table
```sql
-- Added to existing profiles table
share_location_with_close_friends boolean DEFAULT false
close_friends_location_accuracy text DEFAULT 'approximate' 
close_friends_auto_share_when text[] DEFAULT ARRAY['always']::text[]
```

#### New Database Functions

##### `enable_close_friends_location_sharing(accuracy_level, auto_when)`
- Enables location sharing for all current close friends
- Updates user preferences
- Returns count of friends added

##### `disable_close_friends_location_sharing()`
- Disables location sharing for all close friends
- Updates user preferences
- Returns count of friends removed

##### `get_close_friends_location_status()`
- Returns comprehensive status of close friends location sharing
- Includes counts, settings, and sync status

#### Automatic Sync Trigger
- `sync_close_friends_location_sharing()` trigger function
- Automatically adds/removes friends from location sharing when close friend status changes
- Only affects users who have close friends location sharing enabled

### Frontend Architecture

#### Core Hooks

##### `useCloseFriendsLocationSettings()`
```tsx
const { data: settings, isLoading, error } = useCloseFriendsLocationSettings();
// Returns: CloseFriendsLocationSettings with all current settings
```

##### `useToggleCloseFriendsLocationSharing()`
```tsx
const { toggle, isLoading, isEnabled, settings } = useToggleCloseFriendsLocationSharing();

// Enable with custom settings
await toggle(true, {
  accuracyLevel: 'approximate',
  autoWhen: ['always', 'at_venue']
});

// Disable
await toggle(false);
```

##### `useEnhancedLiveShareFriends()`
```tsx
const {
  allShareIds,        // All users receiving location (individual + close friends)
  closeFriendsIds,    // Users from close friends auto-sharing
  individualShareIds, // Users from individual selections
  totalCount,
  closeFriendsLocationEnabled
} = useEnhancedLiveShareFriends();
```

#### UI Components

##### `CloseFriendsLocationToggle`
Main toggle component with multiple variants:

```tsx
// Card variant (default)
<CloseFriendsLocationToggle 
  variant="card"
  showDetails={true}
  onToggle={(enabled) => console.log('Toggled:', enabled)}
/>

// Switch variant for settings pages
<CloseFriendsLocationToggle 
  variant="switch"
  showDetails={false}
/>

// Button variant for compact spaces
<CloseFriendsLocationToggle 
  variant="button"
  className="w-full"
/>
```

##### `CloseFriendsLocationSettings`
Detailed settings configuration:

```tsx
<CloseFriendsLocationSettings 
  settings={locationSettings}
  onSettingsChange={handleSettingsChange}
/>
```

##### `CloseFriendsLocationPrivacyPanel`
Comprehensive privacy overview:

```tsx
<CloseFriendsLocationPrivacyPanel 
  showAdvancedSettings={true}
  className="max-w-4xl"
/>
```

## Integration Points

### 1. Settings/Privacy Page

Add the main toggle to your privacy settings:

```tsx
// In your privacy/settings page
import { CloseFriendsLocationToggle } from '@/components/CloseFriends/CloseFriendsLocationToggle';

<section className="space-y-6">
  <h2>Location Sharing</h2>
  
  {/* Existing individual location sharing controls */}
  
  {/* New close friends bulk sharing */}
  <CloseFriendsLocationToggle variant="card" />
</section>
```

### 2. Close Friends Management

Add quick toggle to close friends list:

```tsx
// In your close friends management component
import { CloseFriendsLocationToggle } from '@/components/CloseFriends/CloseFriendsLocationToggle';

<div className="close-friends-section">
  <CloseFriendsList />
  
  {/* Quick location sharing toggle */}
  <CloseFriendsLocationToggle 
    variant="switch" 
    showDetails={true}
  />
</div>
```

### 3. Privacy Dashboard

Add comprehensive privacy panel:

```tsx
// In your privacy dashboard
import { CloseFriendsLocationPrivacyPanel } from '@/components/CloseFriends/CloseFriendsLocationPrivacyPanel';

<div className="privacy-dashboard">
  <CloseFriendsLocationPrivacyPanel />
</div>
```

### 4. Update Location Tracking Hook

Integrate with your existing location system:

```tsx
// Option 1: Update existing useUserLocation to use enhanced hook
import { useCompatibleLiveShareFriends } from '@/hooks/useEnhancedLiveShareFriends';

// In your useUserLocation hook, replace:
// const shareTo = useLiveShareFriends()
// With:
const shareTo = useCompatibleLiveShareFriends()

// Option 2: Use enhanced hook for more detailed info
import { useEnhancedLiveShareFriends } from '@/hooks/useEnhancedLiveShareFriends';

const enhancedShareInfo = useEnhancedLiveShareFriends();
const shareTo = enhancedShareInfo.allShareIds; // For backward compatibility
```

## Privacy & Accuracy Levels

### Location Accuracy Options

#### Exact (`'exact'`)
- **Description**: Share precise GPS coordinates
- **Use Case**: Close family, intimate friends
- **Privacy Level**: Low
- **Accuracy**: Within ~3-5 meters

#### Approximate (`'approximate'`) - Default
- **Description**: Share general area with ~100m radius
- **Use Case**: Most close friends
- **Privacy Level**: Medium
- **Accuracy**: Within ~100 meters

#### City Only (`'city'`)
- **Description**: Share only city/neighborhood level
- **Use Case**: Acquaintances, broader friend groups
- **Privacy Level**: High
- **Accuracy**: City/neighborhood level

### Auto-Share Conditions

#### Always (`'always'`) - Default
- Shares location whenever tracking is active
- No additional conditions

#### In Floq Events (`'in_floq'`)
- Only when participating in Floq activities
- Detected by context detection system

#### At Venues (`'at_venue'`)
- Only when at restaurants, bars, or events
- Based on venue detection

#### While Moving (`'walking'`)
- Only when actively walking or traveling
- Based on movement detection

## Migration & Deployment

### 1. Database Migration

```bash
# Apply the close friends location sharing schema
psql -d your_database -f sql/close_friends_location_sharing.sql
```

### 2. Update Supabase Types

```bash
# Regenerate types to include new columns and functions
npm run gen:types
```

### 3. Install Components

```tsx
// Add to your component exports
export { CloseFriendsLocationToggle } from './CloseFriends/CloseFriendsLocationToggle';
export { CloseFriendsLocationSettings } from './CloseFriends/CloseFriendsLocationSettings';
export { CloseFriendsLocationPrivacyPanel } from './CloseFriends/CloseFriendsLocationPrivacyPanel';
```

### 4. Update Location Hooks (Optional)

For seamless integration, update your location tracking:

```tsx
// In src/hooks/useUserLocation.ts
// Replace the import:
// import { useLiveShareFriends } from '@/hooks/useLiveShareFriends'
// With:
import { useCompatibleLiveShareFriends } from '@/hooks/useEnhancedLiveShareFriends'

// Replace the usage:
// const shareTo = useLiveShareFriends()
// With:
const shareTo = useCompatibleLiveShareFriends()
```

## User Experience Flow

### First-Time Setup

1. **User adds close friends** using existing close friends system
2. **User visits privacy settings** and sees close friends location toggle
3. **User enables close friends location sharing**
   - Settings dialog appears for accuracy and conditions
   - All current close friends are automatically added to location sharing
4. **User sees confirmation** with count of friends added

### Ongoing Usage

1. **Adding new close friends** automatically adds them to location sharing (if enabled)
2. **Removing close friends** automatically removes them from location sharing
3. **Settings can be adjusted** anytime without affecting the enabled/disabled state
4. **Disabling removes all** close friends from location sharing instantly

### Privacy Controls

1. **Three-tier accuracy system** gives users control over precision
2. **Conditional sharing** lets users set when location is shared
3. **Instant disable** provides immediate privacy control
4. **Visual feedback** shows exactly who can see location and when

## Testing

### Unit Tests

```tsx
// Test the main toggle hook
import { renderHook } from '@testing-library/react';
import { useToggleCloseFriendsLocationSharing } from '@/hooks/useCloseFriendsLocationSharing';

test('should enable close friends location sharing', async () => {
  const { result } = renderHook(() => useToggleCloseFriendsLocationSharing());
  
  await act(async () => {
    await result.current.toggle(true, {
      accuracyLevel: 'approximate',
      autoWhen: ['always']
    });
  });
  
  expect(result.current.isEnabled).toBe(true);
});
```

### Integration Tests

1. **Enable close friends location sharing** → Verify all close friends added to `friend_share_pref`
2. **Add new close friend** → Verify automatically added to location sharing
3. **Remove close friend** → Verify automatically removed from location sharing
4. **Disable close friends location sharing** → Verify all close friends removed
5. **Change accuracy settings** → Verify settings persisted and applied

### Manual Testing Checklist

- [ ] Toggle works in all variants (card, switch, button)
- [ ] Settings dialog opens and saves preferences
- [ ] Privacy panel shows accurate counts and status
- [ ] Adding close friends automatically enables location sharing (when enabled)
- [ ] Removing close friends automatically disables location sharing
- [ ] Enhanced live share friends hook returns correct combined data
- [ ] Location tracking uses enhanced friend list
- [ ] Accuracy levels affect shared coordinates appropriately
- [ ] Auto-share conditions work as expected

## Performance Considerations

### Database Optimization

- **Indexes**: Optimized indexes for close friends location queries
- **Triggers**: Efficient trigger functions for automatic sync
- **Batch Operations**: Single RPC calls for bulk enable/disable

### Frontend Optimization

- **React Query Caching**: 2-minute cache for settings, 1-minute for friend lists
- **Optimistic Updates**: Immediate UI feedback with rollback on error
- **Conditional Rendering**: Components only render when data is available

### Real-time Efficiency

- **Enhanced Hook**: Single query combining individual and close friends data
- **Deduplication**: Automatic deduplication of friend IDs
- **Lazy Loading**: Settings only loaded when needed

## Security Considerations

### Row Level Security

- **Profile Updates**: Users can only update their own location sharing preferences
- **Function Security**: All RPC functions use `SECURITY DEFINER` with proper auth checks
- **Data Access**: Users can only see their own location sharing status

### Privacy Protection

- **Accuracy Filtering**: Location coordinates are filtered based on accuracy settings
- **Conditional Sharing**: Location only shared when conditions are met
- **Immediate Disable**: Location sharing stops instantly when disabled

### Data Handling

- **No Permanent Storage**: Location data is not permanently stored
- **Encrypted Transmission**: All location data is encrypted in transit
- **Minimal Data**: Only necessary location data is shared

## Troubleshooting

### Common Issues

#### Close Friends Not Auto-Added to Location Sharing

**Symptoms**: New close friends don't appear in location sharing
**Causes**: 
- Close friends location sharing not enabled
- Database trigger not firing
- RLS policies blocking updates

**Solutions**:
1. Verify close friends location sharing is enabled in user profile
2. Check database trigger exists and is active
3. Verify RLS policies allow updates to `friend_share_pref`

#### Settings Not Persisting

**Symptoms**: Location accuracy or auto-share settings reset
**Causes**:
- Profile update permissions
- Invalid setting values
- Network connectivity issues

**Solutions**:
1. Check user has permission to update own profile
2. Validate setting values match expected enums
3. Check network connectivity and retry

#### Location Not Sharing with Close Friends

**Symptoms**: Location tracking active but close friends not receiving updates
**Causes**:
- Enhanced hook not being used
- Location tracking using old friend list
- Privacy settings blocking sharing

**Solutions**:
1. Update location tracking to use `useCompatibleLiveShareFriends`
2. Verify privacy settings allow sharing
3. Check location tracking conditions are met

### Debug Tools

```tsx
// Add to development builds for debugging
const DebugCloseFriendsLocation = () => {
  const settings = useCloseFriendsLocationSettings();
  const enhanced = useEnhancedLiveShareFriends();
  
  return (
    <div className="debug-panel">
      <h3>Close Friends Location Debug</h3>
      <pre>{JSON.stringify(settings.data, null, 2)}</pre>
      <pre>{JSON.stringify(enhanced, null, 2)}</pre>
    </div>
  );
};
```

## Future Enhancements

### Potential Features

1. **Location History for Close Friends**: Show where you've been with close friends
2. **Temporary Location Sharing**: Time-limited sharing for events
3. **Location-Based Notifications**: Notify when close friends are nearby
4. **Group Location Sharing**: Share location with groups of close friends
5. **Smart Accuracy**: Automatically adjust accuracy based on context

### API Extensions

1. **Bulk Friend Management**: Add/remove multiple friends from location sharing
2. **Location Sharing Analytics**: Insights on sharing patterns
3. **Advanced Privacy Rules**: More granular control over when/how to share
4. **Integration APIs**: Connect with external location services

## Support

### Documentation
- Review this guide for implementation details
- Check component props and hook APIs
- Test database functions directly in SQL

### Common Integration Points
1. **Settings Pages**: Add `CloseFriendsLocationToggle`
2. **Privacy Dashboards**: Add `CloseFriendsLocationPrivacyPanel`
3. **Location Tracking**: Update to use `useCompatibleLiveShareFriends`
4. **Close Friends Management**: Add location sharing controls

### Performance Monitoring
- Monitor database query performance on `friend_share_pref` table
- Check React Query cache hit rates
- Monitor location sharing broadcast frequency

The close friends location sharing system is now ready to provide users with seamless, privacy-controlled location sharing with their closest friends! 🌟