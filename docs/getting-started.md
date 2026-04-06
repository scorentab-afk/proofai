# Getting Started

## Install the SDK

```bash
npm install @proofai/sdk
```

## One-line certification

```typescript
import { ProofAI } from '@proofai/sdk'

const proofai = new ProofAI({ apiKey: 'pk_live_xxx' })

const cert = await proofai.certify(
  'Analyze this contract for legal risks',
  { provider: 'anthropic' }
)

console.log(cert.verified)       // true
console.log(cert.bundleId)       // bnd_8019b37a7f44_...
console.log(cert.bundleHash)     // SHA-256 hash
console.log(cert.explorerUrl)    // https://polygonscan.com/tx/0x...
```

That's it. One line of code gives you:
- Prompt compressed to DSL with SHA-256 hash
- Real AI execution (Claude, Gemini, or GPT)
- Cognitive knowledge graph extracted from the output
- Ed25519 cryptographic signature
- Evidence bundle stored in database
- Hash anchored on Polygon blockchain
- Full verification with Polygonscan URL

## Get your API key

1. Sign up at [proofai.dev](https://proofai.dev)
2. Go to Settings → API Keys
3. Click "Create API Key"
4. Copy your `pk_live_xxx` key (shown only once)

The free plan gives you 10 compressions and 5 executions per day.

## Choose a provider

```typescript
// Anthropic Claude
const cert = await proofai.certify(prompt, { provider: 'anthropic' })

// Google Gemini (native thought signatures)
const cert = await proofai.certify(prompt, { provider: 'gemini' })

// OpenAI GPT
const cert = await proofai.certify(prompt, { provider: 'openai' })
```

## Step-by-step pipeline

If you need more control, call each step individually:

```typescript
// 1. Compress
const compressed = await proofai.compress('Your prompt here', {
  compressionLevel: 'medium',  // 'low' | 'medium' | 'high'
})

// 2. Execute AI
const execution = await proofai.execute(compressed.id, {
  provider: 'anthropic',
  temperature: 0.7,
  maxTokens: 1024,
})

// 3. Cognitive analysis
const analysis = await proofai.analyze(execution.id, execution.output)

// 4. Ed25519 signature
const signature = await proofai.sign(execution)

// 5. Evidence bundle
const bundle = await proofai.bundle(
  compressed.id,
  execution.id,
  analysis.id,
  signature.signatureId,
  analysis.cognitiveHash,
)

// 6. Blockchain anchor
const anchor = await proofai.anchor(bundle.id, 'polygon')

// 7. Verify
const verification = await proofai.verify(bundle.id)
console.log(verification.verified) // true
```

## Next steps

- [SDK Reference](./sdk-reference.md) — all methods and options
- [EU AI Act Guide](./eu-ai-act-guide.md) — compliance checklist
- [API Reference](./api-reference.md) — raw HTTP endpoints
