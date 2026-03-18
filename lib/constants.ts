export const APP_NAME = '나만의 영양코치';

export const COLORS = {
  // Core
  primary: '#486400',
  primaryContainer: '#c5fd4f',
  primaryDark: '#3e5700',
  primaryLight: '#b8ef42',
  secondary: '#874e00',
  secondaryContainer: '#ffc791',
  tertiary: '#705900',
  tertiaryContainer: '#facd34',
  // Surfaces
  background: '#f6f6f6',
  surface: '#f6f6f6',
  surfaceContainer: '#e7e8e8',
  surfaceContainerLow: '#f0f1f1',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerHigh: '#e1e3e3',
  surfaceContainerHighest: '#dbdddd',
  // Text
  text: '#2d2f2f',
  textSecondary: '#5a5c5c',
  // Utility
  border: '#acadad',
  error: '#b02500',
  white: '#ffffff',
  black: '#000000',
  // Macros
  calories: '#b02500',
  protein: '#486400',
  carbs: '#874e00',
  fat: '#705900',
  // Backwards compat
  accent: '#486400',
} as const;

export const MEAL_TYPES = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
} as const;

export const ACTIVITY_LEVELS: Record<string, { label: string; description: string }> = {
  sedentary: {
    label: '거의 활동 없음',
    description: '주로 앉아서 생활, 운동 거의 안 함',
  },
  light: {
    label: '가벼운 활동',
    description: '가벼운 운동 주 1~3회',
  },
  moderate: {
    label: '보통 활동',
    description: '중간 강도 운동 주 3~5회',
  },
  active: {
    label: '활동적',
    description: '고강도 운동 주 6~7회',
  },
  very_active: {
    label: '매우 활동적',
    description: '고강도 운동 매일 or 육체 노동',
  },
};

export const FITNESS_GOALS: Record<string, {
  label: string;
  emoji: string;
  description: string;
  detail: string;
  color: string;
}> = {
  bulk: {
    label: '벌크업',
    emoji: '💪',
    description: '근육량 극대화',
    detail: 'TDEE +500 kcal · 고탄수화물 · 단백질 2.0g/LBM kg',
    color: '#E91E63',
  },
  lean_bulk: {
    label: '린매스업',
    emoji: '🏋️',
    description: '최소 지방으로 근육 증가',
    detail: 'TDEE +200 kcal · 균형 탄단지 · 단백질 2.2g/LBM kg',
    color: '#486400',
  },
  cutting: {
    label: '커팅',
    emoji: '🔥',
    description: '근육 유지 + 지방 감량',
    detail: 'TDEE -400 kcal · 저탄수화물 · 단백질 2.5g/LBM kg',
    color: '#b02500',
  },
  diet: {
    label: '다이어트',
    emoji: '⚖️',
    description: '체중 감량 중심',
    detail: 'TDEE -600 kcal · 저탄수화물 · 단백질 1.8g/LBM kg',
    color: '#874e00',
  },
  maintenance: {
    label: '유지',
    emoji: '🎯',
    description: '현재 체중 · 체성분 유지',
    detail: 'TDEE 유지 · 균형 탄단지 · 단백질 1.6g/LBM kg',
    color: '#705900',
  },
  recomp: {
    label: '체성분 개선',
    emoji: '⚡',
    description: '근육↑ 지방↓ 동시에',
    detail: 'TDEE -100 kcal · 고단백 · 단백질 2.3g/LBM kg',
    color: '#486400',
  },
};
