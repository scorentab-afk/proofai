# proofAI

**Cryptographic proof that your AI decisions cannot be falsified.**

> *Anthropic can't certify your logs. OpenAI can't certify your logs. Google can't certify your logs.*
> *They built the models — not the audit trail. That's your problem.*
> *proofAI makes it a solved problem.*

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![EU AI Act](https://img.shields.io/badge/EU%20AI%20Act-Article%2012%20Ready-blue.svg)](https://artificialintelligenceact.eu/article/12/)
[![Polygon PoS](https://img.shields.io/badge/Blockchain-Polygon%20PoS-8247E5.svg)](https://polygonscan.com)
[![Ed25519](https://img.shields.io/badge/Crypto-Ed25519-orange.svg)](https://github.com/paulmillr/noble-ed25519)
[![Supabase](https://img.shields.io/badge/Backend-Supabase-3ECF8E.svg)](https://supabase.com)

---

## Why providers can't solve this for you

**1. They're a party to the case.**
When a regulator audits your AI system, the provider (Anthropic, OpenAI, Google) is a stakeholder — not an independent witness. Their logs are evidence they produced about their own product. No court treats that as proof.

**2. The AI Act puts the obligation on the deployer — not the provider.**
Article 26 is explicit: the deployer (you) must ensure logging, monitoring, and human oversight. The provider has no legal obligation to certify your compliance. They won't, and they can't.

**3. Providers don't have the infrastructure.**
Claude doesn't write your logs to a blockchain. GPT doesn't sign your outputs with Ed25519. Gemini doesn't generate compliance certificates. They're model providers — not audit infrastructure.

---

## The problem nobody is talking about

The EU AI Act Article 12 mandates automatic logging for high-risk AI systems from **August 2, 2026**.
Fines: up to **€35 million** or **7% of global turnover**.

Every compliance tool — trail, Vanta, Drata, Protectron — stores your logs in **their own database**.

When a regulator or judge asks:

> *"How do I know you didn't modify these logs after the fact?"*

Their only answer is: **"Trust us."**

That's not proof. That's a declaration.

proofAI anchors every AI decision on the Polygon blockchain with a real Ed25519 cryptographic signature. The proof is mathematical, public, and verifiable by anyone — without trusting us, without trusting you, without trusting anyone.

---

## EU AI Act compliance coverage

| Requirement | Article | Providers | trail | Vanta | **proofAI** |
|-------------|---------|-----------|-------|-------|-------------|
| Automatic event logging | Art. 12 | ❌ | ✅ | ✅ | ✅ |
| 6-month log retention | Art. 19 | ❌ | ✅ | ✅ | ✅ |
| Subject identification (hashed) | Art. 12 | ❌ | ✅ | ✅ | ✅ |
| RAG / reference database tracking | Art. 12 | ❌ | ❌ | ❌ | ✅ |
| Human oversight logging | Art. 14 | ❌ | ✅ | ✅ | ✅ |
| Reasoning trace | Art. 12 | ❌ | ❌ | ❌ | ✅ |
| Gemini thought signatures | Art. 12 | ❌ | ❌ | ❌ | ✅ |
| Post-market monitoring | Art. 72 | ❌ | ✅ | ❌ | ✅ |
| Tamper-evident logs | Art. 19 | ❌ | ❌ | ❌ | ✅ |
| Ed25519 cryptographic signature | Art. 19 | ❌ | ❌ | ❌ | ✅ |
| Blockchain anchor (verifiable by anyone) | Art. 19 | ❌ | ❌ | ❌ | ✅ |
| Independent third party (not party to case) | Art. 19 | ❌ | ❌ | ❌ | ✅ |
| GDPR crypto-shredding (Art. 17) | GDPR | ❌ | ❌ | ❌ | ✅ |
| Open source | — | ❌ | ❌ | ❌ | ✅ |
| Price | — | N/A | €500+/mo | €5k+/yr | **€0.05/proof** |

---

## Screenshots

### Dashboard
![Dashboard](https://github.com/user-attachments/assets/e0bac39f-59da-4963-ad18-5034ab8bdd68)

### Prompt Compression
![Compress](https://github.com/user-attachments/assets/5b2e5997-c066-43d5-9423-378f354d58f9)

### AI Execution with Reasoning Trace
![Execute](https://github.com/user-attachments/assets/c46403e7-f6a8-4781-b0bc-843ac1b3f873)

### Cognitive Knowledge Graph
![Analyze](https://github.com/user-attachments/assets/d961cc6a-a0a8-4ee5-9240-2bdb02808d93)

### AI Signature
![Signature](https://github.com/user-attachments/assets/a5fa0b76-fde5-454e-957d-377f10bd2ad7)

### Verification Passed + Blockchain Record
![Verify](https://github.com/user-attachments/assets/4baf257e-74e2-433f-8edc-c19b0f72fe8d)

### Verification Passed — 4/4 Integrity Checks
![Checks](https://github.com/user-attachments/assets/819a42a9-19e3-43d1-b5d7-5810dc11b1ad)

### Login — Google OAuth + Email
![Login](https://github.com/user-attachments/assets/3d01a51f-5904-4447-8717-65a32b219828)

---

## How it works

```
Your AI call
    ↓
① Compress prompt → DSL + SHA-256 hash
    ↓
② Execute AI (Claude · Gemini · GPT)
   Extract reasoning trace + Gemini thought signatures
    ↓
③ Generate cognitive knowledge graph
    ↓
④ Sign with Ed25519 ← real cryptographic signature
    ↓
⑤ Bundle: prompt + output + signature + graph + RAG sources
    ↓
⑥ Anchor bundle hash → Polygon blockchain
    ↓
⑦ Verify: Ed25519 + blockchain + hash chain
    ↓
Certificate PDF with Polygonscan URL
```

Anyone can verify at `https://polygonscan.com/tx/[tx-hash]`
No account. No login. No middleman. Just math.

---

## The legal argument

When a regulator asks you to prove your AI logs are intact:

**OpenAI / Anthropic answer:** *"We can't certify your logs — that's the deployer's responsibility."*
**trail / Vanta answer:** *"Here's a PDF we generated from our database."*
**proofAI answer:** *"Here's the Polygonscan URL. Verify it yourself."*

One is a refusal. One is a declaration. One is a proof.

> *"Cryptographic approaches resolve the tension between GDPR erasure rights and AI Act retention obligations through crypto-shredding — when erasure is required, the encryption key is destroyed, not the log. The audit trail remains intact."*
> — Adapted from European Data Protection Board guidance

proofAI implements this natively.

---

## One-line integration

```bash
npm install @proofai/sdk
```

```typescript
import { ProofAI } from '@proofai/sdk'

const proofai = new ProofAI({ apiKey: 'pk_live_xxx' })

// Full pipeline — one line
const cert = await proofai.certify('Analyze this contract for legal risks', {
  provider: 'anthropic',
})

console.log(cert.verified)        // true
console.log(cert.bundleHash)      // sha256 hash
console.log(cert.explorerUrl)     // https://polygonscan.com/tx/0x...

// Human oversight (Art. 14)
await proofai.review(cert.bundleId, 'dpo@company.com', 'compliance_officer', 'approved')

// Post-market monitoring (Art. 72)
const stats = await proofai.monitor()
```

Or step by step — `compress()`, `execute()`, `analyze()`, `sign()`, `bundle()`, `anchor()`, `verify()`.

---

## Quickstart (self-hosted)

```bash
git clone https://github.com/proof-ai/proofai.git
cd proofai
npm install
cp .env.example .env
# Fill in your API keys
npm run dev
```

Open `http://localhost:8080`

---

## The 9 Edge Functions

| Function | Article | What it does |
|----------|---------|-------------|
| `compress` | Art. 12 | Compress prompt to DSL + SHA-256 |
| `execute` | Art. 12 | Real AI call — Claude, Gemini, or GPT |
| `analyze` | Art. 12 | Cognitive knowledge graph from output |
| `sign` | Art. 19 | Real Ed25519 signature of the execution |
| `bundle` | Art. 12 | Assemble evidence bundle + subject hash + RAG |
| `anchor` | Art. 19 | Write bundle hash to Polygon blockchain |
| `verify` | Art. 19 | Verify: signature + blockchain + hash chain |
| `review` | Art. 14 | Human oversight — reviewer logs decision |
| `monitor` | Art. 72 | Post-market monitoring — anomaly detection |

---

## Stack

```
Frontend     React 18 + TypeScript + Tailwind + shadcn/ui + Framer Motion
Backend      Supabase Edge Functions (Deno)
Crypto       @noble/ed25519 — real Ed25519 signatures
Blockchain   Polygon PoS mainnet via Alchemy
AI           Claude (Anthropic) · Gemini (Google) · GPT (OpenAI)
Graphs       React Flow — cognitive knowledge graph
PDF          jsPDF — exportable compliance certificate
```

---

## Deploy your own

**1. Supabase setup**

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

**2. Set secrets**

```bash
supabase secrets set \
  ANTHROPIC_API_KEY=sk-ant-... \
  GOOGLE_AI_API_KEY=AIza... \
  OPENAI_API_KEY=sk-... \
  ALCHEMY_API_KEY=your-alchemy-key \
  POLYGON_PRIVATE_KEY=0x... \
  PROOFAI_SIGNER_IDENTITY=proofai-signer-v1
```

**3. Deploy functions**

```bash
supabase functions deploy compress
supabase functions deploy execute
supabase functions deploy analyze
supabase functions deploy sign
supabase functions deploy bundle
supabase functions deploy anchor
supabase functions deploy verify
supabase functions deploy review
supabase functions deploy monitor
```

**4. Build frontend**

```bash
VITE_API_URL=https://YOUR_PROJECT.supabase.co/functions/v1 npm run build
```

---

## Environment Variables

```bash
# Frontend (.env)
VITE_API_URL=https://your-project.supabase.co/functions/v1
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Supabase secrets
ANTHROPIC_API_KEY=
GOOGLE_AI_API_KEY=
OPENAI_API_KEY=
ALCHEMY_API_KEY=
POLYGON_PRIVATE_KEY=
PROOFAI_SIGNER_IDENTITY=proofai-signer-v1
```

---

## Pricing

**1 proof = compress + execute + analyze + sign + anchor + verify**

| Plan | Price | Proofs | Effective rate |
|------|-------|--------|---------------|
| **Free** | €0 | 100 total | Free |
| **Pay-as-you-go** | €0.05/proof | Unlimited | €0.05 |
| **Indie** | €9/mo | 500 included | €0.018/proof |
| **Startup** | €29/mo | 2,000 included | €0.015/proof |
| **Scale** | €99/mo | 10,000 included | €0.01/proof |

---

## GDPR + AI Act — no conflict

The EU AI Act requires 6-month log retention.
GDPR Article 17 gives users the right to erasure.
These appear to conflict. proofAI resolves this with **crypto-shredding**:

- Personal data stored encrypted with a separate key
- Erasure requested → key destroyed, not the log
- Audit trail hash stays intact on blockchain
- Personal content becomes cryptographically inaccessible

Full compliance. No trade-offs.

---

## Gemini Thought Signatures

proofAI is the only compliance tool that captures Gemini's native **thought signatures** — cryptographic markers attached to each reasoning step.

Your certificate proves not just *what* the AI said. But *how it reasoned*.

```typescript
const trace = ThoughtSignatureExtractor.extractFromResponse(response.content)
// → [{ step_index: 0, step_type: 'reasoning', thought_signature: '7f3a...' }]
```

---

## Contributing

PRs welcome. Issues welcome. Stars very welcome.

If you build AI systems in the EU — you need this.
If you're a lawyer or compliance expert — we'd love your input.

---

## License

MIT © proofAI — [github.com/proof-ai/proofai](https://github.com/proof-ai/proofai)

---

*Not by Anthropic. Not by OpenAI. Not by us. By the blockchain.*
