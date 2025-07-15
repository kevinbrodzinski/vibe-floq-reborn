import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import slugify from 'slugify';
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

        // Only handle profile creation for authenticated users
        if (!session?.user) return;

        const user = session.user;
        
        // Check if profile already exists
        const { data: existing, error: selErr } = await supabase
          .from("profiles")
          .select("id, username")
          .eq("id", user.id)
          .maybeSingle();

        if (selErr) {
          console.error("[Auth] profile lookup failed", selErr);
          return;
        }

        // Only create if profile doesn't exist
        if (!existing) {
          // Generate a safe username once
          const base = slugify(user.email?.split("@")[0] ?? "user", {
            lower: true,
            strict: true,
          });
          // Append 4-char hash to avoid collisions
          const username = `${base}_${user.id.slice(0, 4)}`;

          const { data, error: insErr } = await supabase.from("profiles").insert({
            id: user.id,
            display_name: user.user_metadata?.full_name ?? base,
            avatar_url: user.user_metadata?.avatar_url ?? null,
            username,
          }).select().single();

          if (insErr) {
            console.error("[Auth] profile insert failed", insErr);
          } else if (data) {
            // Cache the new profile
            queryClient.setQueryData(['profile', user.id], data);
          }
        } else {
          // Profile exists, just cache it
          queryClient.setQueryData(['profile', user.id], existing);
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
  }, [queryClient]);

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
};