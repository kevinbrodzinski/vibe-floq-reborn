import React, { useState } from 'react';
import { VenueMapExample } from '@/components/VenueMapWithAutomation';
import { VenueMonitoringDashboard } from '@/components/VenueMonitoringDashboard';
import { Button } from '@/components/ui/button';

export const VenueAutomationDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'map' | 'dashboard'>('map');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                🤖 Automated Venue System Demo
              </h1>
              <p className="text-gray-600 mt-1">
                Experience the new intelligent venue syncing system with Google Places & Foursquare integration
              </p>
            </div>
            
            <div className="flex space-x-2">
              <Button
                variant={activeTab === 'map' ? 'default' : 'outline'}
                onClick={() => setActiveTab('map')}
                className="flex items-center space-x-2"
              >
                <span>🗺️</span>
                <span>Interactive Map</span>
              </Button>
              <Button
                variant={activeTab === 'dashboard' ? 'default' : 'outline'}
                onClick={() => setActiveTab('dashboard')}
                className="flex items-center space-x-2"
              >
                <span>📊</span>
                <span>Monitoring Dashboard</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-4">
        {activeTab === 'map' && (
          <div className="space-y-6">
            {/* Features Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 border">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-lg">🔄</span>
                  <h3 className="font-semibold">Auto-Sync</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Venues automatically sync when you pan the map to new areas
                </p>
              </div>
              
              <div className="bg-white rounded-lg p-4 border">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-lg">🧠</span>
                  <h3 className="font-semibold">Smart Intelligence</h3>
                </div>
                <p className="text-sm text-gray-600">
                  AI-powered venue categorization and recommendation scoring
                </p>
              </div>
              
              <div className="bg-white rounded-lg p-4 border">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-lg">🔀</span>
                  <h3 className="font-semibold">Deduplication</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Combines Google Places & Foursquare data without duplicates
                </p>
              </div>
            </div>

            {/* Interactive Map */}
            <div className="bg-white rounded-lg border overflow-hidden">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">Interactive Venue Map</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Click the city buttons to explore different areas. Watch venues sync automatically!
                </p>
              </div>
              <div className="h-[600px]">
                <VenueMapExample />
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">🎯 How to Test</h3>
              <ul className="space-y-1 text-sm text-blue-800">
                <li>• Click different city buttons to see automatic venue syncing</li>
                <li>• Watch the sync status panel in the top-right corner</li>
                <li>• Use "Sync Now" for manual refresh with fresh data</li>
                <li>• Hover over venue markers to see details</li>
                <li>• Green markers = active venues with people present</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Dashboard Overview */}
            <div className="bg-white rounded-lg p-4 border">
              <h2 className="text-lg font-semibold mb-2">System Monitoring Dashboard</h2>
              <p className="text-sm text-gray-600">
                Real-time monitoring of the automated venue system including sync statistics, 
                error tracking, and background job management.
              </p>
            </div>

            {/* Monitoring Dashboard */}
            <VenueMonitoringDashboard />

            {/* Dashboard Features */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 border">
                <h3 className="font-semibold mb-2 flex items-center space-x-2">
                  <span>📈</span>
                  <span>Real-Time Metrics</span>
                </h3>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Total venues in database</li>
                  <li>• Sync success rates</li>
                  <li>• Average venues per sync</li>
                  <li>• Background job status</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-lg p-4 border">
                <h3 className="font-semibold mb-2 flex items-center space-x-2">
                  <span>🔍</span>
                  <span>Error Monitoring</span>
                </h3>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Recent sync errors</li>
                  <li>• API failure tracking</li>
                  <li>• Location-based issues</li>
                  <li>• Automated error resolution</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white border-t mt-8">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="text-center text-sm text-gray-500">
            <p>
              🚀 <strong>Automated Venue System</strong> - Intelligent venue data management with 
              Google Places & Foursquare APIs
            </p>
            <p className="mt-1">
              Features: Auto-sync • Smart categorization • Deduplication • Background jobs • Real-time monitoring
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};