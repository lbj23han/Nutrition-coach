import OpenAI from 'https://deno.land/x/openai@v4.28.0/mod.ts';
import { getUserId, checkAndIncrement } from '../_shared/rateLimit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `당신은 전문 영양 코치입니다. 사용자의 식단과 영양 상태를 분석하고 개인화된 조언을 제공합니다.
응답은 항상 한국어로 해주세요. 친근하고 격려하는 톤으로 답변하세요.
과학적 근거를 바탕으로 실용적이고 구체적인 조언을 제공하세요.
사용자의 목표와 현재 상태를 고려한 맞춤형 조언을 해주세요.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const userId = await getUserId(req.headers.get('Authorization'));
    if (userId) {
      const { allowed, used } = await checkAndIncrement(userId);
      if (!allowed) {
        return new Response(
          JSON.stringify({ error: 'RATE_LIMIT_EXCEEDED', used }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    const { messages, context } = await req.json();

    const client = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY')! });

    const contextMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    const contextParts: string[] = [];

    if (context?.userProfile) {
      const p = context.userProfile;
      contextParts.push(`[사용자 정보]
이름: ${p.name}
나이: ${p.age}세
성별: ${p.gender === 'male' ? '남성' : p.gender === 'female' ? '여성' : '기타'}
키: ${p.height_cm}cm, 체중: ${p.weight_kg}kg
목표: ${p.goal}
일일 목표: 칼로리 ${p.daily_calorie_target}kcal, 단백질 ${p.daily_protein_target}g, 탄수화물 ${p.daily_carb_target}g, 지방 ${p.daily_fat_target}g`);
    }

    if (context?.todayNutrition) {
      const n = context.todayNutrition;
      contextParts.push(`[오늘의 영양 섭취]
칼로리: ${n.total_calories}kcal
단백질: ${n.total_protein}g
탄수화물: ${n.total_carbs}g
지방: ${n.total_fat}g`);
    }

    if (contextParts.length > 0) {
      contextMessages.push({
        role: 'system',
        content: `현재 사용자 컨텍스트:\n${contextParts.join('\n\n')}`,
      });
    }

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...contextMessages,
        ...messages,
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const reply = response.choices[0]?.message?.content ?? '죄송합니다. 응답을 생성할 수 없습니다.';

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
