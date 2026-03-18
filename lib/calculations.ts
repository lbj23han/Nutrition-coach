import type { ActivityLevel, FitnessGoal } from '../types';

export interface BodyMetrics {
  weight_kg: number;
  height_cm: number;
  age: number;
  gender: string;
  body_fat_percentage?: number;
  activity_level: ActivityLevel;
  goal: FitnessGoal;
}

export interface CalculationResult {
  lean_body_mass: number | undefined;
  bmr: number;
  tdee: number;
  daily_calorie_target: number;
  daily_protein_target: number;
  daily_carb_target: number;
  daily_fat_target: number;
  surplus_deficit: number; // kcal difference from TDEE
}

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

// Goal calorie adjustments from TDEE
export const GOAL_CALORIE_ADJUSTMENTS: Record<FitnessGoal, number> = {
  bulk: 500,        // +500 kcal aggressive bulk
  lean_bulk: 200,   // +200 kcal lean/clean bulk
  cutting: -400,    // -400 kcal cut
  diet: -600,       // -600 kcal diet
  maintenance: 0,   // no change
  recomp: -100,     // slight deficit for recomp
};

// Protein targets in g per kg of LBM (or body weight if no BF%)
export const GOAL_PROTEIN_PER_KG: Record<FitnessGoal, number> = {
  bulk: 2.0,
  lean_bulk: 2.2,
  cutting: 2.5,     // high protein to preserve muscle during cut
  diet: 1.8,
  maintenance: 1.6,
  recomp: 2.3,
};

// Carb % of remaining calories after protein
export const GOAL_CARB_RATIO: Record<FitnessGoal, number> = {
  bulk: 0.55,
  lean_bulk: 0.50,
  cutting: 0.40,
  diet: 0.35,
  maintenance: 0.45,
  recomp: 0.42,
};

export function calculateBMR(metrics: BodyMetrics): number {
  const { weight_kg, height_cm, age, gender, body_fat_percentage } = metrics;

  // If body fat % known → Katch-McArdle (more accurate)
  if (body_fat_percentage != null && body_fat_percentage > 0) {
    const lbm = weight_kg * (1 - body_fat_percentage / 100);
    return Math.round(370 + 21.6 * lbm);
  }

  // Mifflin-St Jeor
  if (gender === 'male') {
    return Math.round(10 * weight_kg + 6.25 * height_cm - 5 * age + 5);
  }
  return Math.round(10 * weight_kg + 6.25 * height_cm - 5 * age - 161);
}

export function calculateAll(metrics: BodyMetrics): CalculationResult {
  const { weight_kg, body_fat_percentage, activity_level, goal } = metrics;

  const lean_body_mass =
    body_fat_percentage != null && body_fat_percentage > 0
      ? Math.round((weight_kg * (1 - body_fat_percentage / 100)) * 10) / 10
      : undefined;

  const bmr = calculateBMR(metrics);
  const tdee = Math.round(bmr * ACTIVITY_MULTIPLIERS[activity_level]);
  const adjustment = GOAL_CALORIE_ADJUSTMENTS[goal];
  const daily_calorie_target = Math.max(1200, tdee + adjustment);

  // Protein based on LBM or body weight
  const proteinBase = lean_body_mass ?? weight_kg;
  const daily_protein_target = Math.round(proteinBase * GOAL_PROTEIN_PER_KG[goal]);
  const protein_calories = daily_protein_target * 4;

  // Remaining calories for carbs + fat
  const remaining = Math.max(0, daily_calorie_target - protein_calories);
  const carb_ratio = GOAL_CARB_RATIO[goal];
  const daily_carb_target = Math.round((remaining * carb_ratio) / 4);
  const daily_fat_target = Math.round((remaining * (1 - carb_ratio)) / 9);

  return {
    lean_body_mass,
    bmr,
    tdee,
    daily_calorie_target,
    daily_protein_target,
    daily_carb_target,
    daily_fat_target,
    surplus_deficit: adjustment,
  };
}
