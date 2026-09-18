// =============================================================================
// AI Web Research Provider (Build 03 Full Pipeline Implementation)
// Multi-stage discovery pipeline:
// AI Discovery -> Normalization -> Domain Deduplication -> Basic Validation -> ICP Qualification
// =============================================================================

import { ILeadSourceProvider, LeadSourceFilter, SourcedLeadPayload } from '../interfaces/leadSource';
import { 
  Campaign, 
  DiscoveryCandidate, 
  CandidateValidationStatus, 
  DiscoveryProgress, 
  DiscoveryJobState,
  ICPQualification 
} from '../../types';
import { CRMService } from '../crmService';
import { GeminiAIQualificationProvider } from './geminiQualificationProvider';
import { evaluateCandidateIcpDeterministic } from '../icpEvaluator';
import { safeJsonFetch } from '../safeFetch';

export class AIWebResearchProvider implements ILeadSourceProvider {
  readonly id = 'ai_web_research';
  readonly name = 'AI Web Prospecting Engine';
  readonly type = 'ai_research' as const;
  readonly isConfigured = true;

  private qualificationProvider = new GeminiAIQualificationProvider();

  /**
   * Execute full multi-stage AI discovery pipeline with live progress reporting and idempotent job tracking
   */
  async runDiscoveryPipeline(
    campaign: Campaign,
    targetCount: number = 50,
    bufferMultiplier: number = 1.5,
    onProgress?: (progress: DiscoveryProgress) => void,
    jobId?: string
  ): Promise<DiscoveryCandidate[]> {
    const totalRequested = Math.round(targetCount * bufferMultiplier);
    const effectiveJobId = jobId || `job_${campaign.id}_${Date.now()}`;

    const updateProgress = (
      state: DiscoveryJobState, 
      message: string, 
      discovered = 0, 
      valid = 0, 
      duplicate = 0, 
      qualified = 0,
      errorMessage?: string
    ) => {
      if (onProgress) {
        onProgress({
          state,
          totalTarget: targetCount,
          bufferCount: totalRequested,
          discoveredCount: discovered,
          validCount: valid,
          duplicateCount: duplicate,
          qualifiedCount: qualified,
          currentMessage: message,
          errorMessage,
        });
      }
    };

    updateProgress('discovering', `Querying AI web research engine for ${totalRequested} target prospects...`);
    await CRMService.logActivity(
      'discovery_started',
      `Started AI prospect discovery for campaign "${campaign.name}" (Target: ${targetCount}, Buffer Request: ${totalRequested})`,
      { campaignId: campaign.id, targetCount, totalRequested, jobId: effectiveJobId }
    );

    // 1. Fetch existing known companies and leads across the entire CRM for strict deduplication
    const existingCompanies = await CRMService.getCompanies();
    const existingLeads = await CRMService.getLeads(campaign.id);
    const existingDomains = existingCompanies.map(c => CRMService.cleanDomain(c.domain || c.website || '')).filter(Boolean);
    const existingCompanyNames = existingCompanies.map(c => c.company_name.trim()).filter(Boolean);

    // 2. Call server-side discovery API with retry and idempotency
    let rawCandidates: any[] = [];
    let fetchAttempt = 0;
    const maxFetchAttempts = 2;

    while (fetchAttempt < maxFetchAttempts) {
      fetchAttempt++;
      try {
        if (fetchAttempt > 1) {
          updateProgress('discovering', `Re-attempting discovery query (Attempt ${fetchAttempt}/${maxFetchAttempts})...`);
        }

        const result = await safeJsonFetch<{ candidates?: any[]; error?: string }>('/api/discovery/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            campaign,
            count: totalRequested,
            existingDomains,
            existingCompanyNames,
            jobId: effectiveJobId,
          }),
          timeoutMs: 45000,
        });

        if (!result.ok || !result.data) {
          throw new Error(result.error || 'AI research is temporarily unavailable. No prospects were lost. Try again shortly.');
        }

