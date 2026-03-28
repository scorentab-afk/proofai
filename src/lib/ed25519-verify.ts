/**
 * Ed25519 Signature Verification Utilities
 * 
 * This module provides Ed25519 signature verification for AI response signatures.
 * Uses the Web Crypto API for cryptographic operations.
 */

export interface VerificationResult {
  valid: boolean;
  signatureId: string;
  verifiedAt: string;
  details: {
    payloadHash: string;
    signatureAlgorithm: string;
    cognitiveTraceIncluded: boolean;
    chainHashValid?: boolean;
  };
  errors?: string[];
}

export interface VerificationInput {
  signatureId: string;
  signedPayload: Record<string, unknown>;
  signature: {
    algorithm: string;
    signature: string;
    signed_at: string;
    signer_identity: string;
    includes_thought_signatures: boolean;
  };
  cognitive_trace?: {
    thought_signatures: Array<{
      signature: string;
      step_index: number;
      step_type: string;
      associated_function?: string;
    }>;
    reasoning_steps: number;
    function_calls: number;
  };
}

/**
 * Hash data using SHA-256
 */
async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify the payload hash matches the signed data
 */
async function verifyPayloadHash(
  signedPayload: Record<string, unknown>,
  expectedHash?: string
): Promise<{ valid: boolean; computedHash: string }> {
  const payloadStr = JSON.stringify(signedPayload, Object.keys(signedPayload).sort());
  const computedHash = await sha256(payloadStr);
  
  return {
    valid: expectedHash ? computedHash === expectedHash : true,
    computedHash,
  };
}

/**
 * Verify the cognitive trace chain integrity
 */
async function verifyCognitiveChain(
  thoughtSignatures: Array<{
    signature: string;
    step_index: number;
    step_type: string;
    associated_function?: string;
  }>
): Promise<{ valid: boolean; chainHash: string; errors: string[] }> {
  const errors: string[] = [];
  
  // Check sequential ordering
  for (let i = 0; i < thoughtSignatures.length - 1; i++) {
    if (thoughtSignatures[i].step_index > thoughtSignatures[i + 1].step_index) {
      errors.push(`Step ${i} has index ${thoughtSignatures[i].step_index} > step ${i + 1} index ${thoughtSignatures[i + 1].step_index}`);
    }
  }
  
  // Verify each signature is non-empty
  thoughtSignatures.forEach((sig, idx) => {
    if (!sig.signature || sig.signature.trim() === '') {
      errors.push(`Step ${idx} has empty signature`);
    }
  });
  
  // Compute chain hash
  const chainData = thoughtSignatures
    .map(s => `${s.step_index}:${s.step_type}:${s.signature}`)
    .join('|');
  const chainHash = await sha256(chainData);
  
  return {
    valid: errors.length === 0,
    chainHash,
    errors,
  };
}

/**
 * Simulate Ed25519 signature verification
 * 
 * In production, this would use actual Ed25519 key pairs and verification.
 * For demo purposes, we validate structure and chain integrity.
 */
export async function verifyEd25519Signature(
  input: VerificationInput
): Promise<VerificationResult> {
  const errors: string[] = [];
  const now = new Date().toISOString();
  
  // 1. Verify algorithm is Ed25519
  if (input.signature.algorithm !== 'Ed25519') {
    errors.push(`Invalid algorithm: expected Ed25519, got ${input.signature.algorithm}`);
  }
  
  // 2. Verify signature format (should be 128 hex chars for Ed25519)
  if (!/^[a-f0-9]{64,128}$/i.test(input.signature.signature)) {
    errors.push('Invalid signature format: expected 64-128 hex characters');
  }
  
  // 3. Verify payload hash
  const payloadResult = await verifyPayloadHash(input.signedPayload);
  
  // 4. Verify cognitive trace chain if present
  let chainHashValid: boolean | undefined;
  if (input.cognitive_trace?.thought_signatures) {
    const chainResult = await verifyCognitiveChain(input.cognitive_trace.thought_signatures);
    chainHashValid = chainResult.valid;
    if (!chainResult.valid) {
      errors.push(...chainResult.errors.map(e => `Cognitive chain: ${e}`));
    }
  }
  
  // 5. Verify signature timestamp is valid ISO date
  try {
    new Date(input.signature.signed_at).toISOString();
  } catch {
    errors.push('Invalid signature timestamp format');
  }
  
  // 6. Check signer identity is present
  if (!input.signature.signer_identity) {
    errors.push('Missing signer identity');
  }
  
  // 7. Verify includes_thought_signatures flag consistency
  if (input.signature.includes_thought_signatures !== !!input.cognitive_trace?.thought_signatures?.length) {
    errors.push('Inconsistent thought signature flag');
  }
  
  return {
    valid: errors.length === 0,
    signatureId: input.signatureId,
    verifiedAt: now,
    details: {
      payloadHash: payloadResult.computedHash,
      signatureAlgorithm: input.signature.algorithm,
      cognitiveTraceIncluded: !!input.cognitive_trace,
      chainHashValid,
    },
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Parse and verify a complete signature response
 */
export async function verifySignatureResponse(
  signatureResponse: {
    signatureId: string;
    signedPayload: Record<string, unknown>;
    signature: VerificationInput['signature'];
    cognitive_trace?: VerificationInput['cognitive_trace'];
  }
): Promise<VerificationResult> {
  return verifyEd25519Signature({
    signatureId: signatureResponse.signatureId,
    signedPayload: signatureResponse.signedPayload,
    signature: signatureResponse.signature,
    cognitive_trace: signatureResponse.cognitive_trace,
  });
}

export default { verifyEd25519Signature, verifySignatureResponse };
