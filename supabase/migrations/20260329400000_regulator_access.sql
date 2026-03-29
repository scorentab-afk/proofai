-- ProofAI: Regulator access system + store prompt/response content

-- Store prompt and AI response in evidence bundles
ALTER TABLE evidence_bundles
  ADD COLUMN IF NOT EXISTS prompt_content TEXT,
  ADD COLUMN IF NOT EXISTS ai_response TEXT,
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS model TEXT;

-- Regulator access tokens
CREATE TABLE IF NOT EXISTS regulator_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT NOT NULL UNIQUE,
  token_prefix TEXT NOT NULL,        -- first 12 chars for display: reg_dgccrf_xx...
  name TEXT NOT NULL,                -- 'DGCCRF', 'CNIL', 'ACPR'
  organization TEXT NOT NULL,        -- 'Direction generale de la concurrence...'
  contact_email TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'full' CHECK (scope IN ('full', 'metadata_only')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ             -- null = never expires
);

CREATE INDEX IF NOT EXISTS idx_regulator_tokens_hash ON regulator_tokens(token_hash);

ALTER TABLE regulator_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on regulator_tokens"
  ON regulator_tokens FOR ALL USING (true) WITH CHECK (true);

-- Log regulator access for audit trail
CREATE TABLE IF NOT EXISTS regulator_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regulator_token_id UUID REFERENCES regulator_tokens(id),
  bundle_id TEXT REFERENCES evidence_bundles(id),
  action TEXT NOT NULL DEFAULT 'view',
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_regulator_access_log_token ON regulator_access_log(regulator_token_id);
CREATE INDEX IF NOT EXISTS idx_regulator_access_log_bundle ON regulator_access_log(bundle_id);

ALTER TABLE regulator_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on regulator_access_log"
  ON regulator_access_log FOR ALL USING (true) WITH CHECK (true);
