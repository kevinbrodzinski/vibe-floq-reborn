
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface FloqPlanFABProps {
  floqId: string;
}

export const FloqPlanFAB = ({ floqId }: FloqPlanFABProps) => {
  const navigate = useNavigate();

  return (
    <Button
      size="icon"
      className="fixed bottom-24 right-6 rounded-full bg-gradient-to-br from-violet-500 to-sky-500 shadow-xl hover:shadow-2xl transition-shadow z-50"
      onClick={() => navigate(`/floqs/${floqId}/plans/new`)}
    >
      <Plus className="w-6 h-6 text-white" />
    </Button>
  );
};
