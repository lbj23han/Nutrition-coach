// User types
export interface User {
  id: string;
  email: string;
  created_at: string;
  profile?: UserProfile;
}

export interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  height_cm: number;
  weight_kg: number;
  body_fat_percentage?: number;   // optional
  lean_body_mass?: number;        // calculated: weight * (1 - bf/100)
  activity_level: ActivityLevel;
  goal: FitnessGoal;
  // Calculated targets
  bmr: number;
  tdee: number;
  daily_calorie_target: number;
  daily_protein_target: number;
  daily_carb_target: number;
  daily_fat_target: number;
  created_at: string;
  updated_at: string;
}

export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very_active';

export type FitnessGoal =
  | 'bulk'
  | 'lean_bulk'
  | 'cutting'
  | 'diet'
  | 'maintenance'
  | 'recomp';

// Nutrition types
export interface FoodEntry {
  id: string;
  user_id: string;
  food_name: string;
  meal_type: MealType;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sodium_mg?: number;
  quantity: number;
  unit: string;
  logged_at: string;
  created_at: string;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface DailyNutrition {
  date: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  entries: FoodEntry[];
}

export interface NutritionSummary {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// AI Coaching types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

// Chart types
export interface WeeklyData {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// API response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface FoodSearchResult {
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
}
