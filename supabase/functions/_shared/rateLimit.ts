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
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

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
}