        rawCandidates = result.data.candidates || [];
        break;
      } catch (err: any) {
        console.warn(`[AIWebResearchProvider] Discovery attempt ${fetchAttempt} failed:`, err);
        if (fetchAttempt >= maxFetchAttempts) {
          const userMessage = 'AI research is temporarily unavailable. No prospects were lost. Try again shortly.';
          updateProgress('failed', userMessage, 0, 0, 0, 0, userMessage);
          throw new Error(userMessage);
        }
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    if (rawCandidates.length === 0) {
      updateProgress('completed', 'No new matching companies found for target criteria.', 0, 0, 0, 0);
      return [];
    }

    updateProgress('normalizing', `Normalizing ${rawCandidates.length} candidate domains...`, rawCandidates.length);

    // 3. Normalization & CRM-Wide Deduplication Stage
    const processedCandidates: DiscoveryCandidate[] = [];
    const seenBatchDomains = new Set<string>();
    const seenBatchNames = new Set<string>();

    let duplicateCount = 0;
    let validCount = 0;

    for (let i = 0; i < rawCandidates.length; i++) {
      const raw = rawCandidates[i];
      const rawDomain = raw.domain || raw.website || '';
      const normalizedDomain = CRMService.normalizeDomain(rawDomain);
      const companyName = (raw.company_name || '').trim();
      const normalizedName = CRMService.normalizeCompanyName(companyName);

      const candidateId = `cand-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`;

      let validationStatus: CandidateValidationStatus = 'valid';
      let validationMessage = 'Valid candidate company';
      let isDuplicate = false;
      let duplicateReason: string | undefined;

      // Check basic validity
      if (!companyName || companyName.length < 2) {
        validationStatus = 'invalid';
        validationMessage = 'Missing or invalid company name';
      } else if (!normalizedDomain || !normalizedDomain.includes('.')) {
        validationStatus = 'invalid';
        validationMessage = 'Cannot extract valid website domain';
      }

      // Check deduplication within current discovery batch
      if (validationStatus === 'valid') {
        const isBatchDomainDup = seenBatchDomains.has(normalizedDomain);
        const isBatchNameDup = normalizedName.length > 2 && seenBatchNames.has(normalizedName);

        if (isBatchDomainDup || isBatchNameDup) {
          validationStatus = 'duplicate';
          isDuplicate = true;
          duplicateReason = isBatchDomainDup ? 'Duplicate domain within discovery batch' : 'Duplicate company name in discovery batch';
          duplicateCount++;
        } else {
          seenBatchDomains.add(normalizedDomain);
          if (normalizedName) seenBatchNames.add(normalizedName);

          // Check against existing CRM database companies (by normalized domain and name)
          const existingCompany = existingCompanies.find(c => {
            const cDomain = CRMService.cleanDomain(c.domain || c.website || '');
            const cName = CRMService.normalizeCompanyName(c.company_name);
            if (cDomain && cDomain === normalizedDomain) return true;
            if (normalizedName && cName && cName.length > 2 && cName === normalizedName) return true;
            return false;
          });

          if (existingCompany) {
            isDuplicate = true;
            duplicateReason = `Already in company directory (${existingCompany.company_name})`;
            duplicateCount++;

            // Check if blocked/do not contact
            if (existingCompany.contact_status === 'do_not_contact' || existingCompany.qualification_status === 'blocked') {
              validationStatus = 'blocked';
              validationMessage = 'Company is on Do Not Contact exclusion list';
            } else {
              // Check if already in this specific campaign
              const alreadyLead = existingLeads.some(l => l.company_id === existingCompany.id);
              if (alreadyLead) {
                validationStatus = 'duplicate';
                validationMessage = 'Already an active lead in this campaign';
              } else {
                validationStatus = 'valid';
                validationMessage = 'Existing company in database (reusable for this campaign)';
              }
            }
          } else {
            validCount++;
          }
        }
      }

      processedCandidates.push({
        id: candidateId,
        company_name: companyName,
        website: raw.website || (normalizedDomain ? `https://${normalizedDomain}` : ''),
        domain: normalizedDomain,
        industry: raw.industry || campaign.niche,
        country: raw.country || campaign.target_market || 'Worldwide',
        city: raw.city,
        description: raw.description || `Consumer brand matching ${campaign.niche}`,
        source: 'ai_web_research',
        source_reference: `AI Web Discovery (${campaign.niche})`,
        validation_status: validationStatus,
        validation_message: validationMessage,
        is_duplicate: isDuplicate,
        duplicate_reason: duplicateReason,
        approval_status: 'pending',
      });
    }

    updateProgress(
      'qualifying', 
      `Running AI ICP qualification on ${validCount} candidate companies...`, 
      processedCandidates.length, 
      validCount, 
      duplicateCount
    );

    // 4. AI ICP Qualification Stage (Only for valid, non-blocked candidates)
    const validCandidatesToQualify = processedCandidates.filter(c => c.validation_status === 'valid');
    
    if (validCandidatesToQualify.length > 0) {
      try {
        const batchEvaluations = await this.qualificationProvider.batchQualifyCandidates(
          campaign,
          validCandidatesToQualify.map(c => ({
            id: c.id,
            company_name: c.company_name,
            website: c.website,
            domain: c.domain,
            industry: c.industry,
            description: c.description,
          }))
        );

        let highFitCount = 0;
        for (const evalItem of batchEvaluations) {
          const candidate = processedCandidates.find(c => c.id === evalItem.id);
          if (candidate) {
            candidate.icp_qualification = evalItem.qualification;
            if (evalItem.qualification.classification === 'high_fit') {
              highFitCount++;
            }
          }
        }

        updateProgress(
          'completed',
          `Discovery complete. Discovered ${processedCandidates.length} candidates (${validCount} valid, ${highFitCount} high fit).`,
          processedCandidates.length,
          validCount,
          duplicateCount,
          highFitCount
        );
      } catch (e: any) {
        console.warn('[AIWebResearchProvider] Batch qualification warning, using dynamic deterministic ICP evaluation:', e);
        let fallbackHighFitCount = 0;
        for (const cand of validCandidatesToQualify) {
          cand.icp_qualification = evaluateCandidateIcpDeterministic(campaign, cand);
          if (cand.icp_qualification.classification === 'high_fit') {
            fallbackHighFitCount++;
          }
        }
        updateProgress(
          'completed',
          `Discovery complete. Discovered ${processedCandidates.length} candidates (${validCount} valid, ${fallbackHighFitCount} high fit).`,
          processedCandidates.length,
          validCount,
          duplicateCount,
          fallbackHighFitCount
        );
      }
    } else {
      updateProgress(
        'completed',
        `Discovery finished. All candidates were duplicates or filtered.`,
        processedCandidates.length,
        0,
        duplicateCount,
        0
      );
    }

    await CRMService.logActivity(
      'discovery_completed',
      `Completed AI discovery for campaign "${campaign.name}". Found ${processedCandidates.length} candidates (${validCount} valid, ${duplicateCount} duplicates).`,
      {
        campaignId: campaign.id,
        totalFound: processedCandidates.length,
        validCount,
        duplicateCount,
      }
    );

    return processedCandidates;
  }

  /**
   * Compatibility method for ILeadSourceProvider interface
   */
  async sourceLeads(
    campaignId: string, 
    filter: LeadSourceFilter
  ): Promise<SourcedLeadPayload[]> {
    const campaign = await CRMService.getCampaignById(campaignId);
    if (!campaign) {
      throw new Error(`Campaign with ID ${campaignId} not found.`);
    }

    const candidates = await this.runDiscoveryPipeline(campaign, filter.count || 50);
    return candidates
      .filter(c => c.validation_status === 'valid')
      .map(c => ({
        company: {
          company_name: c.company_name,
          website: c.website,
          domain: c.domain,
          industry: c.industry,
          country: c.country,
          city: c.city,
          description: c.description,
          source: 'ai_web_research',
          source_reference: c.source_reference,
          qualification_status: c.icp_qualification?.classification === 'high_fit' ? 'qualified' : 'unqualified',
          contact_status: 'not_contacted',
        },
        sourceReference: c.source_reference,
      }));
  }

  validateConfig(): { valid: boolean; message?: string } {
    return {
      valid: true,
      message: 'AI Web Research Discovery Engine is active and ready.',
    };
  }
}
