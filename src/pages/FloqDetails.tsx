import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FloqDetails = () => {
  const { floqId } = useParams<{ floqId: string }>();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold">Floq Details</h1>
        </div>

        {/* Stub Content */}
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-2xl">🎭</span>
          </div>
          <h2 className="text-xl font-semibold mb-2">Floq Details</h2>
          <p className="text-muted-foreground mb-4">
            Details for floq: {floqId}
          </p>
          <p className="text-sm text-muted-foreground">
            This is a stub page. Floq details implementation coming soon!
          </p>
        </div>
      </div>
    </div>
  );
};

export default FloqDetails;