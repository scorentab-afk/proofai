# Self-Hosting

ProofAI is fully open source (MIT). You can deploy your own instance.

## Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli) >= 1.100
- A [Supabase](https://supabase.com) project (free tier works)
- API keys for at least one AI provider
- [Alchemy](https://www.alchemy.com/) account for Polygon RPC (free tier works)
- A Polygon wallet private key (testnet)

## 1. Clone and install

```bash
git clone https://github.com/proof-ai/proofai.git
cd proofai
npm install
```

## 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```bash
VITE_API_URL=https://your-project.supabase.co/functions/v1
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 3. Link and push database

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

## 4. Set secrets

```bash
supabase secrets set \
  ANTHROPIC_API_KEY=sk-ant-... \
  GOOGLE_AI_API_KEY=AIza... \
  OPENAI_API_KEY=sk-... \
  ALCHEMY_API_KEY=your-key \
  POLYGON_PRIVATE_KEY=0x...
```

## 5. Deploy Edge Functions

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
supabase functions deploy create-api-key
supabase functions deploy stripe-webhook
```

## 6. Run the frontend

Development:
```bash
npm run dev
```

Production:
```bash
VITE_API_URL=https://your-project.supabase.co/functions/v1 npm run build
```

Deploy the `dist/` folder to Vercel, Netlify, or Cloudflare Pages.

## 7. Point the SDK to your instance

```typescript
import { ProofAI } from '@proofai/sdk'

const proofai = new ProofAI({
  apiKey: 'your-supabase-anon-key',
  baseUrl: 'https://your-project.supabase.co/functions/v1',
})
```

## Generate a testnet wallet

```bash
node -e "const c=require('crypto');console.log('0x'+c.randomBytes(32).toString('hex'))"
```

Fund it with MATIC on Polygon mainnet.
