-- ProofAI: Auth, API Keys & Subscriptions

-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL, -- first 8 chars for display: pk_live_xxxx...
  name TEXT NOT NULL DEFAULT 'Default',
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'indie', 'startup', 'scale', 'enterprise')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'indie', 'startup', 'scale', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Daily usage tracking
CREATE TABLE IF NOT EXISTS usage_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  compress_count INT NOT NULL DEFAULT 0,
  execute_count INT NOT NULL DEFAULT 0,
  UNIQUE(user_id, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_usage_daily_user_date ON usage_daily(user_id, date);

-- RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_daily ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users read own api_keys" ON api_keys FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users read own subscriptions" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users read own usage" ON usage_daily FOR SELECT USING (auth.uid() = user_id);

-- Service role full access
CREATE POLICY "Service role full access on api_keys" ON api_keys FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on subscriptions" ON subscriptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on usage_daily" ON usage_daily FOR ALL USING (true) WITH CHECK (true);

-- Auto-create free subscription on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO subscriptions (user_id, plan, status)
  VALUES (NEW.id, 'free', 'active');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
