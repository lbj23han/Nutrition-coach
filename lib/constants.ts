export const APP_NAME = '나만의 영양코치';

export const COLORS = {
  primary: '#4CAF50',
  primaryLight: '#81C784',
  primaryDark: '#388E3C',
  secondary: '#FF9800',
  secondaryLight: '#FFB74D',
  accent: '#2196F3',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  error: '#F44336',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
  white: '#FFFFFF',
  black: '#000000',
  // Macros
  calories: '#FF6B6B',
  protein: '#4ECDC4',
  carbs: '#45B7D1',
  fat: '#FFA07A',
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
    color: '#9C27B0',
  },
  cutting: {
    label: '커팅',
    emoji: '🔥',
    description: '근육 유지 + 지방 감량',
    detail: 'TDEE -400 kcal · 저탄수화물 · 단백질 2.5g/LBM kg',
    color: '#FF5722',
  },
  diet: {
    label: '다이어트',
    emoji: '⚖️',
    description: '체중 감량 중심',
    detail: 'TDEE -600 kcal · 저탄수화물 · 단백질 1.8g/LBM kg',
    color: '#FF9800',
  },
  maintenance: {
    label: '유지',
    emoji: '🎯',
    description: '현재 체중 · 체성분 유지',
    detail: 'TDEE 유지 · 균형 탄단지 · 단백질 1.6g/LBM kg',
    color: '#2196F3',
  },
  recomp: {
    label: '체성분 개선',
    emoji: '⚡',
    description: '근육↑ 지방↓ 동시에',
    detail: 'TDEE -100 kcal · 고단백 · 단백질 2.3g/LBM kg',
    color: '#00BCD4',
  },
};
