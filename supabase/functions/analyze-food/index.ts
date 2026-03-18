import OpenAI from 'https://deno.land/x/openai@v4.28.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { foodDescription } = await req.json();
    if (!foodDescription) {
      return new Response(JSON.stringify({ error: 'foodDescription required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const client = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY')! });

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
