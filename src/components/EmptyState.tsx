import React from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  animation?: string;
  variant?: 'inline' | 'page' | 'modal';
  children?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  title, 
  description, 
  animation,
  variant = 'page',
  children 
}) => {
  const sizeClasses = {
    inline: 'p-4',
    page: 'p-8',
    modal: 'p-6'
  };
  return (
    <div className={`flex flex-col items-center justify-center ${sizeClasses[variant]} text-center`}>
      {/* Animation placeholder - could be enhanced with Lottie later */}
      {animation && (
        <div className="w-32 h-32 mb-4 flex items-center justify-center bg-muted/50 rounded-full animate-pulse">
          <div className="text-4xl">🎉</div>
        </div>
      )}
      
      <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      
      {children}
    </div>
  );
};