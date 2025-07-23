import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentUserProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { usePreloadOnboarding } from '@/hooks/usePreloadOnboarding';
import { supabase } from '@/integrations/supabase/client';
import { storage } from '@/lib/storage';
import { navigation } from '@/lib/navigation';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  networkError: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
  refreshSession: async () => {},
  networkError: false,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within EnhancedAuthProvider');
  }
  return context;
};

export const EnhancedAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [networkError, setNetworkError] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isOnline } = useNetworkStatus();

  // Preload user data after authentication
  usePreloadOnboarding();

  // Enhanced sign out with proper cleanup
  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      
      // Clear storage first
      await storage.clearAuthStorage();
      
      // Clear React Query cache
      queryClient.clear();
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      
      if (error && error.message !== 'The user session is already signed out') {
        console.error('Sign out error:', error);
        toast({
          variant: 'destructive',
          title: 'Sign out error',
          description: 'There was an issue signing out. Please try again.',
        });
      }
      
      // Force a page refresh to ensure clean state
      navigation.navigate('/');
      
    } catch (error) {
      console.error('Enhanced sign out error:', error);
      // Force refresh even on error to ensure clean state
      navigation.navigate('/');
    }
  }, [queryClient, toast]);

  // Session refresh for network recovery
  const refreshSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('Session refresh error:', error);
        setNetworkError(true);
      } else {
        setNetworkError(false);
        setSession(data.session);
        setUser(data.session?.user ?? null);
      }
    } catch (error) {
      console.error('Session refresh failed:', error);
      setNetworkError(true);
    }
  }, []);

  useEffect(() => {
    let retryTimeout: NodeJS.Timeout;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event);
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        setNetworkError(false);
        
        // Handle session recovery after network reconnection
        if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
          // Invalidate queries to refresh data
          setTimeout(() => {
            queryClient.invalidateQueries();
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Initial session check error:', error);
        setNetworkError(true);
        // Use navigation helper instead of window.location
        navigation.replace('/');
        return;
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [queryClient]);

  // Handle network reconnection
  useEffect(() => {
    if (isOnline && networkError && user) {
      // Retry session refresh when network comes back
      refreshSession();
    }
  }, [isOnline, networkError, user, refreshSession]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      signOut, 
      refreshSession, 
      networkError 
    }}>
      <ProfileErrorHandler />
      {children}
    </AuthContext.Provider>
  );
};

const ProfileErrorHandler = () => {
  const { data: profile, error } = useCurrentUserProfile();
  const { toast } = useToast();

  useEffect(() => {
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Profile load failed',
        description: error.message,
      });
    }
  }, [error, toast]);

  return null;
};