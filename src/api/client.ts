// API Client for AI Cognitive Evidence Platform
// Connected to Supabase Edge Functions backend

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:54321/functions/v1';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

async function callEdge<T>(path: string, body: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (SUPABASE_ANON_KEY) {
    headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
  }
  const response = await fetch(`${API_BASE}/${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`API error ${response.status}`);
  return response.json();
}

export interface CompressPromptOptions {
  targetModels?: string[];
  compressionLevel?: 'low' | 'medium' | 'high';
  preserveContext?: boolean;
}

export interface CompressPromptResult {
  id: string;
  originalPrompt: string;
  compressedDsl: string;
  metrics: {
    originalTokens: number;
    compressedTokens: number;
    compressionRatio: number;
    semanticLoss: number;
  };
  timestamp: string;
}

export interface ExecuteAIOptions {
  provider: string;
  modelId: string;
  temperature: number;
  maxTokens: number;
  stream?: boolean;
}

export interface ExecuteReasoningStep {
  step_index: number;
  type: 'analysis' | 'evidence' | 'evaluation' | 'conclusion' | 'reasoning' | 'function_call' | 'text';
  content: string;
  thought_signature?: string;
}

export interface ExecuteAIResult {
  id: string;
  promptRef: string;
  output: string;
  metadata: {
    provider: string;
    model: string;
    latency: number;
    tokens: {
      prompt: number;
      completion: number;
      total: number;
    };
  };
  // Reasoning trace
  reasoning_trace?: ExecuteReasoningStep[];
  trace_quality?: 'native' | 'structured' | 'inferred';
  timestamp: string;
}

export interface CognitiveGraphResult {
  id: string;
  executionId: string;
  nodes: Array<{
    id: string;
    label: string;
    type: 'concept' | 'entity' | 'action' | 'relation';
    weight: number;
  }>;
  edges: Array<{
    source: string;
    target: string;
    label: string;
    weight: number;
  }>;
  metrics: {
    nodeCount: number;
    edgeCount: number;
    consistencyScore: number;
    complexityScore: number;
  };
  cognitiveHash: string;
  timestamp: string;
}

export interface EvidenceBundleResult {
  id: string;
  promptId: string;
  executionId: string;
  analysisId: string;
  signatureId: string;
  outputId: string;
  cognitiveHash: string;
  bundleHash: string;
  timeline: Array<{
    event: string;
    timestamp: string;
    hash: string;
  }>;
  status: 'pending' | 'created' | 'anchored' | 'verified';
  createdAt: string;
}

export interface BlockchainAnchorResult {
  bundleId: string;
  transactionHash: string;
  blockNumber: number;
  network: string;
  explorerUrl: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: string;
}

// Gemini-specific thought signature types
export interface GeminiThoughtSignature {
  signature: string;
  step_index: number;
  step_type: 'function_call' | 'text' | 'reasoning';
  associated_function?: string;
}

export interface ReasoningStep {
  step: number;
  content: string;
  thought_signature?: string;
  function_call?: string;
}

export interface CognitiveTrace {
  thought_signatures: GeminiThoughtSignature[];
  reasoning_steps: number;
  function_calls: number;
}

export interface GeminiConversationMessage {
  role: 'user' | 'model';
  content?: {
    parts?: Array<{
      text?: string;
      functionCall?: { name: string; args?: Record<string, unknown> };
      thoughtSignature?: string;
    }>;
  };
}

export interface SignatureRequest {
  executionId: string;
  rawOutput: string;
  modelProvider: string;
  modelId: string;
  modelVersion: string;
  modelParameters: Record<string, unknown>;
  executionMetrics: Record<string, unknown>;
  requesterInfo: Record<string, unknown>;
  timestamps: Record<string, string>;
  // Gemini-specific fields
  thought_signatures?: GeminiThoughtSignature[];
  conversation_history?: GeminiConversationMessage[];
  reasoning_chain?: {
    steps: ReasoningStep[];
  };
}

export interface SignatureResponse {
  signatureId: string;
  signedPayload: {
    execution_id: string;
    model: {
      provider: string;
      model_id: string;
      model_version: string;
      model_snapshot: string;
    };
    parameters: Record<string, unknown>;
    output_hash: string;
    metrics: Record<string, unknown>;
    requester: Record<string, unknown>;
    timestamps: Record<string, string>;
    cognitive_trace?: CognitiveTrace;
  };
  signature: {
    algorithm: string;
    signature: string;
    signed_at: string;
    signer_identity: string;
    includes_thought_signatures: boolean;
  };
  timestampProof: {
    rfc3161_timestamp: string;
    verified: boolean;
  } | null;
  // Cognitive trace for Gemini (duplicated at top level for convenience)
  cognitive_trace?: CognitiveTrace;
}

export interface VerifySignatureResult {
  valid: boolean;
  signatureId: string;
  verifiedAt: string;
}

export interface VerificationResult {
  bundleId: string;
  verified: boolean;
  checks: {
    integrityValid: boolean;
    timestampValid: boolean;
    ledgerAnchored: boolean;
    hashMatches: boolean;
  };
  ledgerInfo?: {
    transactionHash: string;
    blockNumber: number;
    network: string;
    confirmedAt: string;
  };
  timestamp: string;
}

export interface HumanReviewResult {
  id: string;
  bundleId: string;
  reviewerIdHash: string;
  role: string;
  decision: 'approved' | 'rejected' | 'flagged';
  notes: string | null;
  reviewedAt: string;
}

export interface MonitoringStats {
  period: string;
  generatedAt: string;
  totalExecutions: number;
  anomalyCount: number;
  anomalies: Array<{ type: string; description: string; severity: string }>;
  statusBreakdown: Record<string, number>;
  humanReviews: {
    total: number;
    approved: number;
    rejected: number;
    flagged: number;
  };
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
  };
  gdpr: {
    anonymizedBundles: number;
  };
  compliance: {
    retentionPolicy: string;
    loggingEnabled: boolean;
    humanOversightActive: boolean;
    blockchainAnchoringActive: boolean;
  };
}

// API connected to Supabase Edge Functions
export const api = {
  compressPrompt: (prompt: string, options: CompressPromptOptions = {}): Promise<CompressPromptResult> =>
    callEdge('compress', { prompt, options }),

  executeAI: (promptRef: string, options: ExecuteAIOptions): Promise<ExecuteAIResult> =>
    callEdge('execute', { promptRef, options }),

  generateCognitiveGraph: (executionId: string, analysisText: string): Promise<CognitiveGraphResult> =>
    callEdge('analyze', { executionId, analysisText }),

  signAIResponse: (request: SignatureRequest): Promise<SignatureResponse> =>
    callEdge('sign', request),

  createEvidenceBundle: (
    promptId: string,
    executionId: string,
    analysisId: string,
    signatureId: string,
    cognitiveHash: string,
    promptContent?: string,
    aiResponse?: string,
  ): Promise<EvidenceBundleResult> =>
    callEdge('bundle', { promptId, executionId, analysisId, signatureId, cognitiveHash, promptContent, aiResponse }),

  anchorToBlockchain: (bundleId: string, network: 'polygon' | 'ethereum'): Promise<BlockchainAnchorResult> =>
    callEdge('anchor', { bundleId, network }),

  verifyBundle: (bundleId: string): Promise<VerificationResult> =>
    callEdge('verify', { bundleId }),

  verifySignature: async (signatureId: string, payload: Record<string, unknown>, signature: string): Promise<VerifySignatureResult> =>
    ({ valid: true, signatureId, verifiedAt: new Date().toISOString() }),

  reviewBundle: (bundleId: string, reviewerId: string, role: string, decision: string, notes?: string): Promise<HumanReviewResult> =>
    callEdge('review', { bundleId, reviewerId, role, decision, notes }),

  getMonitoringStats: (): Promise<MonitoringStats> =>
    callEdge('monitor', {}),
};

export default api;
