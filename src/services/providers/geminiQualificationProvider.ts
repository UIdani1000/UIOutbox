// =============================================================================
// Gemini AI ICP Qualification Provider Implementation
// Calls server-side proxy route with hard 30s timeout to score candidates
// =============================================================================

import { IAIQualificationProvider } from '../interfaces/aiResearch';
import { Campaign, ICPQualification } from '../../types';
import { evaluateCandidateIcpDeterministic } from '../icpEvaluator';
import { safeJsonFetch } from '../safeFetch';

export class GeminiAIQualificationProvider implements IAIQualificationProvider {
  readonly id = 'gemini_icp_qualification';
  readonly name = 'Gemini AI ICP Evaluator';
  readonly isConfigured = true;

  async qualifyCandidate(
    campaign: Campaign,
    candidate: {
      company_name: string;
      website?: string;
      domain?: string;
      industry?: string;
      description?: string;
      country?: string;
    }
  ): Promise<ICPQualification> {
    try {
      const result = await safeJsonFetch<{
        score: number;
        classification: 'high_fit' | 'medium_fit' | 'low_fit';
        reason: string;
        signals?: string[];
        risks?: string[];
      }>('/api/qualification/icp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaign,
          candidate,
        }),
        timeoutMs: 30000,
      });

      if (result.ok && result.data) {
        return {
          score: result.data.score,
          classification: result.data.classification,
          reason: result.data.reason,
          signals: result.data.signals || [],
          risks: result.data.risks || [],
        };
      }

      throw new Error(result.error || 'Failed to qualify candidate via server.');
    } catch (err: any) {
      console.warn('[GeminiAIQualificationProvider] API qualification fallback engaged:', err?.message || err);
      return evaluateCandidateIcpDeterministic(campaign, candidate);
    }
  }

  async batchQualifyCandidates(
    campaign: Campaign,
    candidates: Array<{
      id: string;
      company_name: string;
      website?: string;
      domain?: string;
      industry?: string;
      description?: string;
    }>
  ): Promise<Array<{ id: string; qualification: ICPQualification }>> {
    try {
      const result = await safeJsonFetch<{
        evaluations: Array<{
          id?: string;
          index?: number;
          score: number;
          classification: 'high_fit' | 'medium_fit' | 'low_fit';
          reason: string;
          signals?: string[];
          risks?: string[];
        }>;
      }>('/api/qualification/batch-icp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaign,
          candidates,
        }),
        timeoutMs: 35000,
      });

      if (result.ok && result.data && Array.isArray(result.data.evaluations)) {
        const evaluations = result.data.evaluations;
        return candidates.map((cand, idx) => {
          const matchingEval = evaluations.find((e: any) => e.id === cand.id || e.index === idx);
          if (matchingEval) {
            return {
              id: cand.id,
              qualification: {
                score: matchingEval.score,
                classification: matchingEval.classification,
                reason: matchingEval.reason,
                signals: matchingEval.signals || [],
                risks: matchingEval.risks || [],
              },
            };
          }
          return {
            id: cand.id,
            qualification: evaluateCandidateIcpDeterministic(campaign, cand),
          };
        });
      }
    } catch (err) {
      console.warn('[GeminiAIQualificationProvider] Batch qualification fallback:', err);
    }

    // Fallback to sequential deterministic qualification
    return candidates.map((cand) => ({
      id: cand.id,
      qualification: evaluateCandidateIcpDeterministic(campaign, cand),
    }));
  }
}
