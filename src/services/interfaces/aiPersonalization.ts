// =============================================================================
// AI Personalization Provider Interfaces (Build 04)
// =============================================================================

import { Campaign, Company, Contact, Lead, LeadResearch, CaseStudy } from '../../types';

export interface PersonalizationInput {
  campaign: Campaign;
  lead: Lead;
  company: Company;
  contact?: Contact;
  researchBrief: LeadResearch;
  caseStudy?: CaseStudy;
  customInstructions?: string;
}

export interface GeneratedPersonalizedDraft {
  subject: string;
  alternative_subjects: string[];
  body: string;
  personalization_score: number;
  personalization_reason: string;
  observation_used: string;
  product_used: string;
  opportunity_used: string;
  creative_used: {
    case_study_id?: string;
    case_study_name?: string;
    video_url?: string;
    portfolio_url?: string;
    thumbnail_url?: string;
  };
  language_selected: string;
  language_reason: string;
  language_confidence: number;
  model_used: string;
  provider_used?: string;
  fallback_used?: boolean;
  timestamp?: string;
}

export interface IAIPersonalizationProvider {
  readonly id: string;
  readonly name: string;
  readonly isConfigured: boolean;

  /**
   * Generates a tailored, authentic outreach email draft for a lead based on:
   * Campaign + Company + Contact + Deep Research + Creative Case Study + Language Strategy.
   */
  generateEmailDraft(input: PersonalizationInput): Promise<GeneratedPersonalizedDraft>;

  /**
   * Batch generation of personalized email drafts for high-throughput campaign workflows.
   */
  batchGenerateEmailDrafts(
    inputs: PersonalizationInput[]
  ): Promise<Array<{ leadId: string; draft?: GeneratedPersonalizedDraft; error?: string }>>;
}
