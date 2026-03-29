# Authentication & API Keys

## Overview

ProofAI uses API keys to authenticate SDK and API requests. Each key is tied to a user account and a billing plan.

## Getting your API key

1. Sign up at [proofai.dev](https://proofai.dev) (email or Google OAuth)
2. A free plan is automatically activated
3. Go to **Settings** → **API Keys**
4. Click **Create API Key**
5. Copy your key: `pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

> Your key is shown only once. Save it securely.

## Using your API key

### SDK

```typescript
import { ProofAI } from '@proofai/sdk'

const proofai = new ProofAI({ apiKey: 'pk_live_xxx' })
```

### Raw HTTP

```bash
curl -X POST https://your-project.supabase.co/functions/v1/compress \
  -H "Authorization: Bearer pk_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "..."}'
```

## Free tier (no key required)

You can use the Supabase anon key for the free tier:

```typescript
const proofai = new ProofAI({
  apiKey: 'your-supabase-anon-key',
})
```

Free tier limits: 10 compressions/day, 5 executions/day, verify only.

## Key security

- Keys are **hashed with SHA-256** before storage — we never store your key in cleartext
- Only the first 12 characters (`pk_live_xxxx`) are stored for display
- You can create multiple keys (e.g., one per environment)
- Deactivate compromised keys immediately in Settings

## Plan-based access

Your API key inherits the permissions of your billing plan:

| Feature | Free | Indie | Startup | Scale | Enterprise |
|---------|------|-------|---------|-------|------------|
| `compress` | 10/day | 100/day | Unlimited | Unlimited | Unlimited |
| `execute` | 5/day | 50/day | Unlimited | Unlimited | Unlimited |
| Multi-provider | 1 | 1 | All | All | All |
| `analyze` | - | Yes | Yes | Yes | Yes |
| `sign` | - | - | Yes | Yes | Yes |
| `bundle` | - | - | Yes | Yes | Yes |
| `anchor` | - | - | - | Yes | Yes |
| `verify` | Yes | Yes | Yes | Yes | Yes |
| `review` | - | - | Yes | Yes | Yes |
| `monitor` | - | - | - | Yes | Yes |

When you upgrade your plan, all your existing API keys are automatically upgraded.
