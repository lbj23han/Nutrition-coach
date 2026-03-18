import type { ChatMessage, DailyNutrition, UserProfile } from '../types';

let _isDemoMode = false;

export function setDemoMode(enabled: boolean) {
  _isDemoMode = enabled;
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export class RateLimitError extends Error {
  constructor() {
    super('RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

async function callEdgeFunction(name: string, body: object): Promise<any> {
  let token = SUPABASE_ANON_KEY;
  try {
    const { supabase } = await import('../lib/supabase');
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) token = session.access_token;
  } catch {}

  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (res.status === 429) {
    throw new RateLimitError();
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }

  return res.json();
}

// ─── Demo fallbacks ───────────────────────────────────────────────────────────

const DEMO_RESPONSES = [
  '안녕하세요! 현재 데모 모드입니다. 실제 계정으로 로그인하면 맞춤형 AI 코칭을 받을 수 있어요! 🥗',
  '단백질 섭취를 늘리려면 닭가슴살, 계란, 두부, 그릭요거트를 활용해보세요.',
  '하루 칼로리를 아침 25%, 점심 35%, 저녁 30%, 간식 10%로 배분하면 균형잡힌 식단이 됩니다.',
  '수분 섭취도 중요해요! 체중(kg) × 30ml를 목표로 하루 동안 꾸준히 물을 마셔보세요.',
  '건강한 간식으로는 견과류 한 줌, 바나나, 그릭요거트, 삶은 계란 등이 좋습니다.',
];
let _demoIndex = 0;

const DEMO_FOODS: Record<string, { calories: number; protein: number; carbs: number; fat: number; quantity: number; unit: string }> = {
  default: { calories: 350, protein: 20, carbs: 45, fat: 8, quantity: 1, unit: '인분' },
  '밥': { calories: 300, protein: 5, carbs: 66, fat: 1, quantity: 1, unit: '공기' },
  '계란': { calories: 155, protein: 13, carbs: 1, fat: 11, quantity: 2, unit: '개' },
  '닭가슴살': { calories: 165, protein: 31, carbs: 0, fat: 4, quantity: 100, unit: 'g' },
  '아메리카노': { calories: 10, protein: 0, carbs: 2, fat: 0, quantity: 1, unit: '잔' },
};

const DEMO_VISION_RESULTS: VisionFoodResult[] = [
  {
    description: '현미밥과 반찬이 있는 한식 도시락',
    items: [
      { name: '현미밥', quantity: 1, unit: '공기', calories: 300, protein: 6, carbs: 65, fat: 2 },
      { name: '닭가슴살 볶음', quantity: 100, unit: 'g', calories: 165, protein: 31, carbs: 2, fat: 4 },
      { name: '시금치 나물', quantity: 50, unit: 'g', calories: 20, protein: 2, carbs: 3, fat: 0 },
    ],
  },
  {
    description: '샐러드 한 그릇',
    items: [
      { name: '그린 샐러드', quantity: 200, unit: 'g', calories: 80, protein: 4, carbs: 10, fat: 3 },
      { name: '드레싱', quantity: 20, unit: 'ml', calories: 60, protein: 0, carbs: 3, fat: 6 },
    ],
  },
];
let _demoVisionIndex = 0;

// ─── Public API ───────────────────────────────────────────────────────────────

export interface CoachingContext {
  userProfile?: UserProfile;
  todayNutrition?: DailyNutrition;
}

export interface VisionFoodResult {
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>;
  description: string;
}

export async function getChatResponse(
  messages: ChatMessage[],
  context: CoachingContext
): Promise<string> {
  if (_isDemoMode) {
    const reply = DEMO_RESPONSES[_demoIndex % DEMO_RESPONSES.length];
    _demoIndex++;
    return reply;
  }

  const data = await callEdgeFunction('chat-coach', {
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    context,
  });
  return data.reply;
}

export async function analyzeFoodWithAI(foodDescription: string): Promise<{
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  quantity: number;
  unit: string;
} | null> {
  if (_isDemoMode) {
    const key = Object.keys(DEMO_FOODS).find((k) => foodDescription.includes(k));
    const data = DEMO_FOODS[key ?? 'default'];
    return { name: foodDescription, ...data };
  }

  try {
    return await callEdgeFunction('analyze-food', { foodDescription });
  } catch {
    return null;
  }
}

export async function analyzeFoodImage(base64Image: string): Promise<VisionFoodResult> {
  if (_isDemoMode) {
    const result = DEMO_VISION_RESULTS[_demoVisionIndex % DEMO_VISION_RESULTS.length];
    _demoVisionIndex++;
    return result;
  }

  return callEdgeFunction('analyze-image', { base64Image });
}
