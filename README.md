# ProofAI — AI Cognitive Evidence Platform

**Cryptographic proof that AI thought before it answered.**

ProofAI creates tamper-proof evidence bundles for every AI interaction. Each response is compressed, executed across multiple providers, analyzed into a cognitive graph, signed with Ed25519, bundled with a hash chain, and anchored to the Polygon blockchain.

## Pricing

| Plan | Price | Features |
|------|-------|----------|
| **Free** | $0 | Compress (10/day), Execute 1 provider (5/day), Verify |
| **Indie** | $9/mo | Compress (100/day), Execute (50/day), Cognitive Analysis |
| **Startup** | $29/mo | Unlimited compress/execute, Multi-provider, Ed25519 Signing, Evidence Bundles |
| **Scale** | $99/mo | Everything + Blockchain Anchoring, PDF Certificates |
| **Enterprise** | $499/mo | Everything + SLA, Priority Support, Custom Integrations |

## What It Does

1. **Prompt Compression** — Compresses natural language into a semantic DSL, reducing token cost while preserving meaning
2. **Multi-Provider Execution** — Runs prompts against Anthropic Claude, OpenAI GPT, and Google Gemini with full reasoning traces
3. **Cognitive Graph Analysis** — Extracts concept nodes and relationship edges from AI output, computing consistency and complexity scores
4. **Ed25519 Signing** — Cryptographically signs the AI output with the full cognitive trace using Ed25519
5. **Evidence Bundling** — Packages prompt, execution, analysis, and signature into a hash-chained evidence bundle
6. **Blockchain Anchoring** — Writes the bundle hash to Polygon Amoy testnet via Alchemy for immutable timestamping
7. **Verification** — Independently verifies integrity, timestamps, signatures, and on-chain anchors

## Architecture

```
React/TypeScript Frontend (Vite + shadcn/ui)
        │
        ▼
Supabase Edge Functions (Deno)
   ├── /compress   — Prompt → DSL compression
   ├── /execute    — Multi-provider AI execution
   ├── /analyze    — Cognitive graph extraction
   ├── /sign       — Ed25519 signature generation
   ├── /bundle     — Evidence chain assembly
   ├── /anchor     — Polygon blockchain anchoring
   └── /verify     — Full evidence verification
        │
        ▼
Supabase PostgreSQL + Polygon Amoy Testnet
```

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [Supabase CLI](https://supabase.com/docs/guides/cli) >= 1.100
- [Deno](https://deno.land/) >= 1.38 (installed by Supabase CLI)
- API keys for at least one AI provider (Anthropic, OpenAI, or Google AI)
- [Alchemy](https://www.alchemy.com/) account for Polygon Amoy RPC
- A Polygon wallet private key (testnet only)

## Setup

### 1. Clone and install

```bash
git clone <your-repo-url> proofai
cd proofai
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your API keys:

```
VITE_API_URL=http://localhost:54321/functions/v1
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_AI_API_KEY=AI...
ALCHEMY_API_KEY=your-alchemy-key
POLYGON_PRIVATE_KEY=0x...
```

Generate a testnet wallet key if needed:

```bash
node -e "const crypto=require('crypto');console.log('POLYGON_PRIVATE_KEY=0x'+crypto.randomBytes(32).toString('hex'))"
```

### 3. Start Supabase locally

```bash
supabase init   # only first time — skip if supabase/ already has config.toml
supabase start
```

### 4. Apply the database schema

```bash
supabase db reset   # applies supabase/schema.sql
# or manually:
psql "$SUPABASE_DB_URL" -f supabase/schema.sql
```

### 5. Set Edge Function secrets

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set GOOGLE_AI_API_KEY=AI...
supabase secrets set ALCHEMY_API_KEY=your-alchemy-key
supabase secrets set POLYGON_PRIVATE_KEY=0x...
```

### 6. Serve Edge Functions locally

```bash
supabase functions serve --env-file .env
```

### 7. Start the frontend

```bash
npm run dev
```

Open http://localhost:5173

## Deploy to Production

### 1. Link your Supabase project

```bash
supabase link --project-ref your-project-ref
```

### 2. Push the database schema

```bash
supabase db push
```

### 3. Set production secrets

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set GOOGLE_AI_API_KEY=AI...
supabase secrets set ALCHEMY_API_KEY=your-alchemy-key
supabase secrets set POLYGON_PRIVATE_KEY=0x...
supabase secrets set ED25519_PRIVATE_KEY=your-64-hex-char-key
```

### 4. Deploy all Edge Functions

```bash
supabase functions deploy compress
supabase functions deploy execute
supabase functions deploy analyze
supabase functions deploy sign
supabase functions deploy bundle
supabase functions deploy anchor
supabase functions deploy verify
```

### 5. Build and deploy the frontend

```bash
VITE_API_URL=https://your-project-ref.supabase.co/functions/v1 npm run build
```

Deploy the `dist/` folder to your hosting provider (Vercel, Netlify, Cloudflare Pages, etc.).

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, shadcn/ui, Tailwind CSS, React Flow
- **Backend**: Supabase Edge Functions (Deno runtime)
- **Database**: Supabase PostgreSQL
- **Crypto**: @noble/ed25519, Web Crypto API (SHA-256, SHA-512)
- **Blockchain**: Polygon Amoy testnet via Alchemy JSON-RPC
- **AI Providers**: Anthropic Claude, OpenAI GPT, Google Gemini

## License

MIT
