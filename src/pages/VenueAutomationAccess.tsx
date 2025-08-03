import React from 'react';
import { Button } from '@/components/ui/button';

export const VenueAutomationAccess: React.FC = () => {
  const handleNavigate = (path: string) => {
    window.location.href = path;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🤖</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Automated Venue System
            </h1>
            <p className="text-gray-600 text-lg">
              Experience the next-generation venue data management system
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-2xl">🔄</span>
                <h3 className="font-semibold text-blue-900">Auto-Sync</h3>
              </div>
              <p className="text-sm text-blue-700">
                Automatically syncs venues from Google Places & Foursquare when you explore new areas
              </p>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-2xl">🧠</span>
                <h3 className="font-semibold text-green-900">Smart Intelligence</h3>
              </div>
              <p className="text-sm text-green-700">
                AI-powered venue categorization, trend analysis, and recommendation scoring
              </p>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-2xl">🔀</span>
                <h3 className="font-semibold text-purple-900">Deduplication</h3>
              </div>
              <p className="text-sm text-purple-700">
                Intelligently combines data from multiple sources without duplicates
              </p>
            </div>

            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-2xl">📊</span>
                <h3 className="font-semibold text-orange-900">Monitoring</h3>
              </div>
              <p className="text-sm text-orange-700">
                Real-time monitoring dashboard with performance metrics and error tracking
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <Button
              onClick={() => handleNavigate('/venue-automation-demo')}
              className="w-full h-14 text-lg bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
            >
              <span className="mr-2">🚀</span>
              Launch Interactive Demo
            </Button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={() => handleNavigate('/venue-test')}
                variant="outline"
                className="h-12"
              >
                <span className="mr-2">🧪</span>
                Venue Test Page
              </Button>

              <Button
                onClick={() => handleNavigate('/venues')}
                variant="outline"
                className="h-12"
              >
                <span className="mr-2">🏢</span>
                Venue Directory
              </Button>
            </div>
          </div>

          {/* System Status */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">System Status</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Frontend: Online</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span>Supabase: Local Mode</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span>Google Places: API Key Required</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span>Foursquare: API Key Required</span>
              </div>
            </div>
          </div>

          {/* Quick Setup Instructions */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">🔧 Quick Setup</h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p>1. Set up Supabase locally: <code className="bg-blue-100 px-1 rounded">npx supabase start</code></p>
              <p>2. Add API keys to Supabase secrets</p>
              <p>3. Deploy edge functions: <code className="bg-blue-100 px-1 rounded">npx supabase functions deploy</code></p>
              <p>4. Run database migrations</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};