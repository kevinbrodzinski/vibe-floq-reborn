
import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { FloqProvider } from '@/components/FloqProvider';
import { AppLayout } from '@/components/AppLayout';
import { AppRoutes } from '@/router/AppRoutes';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
    },
  },
});

export const FloqApp: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <FloqProvider>
          <AppLayout>
            <AppRoutes />
          </AppLayout>
          <Toaster />
        </FloqProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};
