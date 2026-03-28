import type { GeminiThoughtSignature } from '@/api/client';

/**
 * Extract thought signatures from Gemini API responses.
 * 
 * Handles:
 * - Sequential function calls (FC1 + sig_A, FC2 + sig_B)
 * - Parallel function calls (FC1 + sig_A, FC2 no sig)
 * - Text responses with reasoning signatures
 */

interface GeminiPart {
  text?: string;
  functionCall?: {
    name: string;
    args?: Record<string, unknown>;
  };
  thoughtSignature?: string;
}

interface GeminiContent {
  parts?: GeminiPart[];
}

interface GeminiMessage {
  role: 'user' | 'model';
  content?: GeminiContent;
}

export class ThoughtSignatureExtractor {
  /**
   * Extract thought signatures from a Gemini API response.
   * 
   * @param responseContent - The 'content' field from Gemini response
   * @param stepIndex - Current step in multi-turn conversation
   * @returns List of extracted thought signatures
   */
  static extractFromResponse(
    responseContent: GeminiContent,
    stepIndex: number = 0
  ): GeminiThoughtSignature[] {
    const signatures: GeminiThoughtSignature[] = [];
    const parts = responseContent.parts || [];

    for (const part of parts) {
      // Check for thought signature in function calls
      if (part.functionCall && part.thoughtSignature) {
        signatures.push({
          signature: part.thoughtSignature,
          step_index: stepIndex,
          step_type: 'function_call',
          associated_function: part.functionCall.name,
        });
      }
      // Check for thought signature in text/reasoning
      else if (part.text && part.thoughtSignature) {
        signatures.push({
          signature: part.thoughtSignature,
          step_index: stepIndex,
          step_type: 'reasoning',
        });
      }
      // Text without signature
      else if (part.text) {
        signatures.push({
          signature: '', // Will be populated by backend
          step_index: stepIndex,
          step_type: 'text',
        });
      }
    }

    return signatures;
  }

  /**
   * Extract ALL thought signatures from a multi-turn conversation.
   * 
   * This is critical for Gemini 3 Pro where signatures must be 
   * preserved across turns.
   */
  static extractFromConversationHistory(
    conversation: GeminiMessage[]
  ): GeminiThoughtSignature[] {
    const allSignatures: GeminiThoughtSignature[] = [];
    let stepIdx = 0;

    for (const message of conversation) {
      if (message.role === 'model' && message.content) {
        const sigs = ThoughtSignatureExtractor.extractFromResponse(
          message.content,
          stepIdx
        );
        allSignatures.push(...sigs);
        stepIdx += 1;
      }
    }

    return allSignatures;
  }

  /**
   * Validate that thought signatures form a valid chain.
   * 
   * For Gemini 3 Pro:
   * - First FC in each step must have signature
   * - Parallel FCs only have signature on first
   */
  static validateSignatureChain(
    signatures: GeminiThoughtSignature[]
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!signatures.length) {
      return { valid: true, errors: [] };
    }

    // Check sequential ordering
    for (let i = 0; i < signatures.length - 1; i++) {
      if (signatures[i].step_index > signatures[i + 1].step_index) {
        errors.push(
          `Signature at position ${i} has step_index ${signatures[i].step_index} ` +
          `which is greater than position ${i + 1} with step_index ${signatures[i + 1].step_index}`
        );
      }
    }

    // Check that function calls in same step follow the parallel FC rule
    const stepGroups = new Map<number, GeminiThoughtSignature[]>();
    for (const sig of signatures) {
      const group = stepGroups.get(sig.step_index) || [];
      group.push(sig);
      stepGroups.set(sig.step_index, group);
    }

    for (const [stepIndex, group] of stepGroups) {
      const functionCalls = group.filter(s => s.step_type === 'function_call');
      if (functionCalls.length > 1) {
        // In parallel FCs, only first should have signature
        const firstHasSig = !!functionCalls[0]?.signature;
        if (!firstHasSig) {
          errors.push(
            `Step ${stepIndex}: First function call in parallel sequence should have signature`
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate a summary of the cognitive trace
   */
  static summarize(signatures: GeminiThoughtSignature[]): {
    totalSteps: number;
    reasoningSteps: number;
    functionCalls: number;
    textOutputs: number;
    uniqueFunctions: string[];
  } {
    const functionCalls = signatures.filter(s => s.step_type === 'function_call');
    const uniqueFunctions = [...new Set(
      functionCalls
        .map(s => s.associated_function)
        .filter((f): f is string => !!f)
    )];

    return {
      totalSteps: signatures.length,
      reasoningSteps: signatures.filter(s => s.step_type === 'reasoning').length,
      functionCalls: functionCalls.length,
      textOutputs: signatures.filter(s => s.step_type === 'text').length,
      uniqueFunctions,
    };
  }

  /**
   * Create a hash of the signature chain for verification
   */
  static async hashChain(signatures: GeminiThoughtSignature[]): Promise<string> {
    const chainData = signatures
      .map(s => `${s.step_index}:${s.step_type}:${s.signature}`)
      .join('|');
    
    const encoder = new TextEncoder();
    const data = encoder.encode(chainData);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

export default ThoughtSignatureExtractor;
