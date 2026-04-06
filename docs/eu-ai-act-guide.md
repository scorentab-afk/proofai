# EU AI Act Compliance Guide

## Deadline

**August 2, 2026** — EU AI Act Article 12 requires automatic logging for high-risk AI systems.

Fines: up to **EUR 35 million** or **7% of global annual turnover**.

## What ProofAI covers

| Requirement | Article | How ProofAI implements it |
|-------------|---------|--------------------------|
| Automatic event logging | Art. 12 | Every AI call is logged with prompt, output, reasoning trace, and metadata |
| 6-month log retention | Art. 19 | `retain_until` column auto-set to `created_at + 6 months` |
| Subject identification | Art. 12 | `subjectId` is SHA-256 hashed before storage — never in cleartext |
| RAG source tracking | Art. 12 | `ragSources` field tracks which documents influenced the AI response |
| Human oversight logging | Art. 14 | `review()` endpoint logs reviewer identity (hashed), role, and decision |
| Reasoning trace | Art. 12 | Full reasoning trace extracted from Claude, Gemini, and GPT |
| Gemini thought signatures | Art. 12 | Native cryptographic markers from each Gemini reasoning step |
| Post-market monitoring | Art. 72 | `monitor()` endpoint provides anomaly detection and risk stats |
| Tamper-evident logs | Art. 19 | SHA-256 hash chain + Ed25519 signature + blockchain anchor |
| Cryptographic signature | Art. 19 | Real Ed25519 signature of the entire execution payload |
| Blockchain anchor | Art. 19 | Bundle hash written to Polygon — verifiable by anyone on Polygonscan |
| GDPR crypto-shredding | GDPR Art. 17 | `anonymize_subject()` soft-deletes personal data, audit trail stays intact |

## Implementation guide

### 1. Basic logging (Art. 12)

Every call to `certify()` automatically logs:
- Input prompt (compressed)
- AI output
- Provider, model, parameters
- Token usage and latency
- Reasoning trace
- Timestamp

```typescript
const cert = await proofai.certify(prompt, { provider: 'anthropic' })
// Logged automatically — nothing else to do
```

### 2. Subject identification (Art. 12 + GDPR)

When your AI system processes data related to a specific person, pass their identifier:

```typescript
const bundle = await proofai.bundle(
  compressId, execId, analysisId, sigId, hash,
  { subjectId: 'user@company.com' }  // SHA-256 hashed before storage
)
```

The subject ID is **never stored in cleartext**. Only the SHA-256 hash is persisted.

### 3. RAG source tracking (Art. 12)

If your AI uses retrieval-augmented generation, track which documents were used:

```typescript
const bundle = await proofai.bundle(
  compressId, execId, analysisId, sigId, hash,
  {
    ragSources: [
      { document_id: 'doc_123', document_name: 'policy.pdf', chunk_index: 2, relevance_score: 0.94 },
      { document_id: 'doc_456', document_name: 'guidelines.md', chunk_index: 0, relevance_score: 0.87 },
    ]
  }
)
```

### 4. Human oversight (Art. 14)

When a human reviews an AI decision, log the review:

```typescript
await proofai.review(
  bundleId,
  'reviewer@company.com',       // hashed before storage
  'compliance_officer',          // role
  'approved',                    // decision: 'approved' | 'rejected' | 'flagged'
  'Reviewed for accuracy.'       // optional notes
)
```

### 5. Post-market monitoring (Art. 72)

Check your AI system's health:

```typescript
const stats = await proofai.monitor()

console.log(stats.totalExecutions)           // 1,234
console.log(stats.anomalyCount)              // 2
console.log(stats.humanReviews.flagged)      // 1
console.log(stats.compliance.loggingEnabled) // true
```

### 6. GDPR erasure (Art. 17)

When a user requests data deletion, call the `anonymize_subject` database function:

```sql
SELECT anonymize_subject('bnd_xxx');
```

This soft-deletes the personal data (`deleted_at` is set) while keeping the audit trail intact. The blockchain anchor remains — it contains only a hash, not personal data.

## The tamper-evidence argument

When a regulator asks: *"How do I know these logs haven't been modified?"*

**Your answer:**
1. Every log is signed with Ed25519 — the signature breaks if any byte changes
2. The bundle hash is anchored on Polygon blockchain — immutable, public, verifiable
3. Anyone can verify at `https://polygonscan.com/tx/[tx-hash]`
4. No account needed. No login. No middleman. Just math.

This is not a declaration of compliance. It's a mathematical proof.
