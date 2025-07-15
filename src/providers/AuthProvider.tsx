import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { nanoid } from 'nanoid';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Ensure profile exists for authenticated user
        if (session?.user && event === 'SIGNED_IN') {
          setTimeout(async () => {
            try {
              // Generate a unique temporary username with collision guard
              const emailPrefix = session.user.email?.split('@')[0] || 'user';
              const tempUsername = `${emailPrefix.slice(0, 25)}_${nanoid(6)}`.toLowerCase();
              
              const profileData = {
                id: session.user.id,
                username: tempUsername,
                display_name: 'New User',   // placeholder; UI will prompt for full name
                full_name: null
              };

              const { data, error } = await supabase
                .from('profiles')
                .upsert(profileData, { onConflict: 'id' })
                .select()
                .single();
              
              if (error) {
                // Handle race conditions with migration or unique violations
                if (error.code === '23514' || error.code === '23505') {
                  // Retry with a fresh random handle
                  const fallbackUsername = `user_${nanoid(10)}`.toLowerCase();
                  const { data: retryData, error: retryError } = await supabase
                    .from('profiles')
                    .upsert({
                      ...profileData,
                      username: fallbackUsername
                    }, { onConflict: 'id' })
                    .select()
                    .single();
                  
                  if (!retryError && retryData) {
                    // Cache the profile in React Query
                    queryClient.setQueryData(['profile', session.user.id], retryData);
                  } else {
                    console.error('Profile creation retry failed:', retryError);
                  }
                } else {
                  console.error('Profile creation error:', error);
                }
              } else if (data) {
                // Cache the profile in React Query
                queryClient.setQueryData(['profile', session.user.id], data);
              }
            } catch (err) {
              console.error('Profile upsert failed:', err);
            }
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
};