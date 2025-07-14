import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Bell, AtSign, Eye, Save, Loader2 } from 'lucide-react';
import type { FloqDetails } from '@/hooks/useFloqDetails';
import { useFloqSettings, type FloqSettings } from '@/hooks/useFloqSettings';

interface FloqSettingsPanelProps {
  floqDetails: FloqDetails;
}

export const FloqSettingsPanel: React.FC<FloqSettingsPanelProps> = ({ floqDetails }) => {
  const { settings: loadedSettings, isLoading, updateSettings, isSaving } = useFloqSettings(floqDetails.id);
  const [localSettings, setLocalSettings] = useState<FloqSettings | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize local settings when loaded settings change
  useEffect(() => {
    if (loadedSettings && !localSettings) {
      setLocalSettings(loadedSettings);
    }
  }, [loadedSettings, localSettings]);

  const currentSettings = localSettings || loadedSettings;

  const handleSettingChange = (key: keyof FloqSettings, value: any) => {
    if (!currentSettings) return;
    
    const newSettings = {
      ...currentSettings,
      [key]: value
    };
    setLocalSettings(newSettings);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!localSettings || !hasChanges) return;
    
    updateSettings(localSettings);
    setHasChanges(false);
  };

  if (isLoading || !currentSettings) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

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
                checked={currentSettings.notifications_enabled}
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
                value={currentSettings.mention_permissions} 
                onValueChange={(value: 'all' | 'co-admins' | 'host-only') => 
                  handleSettingChange('mention_permissions', value)
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Anyone</SelectItem>
                  <SelectItem value="co-admins">Co-admins+</SelectItem>
                  <SelectItem value="host-only">Host only</SelectItem>
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
                checked={currentSettings.join_approval_required}
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
                value={currentSettings.activity_visibility} 
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
              value={currentSettings.welcome_message || ''}
              onChange={(e) => handleSettingChange('welcome_message', e.target.value)}
              placeholder="Welcome to our floq! Here's what you need to know..."
              rows={3}
              maxLength={300}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {(currentSettings.welcome_message || '').length}/300 characters
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