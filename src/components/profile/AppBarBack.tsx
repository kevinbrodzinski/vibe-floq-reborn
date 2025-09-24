import { Button } from '@/components/ui/button';
import { ArrowLeft, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AppBarBackProps {
  title: string;
  showMenu?: boolean;
}

export const AppBarBack = ({ title, showMenu = true }: AppBarBackProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between p-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(-1)}
        className="gap-2 text-white hover:bg-white/10"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>
      <h1 className="text-lg font-light text-white">{title}</h1>
      {showMenu && (
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/10"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};