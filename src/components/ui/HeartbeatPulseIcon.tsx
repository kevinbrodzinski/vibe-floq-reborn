import React from 'react';

interface HeartbeatPulseIconProps {
  className?: string;
  size?: number;
  color?: string;
}

export const HeartbeatPulseIcon: React.FC<HeartbeatPulseIconProps> = ({
  className = '',
  size = 24,
  color = 'currentColor'
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M2 12L4 10L6 12L8 8L10 12L12 10L14 12L16 8L18 12L20 10L22 12"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}; 