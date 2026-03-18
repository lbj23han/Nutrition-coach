import { supabase, TABLES } from '../lib/supabase';
import type { User, UserProfile } from '../types';

export async function signUp(
  email: string,
  password: string
): Promise<{ user: User | null; error: string | null }> {
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) return { user: null, error: error.message };
  if (!data.user) return { user: null, error: '회원가입에 실패했습니다.' };

  return {
    user: {
      id: data.user.id,
      email: data.user.email!,
      created_at: data.user.created_at,
    },
    error: null,
  };
}

export async function signIn(
  email: string,
  password: string
): Promise<{ user: User | null; error: string | null }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return { user: null, error: error.message };
  if (!data.user) return { user: null, error: '로그인에 실패했습니다.' };

  return {
    user: {
      id: data.user.id,
      email: data.user.email!,
      created_at: data.user.created_at,
    },
    error: null,
  };
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function getCurrentUser(): Promise<User | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return {
    id: user.id,
    email: user.email!,
    created_at: user.created_at,
  };
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from(TABLES.USER_PROFILES)
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  return data;
}

export async function createOrUpdateUserProfile(
  userId: string,
  profile: Omit<UserProfile, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from(TABLES.USER_PROFILES)
    .upsert(
      {
        user_id: userId,
        ...profile,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export function calculateDailyTargets(profile: {
  weight_kg: number;
  height_cm: number;
  age: number;
  gender: string;
  activity_level: string;
  goal: string;
}): { calories: number; protein: number; carbs: number; fat: number } {
  // Mifflin-St Jeor Equation for BMR
  let bmr: number;
  if (profile.gender === 'male') {
    bmr = 10 * profile.weight_kg + 6.25 * profile.height_cm - 5 * profile.age + 5;
  } else {
    bmr = 10 * profile.weight_kg + 6.25 * profile.height_cm - 5 * profile.age - 161;
  }

  const activityMultipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };

  const tdee = bmr * (activityMultipliers[profile.activity_level] ?? 1.55);

  let calories = tdee;
  if (profile.goal === 'weight_loss') calories = tdee - 500;
  else if (profile.goal === 'muscle_gain') calories = tdee + 300;

  // Macros: 30% protein, 40% carbs, 30% fat
  const protein = Math.round((calories * 0.3) / 4);
  const carbs = Math.round((calories * 0.4) / 4);
  const fat = Math.round((calories * 0.3) / 9);

  return {
    calories: Math.round(calories),
    protein,
    carbs,
    fat,
  };
}
