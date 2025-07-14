import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EditFloqInfoForm } from './EditFloqInfoForm';
import { MemberManagementList } from './MemberManagementList';
import { FloqSettingsPanel } from './FloqSettingsPanel';
import { FloqDangerZone } from './FloqDangerZone';
import type { FloqDetails } from '@/hooks/useFloqDetails';

interface ManageFloqViewProps {
  floqDetails: FloqDetails;
  onEndFloq?: () => void;
  isEndingFloq?: boolean;
}

export const ManageFloqView: React.FC<ManageFloqViewProps> = ({
  floqDetails,
  onEndFloq,
  isEndingFloq = false
}) => {
  const [activeTab, setActiveTab] = useState('info');

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Manage Floq</h3>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="danger">Danger</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-4">
            <EditFloqInfoForm floqDetails={floqDetails} />
          </TabsContent>

          <TabsContent value="members" className="mt-4">
            <MemberManagementList floqDetails={floqDetails} />
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <FloqSettingsPanel floqDetails={floqDetails} />
          </TabsContent>

          <TabsContent value="danger" className="mt-4">
            <FloqDangerZone 
              floqDetails={floqDetails} 
              onEndFloq={onEndFloq}
              isEndingFloq={isEndingFloq}
            />
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
};