import React from 'react';
import { useParams } from 'react-router-dom';
import FlowReflection from '@/components/flow/FlowReflection';

export default function FlowReflectionPage() {
  const { flowId } = useParams<{ flowId: string }>();
  
  if (!flowId) {
    return (
      <div className="p-6 text-white/80">
        <h1 className="text-xl font-semibold text-red-300">Invalid Flow</h1>
        <p>Flow ID is required to view reflection.</p>
      </div>
    );
  }

  return <FlowReflection flowId={flowId} />;
}