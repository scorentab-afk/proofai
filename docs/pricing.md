# Pricing & Plans

## Pay-per-Proof model

**1 proof = 1 complete pipeline run:**
compress + execute + analyze + sign + anchor + verify

Your real cost per proof: ~EUR 0.006-0.008 (AI API) + ~EUR 0.001 (Polygon tx).
ProofAI price: EUR 0.05/proof. Margin: ~88-96%.

## Plans

| Plan | Price | Proofs | Effective rate | Overage |
|------|-------|--------|---------------|---------|
| **Free** | EUR 0 | 100 total | Free | Blocked |
| **Pay-as-you-go** | EUR 0/mo | Unlimited | EUR 0.05/proof | N/A |
| **Indie** | EUR 9/mo | 500 included | EUR 0.018/proof | EUR 0.04/proof |
| **Startup** | EUR 29/mo | 2,000 included | EUR 0.015/proof | EUR 0.03/proof |
| **Scale** | EUR 99/mo | 10,000 included | EUR 0.01/proof | EUR 0.02/proof |
| **Enterprise** | EUR 499/mo | Unlimited | Custom | Custom |

## How it works

1. Sign up and get an API key (`pk_live_xxx`)
2. Each `certify()` call or complete pipeline run = 1 proof
3. Free plan: first 100 proofs are free, no credit card needed
4. Pay-as-you-go: no monthly fee, billed per proof via Stripe metered billing
5. Forfait plans: monthly fee includes N proofs, overages billed per-proof

## Why pay-per-proof?

- **Aligned cost**: you pay proportional to your usage
- **No surprise bills**: a proof costs exactly EUR 0.05, always
- **Scale-friendly**: volume discounts built into forfait plans
- **Start free**: 100 proofs to test everything, no commitment

## How it compares

| Product | Price | Model | Tamper-evident |
|---------|-------|-------|----------------|
| trail | EUR 500+/mo | Subscription | No |
| Vanta | EUR 5,000+/yr | Subscription | No |
| Drata | EUR 10,000+/yr | Subscription | No |
| **ProofAI** | **EUR 0.05/proof** | **Pay-per-use** | **Yes (Ed25519 + Polygon)** |

500 proofs/month on ProofAI = EUR 9/month.
The same coverage on Vanta = EUR 416/month.

## Enterprise

Custom pricing, SLA 99.9%, SSO/SAML, dedicated infrastructure, on-premise option.

Contact: contact@proofai.dev
