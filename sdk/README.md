# proofai-sdk

Cryptographic proof that AI thought before it answered.

## Install

```bash
npm install proofai-sdk
```

## Quick Start — One Line Certification

```typescript
import { ProofAI } from 'proofai-sdk'

const proofai = new ProofAI({ apiKey: 'your-api-key' })

const cert = await proofai.certify(
  'Analyse les risques juridiques de ce contrat SaaS',
  { provider: 'anthropic' }
)

console.log(cert.verified)        // true
console.log(cert.bundleId)        // bnd_8019b37a7f44_...
console.log(cert.bundleHash)      // sha256 hash
console.log(cert.explorerUrl)     // https://polygonscan.com/tx/0x...
console.log(cert.traceQuality)    // "inferred_via_gemini"
console.log(cert.cognitiveNodes)  // 7  (reasoning steps captured)
// cert.disclaimer — present when trace is inferred (Claude/GPT providers)

// Access individual cognitive nodes from the analyze step:
const nodes = cert.steps.analyze.nodes
// nodes[0] example (Tier 2 — inferred):
// {
//   id: "node_0",
//   label: "The prompt asks to analyse legal risks in a SaaS",
//   content: "The prompt asks to analyse legal risks in a SaaS contract. I need to consider...",
//   hash: "a3f8c1d2e4b7...",   // sha256 of content
//   type: "reasoning",
//   weight: 0.94,
//   traceSource: "inferred_via_gemini"
// }

// nodes[0] example (Tier 1 — native Gemini):
// {
//   id: "node_0",
//   label: "Let me think through what legal risks are typically",
//   content: "Let me think through what legal risks are typically present in SaaS contracts...",
//   hash: "b2e9f4a1c8d3...",   // sha256 of the actual thinking block
//   thought_signature: "b2e9f4a1c8d3...",
//   type: "reasoning",
//   weight: 1.0,
//   traceSource: "native_thinking"
// }
```

## Cognitive Analysis — Two-tier System

ProofAI captures real AI reasoning as evidence, not just the final output.

**Tier 1 — Native (Gemini provider only)**

When `provider: 'gemini'`, ProofAI calls `gemini-2.0-flash-thinking-exp-1219` and extracts real `thought: true` blocks. Each thinking segment becomes a cognitive node with its actual content and SHA-256 hash. `traceQuality: "native"`.

**Tier 2 — Inferred (Claude, GPT, all others)**

When `provider: 'anthropic'` or `'openai'`, ProofAI calls the provider for the response, then calls Gemini Thinking to reconstruct the reasoning chain that most likely produced it. `traceQuality: "inferred_via_gemini"`. A `disclaimer` field is returned noting the trace is inferred.

**Fallback**

If `GOOGLE_AI_API_KEY` is not configured, a single SHA-256 hash of the output is recorded. `traceQuality: "output_hash"`.

## Step by Step

```typescript
const proofai = new ProofAI({ apiKey: 'your-api-key' })

// 1. Compress prompt
const compressed = await proofai.compress('Your prompt here', {
  compressionLevel: 'medium',
})

// 2. Execute AI (returns reasoning_trace + trace_quality)
const execution = await proofai.execute(compressed.id, {
  provider: 'anthropic',  // 'anthropic' | 'openai' | 'gemini'
  temperature: 0.7,
  maxTokens: 1024,
})

// 3. Cognitive analysis — pass real thinking trace
const analysis = await proofai.analyze(
  execution.id,
  execution.output,
  execution.reasoning_trace,
  execution.trace_quality,
)

// 4. Sign with Ed25519
const signature = await proofai.sign(execution)

// 5. Create evidence bundle
const bundle = await proofai.bundle(
  compressed.id,
  execution.id,
  analysis.id,
  signature.signatureId,
  analysis.cognitiveHash,
)

// 6. Anchor to Polygon PoS mainnet (EIP-155 signed raw transaction)
const anchor = await proofai.anchor(bundle.id, 'polygon')

// 7. Verify
const verification = await proofai.verify(bundle.id)
console.log(verification.verified) // true
```

## Options

### `certify(prompt, options?)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `provider` | `'anthropic' \| 'openai' \| 'gemini'` | `'anthropic'` | AI provider |
| `modelId` | `string` | auto | Model override |
| `temperature` | `number` | `0.7` | Generation temperature |
| `maxTokens` | `number` | `1024` | Max output tokens |
| `compressionLevel` | `'low' \| 'medium' \| 'high'` | `'medium'` | DSL compression level |
| `network` | `'polygon' \| 'ethereum'` | `'polygon'` | Blockchain network |
| `skipAnchor` | `boolean` | `false` | Skip blockchain anchoring |

## Self-Hosted

```typescript
const proofai = new ProofAI({
  apiKey: 'your-supabase-anon-key',
  baseUrl: 'https://your-project.supabase.co/functions/v1',
})
```

## License

MIT
