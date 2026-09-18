// =============================================================================
// Lead Source Manager (Lead Sourcing Service Layer)
// Orchestrates multiple lead source providers through a unified pipeline
// =============================================================================

import { ILeadSourceProvider, SourcedLeadPayload, LeadSourceFilter } from './interfaces/leadSource';
import { AIWebResearchProvider } from './providers/aiWebResearchProvider';
import { CRMService } from './crmService';
import { Company, Contact, Lead } from '../types';

export interface SourcingResult {
  totalProcessed: number;
  companiesCreated: number;
  companiesReused: number;
  contactsCreated: number;
  leadsCreated: number;
  duplicateLeadsSkipped: number;
  errors: string[];
}

export class LeadSourceManager {
  private static providers: Map<string, ILeadSourceProvider> = new Map();

  static {
    // Register default providers
    this.registerProvider(new AIWebResearchProvider());
  }

  static registerProvider(provider: ILeadSourceProvider): void {
    this.providers.set(provider.id, provider);
  }

  static getProvider(id: string): ILeadSourceProvider | undefined {
    return this.providers.get(id);
  }

  static getAllProviders(): ILeadSourceProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Ingest approved AI discovery candidates into database as companies and campaign leads
   */
  static async ingestApprovedCandidates(
    campaignId: string,
    candidates: import('../types').DiscoveryCandidate[]
  ): Promise<SourcingResult> {
    const result: SourcingResult = {
      totalProcessed: candidates.length,
      companiesCreated: 0,
      companiesReused: 0,
      contactsCreated: 0,
      leadsCreated: 0,
      duplicateLeadsSkipped: 0,
      errors: [],
    };

    for (const cand of candidates) {
      try {
        if (!cand.company_name?.trim()) {
          result.errors.push('Skipped candidate with missing company name');
          continue;
        }

        // Run company deduplication & creation
        const { company, isDuplicate } = await CRMService.createCompanyWithContact(
          {
            company_name: cand.company_name,
            website: cand.website,
            domain: cand.domain,
            industry: cand.industry,
            country: cand.country,
            city: cand.city,
            description: cand.description,
            source: 'ai_web_research',
            source_reference: cand.source_reference,
            qualification_status: cand.icp_qualification?.classification === 'high_fit' ? 'qualified' : 'unqualified',
            contact_status: 'not_contacted',
          }
        );

        if (isDuplicate) {
          result.companiesReused++;
        } else {
          result.companiesCreated++;
        }

        // Link company to campaign in leads table
        const existingLeads = await CRMService.getLeads(campaignId);
        const leadAlreadyInCampaign = existingLeads.some(l => l.company_id === company.id);

        if (leadAlreadyInCampaign) {
          result.duplicateLeadsSkipped++;
        } else {
          const qualScore = cand.icp_qualification?.score ?? 70;
          const qualReason = cand.icp_qualification?.reason || 'AI ICP qualified discovery candidate';
          const isQualified = cand.icp_qualification?.classification === 'high_fit';

          await CRMService.createLead({
            campaign_id: campaignId,
            company_id: company.id,
            status: isQualified ? 'qualified' : 'new',
            qualification_score: qualScore,
            qualification_reason: qualReason,
            research_status: 'not_started',
            personalization_status: 'pending',
            outreach_status: 'not_started',
          });
          result.leadsCreated++;

          await CRMService.logActivity(
            'candidate_approved',
            `Approved AI candidate "${company.company_name}" (${qualScore}% match) into campaign`,
            { campaignId, companyId: company.id, score: qualScore }
          );
        }
      } catch (err: any) {
        console.error('Error ingesting candidate:', err);
        result.errors.push(`Failed to ingest ${cand.company_name}: ${err.message || err}`);
      }
    }

    if (result.leadsCreated > 0) {
      await CRMService.logActivity(
        'lead_sourced',
        `Ingested ${result.leadsCreated} AI-discovered prospects into campaign (${result.companiesReused} deduplicated existing companies)`,
        { campaignId, ...result }
      );
    }

    return result;
  }

  /**
   * Process raw sourced lead payloads through deduplication, validation, and database insertion
   */
  static async ingestSourcedLeads(
    campaignId: string,
    payloads: SourcedLeadPayload[],
    qualificationScore: number = 0,
    qualificationReason?: string
  ): Promise<SourcingResult> {
    const result: SourcingResult = {
      totalProcessed: payloads.length,
      companiesCreated: 0,
      companiesReused: 0,
      contactsCreated: 0,
      leadsCreated: 0,
      duplicateLeadsSkipped: 0,
      errors: [],
    };

    for (const item of payloads) {
      try {
        if (!item.company.company_name?.trim()) {
          result.errors.push('Skipped entry with missing company name');
          continue;
        }

        // Run company deduplication & creation
        const { company, contact, isDuplicate } = await CRMService.createCompanyWithContact(
          {
            ...item.company,
            source: item.company.source || 'csv_import',
            source_reference: item.sourceReference || item.company.source_reference,
          },
          item.contact
        );

        if (isDuplicate) {
          result.companiesReused++;
          await CRMService.logActivity(
            'duplicate_detected',
            `Deduplicated company domain "${company.domain}" (${company.company_name})`,
            { domain: company.domain, companyId: company.id }
          );
        } else {
          result.companiesCreated++;
          await CRMService.logActivity(
            'company_added',
            `Added company "${company.company_name}" (${company.domain}) via ${company.source}`,
            { companyId: company.id, source: company.source }
          );
        }

        if (contact && !isDuplicate) {
          result.contactsCreated++;
        }

        // Link company to campaign in leads table
        const existingLeads = await CRMService.getLeads(campaignId);
        const leadAlreadyInCampaign = existingLeads.some(l => l.company_id === company.id);

        if (leadAlreadyInCampaign) {
          result.duplicateLeadsSkipped++;
        } else {
          await CRMService.createLead({
            campaign_id: campaignId,
            company_id: company.id,
            contact_id: contact?.id,
            status: 'new',
            qualification_score: qualificationScore,
            qualification_reason: qualificationReason || 'Ingested from lead source',
            research_status: 'not_started',
            personalization_status: 'pending',
            outreach_status: 'not_started',
          });
          result.leadsCreated++;

          await CRMService.logActivity(
            'lead_created',
            `Created campaign lead for "${company.company_name}" in campaign`,
            { campaignId, companyId: company.id }
          );
        }
      } catch (err: any) {
        console.error('Error during lead ingestion:', err);
        result.errors.push(`Failed to ingest ${item.company.company_name}: ${err.message || err}`);
      }
    }

    if (result.leadsCreated > 0) {
      await CRMService.logActivity(
        'company_imported',
        `Imported ${result.leadsCreated} leads into campaign (${result.companiesReused} existing domains deduplicated)`,
        { campaignId, ...result }
      );
    }

    return result;
  }
}
