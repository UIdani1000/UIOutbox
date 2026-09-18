// =============================================================================
// Anthropic Claude AI Provider (Official Anthropic Messages SDK)
// Secondary fallback with high-intelligence synthesis & structured JSON output
// =============================================================================

import Anthropic from '@anthropic-ai/sdk';
import { IAIProvider, ProviderErrorClassification, ProviderExecutionResult } from './baseProvider';
import { AIProviderName, AIRequest } from '../types';

export class AnthropicProvider implements IAIProvider {
  public readonly name: AIProviderName = 'anthropic';
  public readonly displayName = 'Anthropic Claude';

  private client: Anthropic | null = null;

  public isConfigured(): boolean {
    const key = process.env.ANTHROPIC_API_KEY;
    return typeof key === 'string' && key.trim().length > 0;
  }

  private getClient(): Anthropic {
    if (!this.client) {
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) {
        throw new Error('ANTHROPIC_API_KEY environment variable is not configured.');
      }
      this.client = new Anthropic({
        apiKey: key,
      });
    }
    return this.client;
  }

  public getConfiguredModel(): string {
    return (process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-20241022').trim();
  }

  public classifyError(error: any): ProviderErrorClassification {
    const errMsg = String(error?.message || error || '');
    const status = error?.status || (error?.error && error.error.status);

    // 1. Credit Balance / Billing Exhaustion (Anthropic returns 400 invalid_request_error for low credits)
    if (
      errMsg.includes('credit balance is too low') ||
      errMsg.includes('credit balance') ||
      errMsg.includes('purchase credits') ||
      errMsg.includes('Plans & Billing') ||
      errMsg.includes('insufficient funds') ||
      errMsg.includes('billing')
    ) {
      return {
        category: 'QUOTA_EXHAUSTED',
        isRetryable: false, // Immediately failover, do not retry
        statusCode: status || 400,
        message: errMsg,
        retryAfterSeconds: 300,
      };
    }

    // 2. 429 Rate Limit / Overloaded / 529
    if (status === 429 || status === 529 || errMsg.includes('429') || errMsg.includes('rate_limit') || errMsg.includes('overloaded')) {
      let retrySec = 60;
      const retryMatch = errMsg.match(/retry after (\d+)/i) || errMsg.match(/(\d+)s/);
      if (retryMatch && retryMatch[1]) {
        const parsed = parseInt(retryMatch[1], 10);
        if (!isNaN(parsed) && parsed > 0 && parsed <= 3600) {
          retrySec = parsed;
        }
      }
      return {
        category: status === 529 || errMsg.includes('overloaded') ? 'SERVER_ERROR' : 'QUOTA_EXHAUSTED',
        isRetryable: status === 529 || errMsg.includes('overloaded'),
        statusCode: status || 429,
        message: errMsg,
        retryAfterSeconds: retrySec,
      };
    }

    // 3. 404 Model Not Found
    if (status === 404 || errMsg.includes('not_found') || errMsg.includes('model_not_found')) {
      return {
        category: 'MODEL_NOT_FOUND',
        isRetryable: false,
        statusCode: 404,
        message: errMsg,
      };
    }

    // 4. 401 / 403 Authentication
    if (status === 401 || status === 403 || errMsg.includes('authentication_error') || errMsg.includes('permission_error')) {
      return {
        category: 'AUTH_FAILED',
        isRetryable: false,
        statusCode: status || 401,
        message: errMsg,
      };
    }

    // 5. 400 Bad Request (other than credit exhaustion)
    if (status === 400 || errMsg.includes('invalid_request_error')) {
      return {
        category: 'INVALID_REQUEST',
        isRetryable: false,
        statusCode: 400,
        message: errMsg,
      };
    }

    // 6. Network / Timeout
    if (
      status === 408 ||
      errMsg.includes('fetch failed') ||
      errMsg.includes('ECONNRESET') ||
      errMsg.includes('ETIMEDOUT') ||
      errMsg.includes('socket hang up') ||
      errMsg.includes('timeout')
    ) {
      return {
        category: 'NETWORK_ERROR',
        isRetryable: true,
        statusCode: status || 500,
        message: errMsg,
      };
    }

    // 7. 5xx Server Error
    if (status >= 500 || errMsg.includes('api_error')) {
      return {
        category: 'SERVER_ERROR',
        isRetryable: true,
        statusCode: status || 500,
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
    const anthropic = this.getClient();
    const model = request.preferredModel || this.getConfiguredModel();

    let systemPrompt = request.systemPrompt || '';
    if (request.expectedOutput !== 'text' && !systemPrompt.includes('JSON')) {
      systemPrompt = `${systemPrompt}\nIMPORTANT: Respond ONLY with valid, RFC 8259 compliant JSON. No markdown codeblocks, no explanations.`.trim();
    }

    const response = await anthropic.messages.create({
      model,
      max_tokens: request.maxTokens ?? 2500,
      temperature: request.temperature ?? 0.7,
      system: systemPrompt || undefined,
      messages: [
        {
          role: 'user',
          content: request.userPrompt,
        },
      ],
    });

    let text = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        text += block.text;
      }
    }

    const usage = response.usage
      ? {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        }
      : undefined;

    return {
      text: text.trim(),
      model: response.model || model,
      usage,
    };
  }
}
