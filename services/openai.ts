import OpenAI from 'openai';
import type { ChatMessage, DailyNutrition, UserProfile } from '../types';

let _openai: OpenAI | null = null;
let _isDemoMode = false;

export function setDemoMode(enabled: boolean) {
  _isDemoMode = enabled;
}

function getClient(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    if (!apiKey || apiKey.startsWith('sk-your')) {
      throw new Error('NO_API_KEY');
    }
    _openai = new OpenAI({ apiKey });
  }
  return _openai;
}

const SYSTEM_PROMPT = `당신은 전문 영양 코치입니다. 사용자의 식단과 영양 상태를 분석하고 개인화된 조언을 제공합니다.
응답은 항상 한국어로 해주세요. 친근하고 격려하는 톤으로 답변하세요.
과학적 근거를 바탕으로 실용적이고 구체적인 조언을 제공하세요.
사용자의 목표와 현재 상태를 고려한 맞춤형 조언을 해주세요.`;

export interface CoachingContext {
  userProfile?: UserProfile;
  todayNutrition?: DailyNutrition;
}

// Demo fallback responses when no API key is set
const DEMO_RESPONSES = [
  '안녕하세요! 현재 데모 모드입니다. OpenAI API 키를 설정하면 실제 맞춤형 코칭을 받을 수 있어요! 🥗',
  '단백질 섭취를 늘리려면 닭가슴살, 계란, 두부, 그릭요거트를 활용해보세요. 매 끼니마다 단백질 식품을 포함하는 것이 좋습니다! 💪',
  '하루 칼로리를 아침 25%, 점심 35%, 저녁 30%, 간식 10%로 배분하면 균형잡힌 식단이 됩니다.',
  '수분 섭취도 중요해요! 체중(kg) × 30ml를 목표로 하루 동안 꾸준히 물을 마셔보세요.',
  '건강한 간식으로는 견과류 한 줌, 바나나, 그릭요거트, 삶은 계란 등이 좋습니다.',
];
let _demoIndex = 0;

export async function getChatResponse(
  messages: ChatMessage[],
  context: CoachingContext
): Promise<string> {
  if (_isDemoMode) {
    const reply = DEMO_RESPONSES[_demoIndex % DEMO_RESPONSES.length];
    _demoIndex++;
    return reply;
  }
  try {
    const client = getClient();
    const contextMessages = buildContextMessages(context);

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...contextMessages,
        ...messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content ?? '죄송합니다. 응답을 생성할 수 없습니다.';
  } catch (err: any) {
    if (err?.message === 'NO_API_KEY') {
      const reply = DEMO_RESPONSES[_demoIndex % DEMO_RESPONSES.length];
      _demoIndex++;
      return reply;
    }
    throw err;
  }
}

// Demo food data for when no API key is set
const DEMO_FOODS: Record<string, { calories: number; protein: number; carbs: number; fat: number; quantity: number; unit: string }> = {
  default: { calories: 350, protein: 20, carbs: 45, fat: 8, quantity: 1, unit: '인분' },
  '밥': { calories: 300, protein: 5, carbs: 66, fat: 1, quantity: 1, unit: '공기' },
  '계란': { calories: 155, protein: 13, carbs: 1, fat: 11, quantity: 2, unit: '개' },
  '닭가슴살': { calories: 165, protein: 31, carbs: 0, fat: 4, quantity: 100, unit: 'g' },
  '아메리카노': { calories: 10, protein: 0, carbs: 2, fat: 0, quantity: 1, unit: '잔' },
};

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
    const client = getClient();

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `음식 설명을 분석하여 영양 정보를 JSON 형식으로 반환하세요.
응답 형식: {"name": "음식명", "calories": 숫자, "protein": 숫자, "carbs": 숫자, "fat": 숫자, "quantity": 숫자, "unit": "단위"}
모든 영양소는 그램(g) 또는 킬로칼로리(kcal) 단위로 표시하세요.`,
        },
        {
          role: 'user',
          content: `다음 음식의 영양 정보를 알려주세요: ${foodDescription}`,
        },
      ],
      max_tokens: 300,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;
    return JSON.parse(content);
  } catch (err: any) {
    if (err?.message === 'NO_API_KEY') {
      // Return demo data matching keyword, else default
      const key = Object.keys(DEMO_FOODS).find((k) =>
        foodDescription.includes(k)
      );
      const data = DEMO_FOODS[key ?? 'default'];
      return { name: foodDescription, ...data };
    }
    return null;
  }
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

// Demo vision results for when no API key is set
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
  {
    description: '파스타 한 접시',
    items: [
      { name: '토마토 파스타', quantity: 300, unit: 'g', calories: 480, protein: 16, carbs: 78, fat: 12 },
    ],
  },
];
let _demoVisionIndex = 0;

export async function analyzeFoodImage(base64Image: string): Promise<VisionFoodResult> {
  if (_isDemoMode) {
    const result = DEMO_VISION_RESULTS[_demoVisionIndex % DEMO_VISION_RESULTS.length];
    _demoVisionIndex++;
    return result;
  }
  try {
    const client = getClient();

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
                detail: 'high',
              },
            },
            {
              type: 'text',
              text: `이 음식 사진을 분석해주세요. 다음 JSON 형식으로 정확히 반환하세요:
{
  "description": "음식 전체 설명 (한국어, 1문장)",
  "items": [
    {
      "name": "음식명 (한국어)",
      "quantity": 숫자,
      "unit": "단위(g/ml/개/공기/조각 등)",
      "calories": 숫자,
      "protein": 숫자,
      "carbs": 숫자,
      "fat": 숫자
    }
  ]
}
- 보이는 음식을 각각 별도 항목으로 분리하세요
- 중량/수량은 사진에서 추정하세요
- 영양소 단위: calories=kcal, protein/carbs/fat=g
- 확실하지 않으면 일반적인 1인분 기준으로 추정하세요`,
            },
          ],
        },
      ],
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty response');
    return JSON.parse(content) as VisionFoodResult;
  } catch (err: any) {
    if (err?.message === 'NO_API_KEY') {
      const result = DEMO_VISION_RESULTS[_demoVisionIndex % DEMO_VISION_RESULTS.length];
      _demoVisionIndex++;
      return result;
    }
    throw err;
  }
}

function buildContextMessages(
  context: CoachingContext
): OpenAI.Chat.ChatCompletionMessageParam[] {
  const contextParts: string[] = [];

  if (context.userProfile) {
    const p = context.userProfile;
    contextParts.push(`[사용자 정보]
이름: ${p.name}
나이: ${p.age}세
성별: ${p.gender === 'male' ? '남성' : p.gender === 'female' ? '여성' : '기타'}
키: ${p.height_cm}cm, 체중: ${p.weight_kg}kg
목표: ${p.goal}
일일 목표: 칼로리 ${p.daily_calorie_target}kcal, 단백질 ${p.daily_protein_target}g, 탄수화물 ${p.daily_carb_target}g, 지방 ${p.daily_fat_target}g`);
  }

  if (context.todayNutrition) {
    const n = context.todayNutrition;
    contextParts.push(`[오늘의 영양 섭취]
칼로리: ${n.total_calories}kcal
단백질: ${n.total_protein}g
탄수화물: ${n.total_carbs}g
지방: ${n.total_fat}g
식사 내역: ${n.entries.map((e) => `${e.food_name}(${e.meal_type})`).join(', ')}`);
  }

  if (contextParts.length === 0) return [];

  return [
    {
      role: 'system',
      content: `현재 사용자 컨텍스트:\n${contextParts.join('\n\n')}`,
    },
  ];
}
