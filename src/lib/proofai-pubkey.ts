/**
 * ProofAI Ed25519 signer public key.
 *
 * The matching private key lives exclusively in Supabase Edge Function Secrets
 * as ED25519_PRIVATE_KEY — it never leaves the server.
 *
 * This public key is safe to embed in the frontend. Anyone can use it to verify
 * that an evidence bundle was signed by the official ProofAI signer.
 *
 * Loaded from VITE_PROOFAI_ED25519_PUBKEY at build time; falls back to the
 * pinned constant so unit tests and local builds work without .env.local.
 */

const PINNED_PUBKEY = "57e644ae45042127d0c6852bd66d377087aa5a648e3f14146f5c5c33e2a4e1fc";

export const PROOFAI_SIGNER_PUBKEY: string =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_PROOFAI_ED25519_PUBKEY) ||
  PINNED_PUBKEY;
