// =============================================================================
// OpenRouter AI Provider (Free & Diverse Multi-Model Gateway)
// Resilient emergency & free-tier fallback with OpenAI-compatible interface
// =============================================================================

import OpenAI from 'openai';
import { IAIProvider, ProviderErrorClassification, ProviderExecutionResult } from './baseProvider';
import { AIProviderName, AIRequest } from '../types';

export class OpenRouterProvider implements IAIProvider {
  public readonly name: AIProviderName = 'openrouter';
  public readonly displayName = 'OpenRouter';

  private client: OpenAI | null = null;

  public isConfigured(): boolean {
    const key = process.env.OPENROUTER_API_KEY;
    return typeof key === 'string' && key.trim().length > 0;
  }

  private getClient(): OpenAI {
    if (!this.client) {
      const key = process.env.OPENROUTER_API_KEY;
      if (!key) {
        throw new Error('OPENROUTER_API_KEY environment variable is not configured.');
      }
      this.client = new OpenAI({
        apiKey: key.trim(),
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'HTTP-Referer': 'https://uioutbox.app',
          'X-Title': 'UIOutbox AI Router',
        },
      });
    }
    return this.client;
  }

  public getConfiguredModel(): string {
    return (process.env.OPENROUTER_MODEL || 'openrouter/free').trim();
  }

  public classifyError(error: any): ProviderErrorClassification {
    const errMsg = String(error?.message || error || '');
    const status = error?.status || error?.statusCode || (error?.error && error.error.status);

    // 1. 429 Rate Limit / Free Tier Exhaustion / Quota
    if (
      status === 429 ||
      errMsg.includes('429') ||
      errMsg.includes('rate limit') ||
      errMsg.includes('quota') ||
      errMsg.includes('credits') ||
      errMsg.includes('free tier') ||
      errMsg.includes('insufficient credits')
    ) {
      let retrySec = 120; // 2 min cooldown for OpenRouter free tier limit
      const retryMatch = errMsg.match(/retry after (\d+)/i) || errMsg.match(/(\d+)s/);
      if (retryMatch && retryMatch[1]) {
        const parsed = parseInt(retryMatch[1], 10);
        if (!isNaN(parsed) && parsed > 0 && parsed <= 3600) {
          retrySec = parsed;
        }
      }

      return {
        category: 'RATE_LIMITED',
        isRetryable: false,
        statusCode: 429,
        message: errMsg,
        retryAfterSeconds: retrySec,
      };
    }

    // 2. 401 / 403 Authentication Error
    if (
      status === 401 ||
      status === 403 ||
      errMsg.includes('invalid_api_key') ||
      errMsg.includes('Unauthorized') ||
      errMsg.includes('User key not found') ||
      errMsg.includes('AuthenticationError')
    ) {
      return {
        category: 'AUTH_FAILED',
        isRetryable: false,
        statusCode: status || 401,
        message: errMsg,
      };
    }

    // 3. 404 Model Not Found
    if (status === 404 || errMsg.includes('model_not_found') || errMsg.includes('does not exist')) {
      return {
        category: 'MODEL_NOT_FOUND',
        isRetryable: false,
        statusCode: 404,
        message: errMsg,
      };
    }

    // 4. 400 Bad Request
    if (status === 400 || errMsg.includes('invalid_request_error') || errMsg.includes('bad_request')) {
      return {
        category: 'INVALID_REQUEST',
        isRetryable: false,
        statusCode: 400,
        message: errMsg,
      };
    }

    // 5. Network / Timeout / Connection Reset
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

    // 6. 500 / 502 / 503 / 504 Server Error
    if (
      status >= 500 ||
      errMsg.includes('server_error') ||
      errMsg.includes('service_unavailable') ||
      errMsg.includes('503') ||
      errMsg.includes('502')
    ) {
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
    const client = this.getClient();
    const model = request.preferredModel || this.getConfiguredModel();

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    let systemPrompt = request.systemPrompt || '';
    if (request.expectedOutput !== 'text' && !systemPrompt.includes('JSON')) {
      systemPrompt = `${systemPrompt}\nIMPORTANT: Respond ONLY with valid, RFC 8259 compliant JSON. No markdown ticks, no commentary.`.trim();
    }

    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
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

    // Attempt JSON mode if structured data requested (some open models respect response_format)
    if (isJsonExpected) {
      try {
        params.response_format = { type: 'json_object' };
      } catch {
        // Fallback to system prompt enforcement
      }
    }

    const completion = await client.chat.completions.create(params);
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
