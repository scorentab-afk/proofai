# SDK Reference

## Installation

```bash
npm install @proofai/sdk
```

## Constructor

```typescript
import { ProofAI } from '@proofai/sdk'

const proofai = new ProofAI({
  apiKey: 'pk_live_xxx',          // Required — your API key
  baseUrl: 'https://...',         // Optional — custom endpoint for self-hosted
})
```

---

## Methods

### `certify(prompt, options?)`

Full pipeline in one call. Returns a `Certificate`.

```typescript
const cert = await proofai.certify('Your prompt', {
  provider: 'anthropic',
  modelId: 'claude-sonnet-4-20250514',
  temperature: 0.7,
  maxTokens: 1024,
  compressionLevel: 'medium',
  network: 'polygon',
  skipAnchor: false,
})
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `provider` | `'anthropic' \| 'openai' \| 'gemini'` | `'anthropic'` | AI provider |
| `modelId` | `string` | auto | Model override |
| `temperature` | `number` | `0.7` | Generation temperature |
| `maxTokens` | `number` | `1024` | Max output tokens |
| `compressionLevel` | `'low' \| 'medium' \| 'high'` | `'medium'` | DSL compression level |
| `network` | `'polygon' \| 'ethereum'` | `'polygon'` | Blockchain network |
| `skipAnchor` | `boolean` | `false` | Skip blockchain anchoring |

**Returns: `Certificate`**

```typescript
interface Certificate {
  bundleId: string
  bundleHash: string
  verified: boolean
  explorerUrl?: string
  transactionHash?: string
  steps: {
    compress: CompressResult
    execute: ExecuteResult
    analyze: AnalyzeResult
    sign: SignResult
    bundle: BundleResult
    anchor?: AnchorResult
    verify: VerifyResult
  }
}
```

---

### `compress(prompt, options?)`

Compress a prompt to DSL format.

```typescript
const result = await proofai.compress('Your prompt', {
  compressionLevel: 'medium',
  preserveContext: true,
  targetModels: ['claude-sonnet-4'],
})
```

**Returns: `CompressResult`**

```typescript
interface CompressResult {
  id: string
  originalPrompt: string
  compressedDsl: string
  metrics: {
    originalTokens: number
    compressedTokens: number
    compressionRatio: number
    semanticLoss: number
  }
  timestamp: string
}
```

---

### `execute(promptRef, options)`

Execute AI with reasoning trace.

```typescript
const result = await proofai.execute(compressed.id, {
  provider: 'anthropic',
  modelId: 'claude-sonnet-4-20250514',
  temperature: 0.7,
  maxTokens: 1024,
})
```

**Returns: `ExecuteResult`**

```typescript
interface ExecuteResult {
  id: string
  promptRef: string
  output: string
  metadata: {
    provider: string
    model: string
    latency: number
    tokens: { prompt: number; completion: number; total: number }
  }
  reasoning_trace?: Array<{
    step_index: number
    type: string
    content: string
    thought_signature?: string  // Gemini only
  }>
  trace_quality?: 'native' | 'structured' | 'inferred'
  timestamp: string
}
```

---

### `analyze(executionId, analysisText)`

Generate cognitive knowledge graph from AI output.

```typescript
const result = await proofai.analyze(execution.id, execution.output)
```

**Returns: `AnalyzeResult`**

```typescript
interface AnalyzeResult {
  id: string
  executionId: string
  nodes: Array<{ id: string; label: string; type: string; weight: number }>
  edges: Array<{ source: string; target: string; label: string; weight: number }>
  metrics: {
    nodeCount: number
    edgeCount: number
    consistencyScore: number
    complexityScore: number
  }
  cognitiveHash: string
  timestamp: string
}
```

---

### `sign(execution)`

Sign AI execution with Ed25519.

```typescript
const result = await proofai.sign(execution)
```

**Returns: `SignResult`**

```typescript
interface SignResult {
  signatureId: string
  signedPayload: Record<string, unknown>
  signature: {
    algorithm: string       // 'Ed25519'
    signature: string       // hex
    signed_at: string
    signer_identity: string
    includes_thought_signatures: boolean
  }
  timestampProof: { rfc3161_timestamp: string; verified: boolean } | null
  cognitive_trace?: Record<string, unknown>
}
```

---

### `bundle(promptId, executionId, analysisId, signatureId, cognitiveHash, options?)`

Create evidence bundle.

```typescript
const result = await proofai.bundle(
  compressed.id,
  execution.id,
  analysis.id,
  signature.signatureId,
  analysis.cognitiveHash,
  {
    subjectId: 'user@company.com',  // hashed before storage (GDPR)
    sessionId: 'session_abc123',
    ragSources: [
      { document_id: 'doc1', document_name: 'contract.pdf', chunk_index: 0, relevance_score: 0.95 }
    ],
  }
)
```

**Returns: `BundleResult`**

---

### `anchor(bundleId, network?)`

Anchor bundle hash to blockchain.

```typescript
const result = await proofai.anchor(bundle.id, 'polygon')
```

**Returns: `AnchorResult`**

```typescript
interface AnchorResult {
  bundleId: string
  transactionHash: string
  blockNumber: number
  network: string
  explorerUrl: string
  status: 'pending' | 'confirmed' | 'failed'
  timestamp: string
}
```

---

### `verify(bundleId)`

Verify evidence bundle integrity.

```typescript
const result = await proofai.verify(bundle.id)
```

**Returns: `VerifyResult`**

```typescript
interface VerifyResult {
  bundleId: string
  verified: boolean
  checks: {
    integrityValid: boolean
    timestampValid: boolean
    ledgerAnchored: boolean
    hashMatches: boolean
  }
  ledgerInfo?: {
    transactionHash: string
    blockNumber: number
    network: string
    confirmedAt: string
  }
  timestamp: string
}
```

---

### `review(bundleId, reviewerId, role, decision, notes?)`

Log human oversight decision (EU AI Act Article 14).

```typescript
const result = await proofai.review(
  bundle.id,
  'dpo@company.com',           // hashed before storage
  'compliance_officer',         // 'compliance_officer' | 'data_protection_officer' | 'manager'
  'approved',                   // 'approved' | 'rejected' | 'flagged'
  'Reviewed and approved for production use.'
)
```

**Returns: `HumanReviewResult`**

---

### `monitor()`

Get post-market monitoring stats (EU AI Act Article 72).

```typescript
const stats = await proofai.monitor()
console.log(stats.totalExecutions)
console.log(stats.anomalyCount)
console.log(stats.compliance)
```

**Returns: `MonitoringStats`**

```typescript
interface MonitoringStats {
  period: string
  generatedAt: string
  totalExecutions: number
  anomalyCount: number
  anomalies: Array<{ type: string; description: string; severity: string }>
  statusBreakdown: Record<string, number>
  humanReviews: { total: number; approved: number; rejected: number; flagged: number }
  riskDistribution: { low: number; medium: number; high: number }
  gdpr: { anonymizedBundles: number }
  compliance: {
    retentionPolicy: string
    loggingEnabled: boolean
    humanOversightActive: boolean
    blockchainAnchoringActive: boolean
  }
}
```

---

## Self-hosted

Point the SDK to your own Supabase instance:

```typescript
const proofai = new ProofAI({
  apiKey: 'your-supabase-anon-key',
  baseUrl: 'https://your-project.supabase.co/functions/v1',
})
```
