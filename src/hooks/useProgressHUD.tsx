import React, { useState } from 'react';
import { ProgressHUD } from '@/components/ui/ProgressHUD';

export function useProgressHUD() {
  const [msg, setMsg] = useState<string | null>(null);
  
  const Portal = () => {
    if (!msg) return null;
    return <ProgressHUD message={msg} />;
  };
  
  return {
    show: (m?: string) => setMsg(m ?? 'Loading...'),
    hide: () => setMsg(null),
    Portal,
  };
}