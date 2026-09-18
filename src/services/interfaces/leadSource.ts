// =============================================================================
// Lead Source Service Interface
// Allows swappable sourcing engines (AI Web Research, CSV, Apollo, LinkedIn, etc.)
// =============================================================================

import { Company, Contact } from '../../types';

export interface SourcedLeadPayload {
  company: Omit<Company, 'id' | 'created_at' | 'updated_at'>;
  contact?: Omit<Contact, 'id' | 'company_id' | 'created_at' | 'updated_at'>;
  notes?: string;
  sourceReference?: string;
}

export interface LeadSourceFilter {
  niche: string;
  targetMarket?: string;
  targetCompanyType?: string;
  count: number;
}

export interface ILeadSourceProvider {
  readonly id: string;
  readonly name: string;
  readonly type: 'ai_research' | 'csv' | 'manual' | 'api';
  readonly isConfigured: boolean;

  /**
   * Sourcing execution method
   */
  sourceLeads(campaignId: string, filter: LeadSourceFilter): Promise<SourcedLeadPayload[]>;

  /**
   * Validate parameters before execution
   */
  validateConfig?(): { valid: boolean; message?: string };
}
