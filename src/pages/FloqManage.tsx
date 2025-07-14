import React from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/AuthProvider';
import { useFloqDetails } from '@/hooks/useFloqDetails';
import { useNavigation } from '@/hooks/useNavigation';
import { ManageFloqView } from '@/components/floq/ManageFloqView';
import { useEndFloq } from '@/hooks/useEndFloq';
import { EndFloqConfirmDialog } from '@/components/EndFloqConfirmDialog';
import { useState } from 'react';

const FloqManage = () => {
  const { floqId } = useParams<{ floqId: string }>();
  const { session } = useAuth();
  const { goBack } = useNavigation();
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const { mutateAsync: endFloq, isPending: isEndingFloq } = useEndFloq();
  
  const { data: floqDetails, isLoading } = useFloqDetails(floqId, session?.user?.id);

  const handleEndFloq = async () => {
    if (!floqDetails) return;
    
    try {
      await endFloq(floqDetails.id);
      setShowEndConfirm(false);
      goBack();
    } catch (error) {
      console.error('Failed to end floq:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-md mx-auto p-4">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="sm" onClick={goBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="h-6 w-32 bg-muted animate-pulse rounded" />
          </div>
          <div className="space-y-4">
            <div className="h-48 bg-muted animate-pulse rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!floqDetails) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-md mx-auto p-4">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="sm" onClick={goBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold">Floq Not Found</h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur flex items-center gap-2 px-4 py-3 border-b">
        <Button variant="ghost" size="sm" onClick={goBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-semibold">Manage Floq</h1>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-md mx-auto py-6">
          <ManageFloqView 
            floqDetails={floqDetails}
            onEndFloq={() => setShowEndConfirm(true)}
            isEndingFloq={isEndingFloq}
          />
        </div>
      </div>
      
      {/* End Floq Confirmation Dialog */}
      <EndFloqConfirmDialog
        isOpen={showEndConfirm}
        onOpenChange={setShowEndConfirm}
        onConfirm={handleEndFloq}
        isLoading={isEndingFloq}
      />
    </div>
  );
};

export default FloqManage;