-- Persist full cognitive analysis (nodes, edges, trace_quality, disclaimer)
-- directly on the evidence bundle so verify can return them without
-- a separate table join.

ALTER TABLE evidence_bundles
  ADD COLUMN IF NOT EXISTS analysis_data JSONB;

COMMENT ON COLUMN evidence_bundles.analysis_data IS
  'Full cognitive analysis: nodes, edges, metrics, trace_quality, traceSource, disclaimer';
