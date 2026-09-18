// =============================================================================
// Centralized AI Provider Router for UIOutbox
// Intelligent Multi-Provider Failover: Gemini -> Groq -> OpenAI -> Anthropic -> OpenRouter
// =============================================================================

import {
  AITaskType,
  AIProviderName,
  AIRequest,
  AIResponse,
  ProviderHealth,
  AIRoutingPolicy,
  AIExecutionLog,
} from './types';
import { IAIProvider, ProviderExecutionResult } from './providers/baseProvider';
import { GeminiProvider } from './providers/geminiProvider';
import { GroqProvider } from './providers/groqProvider';
import { OpenAIProvider } from './providers/openaiProvider';
import { AnthropicProvider } from './providers/anthropicProvider';
import { OpenRouterProvider } from './providers/openrouterProvider';

export class AIRouter {
  private providers: Map<AIProviderName, IAIProvider> = new Map();
  private cooldowns: Map<AIProviderName, number> = new Map(); // timestamp (ms) until provider is cooled down
  private providerFailures: Map<AIProviderName, number> = new Map();
  private providerAuthFailed: Set<AIProviderName> = new Set();
  private lastSuccessTimestamps: Map<AIProviderName, string> = new Map();
  private executionLogs: AIExecutionLog[] = [];
  private readonly MAX_LOGS = 100;

  // Default priority chain: 1. Gemini -> 2. Groq -> 3. OpenAI -> 4. Anthropic -> 5. OpenRouter
  private readonly DEFAULT_PROVIDER_PRIORITY: AIProviderName[] = [
    'gemini',
    'groq',
    'openai',
    'anthropic',
    'openrouter',
  ];

  // Task-aware default routing policies
  private routingPolicies: Map<AITaskType, AIRoutingPolicy> = new Map([
    [
      'prospect_discovery',
      {
        primary: 'gemini',
        fallback1: 'groq',
        fallback2: 'openrouter',
        chain: ['gemini', 'groq', 'openrouter', 'openai', 'anthropic'],
      },
    ],
    [
      'company_research',
      {
        primary: 'gemini',
        fallback1: 'groq',
        fallback2: 'openrouter',
        chain: ['gemini', 'groq', 'openrouter', 'anthropic', 'openai'],
      },
    ],
    [
      'contact_enrichment',
      {
        primary: 'gemini',
        fallback1: 'groq',
        fallback2: 'openrouter',
        chain: ['gemini', 'groq', 'openrouter', 'openai', 'anthropic'],
      },
    ],
    [
      'icp_qualification',
      {
        primary: 'gemini',
        fallback1: 'groq',
        fallback2: 'openrouter',
        chain: ['gemini', 'groq', 'openrouter', 'openai', 'anthropic'],
      },
    ],
    [
      'email_generation',
      {
        primary: 'gemini',
        fallback1: 'groq',
        fallback2: 'openai',
        chain: ['gemini', 'groq', 'openai', 'openrouter', 'anthropic'],
      },
    ],
    [
      'reply_analysis',
      {
        primary: 'gemini',
        fallback1: 'groq',
        fallback2: 'openai',
        chain: ['gemini', 'groq', 'openai', 'openrouter', 'anthropic'],
      },
    ],
    [
      'reply_response_generation',
      {
        primary: 'gemini',
        fallback1: 'groq',
        fallback2: 'openai',
        chain: ['gemini', 'groq', 'openai', 'openrouter', 'anthropic'],
      },
    ],
    [
      'general',
      {
        primary: 'gemini',
        fallback1: 'groq',
        fallback2: 'openai',
        chain: ['gemini', 'groq', 'openai', 'anthropic', 'openrouter'],
      },
    ],
  ]);

  constructor() {
    this.providers.set('gemini', new GeminiProvider());
    this.providers.set('groq', new GroqProvider());
    this.providers.set('openai', new OpenAIProvider());
    this.providers.set('anthropic', new AnthropicProvider());
    this.providers.set('openrouter', new OpenRouterProvider());
  }

