# API Reference

All endpoints are Supabase Edge Functions accessible via HTTP POST.

**Base URL:** `https://your-project.supabase.co/functions/v1`

**Authentication:** Bearer token in `Authorization` header.

```bash
curl -X POST https://your-project.supabase.co/functions/v1/compress \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"prompt": "Your prompt here", "options": {"compressionLevel": "medium"}}'
```

---

## POST `/compress`

Compress a prompt to DSL format with SHA-256 hash.

**Body:**
```json
{
  "prompt": "Your prompt text",
  "options": {
    "compressionLevel": "medium",
    "preserveContext": true,
    "targetModels": ["claude-sonnet-4"]
  }
}
```

**Response:**
```json
{
  "id": "cmp_3b8c1a992cd2_1774742347178",
  "originalPrompt": "...",
  "compressedDsl": "@DSL_V2 { ... }",
  "metrics": {
    "originalTokens": 58,
    "compressedTokens": 29,
    "compressionRatio": 0.5,
    "semanticLoss": 0.012
  },
  "timestamp": "2026-03-28T22:34:35.799Z"
}
```

---

## POST `/execute`

Execute AI call with reasoning trace.

**Body:**
```json
{
  "promptRef": "cmp_3b8c1a992cd2_1774742347178",
  "options": {
    "provider": "anthropic",
    "modelId": "claude-sonnet-4-20250514",
    "temperature": 0.7,
    "maxTokens": 1024
  }
}
```

**Response:** Returns execution ID, AI output, reasoning trace, token usage, and latency.

---

## POST `/analyze`

Generate cognitive knowledge graph from AI output.

**Body:**
```json
{
  "executionId": "exec_e934d721da62_...",
  "analysisText": "The AI output text to analyze"
}
```

**Response:** Returns nodes, edges, metrics (consistency score, complexity score), and cognitive hash.

---

## POST `/sign`

Sign an AI execution with Ed25519.

**Body:**
```json
{
  "executionId": "exec_...",
  "rawOutput": "The AI output",
  "modelProvider": "anthropic",
  "modelId": "claude-sonnet-4-20250514",
  "modelVersion": "latest",
  "modelParameters": {"temperature": 0.7},
  "executionMetrics": {"latency_ms": 300},
  "requesterInfo": {"source": "sdk"},
  "timestamps": {"request_received": "2026-03-28T..."}
}
```

**Response:** Returns signature ID, signed payload, Ed25519 signature hex, public key, and timestamp proof.

---

## POST `/bundle`

Create evidence bundle from all pipeline steps.

**Body:**
```json
{
  "promptId": "cmp_...",
  "executionId": "exec_...",
  "analysisId": "cog_...",
  "signatureId": "sig_...",
  "cognitiveHash": "sha256...",
  "subjectId": "user@company.com",
  "sessionId": "session_abc",
  "ragSources": [
    {"document_id": "doc1", "document_name": "file.pdf", "chunk_index": 0, "relevance_score": 0.95}
  ]
}
```

**Response:** Returns bundle ID, bundle hash, timeline, and status.

> `subjectId` is SHA-256 hashed before storage. Never stored in cleartext.

---

## POST `/anchor`

Anchor bundle hash to Polygon blockchain.

**Body:**
```json
{
  "bundleId": "bnd_...",
  "network": "polygon"
}
```

**Response:** Returns transaction hash, block number, explorer URL, and status.

---

## POST `/verify`

Verify evidence bundle integrity and blockchain anchoring.

**Body:**
```json
{
  "bundleId": "bnd_..."
}
```

**Response:**
```json
{
  "bundleId": "bnd_...",
  "verified": true,
  "checks": {
    "integrityValid": true,
    "timestampValid": true,
    "ledgerAnchored": true,
    "hashMatches": true
  },
  "ledgerInfo": {
    "transactionHash": "0x...",
    "blockNumber": 12345678,
    "network": "polygon",
    "confirmedAt": "2026-03-28T..."
  }
}
```

---

## POST `/review`

Log human oversight decision (EU AI Act Article 14).

**Body:**
```json
{
  "bundleId": "bnd_...",
  "reviewerId": "dpo@company.com",
  "role": "compliance_officer",
  "decision": "approved",
  "notes": "Reviewed and approved."
}
```

> `reviewerId` is SHA-256 hashed before storage.

**Roles:** `compliance_officer`, `data_protection_officer`, `manager`

**Decisions:** `approved`, `rejected`, `flagged`

---

## POST `/monitor`

Get post-market monitoring statistics (EU AI Act Article 72).

**Body:** `{}`

**Response:** Returns total executions, anomaly count, status breakdown, human review stats, risk distribution, GDPR stats, and compliance status for the last 30 days.

---

## Error responses

All endpoints return errors as:

```json
{
  "error": "Description of the error"
}
```

HTTP status codes: `400` (bad request), `401` (unauthorized), `500` (server error).
