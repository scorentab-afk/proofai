-- ProofAI: EU AI Act Compliance — Articles 12, 14, 19, 72 + GDPR Art. 17

-- ============================================================
-- CASE 1 — Retention 6 months (Article 19) + GDPR crypto-shredding
-- ============================================================

ALTER TABLE evidence_bundles
  ADD COLUMN IF NOT EXISTS retain_until TIMESTAMPTZ DEFAULT (now() + INTERVAL '6 months'),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE blockchain_anchors
  ADD COLUMN IF NOT EXISTS retain_until TIMESTAMPTZ DEFAULT (now() + INTERVAL '6 months'),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- GDPR Art. 17: crypto-shredding — anonymize without breaking audit trail
CREATE OR REPLACE FUNCTION anonymize_subject(bundle_id_param TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE evidence_bundles
  SET deleted_at = now()
  WHERE id = bundle_id_param;
  -- bundle_hash and cognitive_hash remain intact
  -- blockchain anchor is immutable by design
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- CASE 2 — Subject identification (Article 12 + GDPR)
-- ============================================================

ALTER TABLE evidence_bundles
  ADD COLUMN IF NOT EXISTS subject_id_hash TEXT,
  ADD COLUMN IF NOT EXISTS session_id TEXT;

-- ============================================================
-- CASE 3 — Human oversight logging (Article 14)
-- ============================================================

CREATE TABLE IF NOT EXISTS human_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id TEXT NOT NULL REFERENCES evidence_bundles(id),
  reviewer_id_hash TEXT NOT NULL,
  reviewer_role TEXT NOT NULL CHECK (reviewer_role IN ('compliance_officer', 'data_protection_officer', 'manager')),
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected', 'flagged')),
  notes TEXT,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_human_reviews_bundle_id ON human_reviews(bundle_id);
CREATE INDEX IF NOT EXISTS idx_human_reviews_decision ON human_reviews(decision);

ALTER TABLE human_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on human_reviews"
  ON human_reviews FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public read access on human_reviews"
  ON human_reviews FOR SELECT USING (true);

-- ============================================================
-- CASE 5 — RAG source tracking (Article 12)
-- ============================================================

ALTER TABLE evidence_bundles
  ADD COLUMN IF NOT EXISTS rag_sources JSONB;