  /**
   * Returns current health and configuration status for all providers.
   */
  public async getHealthStatus(): Promise<ProviderHealth[]> {
    const now = Date.now();
    const result: ProviderHealth[] = [];

    // Return in deterministic priority order
    for (const name of this.DEFAULT_PROVIDER_PRIORITY) {
      const provider = this.providers.get(name);
      if (!provider) continue;

      const isConfigured = provider.isConfigured();
      let status: ProviderHealth['status'] = 'AVAILABLE';
      let cooldownSec: number | undefined;

      if (!isConfigured) {
        status = 'NOT_CONFIGURED';
      } else if (this.providerAuthFailed.has(name)) {
        status = 'UNAVAILABLE';
      } else {
        const cooldownUntil = this.cooldowns.get(name);
        if (cooldownUntil && cooldownUntil > now) {
          status = 'QUOTA_LIMITED';
          cooldownSec = Math.ceil((cooldownUntil - now) / 1000);
        }
      }

      const configuredModel = await provider.getConfiguredModel();

      result.push({
        name,
        displayName: provider.displayName,
        status,
        isConfigured,
        configuredModel,
        cooldownUntil: this.cooldowns.get(name),
        cooldownRemainingSeconds: cooldownSec,
        lastSuccessTimestamp: this.lastSuccessTimestamps.get(name),
        consecutiveFailures: this.providerFailures.get(name) || 0,
      });
    }

    return result;
  }

  /**
   * Returns current routing policies.
   */
  public getRoutingPolicies(): Record<AITaskType, AIRoutingPolicy> {
    const obj: any = {};
    for (const [task, policy] of this.routingPolicies.entries()) {
      obj[task] = policy;
    }
    return obj;
  }

  /**
   * Returns recent AI execution audit logs.
   */
  public getRecentLogs(): AIExecutionLog[] {
    return [...this.executionLogs].reverse();
  }

  /**
   * Determines the provider order to attempt for a given request.
   * Dynamically filters out providers currently in cooldown, auth-failed, or not configured.
   */
  private getProviderOrder(request: AIRequest): AIProviderName[] {
    const now = Date.now();
    const policy = this.routingPolicies.get(request.task);

    let baseOrder: AIProviderName[];
    if (request.preferredProvider) {
      const others = this.DEFAULT_PROVIDER_PRIORITY.filter(
        (p) => p !== request.preferredProvider
      );
      baseOrder = [request.preferredProvider, ...others];
    } else if (policy && policy.chain && policy.chain.length > 0) {
      baseOrder = policy.chain;
    } else if (policy) {
      const others = this.DEFAULT_PROVIDER_PRIORITY.filter(
        (p) => p !== policy.primary && p !== policy.fallback1 && p !== policy.fallback2
      );
      baseOrder = [policy.primary, policy.fallback1, policy.fallback2, ...others];
    } else {
      baseOrder = this.DEFAULT_PROVIDER_PRIORITY;
    }

    // Filter candidates:
    // Only include configured providers that are NOT in auth-failed and NOT in active cooldown
    const activeCandidates: AIProviderName[] = [];

    for (const name of baseOrder) {
      const provider = this.providers.get(name);
      if (!provider || !provider.isConfigured()) {
        continue;
      }
      if (this.providerAuthFailed.has(name)) {
        continue;
      }

      const cooldownUntil = this.cooldowns.get(name);
      if (cooldownUntil && cooldownUntil > now) {
        // Provider is currently in cooldown - dynamically skip
        continue;
      } else {
        // Cooldown has expired or was not set
        if (cooldownUntil) {
          this.cooldowns.delete(name);
        }
        activeCandidates.push(name);
      }
    }

    return activeCandidates;
  }

