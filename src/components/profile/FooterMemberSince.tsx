import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Shield, Flag } from 'lucide-react';

interface FooterMemberSinceProps {
  createdAt?: string;
}

export const FooterMemberSince = ({ createdAt }: FooterMemberSinceProps) => {
  const memberSince = createdAt 
    ? format(new Date(createdAt), 'MMMM yyyy')
    : 'Recently';

  return (
    <div className="text-center pt-6 border-t border-white/10">
      <p className="text-sm text-muted-foreground mb-4">
        Member since {memberSince}
      </p>
      <div className="flex justify-center gap-4">
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white">
          <Flag className="h-4 w-4 mr-2" />
          Report
        </Button>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white">
          <Shield className="h-4 w-4 mr-2" />
          Block
        </Button>
      </div>
    </div>
  );
};