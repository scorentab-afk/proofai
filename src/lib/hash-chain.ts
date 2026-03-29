/**
 * ProofAI Hash Chain — ported from Clawprint (Rust)
 * Two-level tamper detection:
 * 1. Event-level: SHA-256 hash of canonical form
 * 2. Chain-level: each event links to previous via hash_prev
 */

export interface ChainEvent {
  event_id: number;
  ts: string; // RFC3339
  kind: string;
  actor?: string;
  payload: Record<string, unknown>;
  artifact_refs?: string[];
  hash_prev: string | null;
  hash_self: string;
}

interface CanonicalEvent {
  event_id: number;
  ts: string;
  kind: string;
  actor?: string;
  payload: Record<string, unknown>;
  artifact_refs?: string[];
  hash_prev: string | null;
}

async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Compute the canonical hash of an event (excluding hash_self).
 * Matches Clawprint's Rust implementation.
 */
export async function computeEventHash(event: ChainEvent): Promise<string> {
  const canonical: CanonicalEvent = {
    event_id: event.event_id,
    ts: event.ts,
    kind: event.kind,
    payload: event.payload,
    hash_prev: event.hash_prev,
  };
  // Only include optional fields if present (matches Rust's skip_serializing_if)
  if (event.actor) canonical.actor = event.actor;
  if (event.artifact_refs?.length) canonical.artifact_refs = event.artifact_refs;

  const json = JSON.stringify(canonical);
  return sha256(json);
}

/**
 * Verify a single event's hash integrity.
 */
export async function verifyEvent(event: ChainEvent): Promise<boolean> {
  const computed = await computeEventHash(event);
  return computed === event.hash_self;
}

/**
 * Verify an entire chain of events.
 * Returns { valid, errors } with specific failure details.
 */
export async function verifyChain(events: ChainEvent[]): Promise<{
  valid: boolean;
  verified: number;
  errors: Array<{ event_id: number; error: string }>;
}> {
  if (events.length === 0) {
    return { valid: true, verified: 0, errors: [] };
  }

  const errors: Array<{ event_id: number; error: string }> = [];

  for (let i = 0; i < events.length; i++) {
    const event = events[i];

    // 1. Verify individual event hash
    const hashValid = await verifyEvent(event);
    if (!hashValid) {
      const expected = await computeEventHash(event);
      errors.push({
        event_id: event.event_id,
        error: `Hash mismatch: stored=${event.hash_self.substring(0, 16)}... computed=${expected.substring(0, 16)}...`,
      });
    }

    // 2. Verify chain link (if not first event)
    if (i > 0) {
      const prevHash = events[i - 1].hash_self;
      if (event.hash_prev !== prevHash) {
        errors.push({
          event_id: event.event_id,
          error: `Broken chain link: expected hash_prev=${prevHash.substring(0, 16)}... got=${event.hash_prev?.substring(0, 16) ?? 'null'}`,
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    verified: events.length,
    errors,
  };
}

/**
 * Create a new chain event, computing its hash.
 * Links to the previous event if provided.
 */
export async function createChainEvent(
  eventId: number,
  kind: string,
  payload: Record<string, unknown>,
  previousHash: string | null = null,
  actor?: string,
): Promise<ChainEvent> {
  const event: ChainEvent = {
    event_id: eventId,
    ts: new Date().toISOString(),
    kind,
    payload,
    hash_prev: previousHash,
    hash_self: '', // computed below
  };
  if (actor) event.actor = actor;

  event.hash_self = await computeEventHash(event);
  return event;
}

/**
 * Build a complete hash chain from a list of evidence bundle events.
 * Useful for creating a verifiable audit trail from proofAI pipeline steps.
 */
export async function buildEvidenceChain(steps: Array<{
  kind: string;
  payload: Record<string, unknown>;
  actor?: string;
}>): Promise<ChainEvent[]> {
  const chain: ChainEvent[] = [];

  for (let i = 0; i < steps.length; i++) {
    const prevHash = i > 0 ? chain[i - 1].hash_self : null;
    const event = await createChainEvent(
      i,
      steps[i].kind,
      steps[i].payload,
      prevHash,
      steps[i].actor,
    );
    chain.push(event);
  }

  return chain;
}
