import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';

// @noble/ed25519 v2 requires a sha512 implementation.
// Set both sync and async so verifyAsync works in any browser/bundler context.
ed.etc.sha512Sync = (...m: Parameters<typeof sha512>) => sha512(...m);
ed.etc.sha512Async = async (...m: Parameters<typeof sha512>) => sha512(...m);

/**
 * Verify an Ed25519 signature against a message and public key.
 * Pure cryptographic verification — no network calls, no server roundtrip.
 * Runs entirely in the browser via @noble/ed25519.
 *
 * @param signatureHex  128-char hex string (64-byte Ed25519 signature)
 * @param messageHex    hex-encoded message that was signed (bundle_hash)
 * @param pubkeyHex     64-char hex string (32-byte Ed25519 public key)
 */
export async function verifyEd25519(
  signatureHex: string,
  messageHex: string,
  pubkeyHex: string
): Promise<boolean> {
  if (!signatureHex || !messageHex || !pubkeyHex) return false;
  if (signatureHex.length !== 128) return false;
  if (pubkeyHex.length !== 64) return false;
  try {
    return await ed.verifyAsync(signatureHex, messageHex, pubkeyHex);
  } catch {
    return false;
  }
}