  /**
   * Main entry point: Executes an AI request across providers with intelligent failover.
   */
  public async execute(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const requestId = request.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const candidateProviders = this.getProviderOrder(request);

    if (candidateProviders.length === 0) {
      console.log(`[AI Router]\nAll providers unavailable\nUsing deterministic campaign fallback`);
      const errorMsg = 'All configured AI providers are currently unavailable or in cooldown.';
      this.logExecution({
        requestId,
        task: request.task,
        provider: 'gemini',
        model: 'none',
        success: false,
        fallbackUsed: true,
        attemptedProviders: [],
        errorCategory: 'ALL_PROVIDERS_UNAVAILABLE',
        errorMessage: errorMsg,
        latencyMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });
      throw new Error(errorMsg);
    }

    const attemptedProviders: AIProviderName[] = [];
    let lastError: any = null;

    for (let i = 0; i < candidateProviders.length; i++) {
      const providerName = candidateProviders[i];
      const provider = this.providers.get(providerName)!;
      attemptedProviders.push(providerName);

      const nextProviderName = candidateProviders[i + 1];
      const nextProvider = nextProviderName ? this.providers.get(nextProviderName) : null;
      const isFallback = i > 0;

      // Gemini 503 / transient server errors allow maximum 1 retry (total 2 attempts).
      // Quota / Auth errors allow 0 retries.
      const MAX_RETRIES = 2;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          // Wrap provider execution in a strict 25-second server-side timeout
          const providerExecutionPromise = provider.execute({
            ...request,
            requestId,
          });

          let timer: any;
          const timeoutPromise = new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
              const err = new Error(`Provider ${provider.displayName} request timed out after 25s.`);
              (err as any).status = 408;
              reject(err);
            }, 25000);
          });

          const result: ProviderExecutionResult = await Promise.race([
            providerExecutionPromise,
            timeoutPromise,
          ]).finally(() => {
            clearTimeout(timer);
          });

          const latencyMs = Date.now() - startTime;
          this.lastSuccessTimestamps.set(providerName, new Date().toISOString());
          this.providerFailures.set(providerName, 0);

          // Parse structured data if expected
          let structuredData: any = undefined;
          if (request.expectedOutput !== 'text') {
            try {
              structuredData = JSON.parse(result.text);
            } catch {
              const cleaned = result.text.replace(/```json\n?|\n?```/g, '').trim();
              try {
                structuredData = JSON.parse(cleaned);
              } catch {
                // Keep undefined if parse fails
              }
            }
          }

          const response: AIResponse = {
            text: result.text,
            structuredData,
            provider: providerName,
            model: result.model,
            usage: result.usage,
            latencyMs,
            fallbackUsed: isFallback,
            attemptedProviders,
            requestId,
            timestamp: new Date().toISOString(),
          };

          this.logExecution({
            requestId,
            task: request.task,
            provider: providerName,
            model: result.model,
            success: true,
            fallbackUsed: isFallback,
            attemptedProviders,
            latencyMs,
            timestamp: response.timestamp,
            tokenUsage: result.usage,
          });

          if (isFallback) {
            console.log(
              `[AI Router] Fallback to ${provider.displayName} succeeded for task "${request.task}" in ${latencyMs}ms.`
            );
          }

          return response;
        } catch (err: any) {
          lastError = err;
          const classification = provider.classifyError(err);
          const currentFails = (this.providerFailures.get(providerName) || 0) + 1;
          this.providerFailures.set(providerName, currentFails);

          const isBillingMsg =
            classification.message.toLowerCase().includes('credit') ||
            classification.message.toLowerCase().includes('billing') ||
            classification.message.toLowerCase().includes('plans & billing');

          // 1. Quota Exhaustion / Rate Limited / Billing (OpenAI 429, Gemini 429, Anthropic 400 low credit)
          if (classification.category === 'QUOTA_EXHAUSTED' || classification.category === 'RATE_LIMITED') {
            const cooldownSec = classification.retryAfterSeconds || 300;
            this.cooldowns.set(providerName, Date.now() + cooldownSec * 1000);

            const displayCategory = isBillingMsg ? 'BILLING_EXHAUSTED' : 'QUOTA_EXHAUSTED';
            const statusPrefix = classification.statusCode ? `${classification.statusCode} ` : '';

            console.log(
              `[AI Router]\n${provider.displayName} → ${statusPrefix}${displayCategory}\nSkipping provider\n\n[AI Router]\n${provider.displayName} → cooldown activated\n${
                nextProvider ? `Moving to ${nextProvider.displayName}...` : 'All providers unavailable'
              }`
            );
            break; // Immediately move to next provider without retrying
          }

          // 2. Authentication failure
          if (classification.category === 'AUTH_FAILED') {
            this.providerAuthFailed.add(providerName);
            console.log(
              `[AI Router]\n${provider.displayName} → AUTH_FAILED\nSkipping provider\n\n[AI Router]\n${
                nextProvider ? `Moving to ${nextProvider.displayName}...` : 'All providers unavailable'
              }`
            );
            break; // Immediately move to next provider
          }

          // 3. Model Not Found (404 or decommissioned model)
          if (classification.category === 'MODEL_NOT_FOUND') {
            console.log(
              `[AI Router]\n${provider.displayName} → 404 MODEL_NOT_FOUND\nSkipping provider\n\n[AI Router]\n${
                nextProvider ? `Moving to ${nextProvider.displayName}...` : 'All providers unavailable'
              }`
            );
            break; // Immediately move to next provider without retrying
          }

          // 4. Bad prompt / Invalid Request (non-billing)
          if (classification.category === 'INVALID_REQUEST') {
            console.log(`[AI Router]\n${provider.displayName} → ${classification.statusCode || 400} INVALID_REQUEST\nSkipping provider`);
            break;
          }

          // 4. Server Error (503 High Demand / 5xx) / Timeout / Network Error
          if (
            classification.category === 'SERVER_ERROR' ||
            classification.category === 'TIMEOUT' ||
            classification.category === 'NETWORK_ERROR'
          ) {
            if (attempt === 1) {
              const statusPrefix = classification.statusCode ? `${classification.statusCode} ` : '';
              console.log(`[AI Router]\n${provider.displayName} → ${statusPrefix}${classification.category}\nRetrying once...`);
              await new Promise((res) => setTimeout(res, 800));
              continue; // Attempt 2
            } else {
              // Second attempt failed -> place in short cooldown and failover
              const cooldownSec = 60;
              this.cooldowns.set(providerName, Date.now() + cooldownSec * 1000);
              console.log(
                `[AI Router]\n${provider.displayName} → cooldown activated\n${
                  nextProvider ? `Moving to ${nextProvider.displayName}...` : 'All providers unavailable'
                }`
              );
              break; // Move to next provider
            }
          }

          // Any other error
          console.log(`[AI Router]\n${provider.displayName} → ${classification.category}\nSkipping provider`);
          break;
        }
      }
    }

    console.log(`[AI Router]\nAll providers unavailable\nUsing deterministic campaign fallback`);

    const latencyMs = Date.now() - startTime;
    this.logExecution({
      requestId,
      task: request.task,
      provider: candidateProviders[candidateProviders.length - 1],
      model: 'unknown',
      success: false,
      fallbackUsed: true,
      attemptedProviders,
      errorCategory: 'ALL_PROVIDERS_EXHAUSTED',
      errorMessage: lastError?.message || 'All configured AI providers failed.',
      latencyMs,
      timestamp: new Date().toISOString(),
    });

    throw (
      lastError ||
      new Error('AI provider temporarily unavailable. UIOutbox attempted all configured providers.')
    );
  }

  /**
   * Helper to append an execution audit log entry.
   */
  private logExecution(log: AIExecutionLog): void {
    this.executionLogs.push(log);
    if (this.executionLogs.length > this.MAX_LOGS) {
      this.executionLogs.shift();
    }
  }

  /**
   * Reset cooldowns and session state (useful for testing or manual re-checks).
   */
  public resetState(): void {
    this.cooldowns.clear();
    this.providerFailures.clear();
    this.providerAuthFailed.clear();
  }
}

// Global Singleton Router Instance
export const aiRouter = new AIRouter();
