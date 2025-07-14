import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Bell, AtSign, Eye, Lock, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { FloqDetails } from '@/hooks/useFloqDetails';

interface FloqSettingsPanelProps {
  floqDetails: FloqDetails;
}

interface FloqSettings {
  notifications_enabled: boolean;
  mention_permissions: 'all' | 'co_admins' | 'host_only';
  join_approval_required: boolean;
  activity_visibility: 'public' | 'members_only';
  welcome_message: string;
}

export const FloqSettingsPanel: React.FC<FloqSettingsPanelProps> = ({ floqDetails }) => {
  // Mock initial settings - in a real app, these would be fetched from the database
  const [settings, setSettings] = useState<FloqSettings>({
    notifications_enabled: true,
    mention_permissions: 'all',
    join_approval_required: floqDetails.visibility === 'private',
    activity_visibility: floqDetails.visibility === 'public' ? 'public' : 'members_only',
    welcome_message: ''
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const queryClient = useQueryClient();

  const handleSettingChange = (key: keyof FloqSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // In a real implementation, you'd save these settings to a floq_settings table
      // For now, we'll just show a success message
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      toast.success('Settings saved successfully');
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </h4>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Group Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Send notifications for new messages and activities
                </p>
              </div>
              <Switch
                checked={settings.notifications_enabled}
                onCheckedChange={(checked) => handleSettingChange('notifications_enabled', checked)}
              />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <AtSign className="w-4 h-4" />
            Mentions & Permissions
          </h4>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Who can @mention everyone</Label>
                <p className="text-sm text-muted-foreground">
                  Control who can send @all mentions to the group
                </p>
              </div>
              <Select 
                value={settings.mention_permissions} 
                onValueChange={(value: 'all' | 'co_admins' | 'host_only') => 
                  handleSettingChange('mention_permissions', value)
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Anyone</SelectItem>
                  <SelectItem value="co_admins">Co-admins+</SelectItem>
                  <SelectItem value="host_only">Host only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Privacy & Visibility
          </h4>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Join Approval Required</Label>
                <p className="text-sm text-muted-foreground">
                  Require host approval for new members
                </p>
              </div>
              <Switch
                checked={settings.join_approval_required}
                onCheckedChange={(checked) => handleSettingChange('join_approval_required', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Activity Visibility</Label>
                <p className="text-sm text-muted-foreground">
                  Who can see floq activities and participant list
                </p>
              </div>
              <Select 
                value={settings.activity_visibility} 
                onValueChange={(value: 'public' | 'members_only') => 
                  handleSettingChange('activity_visibility', value)
                }
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="members_only">Members only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="space-y-4">
          <h4 className="font-medium">Welcome Message</h4>
          
          <div>
            <Label htmlFor="welcome_message">
              Message for new members (optional)
            </Label>
            <Textarea
              id="welcome_message"
              value={settings.welcome_message}
              onChange={(e) => handleSettingChange('welcome_message', e.target.value)}
              placeholder="Welcome to our floq! Here's what you need to know..."
              rows={3}
              maxLength={300}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {settings.welcome_message.length}/300 characters
            </p>
          </div>
        </div>
      </Card>

      {hasChanges && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Settings
          </Button>
        </div>
      )}
    </div>
  );
};