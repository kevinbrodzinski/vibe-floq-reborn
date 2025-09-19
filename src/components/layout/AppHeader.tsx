import React, { useState } from 'react';
import { Bell, Search, User, Settings, Menu, Zap, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentUserProfile } from '@/hooks/useProfile';
import { useEventNotifications } from '@/providers/EventNotificationsProvider';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { useNavigate, useLocation } from 'react-router-dom';
import { SocialBatteryIcon } from '@/components/SocialBatteryIcon';
import { useRallyRoom } from '@/hooks/useRallyRoom';
import { useRecommendationCapture } from '@/hooks/useRecommendationCapture';
import { edgeLog } from '@/lib/edgeLog';

export function AppHeader() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCoPresenceActions, setShowCoPresenceActions] = useState(false);
  const { user } = useAuth();
  const { data: profile } = useCurrentUserProfile();
  const { unseen } = useEventNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const rally = useRallyRoom();
  const capture = useRecommendationCapture('balanced');

  const unreadCount = unseen.length;

  const handleRallyNow = async () => {
    try {
      const id = await rally.create();
      await capture.setPlanContext({ 
        planId: id, 
        participantsCount: 1 
      });
      await capture.flushNow();
      edgeLog('rally_created', { id });
      setShowCoPresenceActions(false);
      // TODO: Navigate to rally view or show success toast
    } catch (error) {
      console.error('Failed to create rally:', error);
    }
  };

  const handleMeetHalfway = () => {
    setShowCoPresenceActions(false);
    // TODO: Open meet-halfway flow or navigate to HQ
    navigate('/floqs'); // Temporary - navigate to floqs list
  };

  // Don't show header on field page for full map experience
  if (location.pathname === '/field' || location.pathname === '/' || location.pathname === '/home') {
    return null;
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Left side - Logo/Brand */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/home')}
            >
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                floq
              </h1>
            </Button>
          </div>

          {/* Center - Search (on larger screens) */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <Button
              variant="outline"
              className="w-full justify-start text-muted-foreground"
              onClick={() => {
                // TODO: Open command palette or search modal
              }}
            >
              <Search className="w-4 h-4 mr-2" />
              Search places, friends...
            </Button>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-2 header-badges">
            {/* Social Battery / Co-presence Actions */}
            <SocialBatteryIcon onPress={() => setShowCoPresenceActions(true)} />
            {/* Search button for mobile */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
            >
              <Search className="w-5 h-5" />
            </Button>

            {/* Notifications */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNotifications(true)}
              className="relative"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </Button>

            {/* Profile */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/settings/profile')}
              className="flex items-center gap-2"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback>
                  {profile?.display_name?.[0] || profile?.username?.[0] || user?.email?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline-block text-sm font-medium">
                {profile?.display_name || profile?.username || 'Profile'}
              </span>
            </Button>
          </div>
        </div>
      </header>

      {/* Notification Center */}
      <NotificationCenter />

      {/* Co-presence Action Sheet */}
      {showCoPresenceActions && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div 
            className="absolute inset-0 bg-black/60" 
            onClick={() => setShowCoPresenceActions(false)} 
          />
          <div className="relative w-full max-w-sm bg-background/95 backdrop-blur-sm border rounded-t-xl sm:rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Co-presence Actions</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowCoPresenceActions(false)}
              >
                ×
              </Button>
            </div>
            <div className="space-y-3">
              <Button 
                onClick={handleRallyNow}
                className="w-full flex items-center gap-3 p-4 h-auto"
                variant="outline"
              >
                <Zap className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Rally Now</div>
                  <div className="text-sm text-muted-foreground">Start an instant gathering</div>
                </div>
              </Button>
              <Button 
                onClick={handleMeetHalfway}
                className="w-full flex items-center gap-3 p-4 h-auto"
                variant="outline"
              >
                <Users className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Meet Halfway</div>
                  <div className="text-sm text-muted-foreground">Find optimal meeting spots</div>
                </div>
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}