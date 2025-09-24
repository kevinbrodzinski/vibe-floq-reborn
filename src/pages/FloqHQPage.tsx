import React from "react";
import { useParams } from "react-router-dom";
import FloqHQTabbed from "@/components/floq/FloqHQTabbed";
import { ErrorBoundary } from 'react-error-boundary';

function FloqHQErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 max-w-md mx-auto p-6">
        <h2 className="text-xl font-semibold text-destructive">FloqHQ Error</h2>
        <p className="text-muted-foreground text-sm">
          {error.message || 'Unable to load FloqHQ interface.'}
        </p>
        <button
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export default function FloqHQPage() {
  const { floqId } = useParams<{ floqId: string }>();
  
  if (!floqId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-md mx-auto p-6">
          <h2 className="text-xl font-semibold text-destructive">Invalid FloqHQ</h2>
          <p className="text-muted-foreground text-sm">
            No floq ID provided. Please navigate to a valid floq.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary FallbackComponent={FloqHQErrorFallback}>
      <FloqHQTabbed />
    </ErrorBoundary>
  );
}