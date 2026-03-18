import OpenAI from 'https://deno.land/x/openai@v4.28.0/mod.ts';
import { getUserId, checkAndIncrement } from '../_shared/rateLimit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { base64Image } = await req.json();
    if (!base64Image) {
      return new Response(JSON.stringify({ error: 'base64Image required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const client = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY')! });

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

    return new Response(content, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
