// =============================================================================
// OpenAI AI Provider (Official OpenAI SDK)
// Seamless fallback with structured JSON and cost-efficient default models
// =============================================================================

import OpenAI from 'openai';
import { IAIProvider, ProviderErrorClassification, ProviderExecutionResult } from './baseProvider';
import { AIProviderName, AIRequest } from '../types';

export class OpenAIProvider implements IAIProvider {
  public readonly name: AIProviderName = 'openai';
  public readonly displayName = 'OpenAI';

  private client: OpenAI | null = null;

  public isConfigured(): boolean {
    const key = process.env.OPENAI_API_KEY;
    return typeof key === 'string' && key.trim().length > 0;
  }

  private getClient(): OpenAI {
    if (!this.client) {
      const key = process.env.OPENAI_API_KEY;
      if (!key) {
        throw new Error('OPENAI_API_KEY environment variable is not configured.');
      }
      this.client = new OpenAI({
        apiKey: key,
      });
    }
    return this.client;
  }

  public getConfiguredModel(): string {
    return (process.env.OPENAI_MODEL || 'gpt-4o-mini').trim();
  }

  public classifyError(error: any): ProviderErrorClassification {
    const errMsg = String(error?.message || error || '');
    const status = error?.status || error?.statusCode || (error?.error && error.error.status);

    // 429 / Billing / Quota Exceeded
    if (
      status === 429 ||
      errMsg.includes('429') ||
      errMsg.includes('insufficient_quota') ||
      errMsg.includes('exceeded your current quota') ||
      errMsg.includes('quota') ||
      errMsg.includes('billing')
    ) {
      let retrySec = 300; // 5 minute default cooldown for quota exhaustion
      const retryMatch = errMsg.match(/retry after (\d+)/i) || errMsg.match(/(\d+)s/);
      if (retryMatch && retryMatch[1]) {
        const parsed = parseInt(retryMatch[1], 10);
        if (!isNaN(parsed) && parsed > 0 && parsed <= 3600) {
          retrySec = parsed;
        }
      }

      // Check if it's transient RPM/TPM limit vs actual quota exhaustion
      const isTransientRateLimit =
        (errMsg.includes('rate_limit_exceeded') || errMsg.includes('Requests per min') || errMsg.includes('Tokens per min')) &&
        !errMsg.includes('quota') &&
        !errMsg.includes('billing');

      return {
        category: isTransientRateLimit ? 'RATE_LIMITED' : 'QUOTA_EXHAUSTED',
        isRetryable: false, // Immediately failover
        statusCode: 429,
        message: errMsg,
        retryAfterSeconds: isTransientRateLimit ? (retrySec < 60 ? retrySec : 30) : retrySec,
      };
    }

    // 404 Model Not Found
    if (status === 404 || errMsg.includes('model_not_found') || errMsg.includes('does not exist')) {
      return {
        category: 'MODEL_NOT_FOUND',
        isRetryable: false,
        statusCode: 404,
        message: errMsg,
      };
    }

    // 401 / 403 Authentication
    if (
      status === 401 ||
      status === 403 ||
      errMsg.includes('invalid_api_key') ||
      errMsg.includes('Incorrect API key') ||
      errMsg.includes('AuthenticationError')
    ) {
      return {
        category: 'AUTH_FAILED',
        isRetryable: false,
        statusCode: status || 401,
        message: errMsg,
      };
    }

    // 400 Bad Request
    if (status === 400 || errMsg.includes('invalid_request_error')) {
      return {
        category: 'INVALID_REQUEST',
        isRetryable: false,
        statusCode: 400,
        message: errMsg,
      };
    }

    // Network / Timeout
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

    // 5xx Server Error
    if (status >= 500 || errMsg.includes('server_error') || errMsg.includes('service_unavailable')) {
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
    const openai = this.getClient();
    const model = request.preferredModel || this.getConfiguredModel();

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (request.systemPrompt) {
      messages.push({
        role: 'system',
        content: request.systemPrompt,
      });
    }

    messages.push({
      role: 'user',
      content: request.userPrompt,
    });

    const isJsonExpected = request.expectedOutput !== 'text';

    const params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
      model,
      messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 2500,
    };

    if (isJsonExpected) {
      params.response_format = { type: 'json_object' };
    }

    const completion = await openai.chat.completions.create(params);
    const choice = completion.choices[0];
    const text = choice?.message?.content || '';

    const usage = completion.usage
      ? {
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
          totalTokens: completion.usage.total_tokens,
        }
      : undefined;

    return {
      text: text.trim(),
      model: completion.model || model,
      usage,
    };
  }
}
