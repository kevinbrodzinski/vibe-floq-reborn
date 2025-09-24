import React from 'react';
import { PersonalAnalyticsDashboard } from '@/components/analytics/PersonalAnalyticsDashboard';
import { IntelligentRecommendationEngine } from '@/components/intelligence/IntelligentRecommendationEngine';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Analytics() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto py-6">
        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="analytics">Personal Analytics</TabsTrigger>
            <TabsTrigger value="recommendations">Smart Recommendations</TabsTrigger>
          </TabsList>
          
          <TabsContent value="analytics">
            <PersonalAnalyticsDashboard />
          </TabsContent>
          
          <TabsContent value="recommendations">
            <IntelligentRecommendationEngine />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}