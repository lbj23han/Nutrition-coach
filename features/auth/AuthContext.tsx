import React, { createContext, useContext, useEffect, useState } from 'react';
import { getUserProfile } from '../../services/auth';
import type { User, UserProfile, FitnessGoal } from '../../types';

// Demo user data — no Supabase required
export const DEMO_USER: User = {
  id: 'demo-user-001',
  email: 'demo@nutritioncoach.app',
  created_at: new Date().toISOString(),
};

export const DEMO_PROFILE: UserProfile = {
  id: 'demo-profile-001',
  user_id: 'demo-user-001',
  name: '김데모',
  age: 28,
  gender: 'male',
  height_cm: 175,
  weight_kg: 72,
  body_fat_percentage: 18,
  lean_body_mass: 59,
  activity_level: 'moderate',
  goal: 'lean_bulk' as FitnessGoal,
  bmr: 1820,
  tdee: 2821,
  daily_calorie_target: 2400,
  daily_protein_target: 180,
  daily_carb_target: 280,
  daily_fat_target: 70,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  loginDemo: () => void;
  logoutDemo: () => void;
  updateDemoProfile: (p: Omit<UserProfile, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,
  isDemoMode: false,
  loginDemo: () => {},
  logoutDemo: () => {},
  updateDemoProfile: () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const loginDemo = () => {
    setUser(DEMO_USER);
    setProfile(DEMO_PROFILE);
    setIsDemoMode(true);
  };

  const logoutDemo = () => {
    setUser(null);
    setProfile(null);
    setIsDemoMode(false);
  };

  const updateDemoProfile = (
    p: Omit<UserProfile, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ) => {
    setProfile({
      id: 'demo-profile-001',
      user_id: 'demo-user-001',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...p,
    });
  };

  const refreshProfile = async () => {
    if (!user || isDemoMode) return;
    const p = await getUserProfile(user.id);
    setProfile(p);
  };

  useEffect(() => {
    // Try Supabase if env vars are set, otherwise just finish loading
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const hasSupabase =
      supabaseUrl && !supabaseUrl.includes('your-project');

    if (!hasSupabase) {
      setIsLoading(false);
      return;
    }

    let subscription: { unsubscribe: () => void } | null = null;

    import('../../lib/supabase').then(({ supabase }) => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          const u: User = {
            id: session.user.id,
            email: session.user.email!,
            created_at: session.user.created_at,
          };
          setUser(u);
          getUserProfile(u.id)
            .then(setProfile)
            .finally(() => setIsLoading(false));
        } else {
          setIsLoading(false);
        }
      });

      const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const u: User = {
            id: session.user.id,
            email: session.user.email!,
            created_at: session.user.created_at,
          };
          setUser(u);
          const p = await getUserProfile(u.id);
          setProfile(p);
        } else if (!isDemoMode) {
          setUser(null);
          setProfile(null);
        }
      });
      subscription = data.subscription;
    });

    return () => subscription?.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        isAuthenticated: !!user,
        isDemoMode,
        loginDemo,
        logoutDemo,
        updateDemoProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
