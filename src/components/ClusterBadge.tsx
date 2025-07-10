import { FC } from 'react';

interface Props {
  count: number;
  x: number;
  y: number;
}

const ClusterBadge: FC<Props> = ({ count, x, y }) => (
  <div
    className="absolute flex items-center justify-center text-[10px] font-medium text-white
               h-5 min-w-5 rounded-full bg-neutral-900/75 backdrop-blur"
    style={{ 
      left: `${x}%`,
      top: `${y}%`,
      transform: 'translate(-50%, -50%) translate(6px, -6px)',
      zIndex: 1000
    }}
    aria-label={`+${count} more people`}
  >
    +{count}
  </div>
);

export default ClusterBadge;