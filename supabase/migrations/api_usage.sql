-- API 사용량 추적 테이블 (사용자당 최대 10회 제한)
CREATE TABLE IF NOT EXISTS api_usage (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  call_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- 사용자 본인만 조회 가능
CREATE POLICY "Users can view own usage"
  ON api_usage FOR SELECT
  USING (auth.uid() = user_id);
