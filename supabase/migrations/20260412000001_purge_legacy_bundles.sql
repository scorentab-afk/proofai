-- ProofAI v1.3 — Purge pre-signature bundles
-- Removes all evidence_bundles created before Ed25519 signing was implemented.
-- A full JSON backup was saved locally as .legacy_bundles_backup_20260412.json
-- before this migration was applied.
--
-- Safe to run: only deletes rows where signature_hex IS NULL (legacy bundles).
-- All new bundles produced by the v1.3 pipeline have signature_hex set at creation.

-- Delete dependent anchor records first (FK: blockchain_anchors.bundle_id → evidence_bundles.id)
DELETE FROM blockchain_anchors
WHERE bundle_id IN (
  SELECT id FROM evidence_bundles WHERE signature_hex IS NULL
);

-- Now safe to delete the bundles themselves
DELETE FROM evidence_bundles WHERE signature_hex IS NULL;
