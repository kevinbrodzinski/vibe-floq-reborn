
'use client';

import { useParams } from 'next/navigation';
import { PlanDetailsView } from '@/components/plans/PlanDetailsView';

export default function PlanDetailsPage() {
  const params = useParams();
  const planId = params.id as string;

  return <PlanDetailsView planId={planId} />;
}
