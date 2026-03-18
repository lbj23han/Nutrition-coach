-- Enable Row Level Security
-- Run these SQL statements in your Supabase SQL Editor

-- User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  name TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age > 0 AND age < 150),
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  height_cm NUMERIC(5,2) NOT NULL CHECK (height_cm > 0),
  weight_kg NUMERIC(5,2) NOT NULL CHECK (weight_kg > 0),
  body_fat_percentage NUMERIC(4,1),
  lean_body_mass NUMERIC(5,2),
  activity_level TEXT NOT NULL CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  goal TEXT NOT NULL CHECK (goal IN ('bulk', 'lean_bulk', 'cutting', 'diet', 'maintenance', 'recomp')),
  bmr INTEGER NOT NULL DEFAULT 1500,
  tdee INTEGER NOT NULL DEFAULT 2000,
  daily_calorie_target INTEGER NOT NULL DEFAULT 2000,
  daily_protein_target INTEGER NOT NULL DEFAULT 150,
  daily_carb_target INTEGER NOT NULL DEFAULT 250,
  daily_fat_target INTEGER NOT NULL DEFAULT 65,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Food Entries Table
CREATE TABLE IF NOT EXISTS food_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  food_name TEXT NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  calories NUMERIC(8,2) NOT NULL CHECK (calories >= 0),
  protein_g NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (protein_g >= 0),
  carbs_g NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (carbs_g >= 0),
  fat_g NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (fat_g >= 0),
  fiber_g NUMERIC(6,2) CHECK (fiber_g >= 0),
  sodium_mg NUMERIC(8,2) CHECK (sodium_mg >= 0),
  quantity NUMERIC(8,2) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'g',
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for food_entries
CREATE POLICY "Users can view their own food entries"
  ON food_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own food entries"
  ON food_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own food entries"
  ON food_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own food entries"
  ON food_entries FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_food_entries_user_id ON food_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_food_entries_logged_at ON food_entries(logged_at);
CREATE INDEX IF NOT EXISTS idx_food_entries_user_date ON food_entries(user_id, logged_at);
