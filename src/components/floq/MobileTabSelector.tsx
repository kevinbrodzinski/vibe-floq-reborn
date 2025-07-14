import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Info, Users, Mail, Settings, AlertTriangle } from 'lucide-react';

interface MobileTabSelectorProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TAB_OPTIONS = [
  { value: 'info', label: 'Info', icon: Info },
  { value: 'members', label: 'Members', icon: Users },
  { value: 'invitations', label: 'Invitations', icon: Mail },
  { value: 'settings', label: 'Settings', icon: Settings },
  { value: 'danger', label: 'Danger Zone', icon: AlertTriangle },
] as const;

export const MobileTabSelector: React.FC<MobileTabSelectorProps> = ({
  activeTab,
  onTabChange,
}) => {
  const getCurrentTabLabel = () => {
    const tab = TAB_OPTIONS.find(option => option.value === activeTab);
    return tab ? tab.label : 'Select Tab';
  };

  return (
    <div className="w-full">
      <Select value={activeTab} onValueChange={onTabChange}>
        <SelectTrigger className="w-full h-12 text-left" aria-label="Select management tab">
          <div className="flex items-center gap-2">
            {TAB_OPTIONS.find(option => option.value === activeTab)?.icon && (
              React.createElement(TAB_OPTIONS.find(option => option.value === activeTab)!.icon, {
                className: "h-4 w-4"
              })
            )}
            <SelectValue placeholder={getCurrentTabLabel()} />
          </div>
        </SelectTrigger>
        <SelectContent>
          {TAB_OPTIONS.map((option) => (
            <SelectItem 
              key={option.value} 
              value={option.value}
              className="h-12 flex items-center gap-2"
            >
              <div className="flex items-center gap-2">
                <option.icon className="h-4 w-4" />
                <span>{option.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};