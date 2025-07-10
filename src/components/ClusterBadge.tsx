import { FC } from 'react';

interface Props {
  count: number;
  x: number;
  y: number;
}

const ClusterBadge: FC<Props> = ({ count, x, y }) => (
  <div
    className="absolute flex items-center justify-center text-[10px] font-medium text-white
               h-5 min-w-5 rounded-full bg-gray-800/90 backdrop-blur pointer-events-none"
    style={{ 
      left: `${x}%`,
      top: `${y}%`,
      transform: 'translate(-50%, -50%)',
      zIndex: 1000
    }}
  >
    +{count}
  </div>
);

export default ClusterBadge;