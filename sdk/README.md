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
console.log(cert.explorerUrl)     // https://amoy.polygonscan.com/tx/0x...
```

## Step by Step

```typescript
const proofai = new ProofAI({ apiKey: 'your-api-key' })

// 1. Compress prompt
const compressed = await proofai.compress('Your prompt here', {
  compressionLevel: 'medium',
})

// 2. Execute AI
const execution = await proofai.execute(compressed.id, {
  provider: 'anthropic',  // 'anthropic' | 'openai' | 'gemini'
  temperature: 0.7,
  maxTokens: 1024,
})

// 3. Cognitive analysis
const analysis = await proofai.analyze(execution.id, execution.output)

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

// 6. Anchor to Polygon
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
