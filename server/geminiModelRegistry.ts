// =============================================================================
// Gemini Model Registry & Session Cache
// Centralized, dynamic model discovery with session caching and validation
// =============================================================================

import { GoogleGenAI } from '@google/genai';

export interface ModelRegistryConfig {
  primaryModel: string;
  fallbackModels: string[];
}

export class GeminiModelRegistry {
  // Candidate models in strict preference order (supported current Gemini models)
  private static readonly PREFERRED_MODELS = [
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-3.7-flash',
    'gemini-pro-latest',
  ];

  // Cached verified models for current session (pre-seeded with high-speed working flash models)
  private static verifiedModels: string[] | null = [
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-3.7-flash',
    'gemini-pro-latest',
  ];
  private static isCheckingAvailability = false;
  private static blacklistedModels: Set<string> = new Set();

  /**
   * Discovers and validates available models from the Gemini API.
   * Caches the result in memory for the duration of the server session.
   */
  public static async getAvailableModels(ai: GoogleGenAI): Promise<string[]> {
    if (this.verifiedModels && this.verifiedModels.length > 0) {
      const active = this.verifiedModels.filter((m) => !this.blacklistedModels.has(m));
      if (active.length > 0) {
        return active;
      }
    }

    if (this.isCheckingAvailability) {
      return this.PREFERRED_MODELS.filter((m) => !this.blacklistedModels.has(m));
    }

    this.isCheckingAvailability = true;
    try {
      console.log('[GeminiModelRegistry] Discovering available models from Gemini API...');
      const availableFromApi = new Set<string>();

      try {
        const response = await ai.models.list();
        for await (const model of response) {
          const rawName = model.name || '';
          const cleanName = rawName.replace(/^models\//, '');
          // Only include generateContent capable models
          const methods = (model as any).supportedGenerationMethods;
          const supportsGenerate = !methods || (Array.isArray(methods) && methods.includes('generateContent'));
          if (cleanName && supportsGenerate && !this.blacklistedModels.has(cleanName)) {
            availableFromApi.add(cleanName);
          }
        }
      } catch (listErr: any) {
        console.warn('[GeminiModelRegistry] Could not list models from API (using curated list):', listErr?.message || listErr);
      }

      if (availableFromApi.size > 0) {
        // First, check if our preferred models are present in API list
        const verifiedPreferred = this.PREFERRED_MODELS.filter((m) => availableFromApi.has(m) && !this.blacklistedModels.has(m));
        
        // Also capture any other flash/pro models from API
        const otherApiModels = Array.from(availableFromApi).filter(
          (m) => !this.PREFERRED_MODELS.includes(m) && !this.blacklistedModels.has(m) && m.startsWith('gemini-')
        );

        const verified = [...verifiedPreferred, ...otherApiModels];
        if (verified.length > 0) {
          this.verifiedModels = verified;
          console.log('[GeminiModelRegistry] Successfully verified available models:', this.verifiedModels);
          return this.verifiedModels.filter((m) => !this.blacklistedModels.has(m));
        }
      }

      this.verifiedModels = this.PREFERRED_MODELS.filter((m) => !this.blacklistedModels.has(m));
      return this.verifiedModels;
    } catch (e: any) {
      console.warn('[GeminiModelRegistry] Model discovery error:', e?.message || e);
      this.verifiedModels = this.PREFERRED_MODELS.filter((m) => !this.blacklistedModels.has(m));
      return this.verifiedModels;
    } finally {
      this.isCheckingAvailability = false;
    }
  }

  /**
   * Returns the configured primary model and fallback model chain.
   */
  public static async getModelConfig(ai: GoogleGenAI): Promise<ModelRegistryConfig> {
    const models = await this.getAvailableModels(ai);
    const validModels = models.filter((m) => !this.blacklistedModels.has(m));
    const primary = validModels[0] || 'gemini-3.6-flash';
    const fallbacks = validModels.slice(1);
    return {
      primaryModel: primary,
      fallbackModels: fallbacks,
    };
  }

  /**
   * Marks a model as permanently unavailable for this session (e.g., on 404 Not Found)
   */
  public static markModelUnavailable(model: string): void {
    console.warn(`[GeminiModelRegistry] Blacklisting model for session: ${model}`);
    this.blacklistedModels.add(model);
    if (this.verifiedModels) {
      this.verifiedModels = this.verifiedModels.filter((m) => m !== model);
    }
  }

  /**
   * Resets session cache
   */
  public static resetSession(): void {
    this.verifiedModels = null;
    this.blacklistedModels.clear();
  }
}
