// =============================================================================
// AI Research & Qualification Interfaces
// Modular abstraction for replacing or extending AI models and research providers
// =============================================================================

import { Campaign, Company, LeadResearch, ICPQualification, PersonalizationContract } from '../../types';

export interface IAIResearchProvider {
  readonly id: string;
  readonly name: string;
  readonly isConfigured: boolean;

  /**
   * Execute deep, campaign-aware qualitative research on a company.
   * Produces structured research brief and personalization contract.
   */
  researchCompany(
    campaign: Campaign, 
    company: Company, 
    leadId: string
  ): Promise<{ research: LeadResearch; personalizationContract: PersonalizationContract }>;
}

export interface IAIQualificationProvider {
  readonly id: string;
  readonly name: string;
  readonly isConfigured: boolean;

  /**
   * Evaluate candidate fit against campaign parameters.
   */
  qualifyCandidate(
    campaign: Campaign, 
    candidate: {
      company_name: string;
      website?: string;
      domain?: string;
      industry?: string;
      description?: string;
      country?: string;
    }
  ): Promise<ICPQualification>;

  /**
   * Batch evaluate candidates for high-throughput discovery workflows.
   */
  batchQualifyCandidates(
    campaign: Campaign,
    candidates: Array<{
      id: string;
      company_name: string;
      website?: string;
      domain?: string;
      industry?: string;
      description?: string;
    }>
  ): Promise<Array<{ id: string; qualification: ICPQualification }>>;
}
