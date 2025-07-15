import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { ArrowLeft, Activity, Users, Info, Settings2, Calendar, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFloqDetails } from '@/hooks/useFloqDetails';
import { useNavigation } from '@/hooks/useNavigation';

import { FloqAnalyticsDashboard } from '@/components/floq/FloqAnalyticsDashboard';
import { FloqInfoTab } from '@/components/floq/FloqInfoTab';
import { FloqPlansTab } from '@/components/floq/FloqPlansTab';

const FloqDetails = () => {
  const { floqId } = useParams<{ floqId: string }>();
  const { session } = useAuth();
  const { goBack } = useNavigation();
  const [activeTab, setActiveTab] = useState('info');
  
  const { data: floqDetails, isLoading, error } = useFloqDetails(floqId, session?.user?.id);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="sm" onClick={goBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="h-6 w-48 bg-muted animate-pulse rounded" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-64 bg-muted animate-pulse rounded-lg" />
              <div className="h-48 bg-muted animate-pulse rounded-lg" />
            </div>
            <div className="space-y-4">
              <div className="h-32 bg-muted animate-pulse rounded-lg" />
              <div className="h-48 bg-muted animate-pulse rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !floqDetails) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="sm" onClick={goBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold">Floq Not Found</h1>
          </div>
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              This floq doesn't exist or you don't have permission to view it.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isCreator = floqDetails.creator_id === session?.user?.id;
  const isMember = floqDetails.participants?.some(p => p.user_id === session?.user?.id);
  const hasAccess = isCreator || isMember;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={goBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">{floqDetails.title}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary" className="text-xs">
                  {floqDetails.primary_vibe}
                </Badge>
                <span>•</span>
                <span>{floqDetails.participants?.length || 0} members</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="info" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              <span className="hidden sm:inline">Info</span>
            </TabsTrigger>
            {hasAccess && (
              <TabsTrigger value="chat" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Chat</span>
              </TabsTrigger>
            )}
            {hasAccess && (
              <TabsTrigger value="plans" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Plans</span>
              </TabsTrigger>
            )}
            {isCreator && (
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">Analytics</span>
              </TabsTrigger>
            )}
            {isCreator && (
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Tab Content */}
          <ScrollArea className="h-[calc(100vh-200px)]">
            <TabsContent value="info" className="mt-0">
              <FloqInfoTab floqDetails={floqDetails} />
            </TabsContent>

            {hasAccess && (
              <TabsContent value="chat" className="mt-0">
                <Card className="p-4 h-[500px]">
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4" />
                    <p>Chat integration coming soon</p>
                  </div>
                </Card>
              </TabsContent>
            )}

            {hasAccess && (
              <TabsContent value="plans" className="mt-0">
                <FloqPlansTab floqDetails={floqDetails} />
              </TabsContent>
            )}

            {isCreator && (
              <TabsContent value="analytics" className="mt-0">
                <FloqAnalyticsDashboard floqDetails={floqDetails} />
              </TabsContent>
            )}

            {isCreator && (
              <TabsContent value="settings" className="mt-0">
                <Card className="p-4">
                  <div className="text-center py-8 text-muted-foreground">
                    Advanced settings coming soon
                  </div>
                </Card>
              </TabsContent>
            )}
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  );
};

export default FloqDetails;