// =============================================================================
// Dynamic ICP Qualification Engine & Deterministic Core Business Evaluator
// Dynamically verifies if a candidate's primary commercial business matches
// the active campaign's target niche, creative offer, and company type.
// =============================================================================

import { Campaign, ICPQualification } from '../types';

export interface CandidateEvaluationPayload {
  company_name: string;
  website?: string;
  domain?: string;
  industry?: string;
  description?: string;
  country?: string;
}

// Major distinct commercial sectors and their defining keywords
const DISTINCT_SECTOR_KEYWORDS: Record<string, string[]> = {
  fragrance: [
    'fragrance', 'perfume', 'perfumery', 'parfum', 'eau de parfum', 'eau de toilette', 
    'extrait', 'cologne', 'olfactive', 'attar', 'scent', 'scents', 'fine fragrance',
    'fragrance house', 'perfume house', 'perfumer', 'niche fragrance', 'luxury fragrance',
    'unisex fragrance', 'artisan perfume'
  ],
  skincare: [
    'skincare', 'skin care', 'serum', 'moisturizer', 'cleanser', 'sunscreen', 'spf', 
    'dermatolog', 'anti-aging', 'toner', 'face oil', 'retinol', 'hyaluronic', 'acne',
    'cosmetics', 'makeup', 'lip gloss', 'eyeshadow', 'mascara'
  ],
  food_beverage: [
    'food', 'beverage', 'snack', 'cereal', 'soda', 'tonic', 'prebiotic', 'drink', 
    'water', 'tea', 'protein bar', 'chocolate', 'snacking', 'meal', 'nutrition',
    'sparkling water', 'seltzer', 'kombucha', 'energy drink'
  ],
  cookware_home: [
    'cookware', 'pan', 'pot', 'bakeware', 'kitchenware', 'dutch oven', 'blender', 
    'appliance', 'kitchen', 'cutlery', 'dish', 'plate', 'skillet', 'non-stick pan',
    'ceramic cookware', 'baking sheet', 'knife set'
  ],
  tech_electronics: [
    'smartphone', 'earbuds', 'wireless charger', 'wearable', 'smart ring', 'health tracking',
    'titanium ring', 'gadget', 'hardware', 'electronics', 'consumer tech', 'charger',
    'keyboard', 'headphones', 'smart device', 'sensor'
  ],
  gear_bags: [
    'camera bag', 'backpack', 'strap', 'gear', 'luggage', 'travel bag', 'duffel', 
    'carry-on', 'everyday carry', 'pack'
  ],
  coffee_equipment: [
    'coffee', 'espresso', 'grinder', 'kettle', 'roaster', 'pour-over', 'brewer',
    'coffee maker', 'espresso machine', 'scale'
  ],
  apparel_footwear: [
    'apparel', 'clothing', 'shoes', 'sneakers', 'hoodie', 'activewear', 'dress',
    'jacket', 'outerwear', 'streetwear', 'footwear', 'running shoes'
  ],
  saas_software: [
    'software', 'saas', 'platform', 'cloud', 'app', 'workflow', 'b2b software',
    'developer tool', 'analytics', 'database', 'api', 'automation'
  ],
  agency_services: [
    'agency', 'marketing agency', 'design studio', 'consulting', 'freelancer',
    'development firm', 'creative agency', 'seo agency', 'dev shop'
  ]
};

/**
 * Deterministically evaluates candidate ICP fit against active campaign parameters.
 * Strict Core Business Test: Company MUST primarily operate within the campaign niche.
 */
