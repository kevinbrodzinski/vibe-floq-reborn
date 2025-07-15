import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
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
              // Generate a temporary username from email if no username exists
              const emailPrefix = session.user.email?.split('@')[0] || 'user';
              const tempUsername = `${emailPrefix}_${session.user.id.slice(0, 6)}`.toLowerCase();
              
              const { error } = await supabase
                .from('profiles')
                .upsert({
                  id: session.user.id,
                  username: tempUsername,
                  display_name: 'New User',   // placeholder; UI will prompt for full name
                  full_name: null
                }, { onConflict: 'id' });
              
              if (error) {
                console.error('Profile creation error:', error);
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