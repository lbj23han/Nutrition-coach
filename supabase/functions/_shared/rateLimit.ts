import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const LIMIT = 10;

export async function getUserId(authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null;
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
  );
  const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  return user?.id ?? null;
}

export async function checkAndIncrement(userId: string): Promise<{ allowed: boolean; used: number }> {
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  // SERVICE_ROLE_KEY 미설정 시 rate limit 건너뜀 (요청 허용)
  if (!serviceRoleKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not set — skipping rate limit');
    return { allowed: true, used: 0 };
  }

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceRoleKey);

    const { data } = await supabase
      .from('api_usage')
      .select('call_count')
      .eq('user_id', userId)
      .single();

    const used = data?.call_count ?? 0;

    if (used >= LIMIT) {
      return { allowed: false, used };
    }

    await supabase
      .from('api_usage')
      .upsert({ user_id: userId, call_count: used + 1, updated_at: new Date().toISOString() });

    return { allowed: true, used: used + 1 };
  } catch (err) {
    // DB 오류 시 rate limit 실패해도 OpenAI 요청은 통과시킴
    console.error('Rate limit check failed:', err);
    return { allowed: true, used: 0 };
  }
}
