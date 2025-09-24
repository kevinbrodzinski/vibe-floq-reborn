import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const NewPlan = () => {
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
            onClick={() => navigate(`/floqs/${floqId}`)}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold">Create Plan</h1>
        </div>

        {/* Content */}
        <Card className="p-6">
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-2xl">📅</span>
            </div>
            <h2 className="text-xl font-semibold mb-2">Plan Creation</h2>
            <p className="text-muted-foreground mb-4">
              Plan coordination tools are coming soon!
            </p>
            <p className="text-sm text-muted-foreground">
              This feature will allow hosts to create and coordinate activities and future meetups with their floq members.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default NewPlan;