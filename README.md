# proofAI

**Cryptographic proof for AI decisions — verifiable in your browser, anchored on Polygon mainnet.**

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://github.com/proof-ai/proofai/blob/main/LICENSE)
[![EU AI Act](https://img.shields.io/badge/EU%20AI%20Act-Article%2012%20%26%2019-blue.svg)](https://artificialintelligenceact.eu/article/12/)
[![Polygon Mainnet](https://img.shields.io/badge/Blockchain-Polygon%20Mainnet-8247E5.svg)](https://polygonscan.com/address/0xa3de684c299b02bca5b2b39548fc0a99725bbd58)
[![Ed25519](https://img.shields.io/badge/Crypto-Ed25519-orange.svg)](https://github.com/paulmillr/noble-ed25519)
[![Version](https://img.shields.io/badge/Version-1.3-brightgreen.svg)](https://github.com/proof-ai/proofai/releases)

> *Anthropic can't certify your AI logs. OpenAI can't certify your AI logs. Google can't certify your AI logs.*
> *They built the models — not the audit trail. That's your problem under EU AI Act Article 12.*
> *proofAI makes it a solved problem — and you can verify every claim in this README yourself, in your browser, in 30 seconds.*

---

## See it work — right now, in your browser

Open the regulator portal and paste this bundle ID:

**👉 [https://proofai-ochre.vercel.app/regulator](https://proofai-ochre.vercel.app/regulator)**

```
Bundle ID:       bnd_10234f44690e_1775964592678
Regulator token: reg_proofai_regulator_2026
```

You will see, in this exact order, **all happening inside your browser** (open DevTools → Network tab to verify):

1. **SHA-256 hash** of the bundle, recomputed locally via Web Crypto API
2. **Ed25519 signature** verified against our pinned public key — no server round-trip
3. **Polygon mainnet transaction** verified directly via public RPC nodes — no proofAI infrastructure
4. **EU AI Act Article-by-Article mapping** — 7 conformant checks, 3 N/A for this use case

Each verification step includes the exact `cast` / `curl` command an auditor can copy-paste to re-verify independently. The page footer makes it explicit: *"Verification of blockchain anchors can be performed independently at polygonscan.com."*

This is not a marketing video. Every element above is happening in your browser as you read this.

---

## What proofAI v1.3 actually delivers

| Capability | Status | How to verify |
|---|---|---|
| Tamper-evident logging (Art. 12.1) | ✅ | Bundle hash anchored on Polygon block 85422286 |
| Traceability of AI decisions (Art. 12.2) | ✅ | Cognitive nodes extracted, consistency score |
| 6-month log retention (Art. 19.3) | ✅ | Automatic, ISO 8601 timestamps in every bundle |
| Cryptographic signature (Art. 19.1) | ✅ | Real Ed25519 via [@noble/ed25519](https://github.com/paulmillr/noble-ed25519), 128-char hex, persisted |
| Blockchain anchor — independent verification (Art. 19.2) | ✅ | Polygon PoS mainnet, 3-RPC public fallback |
| Human oversight (Art. 14) | ✅ | `review()` API for compliance officers |
| Post-market monitoring (Art. 72) | ✅ | `monitor()` API with anomaly detection |
| Right to erasure / crypto-shredding (GDPR Art. 17) | ✅ | Encryption key destruction, log integrity preserved |
| Subject identification — pseudonymised (Art. 12.3) | ✅ | SHA-256 hash of subject ID, no PII exposure |
| RAG / reference database tracking (Art. 12.4) | ✅ | Source documents hashed and listed in bundle |

---

## Architecture

```
Your AI call
    │
    ▼
┌─────────────┐
│  compress   │  Prompt → DSL + SHA-256 hash
└─────────────┘
    │
    ▼
┌─────────────┐
│   execute   │  Real AI call: Claude / Gemini / GPT
└─────────────┘  Captures reasoning trace + cognitive nodes
    │
    ▼
┌─────────────┐
│   analyze   │  Cognitive knowledge graph extraction
└─────────────┘  12 nodes for the demo bundle, consistency 86%
    │
    ▼
┌─────────────┐
│    sign     │  Ed25519 signature via @noble/ed25519
└─────────────┘  Persistent key, persisted hex, public pubkey
    │
    ▼
┌─────────────┐
│   bundle    │  Assemble: prompt + output + signature + cognitive graph
└─────────────┘
    │
    ▼
┌─────────────┐
│   anchor    │  Bundle hash → Polygon mainnet calldata
└─────────────┘  From wallet 0xA3DE684c... — public, immutable
    │
    ▼
┌─────────────┐
│   verify    │  In-browser: SHA-256 + Ed25519 + RPC Polygon
└─────────────┘  ZERO calls to proofAI servers during verification
```

---

## The cryptographic identity of proofAI

**Signer wallet (Polygon mainnet):**
[`0xA3DE684c299b02bca5b2B39548FC0A99725bBd58`](https://polygonscan.com/address/0xa3de684c299b02bca5b2b39548fc0a99725bbd58)

**Ed25519 public key (pinned, hex):**
```
57e644ae45042127d0c6852bd66d377087aa5a648e3f14146f5c5c33e2a4e1fc
```

This public key is also published verbatim in [`PUBKEY.txt`](https://github.com/proof-ai/proofai/blob/main/PUBKEY.txt) at the root of this repository. Any divergence between the key in the SDK, the regulator portal, this README, and `PUBKEY.txt` is a bug — please open an issue.

**Demo bundle anchored on Polygon mainnet:**
- Bundle ID: `bnd_10234f44690e_1775964592678`
- Bundle hash (SHA-256): `10234f44690ee0b16d0ae80111ba2a0a848b70fa5f8170929ccce46b95598b19`
- Polygon transaction: [`0xf77b138372f1f44a6a16117483a9d75fa233f398bacf0b2a2711d7ffe81c4778`](https://polygonscan.com/tx/0xf77b138372f1f44a6a16117483a9d75fa233f398bacf0b2a2711d7ffe81c4778)
- Block: 85422286
- AI provider: Anthropic Claude Sonnet 4.6
- Use case: Professional credit evaluation (SaaS B2B, €500k financing request)

---

## Verify any bundle yourself — 3 ways, all independent of proofAI

### 1. The browser way (zero install, 30 seconds)

Open [proofai-ochre.vercel.app/regulator](https://proofai-ochre.vercel.app/regulator), paste the bundle ID, watch the four cryptographic verifications happen in real time. The page makes a single fetch to load the bundle JSON, then performs all verification steps locally. You can confirm in DevTools → Network that no calls are made to `proofai.*` or `supabase.*` during the verification phase — only to public Polygon RPC nodes (polygon.llamarpc.com, publicnode.com, 1rpc.io) for the on-chain check.

### 2. The terminal way (any RPC client, no proofAI dependency)

Verify a bundle's anchoring directly against Polygon mainnet:

```bash
curl -s https://polygon.llamarpc.com \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "method":"eth_getTransactionByHash",
    "params":["0xf77b138372f1f44a6a16117483a9d75fa233f398bacf0b2a2711d7ffe81c4778"],
    "id":1
  }' | python3 -c "
import sys, json
tx = json.load(sys.stdin)['result']
expected_hash = '0x10234f44690ee0b16d0ae80111ba2a0a848b70fa5f8170929ccce46b95598b19'
print('From wallet:', tx['from'])
print('Block:      ', int(tx['blockNumber'], 16))
print('Calldata = bundle_hash:', tx['input'].lower() == expected_hash)
"
```

Expected output:
```
From wallet: 0xa3de684c299b02bca5b2b39548fc0a99725bbd58
Block:       85422286
Calldata = bundle_hash: True
```

### 3. The Polygonscan way (no command line)

Click [the transaction link](https://polygonscan.com/tx/0xf77b138372f1f44a6a16117483a9d75fa233f398bacf0b2a2711d7ffe81c4778), look at the *Input Data* field. It contains exactly the bundle's SHA-256 hash, no derivation, no salt, no timestamp wrapping. Status: Success. Block confirmations: thousands and counting.

---

## Install and integrate

### Node.js / TypeScript

```bash
npm install @proofai/sdk
```

```typescript
import { ProofAI } from '@proofai/sdk';

const proofai = new ProofAI({ apiKey: 'pk_live_xxx' });

const cert = await proofai.certify(
  'Évaluer cette demande de crédit professionnel...',
  { provider: 'anthropic' }
);

console.log(cert.verified);     // true
console.log(cert.bundleHash);   // SHA-256
console.log(cert.explorerUrl);  // https://polygonscan.com/tx/0x...
console.log(cert.regulatorUrl); // https://proofai-ochre.vercel.app/regulator
```

### Python

```bash
pip install proofai
```

```python
from proofai import ProofAI

client = ProofAI(api_key="pk_live_xxx")
cert = client.certify("Évaluer cette demande de crédit professionnel...")

assert cert.verified
print(cert.explorer_url)
```

---

## How proofAI compares

| Capability | Internal logging only | trail / Vanta / Drata (generic GRC) | proofAI v1.3 |
|---|---|---|---|
| Local hash chain | ✅ | ✅ | ✅ |
| Provider-independent attestation | ❌ | ❌ | ✅ |
| Tamper-evident on-chain anchor | ❌ | ❌ | ✅ Polygon mainnet |
| Browser-side cryptographic verification | ❌ | ❌ | ✅ |
| Article-by-Article EU AI Act mapping | ❌ | ⚠️ generic | ✅ |
| Cognitive reasoning capture | ❌ | ❌ | ✅ |
| GDPR crypto-shredding compatible | ❌ | ⚠️ partial | ✅ |
| Open source (MIT) | varies | ❌ | ✅ |
| Per-proof pricing | N/A | enterprise contract only | from €0.05 |

We respect [rio-receipt-protocol](https://github.com/bkr1297-RIO/rio-receipt-protocol) as a complementary upstream: where RIO provides excellent local hash-chain receipts for in-process AI action logging (zero dependencies, pure Python), proofAI extends the model with cryptographic signing, blockchain anchoring, and EU AI Act mapping suitable for regulator-facing audits. A `proofai.bridges.rio` integration is on the v1.4 roadmap.

---

## Roadmap

### v1.4 — Q2 2026

- **Multimodal support** — vision (images), audio, PDF, structured documents. The bundle format already accommodates content addressing via SHA-256; only the input/output handlers need extension.
- **Factur-X-style transmission format** — `.proofai.pdf` files combining a human-readable PDF/A-3 (regulator-friendly) with embedded XML (machine-readable for automated compliance pipelines), inspired by [EN 16931](https://fnfe-mpe.org/factur-x/) electronic invoicing standards. One file, two readers, no middleware.
- **Automated regulator transmission** — opt-in nightly batch dispatch of compliance bundles to subscribed authorities (CNIL, ACPR, ARCOM, DGCCRF, EUDA), in the same way Factur-X automated B2G invoice transmission to French tax authorities.
- **`proofai.bridges.rio`** — wrap RIO Receipt Protocol receipts as proofAI bundles, anchoring local hash-chains to Polygon for regulator-grade verifiability.
- **`proofai verify` CLI** — pure Python verification tool, no proofAI dependency at runtime, for CI/CD compliance pipelines.

### v2.0 — H2 2026

- **Open standard submission** — work with [FNFE-MPE](https://fnfe-mpe.org/) (the French Forum that piloted Factur-X standardisation) and AFNOR to define `ProofAI-X` as a published, freely-implementable standard for AI decision evidence transmission.
- **Regulator recognition** — formal validation tracks with CNIL (GDPR alignment), ACPR (banking supervision), and EUDA (European Union Agency for the Operational Management of Large-Scale IT Systems), the likely coordination authority for EU AI Act enforcement.
- **Long-term vision** — *what Factur-X is to electronic invoicing under EN 16931, proofAI aims to be for AI compliance under the EU AI Act*: a single, open, machine-and-human-readable format that any deployer can produce, any auditor can read, and any regulator can ingest at scale.

---

## Pricing

**1 proof = compress + execute + analyze + sign + bundle + anchor + verify**

| Plan | Price | Proofs included | Effective rate |
|---|---|---|---|
| **Free** | €0 | 100 total | Free |
| **Pay-as-you-go** | €0.05/proof | unlimited | €0.05 |
| **Indie** | €9/month | 500 included | €0.018/proof |
| **Startup** | €29/month | 2,000 included | €0.015/proof |
| **Scale** | €99/month | 10,000 included | €0.01/proof |
| **Enterprise** | Custom | Volume + SLA + dedicated support | Contact us |

> *Pricing is in beta. Volume tiers may be re-calibrated as we gather real usage data and instrument actual cost-per-proof across AI providers.*

---

## Limitations and threat model

We document what proofAI does **not** guarantee, because honest scope is part of the product:

- **proofAI does not guarantee the correctness of the AI decision itself.** It guarantees the integrity, immutability, and verifiability of the decision's audit trail. A poorly-reasoned decision that was properly logged remains a poorly-reasoned decision.
- **proofAI does not constitute legal compliance advice.** The Article-by-Article mapping is an aid for compliance officers and auditors, not a substitute for human legal review.
- **proofAI v1.3 is text-modality only.** Multimodal AI decisions (vision, audio, PDF) are not yet supported. Roadmap: v1.4, Q2 2026.
- **Subject identification relies on the deployer.** proofAI hashes whatever subject identifier you provide. If you provide raw PII, that PII becomes part of the bundle. Use stable pseudonyms or hash subject IDs before passing them to `certify()`.
- **The Ed25519 signing key is currently held by proofAI.** This means proofAI is technically capable of signing arbitrary bundles. We mitigate this through (a) public key pinning in this repository, (b) public anchoring of every bundle hash on Polygon mainnet (so timing fraud is detectable), and (c) a v2.0 commitment to multi-signer threshold signatures.
- **The Polygon mainnet anchoring uses a self-transfer with calldata pattern.** Each bundle hash is included verbatim in the `input` field of a Polygon mainnet transaction signed by the proofAI signer wallet. There is no smart contract, no event log, no on-chain registry — verification requires reading the calldata field directly. A future version may deploy a verifiable smart contract with indexed events for compatibility with Web3 indexers like TheGraph or Dune.
- **proofAI relies on the availability of public Polygon RPC nodes for in-browser verification.** If all five fallback RPCs are simultaneously unreachable from a given network, the on-chain verification card displays a graceful fallback pointing to Polygonscan as the manual verification path. The transaction itself remains on the immutable ledger regardless.

---

## Acknowledgments

proofAI builds on the work of many people and projects:

- **[@noble/ed25519](https://github.com/paulmillr/noble-ed25519)** by Paul Miller — the most thoroughly audited pure-JS Ed25519 implementation we could find. Used in both the Edge Functions (Deno) and the regulator portal (browser).
- **[rio-receipt-protocol](https://github.com/bkr1297-RIO/rio-receipt-protocol)** — an excellent zero-dependency Python library for local AI action receipts. While proofAI and RIO target different layers (regulator-facing infrastructure vs. in-process logging primitive), we consider them complementary rather than competing. A bridge integration is on our roadmap.
- **[Factur-X / FNFE-MPE](https://fnfe-mpe.org/)** — the French electronic invoicing standard (EN 16931) that demonstrated how a single PDF/A-3 + embedded XML format can serve both human auditors and machine pipelines. Major inspiration for our v1.4 transmission roadmap.
- **Polygon Foundation** — for providing a high-throughput, low-cost, EVM-compatible mainnet that makes per-proof anchoring economically viable at scale.
- **Anthropic, OpenAI, Google** — for the reasoning capabilities we wrap. proofAI does not modify or compete with model providers; we make their outputs auditable.

---

## License

MIT © proofAI contributors — see [LICENSE](LICENSE).

---

## Contributing

PRs welcome. Issues welcome. Stars very welcome.

If you build AI systems in the EU and need to demonstrate compliance under EU AI Act Article 12 — you need this.
If you are a compliance officer, DPO, or auditor — we would love your feedback on the regulator portal and the Article mapping.
If you are a cryptographer or auditor — we would love your eyes on the signing scheme and the verification flow.

Open an issue, or reach out via [github.com/proof-ai/proofai/discussions](https://github.com/proof-ai/proofai/discussions).

---

*Verifiable by math. Anchored on Polygon. Mapped to Article 12.*
*Not by Anthropic. Not by OpenAI. Not by us. By the chain.*
