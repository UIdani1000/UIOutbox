// =============================================================================
// Gemini AI Provider (Google GenAI)
// Enhanced with dynamic model discovery, session blacklisting, and instant 429 failover
// =============================================================================

import { GoogleGenAI } from '@google/genai';
import { IAIProvider, ProviderErrorClassification, ProviderExecutionResult } from './baseProvider';
import { AIProviderName, AIRequest } from '../types';
import { GeminiModelRegistry } from '../../geminiModelRegistry';

export class GeminiProvider implements IAIProvider {
  public readonly name: AIProviderName = 'gemini';
  public readonly displayName = 'Google Gemini';

  private client: GoogleGenAI | null = null;

  public isConfigured(): boolean {
    const key = process.env.GEMINI_API_KEY;
    return typeof key === 'string' && key.trim().length > 0;
  }

  private getClient(): GoogleGenAI {
    if (!this.client) {
      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        throw new Error('GEMINI_API_KEY environment variable is not configured.');
      }
      this.client = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'uioutbox-ai-router',
          },
        },
      });
    }
    return this.client;
  }

  public async getConfiguredModel(): Promise<string> {
    if (process.env.GEMINI_MODEL) {
      return process.env.GEMINI_MODEL.trim();
    }
    try {
      if (this.isConfigured()) {
        const config = await GeminiModelRegistry.getModelConfig(this.getClient());
        return config.primaryModel;
      }
    } catch {
      // ignore
    }
    return 'gemini-3.6-flash';
  }

  public classifyError(error: any): ProviderErrorClassification {
    const errMsg = String(error?.message || error || '');
    const status = error?.status || error?.code || (error?.error && error.error.code);

    // 429 Resource / Quota Exhausted
    if (
      status === 429 ||
      errMsg.includes('429') ||
      errMsg.includes('RESOURCE_EXHAUSTED') ||
      errMsg.includes('quota exceeded') ||
      errMsg.includes('generate_content_free_tier_requests') ||
      errMsg.includes('exceeded your current quota') ||
      errMsg.includes('insufficient_quota')
    ) {
      // Look for retry-after in headers or message
      let retrySec = 60;
      const retryMatch = errMsg.match(/retry after (\d+)/i) || errMsg.match(/(\d+)s/);
      if (retryMatch && retryMatch[1]) {
        const parsed = parseInt(retryMatch[1], 10);
        if (!isNaN(parsed) && parsed > 0 && parsed <= 3600) {
          retrySec = parsed;
        }
      }
      return {
        category: 'QUOTA_EXHAUSTED',
        isRetryable: false, // Immediately fail over to next provider rather than re-hitting quota
        statusCode: 429,
        message: errMsg,
        retryAfterSeconds: retrySec,
      };
    }

    // 404 Model Not Found
    if (
      status === 404 ||
      errMsg.includes('404') ||
      errMsg.includes('not found') ||
      errMsg.includes('is not supported for generateContent')
    ) {
      return {
        category: 'MODEL_NOT_FOUND',
        isRetryable: false,
        statusCode: 404,
        message: errMsg,
      };
    }

    // 401 / 403 Authentication & Permissions
    if (
      status === 401 ||
      status === 403 ||
      errMsg.includes('API_KEY_INVALID') ||
      errMsg.includes('PERMISSION_DENIED') ||
      errMsg.includes('unauthenticated') ||
      errMsg.includes('Forbidden')
    ) {
      return {
        category: 'AUTH_FAILED',
        isRetryable: false,
        statusCode: status || 401,
        message: errMsg,
      };
    }

    // 400 Bad Request
    if (status === 400 || errMsg.includes('INVALID_ARGUMENT')) {
      return {
        category: 'INVALID_REQUEST',
        isRetryable: false,
        statusCode: 400,
        message: errMsg,
      };
    }

    // Network / Timeout Errors
    if (
      errMsg.includes('fetch failed') ||
      errMsg.includes('ECONNRESET') ||
      errMsg.includes('ETIMEDOUT') ||
      errMsg.includes('socket hang up') ||
      errMsg.includes('timeout') ||
      status === 408
    ) {
      return {
        category: 'NETWORK_ERROR',
        isRetryable: true,
        statusCode: status || 500,
        message: errMsg,
      };
    }

    // 5xx / Unavailable / High Demand / Overloaded
    if (
      status === 503 ||
      status === 500 ||
      status === 502 ||
      status === 504 ||
      (typeof status === 'number' && status >= 500) ||
      errMsg.includes('503') ||
      errMsg.includes('UNAVAILABLE') ||
      errMsg.includes('high demand') ||
      errMsg.includes('overloaded') ||
      errMsg.includes('temporarily unavailable')
    ) {
      return {
        category: 'SERVER_ERROR',
        isRetryable: true,
        statusCode: status || 503,
        message: errMsg,
      };
    }

    return {
      category: 'UNKNOWN',
      isRetryable: false,
      statusCode: status || 500,
      message: errMsg,
    };
  }

  public async execute(request: AIRequest): Promise<ProviderExecutionResult> {
    const ai = this.getClient();
    
    // Determine candidate model chain with automatic robust fallbacks
    const config = await GeminiModelRegistry.getModelConfig(ai);
    const primary = request.preferredModel || process.env.GEMINI_MODEL?.trim() || config.primaryModel;
    const allCandidates = [primary, ...config.fallbackModels, 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
    const candidateModels = Array.from(new Set(allCandidates));

    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: request.userPrompt,
          config: {
            responseMimeType: request.expectedOutput === 'text' ? 'text/plain' : 'application/json',
            systemInstruction: request.systemPrompt,
            temperature: request.temperature,
            maxOutputTokens: request.maxTokens,
          },
        });

        const text = response.text;
        if (text && text.trim().length > 0) {
          const usage = (response as any).usageMetadata
            ? {
                promptTokens: (response as any).usageMetadata.promptTokenCount,
                completionTokens: (response as any).usageMetadata.candidatesTokenCount,
                totalTokens: (response as any).usageMetadata.totalTokenCount,
              }
            : undefined;

          return {
            text: text.trim(),
            model,
            usage,
          };
        }
      } catch (err: any) {
        lastError = err;
        const classification = this.classifyError(err);

        // Cycle to next Gemini model if 404 MODEL_NOT_FOUND or model-specific QUOTA_EXHAUSTED
        if (classification.category === 'MODEL_NOT_FOUND' || classification.category === 'QUOTA_EXHAUSTED') {
          console.warn(`[GeminiProvider] Model ${model} returned ${classification.category}, falling back to next available Gemini model...`);
          GeminiModelRegistry.markModelUnavailable(model);
          continue;
        }

        // For all other errors (503 SERVER_ERROR, 429 QUOTA_EXHAUSTED, AUTH_FAILED, etc.),
        // throw immediately to AIRouter so the centralized router manages single-retry and failover.
        throw err;
      }
    }

    throw lastError || new Error('All candidate Gemini models failed.');
  }
}
