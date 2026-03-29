-- ProofAI: Pay-per-Proof billing model

-- Add proof tracking to api_keys
ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS proofs_used INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS proofs_limit INT DEFAULT 100;  -- null = unlimited

-- Add proof tracking to subscriptions
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS proofs_included INT DEFAULT 100,
  ADD COLUMN IF NOT EXISTS proofs_used_this_period INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overage_rate NUMERIC(6,4) DEFAULT 0.05,
  ADD COLUMN IF NOT EXISTS period_reset_at TIMESTAMPTZ;

-- Update plan check constraint
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN ('free', 'payg', 'indie', 'startup', 'scale', 'enterprise'));

ALTER TABLE api_keys DROP CONSTRAINT IF EXISTS api_keys_plan_check;
ALTER TABLE api_keys ADD CONSTRAINT api_keys_plan_check
  CHECK (plan IN ('free', 'payg', 'indie', 'startup', 'scale', 'enterprise'));

-- Proof events — tracks every individual proof for billing
CREATE TABLE IF NOT EXISTS proof_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES api_keys(id),
  user_id UUID REFERENCES auth.users(id),
  bundle_id TEXT REFERENCES evidence_bundles(id),
  provider TEXT,
  tokens_used INT NOT NULL DEFAULT 0,
  cost_euros NUMERIC(8,4) NOT NULL DEFAULT 0.05,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proof_events_api_key ON proof_events(api_key_id);
CREATE INDEX IF NOT EXISTS idx_proof_events_user ON proof_events(user_id);
CREATE INDEX IF NOT EXISTS idx_proof_events_created ON proof_events(created_at DESC);

ALTER TABLE proof_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on proof_events"
  ON proof_events FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Users read own proof_events"
  ON proof_events FOR SELECT USING (auth.uid() = user_id);
