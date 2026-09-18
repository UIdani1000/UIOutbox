// =============================================================================
// UIOutbox Normalized AI Interface & Types
// Provider-agnostic abstractions for Gemini, OpenAI, and Anthropic Claude
// =============================================================================

export type AITaskType =
  | 'prospect_discovery'
  | 'company_research'
  | 'contact_enrichment'
  | 'icp_qualification'
  | 'email_generation'
  | 'reply_analysis'
  | 'reply_response_generation'
  | 'general';

export type AIProviderName = 'gemini' | 'groq' | 'openai' | 'anthropic' | 'openrouter';

export type ProviderStatus = 'AVAILABLE' | 'QUOTA_LIMITED' | 'UNAVAILABLE' | 'NOT_CONFIGURED';

export interface AIRequest {
  task: AITaskType;
  userPrompt: string;
  systemPrompt?: string;
  context?: Record<string, any>;
  expectedOutput?: 'json' | 'text';
  temperature?: number;
  maxTokens?: number;
  preferredProvider?: AIProviderName;
  preferredModel?: string;
  requestId?: string;
}

export interface AIResponse {
  text: string;
  structuredData?: any;
  provider: AIProviderName;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  latencyMs: number;
  fallbackUsed: boolean;
  attemptedProviders: AIProviderName[];
  requestId: string;
  timestamp: string;
}

export interface ProviderHealth {
  name: AIProviderName;
  displayName: string;
  status: ProviderStatus;
  isConfigured: boolean;
  configuredModel: string;
  cooldownUntil?: number; // epoch ms
  cooldownRemainingSeconds?: number;
  lastError?: string;
  lastSuccessTimestamp?: string;
  consecutiveFailures: number;
}

export interface AIRoutingPolicy {
  primary: AIProviderName;
  fallback1: AIProviderName;
  fallback2: AIProviderName;
  chain?: AIProviderName[];
}

export interface AIExecutionLog {
  requestId: string;
  task: AITaskType;
  provider: AIProviderName;
  model: string;
  success: boolean;
  fallbackUsed: boolean;
  attemptedProviders: AIProviderName[];
  errorCategory?: string;
  errorMessage?: string;
  latencyMs: number;
  timestamp: string;
  tokenUsage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}
