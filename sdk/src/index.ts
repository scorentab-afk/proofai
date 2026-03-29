export type {
  ProofAIConfig,
  Provider,
  CompressionLevel,
  Network,
  CompressOptions,
  CompressResult,
  ExecuteOptions,
  ExecuteResult,
  AnalyzeResult,
  SignResult,
  BundleResult,
  BundleOptions,
  AnchorResult,
  VerifyResult,
  HumanReviewResult,
  MonitoringStats,
  CertifyOptions,
  Certificate,
} from './types';

import type {
  ProofAIConfig,
  CompressOptions,
  CompressResult,
  ExecuteOptions,
  ExecuteResult,
  AnalyzeResult,
  SignResult,
  BundleResult,
  BundleOptions,
  AnchorResult,
  VerifyResult,
  HumanReviewResult,
  MonitoringStats,
  CertifyOptions,
  Certificate,
} from './types';

const DEFAULT_BASE_URL = 'https://apzgbajvwzykygrxxrwm.supabase.co/functions/v1';

export class ProofAI {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: ProofAIConfig) {
    if (!config.apiKey) throw new Error('ProofAI: apiKey is required');
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl?.replace(/\/$/, '') || DEFAULT_BASE_URL;
  }

  private async call<T>(path: string, body: unknown): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    // pk_live_ keys use x-api-key header, others use Authorization Bearer
    if (this.apiKey.startsWith('pk_live_')) {
      headers['x-api-key'] = this.apiKey;
    } else {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    const res = await fetch(`${this.baseUrl}/${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`ProofAI API error ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  // --- Individual steps ---

  async compress(prompt: string, options: CompressOptions = {}): Promise<CompressResult> {
    return this.call('compress', { prompt, options });
  }

  async execute(promptRef: string, options: ExecuteOptions): Promise<ExecuteResult> {
    const modelDefaults: Record<string, string> = {
      anthropic: 'claude-sonnet-4-20250514',
      openai: 'gpt-4-turbo',
      gemini: 'gemini-2.0-flash',
      google: 'gemini-2.0-flash',
    };
    return this.call('execute', {
      promptRef,
      options: {
        provider: options.provider,
        modelId: options.modelId || modelDefaults[options.provider] || 'gpt-4-turbo',
        temperature: options.temperature ?? 0.7,
        maxTokens: options.maxTokens ?? 1024,
      },
    });
  }

  async analyze(executionId: string, analysisText: string): Promise<AnalyzeResult> {
    return this.call('analyze', { executionId, analysisText });
  }

  async sign(execution: ExecuteResult): Promise<SignResult> {
    const now = new Date().toISOString();
    return this.call('sign', {
      executionId: execution.id,
      rawOutput: execution.output,
      modelProvider: execution.metadata.provider,
      modelId: execution.metadata.model,
      modelVersion: 'latest',
      modelParameters: { temperature: 0.7 },
      executionMetrics: { latency_ms: execution.metadata.latency, tokens: execution.metadata.tokens.total },
      requesterInfo: { source: 'proofai-sdk' },
      timestamps: { request_received: now, execution_completed: now },
    });
  }

  async bundle(
    promptId: string,
    executionId: string,
    analysisId: string,
    signatureId: string,
    cognitiveHash: string,
    options?: BundleOptions,
  ): Promise<BundleResult> {
    return this.call('bundle', {
      promptId, executionId, analysisId, signatureId, cognitiveHash,
      subjectId: options?.subjectId,
      sessionId: options?.sessionId,
      ragSources: options?.ragSources,
    });
  }

  async anchor(bundleId: string, network: 'polygon' | 'ethereum' = 'polygon'): Promise<AnchorResult> {
    return this.call('anchor', { bundleId, network });
  }

  async verify(bundleId: string): Promise<VerifyResult> {
    return this.call('verify', { bundleId });
  }

  // --- AI Act compliance endpoints ---

  async review(
    bundleId: string,
    reviewerId: string,
    role: 'compliance_officer' | 'data_protection_officer' | 'manager',
    decision: 'approved' | 'rejected' | 'flagged',
    notes?: string,
  ): Promise<HumanReviewResult> {
    return this.call('review', { bundleId, reviewerId, role, decision, notes });
  }

  async monitor(): Promise<MonitoringStats> {
    return this.call('monitor', {});
  }

  // --- Full pipeline in one call ---

  async certify(
    prompt: string,
    options: CertifyOptions = {},
  ): Promise<Certificate> {
    const provider = options.provider || 'anthropic';

    // 1. Compress
    const compressed = await this.compress(prompt, {
      compressionLevel: options.compressionLevel || 'medium',
    });

    // 2. Execute
    const execution = await this.execute(compressed.id, {
      provider,
      modelId: options.modelId,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    });

    // 3. Analyze
    const analysis = await this.analyze(execution.id, execution.output);

    // 4. Sign
    const signature = await this.sign(execution);

    // 5. Bundle
    const evidenceBundle = await this.bundle(
      compressed.id,
      execution.id,
      analysis.id,
      signature.signatureId,
      analysis.cognitiveHash,
    );

    // 6. Anchor (optional)
    let anchorResult: AnchorResult | undefined;
    if (!options.skipAnchor) {
      try {
        anchorResult = await this.anchor(evidenceBundle.id, options.network || 'polygon');
      } catch {
        // Anchor is best-effort — don't fail the whole pipeline
      }
    }

    // 7. Verify
    const verification = await this.verify(evidenceBundle.id);

    return {
      bundleId: evidenceBundle.id,
      bundleHash: evidenceBundle.bundleHash,
      verified: verification.verified,
      explorerUrl: anchorResult?.explorerUrl,
      transactionHash: anchorResult?.transactionHash,
      steps: {
        compress: compressed,
        execute: execution,
        analyze: analysis,
        sign: signature,
        bundle: evidenceBundle,
        anchor: anchorResult,
        verify: verification,
      },
    };
  }
}

export default ProofAI;
