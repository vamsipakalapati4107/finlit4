import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        void handleDailyLoginReward(session.user.id);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        void handleDailyLoginReward(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleDailyLoginReward = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('last_login_date, streak_days, xp')
        .eq('id', userId)
        .maybeSingle();

      if (error) return; // silently ignore errors
      if (!profile) {
        try {
          await supabase
            .from('profiles')
            .insert({ id: userId })
            .select('id')
            .single();
        } catch {
          // ignore insert race conditions
        }
        return; // profile will exist next time
      }

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const lastLogin = profile?.last_login_date ? new Date(profile.last_login_date) : null;

      let newStreak = profile?.streak_days || 0;
      if (!lastLogin) {
        newStreak = 1;
      } else {
        const diffDays = Math.floor((today.setHours(0,0,0,0) - new Date(lastLogin.setHours(0,0,0,0)).getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) newStreak = newStreak + 1;
        else if (diffDays > 1) newStreak = 1; // reset
      }

      const dailyXP = 20;
      await supabase
        .from('profiles')
        .update({
          last_login_date: todayStr,
          streak_days: newStreak,
          xp: (profile?.xp || 0) + dailyXP,
        })
        .eq('id', userId);

      if (newStreak > 0 && newStreak % 7 === 0) {
        toast.success(`🔥 ${newStreak}-day streak! +${dailyXP} XP`);
      }
    } catch (e) {
      // non-fatal; ignore if offline or table missing
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      toast.error(error.message);
      throw error;
    }

    toast.success('Account created successfully!');
    navigate('/onboarding');
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      throw error;
    }

    toast.success('Welcome back!');
    navigate('/dashboard');
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      toast.error(error.message);
      throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      toast.error(error.message);
      throw error;
    }

    toast.success('Signed out successfully');
    navigate('/');
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
