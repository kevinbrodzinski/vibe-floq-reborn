
import React from 'react';

export const VibeDensityBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 opacity-20 pointer-events-none">
      {/* Subtle grid pattern */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(circle at 25% 25%, hsl(var(--primary) / 0.1) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, hsl(var(--accent) / 0.1) 0%, transparent 50%),
            radial-gradient(circle at 25% 75%, hsl(var(--secondary) / 0.1) 0%, transparent 50%),
            radial-gradient(circle at 75% 25%, hsl(var(--primary) / 0.1) 0%, transparent 50%)
          `,
          backgroundSize: '400px 400px',
          animation: 'pulse 8s ease-in-out infinite'
        }}
      />
      
      {/* Flowing lines */}
      <div className="absolute inset-0">
        <svg className="w-full h-full" viewBox="0 0 1000 1000" opacity="0.05">
          <defs>
            <linearGradient id="flow1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="hsl(var(--accent))" />
            </linearGradient>
          </defs>
          <path
            d="M0,300 Q250,200 500,300 T1000,300"
            stroke="url(#flow1)"
            strokeWidth="2"
            fill="none"
            className="animate-pulse"
          />
          <path
            d="M0,700 Q250,600 500,700 T1000,700"
            stroke="url(#flow1)"
            strokeWidth="2"
            fill="none"
            className="animate-pulse"
            style={{ animationDelay: '2s' }}
          />
        </svg>
      </div>
    </div>
  );
};
