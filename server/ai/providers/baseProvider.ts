// =============================================================================
// Base AI Provider Interface & Error Classification
// =============================================================================

import { AIProviderName, AIRequest } from '../types';

export type AIErrorCategory =
  | 'QUOTA_EXHAUSTED'
  | 'AUTH_FAILED'
  | 'INVALID_REQUEST'
  | 'MODEL_NOT_FOUND'
  | 'SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'UNKNOWN';

export interface ProviderErrorClassification {
  category: AIErrorCategory;
  isRetryable: boolean;
  statusCode?: number;
  message: string;
  retryAfterSeconds?: number;
}

export interface ProviderExecutionResult {
  text: string;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface IAIProvider {
  readonly name: AIProviderName;
  readonly displayName: string;
  
  isConfigured(): boolean;
  getConfiguredModel(): Promise<string> | string;
  execute(request: AIRequest): Promise<ProviderExecutionResult>;
  classifyError(error: any): ProviderErrorClassification;
}
