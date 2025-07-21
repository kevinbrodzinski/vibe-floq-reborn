
import { useParams } from 'react-router-dom';
import { PlanDetailsView } from '@/components/plans/PlanDetailsView';

export default function PlanDetailsPage() {
  const params = useParams();
  const planId = params.id as string;

  return <PlanDetailsView planId={planId} />;
}
