import React, { useState } from 'react';
import { Bell, Search, User, Settings, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentUserProfile } from '@/hooks/useProfile';
import { useEventNotifications } from '@/providers/EventNotificationsProvider';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { useNavigate, useLocation } from 'react-router-dom';

export function AppHeader() {
  const [showNotifications, setShowNotifications] = useState(false);
  const { user } = useAuth();
  const { data: profile } = useCurrentUserProfile();
  const { unseen } = useEventNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  const unreadCount = unseen.length;

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
    </>
  );
}