-- ProofAI: AI Cognitive Evidence Platform
-- Supabase PostgreSQL Schema

-- Evidence Bundles table
CREATE TABLE IF NOT EXISTS evidence_bundles (
  id TEXT PRIMARY KEY,
  prompt_id TEXT NOT NULL,
  execution_id TEXT NOT NULL,
  analysis_id TEXT NOT NULL,
  signature_id TEXT NOT NULL,
  cognitive_hash TEXT NOT NULL,
  bundle_hash TEXT NOT NULL,
  timeline JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('pending', 'created', 'anchored', 'verified')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Blockchain Anchors table
CREATE TABLE IF NOT EXISTS blockchain_anchors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id TEXT NOT NULL REFERENCES evidence_bundles(id),
  transaction_hash TEXT NOT NULL,
  block_number BIGINT NOT NULL DEFAULT 0,
  network TEXT NOT NULL DEFAULT 'polygon',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_evidence_bundles_status ON evidence_bundles(status);
CREATE INDEX IF NOT EXISTS idx_evidence_bundles_created_at ON evidence_bundles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blockchain_anchors_bundle_id ON blockchain_anchors(bundle_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_anchors_tx_hash ON blockchain_anchors(transaction_hash);

-- Row Level Security
ALTER TABLE evidence_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE blockchain_anchors ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (Edge Functions use service role key)
CREATE POLICY "Service role full access on evidence_bundles"
  ON evidence_bundles FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on blockchain_anchors"
  ON blockchain_anchors FOR ALL
  USING (true)
  WITH CHECK (true);

-- Public read access for verification
CREATE POLICY "Public read access on evidence_bundles"
  ON evidence_bundles FOR SELECT
  USING (true);

CREATE POLICY "Public read access on blockchain_anchors"
  ON blockchain_anchors FOR SELECT
  USING (true);
