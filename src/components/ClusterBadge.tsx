
import { FC } from 'react';
import { zIndex } from '@/constants/z';

interface Props {
  count: number;
  x: number;
  y: number;
  onClick?: () => void;
}

const ClusterBadge: FC<Props> = ({ count, x, y, onClick }) => (
  <div
    className="absolute flex items-center justify-center text-[10px] font-medium text-white
               h-5 min-w-5 rounded-full bg-neutral-900/75 backdrop-blur cursor-pointer 
               hover:bg-neutral-800/75 transition-colors pointer-events-auto"
    style={{ 
      left: `${x}%`,
      top: `${y}%`,
      transform: 'translate(-50%, -50%) translate(6px, -6px)',
      ...zIndex('mapOverlay').style
    }}
    onClick={onClick}
    aria-label={`+${count} more people`}
  >
    +{count}
  </div>
);

export default ClusterBadge;
