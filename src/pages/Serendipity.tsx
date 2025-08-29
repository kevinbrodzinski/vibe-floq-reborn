import React from 'react';
import { SerendipityDashboard } from '@/components/serendipity/SerendipityDashboard';

export default function Serendipity() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto py-6">
        <SerendipityDashboard />
      </div>
    </div>
  );
}