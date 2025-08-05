import { DataRecordingStatus } from '@/components/afterglow/DataRecordingStatus';
import { AfterglowGenerationPanel } from '@/components/afterglow/AfterglowGenerationPanel';

/**
 * Complete Afterglow Pipeline Test Page
 * Shows all 4 steps of the afterglow implementation
 */
export const AfterglowTestPage = () => {
  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Afterglow Pipeline Test</h1>
        <p className="text-muted-foreground">
          Complete 4-step afterglow implementation: Data Recording → Staleness Triggers → Real-time Updates → Generation Pipeline
        </p>
      </div>
      
      <div className="grid gap-6">
        {/* Step 3: Real-time Updates */}
        <DataRecordingStatus />
        
        {/* Step 4: Generation Pipeline */}
        <AfterglowGenerationPanel />
        
        <div className="text-center text-sm text-muted-foreground mt-8">
          <p>💡 Try interacting with venues, changing vibes, joining floqs, or creating plans to see the pipeline in action!</p>
        </div>
      </div>
    </div>
  );
};