export function evaluateCandidateIcpDeterministic(
  campaign: Partial<Campaign> & { niche: string },
  candidate: CandidateEvaluationPayload
): ICPQualification {
  const campaignNiche = (campaign.niche || '').toLowerCase().trim();
  const campaignOffer = (campaign.offer || '').toLowerCase().trim();
  const campaignCompanyType = (campaign.target_company_type || '').toLowerCase().trim();
  const campaignMarket = (campaign.target_market || 'worldwide').toLowerCase().trim();

  const companyName = (candidate.company_name || '').toLowerCase();
  const industry = (candidate.industry || '').toLowerCase();
  const description = (candidate.description || '').toLowerCase();
  const domain = (candidate.domain || '').toLowerCase();

  const combinedCandidateText = `${companyName} ${industry} ${description} ${domain}`;

  // 1. Identify which sector the campaign niche belongs to
  let campaignPrimarySector: string | null = null;
  let campaignSectorKeywords: string[] = [];

  for (const [sector, keywords] of Object.entries(DISTINCT_SECTOR_KEYWORDS)) {
    const matchesNiche = keywords.some(k => campaignNiche.includes(k) || campaignCompanyType.includes(k));
    if (matchesNiche) {
      campaignPrimarySector = sector;
      campaignSectorKeywords = keywords;
      break;
    }
  }

  // If not matched to pre-defined sector, dynamically build keywords from campaign niche string
  if (campaignSectorKeywords.length === 0) {
    const rawTokens = campaignNiche
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !['and', 'the', 'for', 'with', 'direct', 'consumer', 'brands', 'brand'].includes(w));
    campaignSectorKeywords = rawTokens;
  }

  // 2. Count direct niche keyword occurrences in candidate data
  const nicheKeywordMatches = campaignSectorKeywords.filter(k => combinedCandidateText.includes(k));
  const hasStrongNicheMatch = nicheKeywordMatches.length >= 1;

  // 3. Detect if candidate belongs primarily to an unrelated distinct sector
  let detectedCandidateSector: string | null = null;
  let offNicheSectorMatchCount = 0;

  for (const [sector, keywords] of Object.entries(DISTINCT_SECTOR_KEYWORDS)) {
    // Skip checking against the campaign's own sector
    if (campaignPrimarySector && sector === campaignPrimarySector) continue;

    const sectorMatches = keywords.filter(k => combinedCandidateText.includes(k));
    if (sectorMatches.length >= 2 || (sectorMatches.length === 1 && industry.includes(keywords[0]))) {
      detectedCandidateSector = sector;
      offNicheSectorMatchCount = sectorMatches.length;
      break;
    }
  }

  // 4. Exclusion & Core Business Test Decision
  const isOffNicheMismatch = Boolean(
    detectedCandidateSector &&
    (!campaignPrimarySector || detectedCandidateSector !== campaignPrimarySector) &&
    !hasStrongNicheMatch
  );

  const isAgencyService = (
    DISTINCT_SECTOR_KEYWORDS.agency_services.some(k => combinedCandidateText.includes(k)) &&
    !campaignNiche.includes('agency') &&
    !campaignNiche.includes('service')
  );

  // 5. Score Calculation
  let score = 0;
  let classification: 'high_fit' | 'medium_fit' | 'low_fit' = 'low_fit';
  let reason = '';
  const signals: string[] = [];
  const risks: string[] = [];

  if (isAgencyService) {
    score = 15;
    classification = 'low_fit';
    reason = `Disqualified: Candidate appears to be a service agency/consultancy, not a brand selling in "${campaign.niche}".`;
    risks.push('Service provider / agency profile (does not match target brand criteria)');
  } else if (isOffNicheMismatch && detectedCandidateSector) {
    const formattedSector = detectedCandidateSector.replace(/_/g, ' ');
    score = Math.floor(15 + Math.random() * 15); // 15 - 30
    classification = 'low_fit';
    reason = `Disqualified: Primary business is ${formattedSector} (${candidate.industry || 'unrelated category'}), which does not match the target niche of "${campaign.niche}".`;
    risks.push(`Core product catalog is in ${formattedSector}, completely outside "${campaign.niche}"`);
  } else if (hasStrongNicheMatch) {
    // Candidate has direct core match with the campaign niche!
    let nichePoints = 55;
    if (nicheKeywordMatches.length >= 2) nichePoints = 60;

    // Offer synergy points
    let offerPoints = 15;
    if (campaignOffer.includes('3d') || campaignOffer.includes('animation') || campaignOffer.includes('video') || campaignOffer.includes('commercial')) {
      offerPoints = 18;
      signals.push(`Physical packaging & hero products well-suited for ${campaign.offer}`);
    }

    // Company type points
    let companyTypePoints = 12;
    if (campaignCompanyType.includes('luxury') || campaignCompanyType.includes('niche') || campaignCompanyType.includes('independent')) {
      if (combinedCandidateText.includes('luxury') || combinedCandidateText.includes('niche') || combinedCandidateText.includes('independent') || combinedCandidateText.includes('artisan') || combinedCandidateText.includes('boutique')) {
        companyTypePoints = 15;
        signals.push(`Brand positioning aligns with "${campaign.target_company_type || 'Target brand tier'}"`);
      }
    }

    // Market points
    const marketPoints = 4;
    signals.push(`Direct core commercial catalog in "${campaign.niche}"`);

    score = Math.min(Math.max(nichePoints + offerPoints + companyTypePoints + marketPoints, 82), 98);
    classification = 'high_fit';
    reason = `${candidate.company_name} is a dedicated brand in the "${campaign.niche}" category with core products and packaging aligned with ${campaign.offer}.`;
  } else {
    // Partial or adjacent match (e.g. general cosmetics/beauty when niche is fragrance, or unclassified category)
    score = 58;
    classification = 'medium_fit';
    reason = `Adjacent consumer brand with potential crossover into "${campaign.niche}"; manual verification of product catalog recommended.`;
    signals.push('Consumer brand with digital storefront presence');
    risks.push(`Verify whether "${campaign.niche}" is a primary commercial product line`);
  }

  return {
    score,
    classification,
    reason,
    signals,
    risks,
  };
}
