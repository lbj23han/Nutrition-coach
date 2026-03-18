import { supabase, TABLES } from '../lib/supabase';
import type { FoodEntry, DailyNutrition, MealType, NutritionSummary } from '../types';

const DEMO_USER_ID = 'demo-user-001';

// In-memory store for demo food entries
const _demoEntries: FoodEntry[] = [
  {
    id: 'd1',
    user_id: DEMO_USER_ID,
    food_name: '현미밥',
    meal_type: 'breakfast',
    calories: 300,
    protein_g: 6,
    carbs_g: 65,
    fat_g: 2,
    quantity: 1,
    unit: '공기',
    logged_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 'd2',
    user_id: DEMO_USER_ID,
    food_name: '삶은 계란',
    meal_type: 'breakfast',
    calories: 155,
    protein_g: 13,
    carbs_g: 1,
    fat_g: 11,
    quantity: 2,
    unit: '개',
    logged_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 'd3',
    user_id: DEMO_USER_ID,
    food_name: '닭가슴살 도시락',
    meal_type: 'lunch',
    calories: 420,
    protein_g: 45,
    carbs_g: 38,
    fat_g: 8,
    quantity: 1,
    unit: '개',
    logged_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 'd4',
    user_id: DEMO_USER_ID,
    food_name: '아메리카노',
    meal_type: 'snack',
    calories: 10,
    protein_g: 0,
    carbs_g: 2,
    fat_g: 0,
    quantity: 1,
    unit: '잔',
    logged_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
];

function isDemo(userId: string) {
  return userId === DEMO_USER_ID;
}

export async function logFood(
  userId: string,
  food: Omit<FoodEntry, 'id' | 'user_id' | 'created_at'>
): Promise<FoodEntry> {
  if (isDemo(userId)) {
    const entry: FoodEntry = {
      ...food,
      id: `demo-${Date.now()}`,
      user_id: userId,
      created_at: new Date().toISOString(),
    };
    _demoEntries.push(entry);
    return entry;
  }

  const { data, error } = await supabase
    .from(TABLES.FOOD_ENTRIES)
    .insert({ ...food, user_id: userId })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getFoodEntriesByDate(
  userId: string,
  date: string
): Promise<FoodEntry[]> {
  if (isDemo(userId)) {
    return _demoEntries.filter((e) => e.logged_at.startsWith(date));
  }

  const startOfDay = `${date}T00:00:00.000Z`;
  const endOfDay = `${date}T23:59:59.999Z`;

  const { data, error } = await supabase
    .from(TABLES.FOOD_ENTRIES)
    .select('*')
    .eq('user_id', userId)
    .gte('logged_at', startOfDay)
    .lte('logged_at', endOfDay)
    .order('logged_at', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function deleteFoodEntry(entryId: string, userId?: string): Promise<void> {
  if (userId && isDemo(userId)) {
    const idx = _demoEntries.findIndex((e) => e.id === entryId);
    if (idx !== -1) _demoEntries.splice(idx, 1);
    return;
  }

  const { error } = await supabase
    .from(TABLES.FOOD_ENTRIES)
    .delete()
    .eq('id', entryId);

  if (error) throw new Error(error.message);
}

export async function getDailyNutrition(
  userId: string,
  date: string
): Promise<DailyNutrition> {
  const entries = await getFoodEntriesByDate(userId, date);

  const totals = entries.reduce(
    (acc, entry) => ({
      calories: acc.calories + entry.calories,
      protein: acc.protein + entry.protein_g,
      carbs: acc.carbs + entry.carbs_g,
      fat: acc.fat + entry.fat_g,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return {
    date,
    total_calories: Math.round(totals.calories),
    total_protein: Math.round(totals.protein * 10) / 10,
    total_carbs: Math.round(totals.carbs * 10) / 10,
    total_fat: Math.round(totals.fat * 10) / 10,
    entries,
  };
}

export async function getWeeklyNutrition(
  userId: string,
  endDate: string
): Promise<DailyNutrition[]> {
  const results: DailyNutrition[] = [];
  const end = new Date(endDate);

  for (let i = 6; i >= 0; i--) {
    const date = new Date(end);
    date.setDate(end.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    if (isDemo(userId)) {
      // Generate realistic demo weekly data
      const base = [850, 1200, 1650, 980, 2100, 1800, 885];
      const cal = base[6 - i] ?? 1500;
      results.push({
        date: dateStr,
        total_calories: cal,
        total_protein: Math.round(cal * 0.3 / 4),
        total_carbs: Math.round(cal * 0.4 / 4),
        total_fat: Math.round(cal * 0.3 / 9),
        entries: [],
      });
    } else {
      const daily = await getDailyNutrition(userId, dateStr);
      results.push(daily);
    }
  }

  return results;
}

export function calculateNutritionProgress(
  current: NutritionSummary,
  targets: NutritionSummary
): { calories: number; protein: number; carbs: number; fat: number } {
  return {
    calories: Math.min((current.calories / targets.calories) * 100, 100),
    protein: Math.min((current.protein / targets.protein) * 100, 100),
    carbs: Math.min((current.carbs / targets.carbs) * 100, 100),
    fat: Math.min((current.fat / targets.fat) * 100, 100),
  };
}

export function getMealsByType(
  entries: FoodEntry[]
): Record<MealType, FoodEntry[]> {
  return {
    breakfast: entries.filter((e) => e.meal_type === 'breakfast'),
    lunch: entries.filter((e) => e.meal_type === 'lunch'),
    dinner: entries.filter((e) => e.meal_type === 'dinner'),
    snack: entries.filter((e) => e.meal_type === 'snack'),
  };
}
