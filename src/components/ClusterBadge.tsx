
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
    className="absolute flex items-center justify-center text-[10px] font-medium
               h-5 min-w-5 rounded-full bg-[color:var(--bg-alt)] backdrop-blur cursor-pointer 
               hover:bg-[color:var(--chip-bg)] transition-colors pointer-events-auto
               text-[color:var(--ink)] border border-[color:var(--border)]"
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
