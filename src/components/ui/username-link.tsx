import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface UsernameLinkProps {
  username: string;
  className?: string;
  children?: React.ReactNode;
}

export const UsernameLink = ({ username, className, children }: UsernameLinkProps) => {
  return (
    <Link 
      to={`/u/${username}`}
      className={cn("text-primary hover:underline", className)}
    >
      {children || `@${username}`}
    </Link>
  );
};