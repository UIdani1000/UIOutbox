import { supabase, isSupabaseConfigured } from './supabase';
import { 
  Profile, 
  Campaign, 
  CaseStudy, 
  Company, 
  Contact, 
  Lead, 
  LeadStatus,
  EmailTemplate, 
  EmailMessage, 
  FollowUpSequence, 
  FollowUpStep, 
  LeadFollowUpSequence,
  Activity, 
  DashboardMetrics,
  LeadResearch,
  DeliverySettings,
  SendEmailResult,
  ProspectReply,
  ReplyClassification,
  ReplyPriority,
  ReplyStatus,
  ResponseDraft,
  ReplyAnalysisResult,
  ConversationMessageItem,
  ContactConfidence,
  ContactStatus,
  EmailVerificationStatus,
} from '../types';
import { gmailProvider } from './providers/gmailEmailProvider';
import { findCatalogBrand, findCatalogDecisionMaker } from './catalogData';
import { withTimeout } from './safeFetch';

const STORAGE_KEYS = {
  PROFILE: 'uioutbox_profile',
  CAMPAIGNS: 'uioutbox_campaigns',
  CASE_STUDIES: 'uioutbox_case_studies',
  COMPANIES: 'uioutbox_companies',
  CONTACTS: 'uioutbox_contacts',
  LEADS: 'uioutbox_leads',
  EMAIL_TEMPLATES: 'uioutbox_email_templates',
  EMAIL_MESSAGES: 'uioutbox_email_messages',
  FOLLOW_UPS: 'uioutbox_follow_ups',
  LEAD_SEQUENCES: 'uioutbox_lead_sequences',
  PROSPECT_REPLIES: 'uioutbox_prospect_replies',
  ACTIVITIES: 'uioutbox_activities',
  LEAD_RESEARCH: 'uioutbox_lead_research',
  DELIVERY_SETTINGS: 'uioutbox_delivery_settings',
};

export const DEFAULT_DELIVERY_SETTINGS: DeliverySettings = {
  dailySendLimit: 50,
  delayBetweenSendsSec: 4,
  enableTracking: true,
  testRecipientEmail: 'big.nssien@gmail.com',
};


// Default seed profile for UI Dani
export const DEFAULT_PROFILE: Profile = {
  id: 'profile-uidani-001',
  display_name: 'UI Dani',
  business_name: 'UIDani',
  email: 'big.nssien@gmail.com',
  website: 'https://bignssien.wixstudio.com/uidani',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Default starter portfolio case studies for UI Dani
export const DEFAULT_CASE_STUDIES: CaseStudy[] = [
  {
    id: '00000000-0000-0000-0000-000000000021',
    name: '3D Product Interface & Interaction Redesign',
    description: 'Interactive 3D product showcase, motion micro-interactions, and conversion flow redesign for high-growth tech brands.',
    niche: 'Luxury & High-Growth Tech',
    offer: 'Product Video Animation & Interface Teardown',
    portfolio_url: 'https://bignssien.wixstudio.com/uidani',
    video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    thumbnail_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000022',
    name: 'Luxury E-Commerce & Perfumery Teardown',
    description: 'Bespoke narrative-driven landing page experience and high-converting visual catalog designed for artisanal perfumeries.',
    niche: 'Luxury Fragrance & Niche Perfumery',
    offer: 'Custom UI/UX Concept & Brand Motion Teardown',
    portfolio_url: 'https://bignssien.wixstudio.com/uidani',
    video_url: '',
    thumbnail_url: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800&auto=format&fit=crop&q=80',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

// Default starter follow up sequence
export function isValidUuid(val?: string | null): boolean {
  if (!val || typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
}

export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const DEFAULT_FOLLOW_UP_SEQUENCE: FollowUpSequence = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Standard 4-Step Designer Sequence',
  status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  steps: [
    {
      id: '00000000-0000-0000-0000-000000000010',
      sequence_id: '00000000-0000-0000-0000-000000000001',
      step_number: 0,
      delay_days: 0,
      subject_template: 'Quick question regarding {{company_name}} product design',
      body_template: `Hi {{first_name}},\n\nI noticed {{company_name}}'s latest product interface. We recently crafted a product ad video and interface animation for a similar brand that significantly boosted conversion.\n\nWould you be open to seeing a 45-second creative teardown?\n\nBest,\nUI Dani\nUIDani Creative Studio`,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '00000000-0000-0000-0000-000000000011',
      sequence_id: '00000000-0000-0000-0000-000000000001',
      step_number: 1,
      delay_days: 3,
      subject_template: 'Re: Quick question regarding {{company_name}} product design',
      body_template: `Hi {{first_name}},\n\nFollowing up on my previous note. Here is the direct link to the case study video: {{case_study_url}}\n\nLet me know if you would like me to prepare a bespoke concept for {{company_name}}.\n\nBest,\nUI Dani`,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '00000000-0000-0000-0000-000000000012',
      sequence_id: '00000000-0000-0000-0000-000000000001',
      step_number: 2,
      delay_days: 7,
      subject_template: 'Design concept ideas for {{company_name}}',
      body_template: `Hi {{first_name}},\n\nI put together 2 quick animation ideas tailored for {{company_name}}'s upcoming release.\n\nWorth a 5-minute sync this week?\n\nBest,\nUI Dani`,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '00000000-0000-0000-0000-000000000013',
      sequence_id: '00000000-0000-0000-0000-000000000001',
      step_number: 3,
      delay_days: 14,
      subject_template: 'Final note / UI Dani',
      body_template: `Hi {{first_name}},\n\nAssuming you are all set on the creative/product design front right now. I will keep an eye on {{company_name}}'s growth and reconnect down the road!\n\nBest,\nUI Dani`,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
};

// Helper for local storage persistence
function getLocalItem<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function setLocalItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Failed to save ${key} to localStorage:`, err);
  }
}

export class CRMService {
  // ---------------------------------------------------------------------------
  // Domain Normalization Helper
  // ---------------------------------------------------------------------------
  static normalizeDomain(input?: string): string {
    return this.cleanDomain(input || '');
  }

  // ---------------------------------------------------------------------------
  // Profile
  // ---------------------------------------------------------------------------
  static async getProfile(): Promise<Profile> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('profiles').select('*').limit(1).single();
        if (!error && data) return data as Profile;
      } catch (e) {
        console.warn('Supabase getProfile fallback:', e);
      }
    }
    return getLocalItem<Profile>(STORAGE_KEYS.PROFILE, DEFAULT_PROFILE);
  }

  static async updateProfile(profile: Partial<Profile>): Promise<Profile> {
    const current = await this.getProfile();
    const updated: Profile = {
      ...current,
      ...profile,
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('profiles').upsert(updated);
      } catch (e) {
        console.warn('Supabase updateProfile fallback:', e);
      }
    }
    setLocalItem(STORAGE_KEYS.PROFILE, updated);
    await this.logActivity('settings_updated', `Updated profile settings for ${updated.display_name}`);
    return updated;
  }

  // ---------------------------------------------------------------------------
  // Campaigns
  // ---------------------------------------------------------------------------
  static async getCampaigns(): Promise<Campaign[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('campaigns')
          .select(`
            *,
            case_study:case_studies(*),
            follow_up_sequence:follow_up_sequences(*)
          `)
          .order('created_at', { ascending: false });
        if (!error && data) {
          // Sync local storage
          setLocalItem(STORAGE_KEYS.CAMPAIGNS, data);
          return data as Campaign[];
        }
      } catch (e) {
        console.warn('Supabase getCampaigns fallback:', e);
      }
    }
    return getLocalItem<Campaign[]>(STORAGE_KEYS.CAMPAIGNS, []);
  }

  static async getCampaignById(id: string): Promise<Campaign | null> {
    const campaigns = await this.getCampaigns();
    return campaigns.find(c => c.id === id) || null;
  }

  /**
   * Resolves the full Campaign context for a lead using hierarchical lookup:
   * 1. Explicit campaignId passed by UI/action
   * 2. lead.campaign_id / lead.campaign?.id attached to the lead
   * 3. Fallback activeCampaignId or first available campaign in CRM
   * 
   * Ensures the returned campaign object is enriched with its associated CaseStudy
   * and full strategy parameters (niche, offer, market, company_type, language_strategy).
   */
  static async resolveCampaignForLead(
    lead: Lead | string | null | undefined,
    explicitCampaignId?: string | null,
    fallbackActiveCampaignId?: string | null
  ): Promise<Campaign | null> {
    const campaigns = await this.getCampaigns();
    const caseStudies = await this.getCaseStudies();

    let leadObj: Lead | null = null;
    if (typeof lead === 'string') {
      leadObj = await this.getLeadById(lead);
    } else if (lead) {
      leadObj = lead;
    }

    // 1. Explicit campaignId passed
    let targetCampaignId = explicitCampaignId;

    // 2. Lead's direct campaign relationship
    if (!targetCampaignId && leadObj) {
      targetCampaignId = leadObj.campaign_id || leadObj.campaign?.id || (leadObj as any).campaignId;
    }

    // 3. Fallback activeCampaignId
    if (!targetCampaignId && fallbackActiveCampaignId) {
      targetCampaignId = fallbackActiveCampaignId;
    }

    // 4. Match campaign from list
    let matchedCampaign: Campaign | null = null;
    if (targetCampaignId) {
      matchedCampaign = campaigns.find(c => c.id === targetCampaignId) || null;
    }

    // 5. If still no match and lead has embedded campaign object with minimum required fields
    if (!matchedCampaign && leadObj?.campaign && leadObj.campaign.name && leadObj.campaign.niche) {
      matchedCampaign = leadObj.campaign;
    }

    // 6. Ultimate fallback: First available campaign
    if (!matchedCampaign && campaigns.length > 0) {
      matchedCampaign = campaigns[0];
    }

    if (!matchedCampaign) {
      return null;
    }

    // Enrich campaign with case study and ensure all required strategy fields are present
    const caseStudy = matchedCampaign.case_study ||
      caseStudies.find(cs => cs.id === matchedCampaign!.case_study_id) ||
      caseStudies[0];

    const enrichedCampaign: Campaign = {
      ...matchedCampaign,
      name: matchedCampaign.name || 'Outreach Campaign',
      niche: matchedCampaign.niche || 'D2C Brands',
      offer: matchedCampaign.offer || '3D Product Animation',
      target_market: matchedCampaign.target_market || 'Worldwide',
      target_company_type: matchedCampaign.target_company_type || 'Active Web Storefront',
      language_strategy: matchedCampaign.language_strategy || 'Adaptive',
      case_study: caseStudy,
      case_study_id: caseStudy?.id || matchedCampaign.case_study_id,
    };

    return enrichedCampaign;
  }

  static async createCampaign(payload: Omit<Campaign, 'id' | 'created_at' | 'updated_at'>): Promise<Campaign> {
    const validSequenceId = isValidUuid(payload.follow_up_sequence_id) ? payload.follow_up_sequence_id : null;
    const validCaseStudyId = isValidUuid(payload.case_study_id) ? payload.case_study_id : null;

    let newCampaign: Campaign = {
      ...payload,
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `camp-${Date.now()}`,
      case_study_id: validCaseStudyId || undefined,
      follow_up_sequence_id: validSequenceId || undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const dbPayload: Record<string, any> = {
          name: payload.name,
          status: payload.status || 'draft',
          niche: payload.niche,
          offer: payload.offer,
          target_market: payload.target_market,
          target_company_type: payload.target_company_type,
          daily_target: payload.daily_target || 50,
          language_strategy: payload.language_strategy || 'Adaptive',
          case_study_id: validCaseStudyId,
          follow_up_sequence_id: validSequenceId,
        };

        const { data, error } = await supabase
          .from('campaigns')
          .insert(dbPayload)
          .select(`
            *,
            case_study:case_studies(*),
            follow_up_sequence:follow_up_sequences(*)
          `)
          .single();

        if (error) {
          console.error('Supabase createCampaign error:', error);
          throw error;
        }
        if (data) {
          newCampaign = data as Campaign;
        }
      } catch (e) {
        console.warn('Supabase createCampaign error:', e);
        throw e;
      }
    }

    const list = getLocalItem<Campaign[]>(STORAGE_KEYS.CAMPAIGNS, []);
    setLocalItem(STORAGE_KEYS.CAMPAIGNS, [newCampaign, ...list.filter(c => c.id !== newCampaign.id)]);

    await this.logActivity(
      'campaign_created',
      `Created campaign "${newCampaign.name}" with target niche "${newCampaign.niche}" (Goal: ${newCampaign.daily_target})`,
      { campaignId: newCampaign.id }
    );

    if (newCampaign.case_study_id) {
      await this.logActivity(
        'case_study_assigned',
        `Linked case study asset to campaign "${newCampaign.name}"`,
        { campaignId: newCampaign.id, caseStudyId: newCampaign.case_study_id }
      );
    }

    return newCampaign;
  }

  static async updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign | null> {
    const list = getLocalItem<Campaign[]>(STORAGE_KEYS.CAMPAIGNS, []);
    const idx = list.findIndex(c => c.id === id);
    const existing = idx >= 0 ? list[idx] : null;

    const prevStatus = existing?.status;
    let updated: Campaign = {
      ...(existing || {} as Campaign),
      ...updates,
      id,
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const dbUpdates: Record<string, any> = {
          ...updates,
          updated_at: new Date().toISOString(),
        };

        if ('follow_up_sequence_id' in updates) {
          dbUpdates.follow_up_sequence_id = isValidUuid(updates.follow_up_sequence_id) 
            ? updates.follow_up_sequence_id 
            : null;
        }
        if ('case_study_id' in updates) {
          dbUpdates.case_study_id = isValidUuid(updates.case_study_id) 
            ? updates.case_study_id 
            : null;
        }

        const { data, error } = await supabase
          .from('campaigns')
          .update(dbUpdates)
          .eq('id', id)
          .select(`
            *,
            case_study:case_studies(*),
            follow_up_sequence:follow_up_sequences(*)
          `)
          .single();

        if (!error && data) {
          updated = data as Campaign;
        } else if (error) {
          console.error('Supabase updateCampaign error:', error);
        }
      } catch (e) {
        console.warn('Supabase updateCampaign fallback:', e);
      }
    }

    if (idx !== -1) {
      list[idx] = updated;
    } else {
      list.push(updated);
    }
    setLocalItem(STORAGE_KEYS.CAMPAIGNS, list);

    // Log status transitions specifically
    if (updates.status && updates.status !== prevStatus) {
      if (updates.status === 'active') {
        await this.logActivity('campaign_started', `Started outreach campaign "${updated.name}"`, { campaignId: id });
      } else if (updates.status === 'paused') {
        await this.logActivity('campaign_paused', `Paused campaign "${updated.name}"`, { campaignId: id });
      } else {
        await this.logActivity('campaign_updated', `Transitioned campaign "${updated.name}" status to ${updates.status}`, { campaignId: id, status: updates.status });
      }
    } else {
      await this.logActivity('campaign_updated', `Updated campaign parameters for "${updated.name}"`, { campaignId: id });
    }

    return updated;
  }

  static async duplicateCampaign(id: string): Promise<Campaign | null> {
    const existing = await this.getCampaignById(id);
    if (!existing) return null;

    const duplicatedPayload: Omit<Campaign, 'id' | 'created_at' | 'updated_at'> = {
      name: `${existing.name} (Copy)`,
      status: 'draft',
      niche: existing.niche,
      offer: existing.offer,
      target_market: existing.target_market,
      target_company_type: existing.target_company_type,
      daily_target: existing.daily_target,
      language_strategy: existing.language_strategy,
      case_study_id: existing.case_study_id,
      follow_up_sequence_id: existing.follow_up_sequence_id,
    };

    const created = await this.createCampaign(duplicatedPayload);
    await this.logActivity(
      'campaign_created',
      `Duplicated campaign from "${existing.name}" to "${created.name}"`,
      { originalCampaignId: id, newCampaignId: created.id }
    );
    return created;
  }

  static async deleteCampaign(id: string): Promise<boolean> {
    const list = getLocalItem<Campaign[]>(STORAGE_KEYS.CAMPAIGNS, []);
    const target = list.find(c => c.id === id);
    const filtered = list.filter(c => c.id !== id);
    setLocalItem(STORAGE_KEYS.CAMPAIGNS, filtered);

    // Also remove associated leads in local state
    const leads = getLocalItem<Lead[]>(STORAGE_KEYS.LEADS, []);
    const remainingLeads = leads.filter(l => l.campaign_id !== id);
    setLocalItem(STORAGE_KEYS.LEADS, remainingLeads);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('campaigns').delete().eq('id', id);
      } catch (e) {
        console.warn('Supabase deleteCampaign fallback:', e);
      }
    }

    if (target) {
      await this.logActivity('campaign_deleted', `Deleted campaign "${target.name}"`, { campaignId: id });
    }
    return true;
  }

  // ---------------------------------------------------------------------------
  // Case Studies
  // ---------------------------------------------------------------------------
  static async getCaseStudies(): Promise<CaseStudy[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const queryPromise = supabase
          .from('case_studies')
          .select('*')
          .order('created_at', { ascending: false });
        const { data, error } = await withTimeout<any>(queryPromise, 10000, { data: null, error: null }, 'Supabase getCaseStudies');
        if (!error && data) {
          setLocalItem(STORAGE_KEYS.CASE_STUDIES, data);
          return data as CaseStudy[];
        } else if (error) {
          console.warn('Supabase getCaseStudies error/timeout:', error);
        }
      } catch (e) {
        console.warn('Supabase getCaseStudies fallback:', e);
      }
    }
    return getLocalItem<CaseStudy[]>(STORAGE_KEYS.CASE_STUDIES, []);
  }

  static async createCaseStudy(payload: Omit<CaseStudy, 'id' | 'created_at' | 'updated_at'>): Promise<CaseStudy> {
    const id = generateUuid();
    let newCaseStudy: CaseStudy = {
      ...payload,
      id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const dbPayload: Record<string, any> = {
          id,
          name: payload.name,
          description: payload.description || '',
          niche: payload.niche || '',
          offer: payload.offer || '',
          portfolio_url: payload.portfolio_url || '',
          video_url: payload.video_url || '',
          thumbnail_url: payload.thumbnail_url || '',
          status: payload.status || 'active',
        };

        const { data, error } = await supabase
          .from('case_studies')
          .insert(dbPayload)
          .select('*')
          .single();

        if (error) {
          console.error('Supabase createCaseStudy error with explicit id:', error);
          // Fallback: try inserting without client-supplied id in case database enforces server-generated uuid
          const fallbackInsert = await supabase
            .from('case_studies')
            .insert({
              name: payload.name,
              description: payload.description || '',
              niche: payload.niche || '',
              offer: payload.offer || '',
              portfolio_url: payload.portfolio_url || '',
              video_url: payload.video_url || '',
              thumbnail_url: payload.thumbnail_url || '',
              status: payload.status || 'active',
            })
            .select('*')
            .single();

          if (fallbackInsert.data && !fallbackInsert.error) {
            newCaseStudy = fallbackInsert.data as CaseStudy;
          }
        } else if (data) {
          newCaseStudy = data as CaseStudy;
        }
      } catch (e) {
        console.warn('Supabase createCaseStudy exception:', e);
      }
    }

    const list = getLocalItem<CaseStudy[]>(STORAGE_KEYS.CASE_STUDIES, []);
    setLocalItem(STORAGE_KEYS.CASE_STUDIES, [newCaseStudy, ...list.filter(c => c.id !== newCaseStudy.id)]);

    await this.logActivity(
      'case_study_added',
      `Added creative case study "${newCaseStudy.name}" (${newCaseStudy.niche})`
    );

    return newCaseStudy;
  }

  static async updateCaseStudy(id: string, updates: Partial<CaseStudy>): Promise<CaseStudy | null> {
    const list = getLocalItem<CaseStudy[]>(STORAGE_KEYS.CASE_STUDIES, []);
    const idx = list.findIndex(c => c.id === id);
    const existing = idx >= 0 ? list[idx] : null;

    let updated: CaseStudy = {
      ...(existing || ({} as CaseStudy)),
      ...updates,
      id,
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const dbUpdates: Record<string, any> = {
          ...updates,
          updated_at: new Date().toISOString(),
        };

        // Don't send undefined values
        Object.keys(dbUpdates).forEach(k => {
          if (dbUpdates[k] === undefined) delete dbUpdates[k];
        });

        const { data, error } = await supabase
          .from('case_studies')
          .update(dbUpdates)
          .eq('id', id)
          .select('*')
          .single();

        if (!error && data) {
          updated = data as CaseStudy;
        } else if (error) {
          console.error('Supabase updateCaseStudy error:', error);
        }
      } catch (e) {
        console.warn('Supabase updateCaseStudy fallback:', e);
      }
    }

    if (idx !== -1) {
      list[idx] = updated;
    } else {
      list.push(updated);
    }
    setLocalItem(STORAGE_KEYS.CASE_STUDIES, list);

    await this.logActivity(
      'case_study_updated',
      `Updated case study asset "${updated.name}"`
    );

    return updated;
  }

  static async deleteCaseStudy(id: string): Promise<boolean> {
    const list = getLocalItem<CaseStudy[]>(STORAGE_KEYS.CASE_STUDIES, []);
    const target = list.find(c => c.id === id);
    const filtered = list.filter(c => c.id !== id);
    setLocalItem(STORAGE_KEYS.CASE_STUDIES, filtered);

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('case_studies').delete().eq('id', id);
        if (error) console.error('Supabase deleteCaseStudy error:', error);
      } catch (e) {
        console.warn('Supabase deleteCaseStudy fallback:', e);
      }
    }

    if (target) {
      await this.logActivity('case_study_deleted', `Deleted case study asset "${target.name}"`);
    }
    return true;
  }

  // ---------------------------------------------------------------------------
  // Companies & Contacts (with Domain & Email Deduplication)
  // ---------------------------------------------------------------------------
  static async getCompanies(): Promise<Company[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('companies')
          .select(`
            *,
            contacts(*)
          `)
          .order('created_at', { ascending: false });
        if (!error && data) {
          // Authoritative from database
          setLocalItem(STORAGE_KEYS.COMPANIES, data as Company[]);
          return data as Company[];
        }
      } catch (e) {
        console.warn('Supabase getCompanies fallback:', e);
      }
    }
    return getLocalItem<Company[]>(STORAGE_KEYS.COMPANIES, []);
  }

  static cleanDomain(urlOrDomain: string): string {
    if (!urlOrDomain) return '';
    return urlOrDomain
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .split('/')[0]
      .split('?')[0]
      .split('#')[0]
      .trim()
      .toLowerCase();
  }

  static normalizeCompanyName(name: string): string {
    if (!name) return '';
    return name
      .toLowerCase()
      .replace(/^(the|a|an)\s+/i, '')
      .replace(/[,.'"-]/g, ' ')
      .replace(/\b(inc|llc|ltd|corp|corporation|co|company|gmbh|sa|pty|plc|holdings|group|brand|studios?)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  static normalizeEmail(email: string): string {
    return (email || '').trim().toLowerCase();
  }

  static async createCompanyWithContact(
    companyData: Omit<Company, 'id' | 'created_at' | 'updated_at'>,
    contactData?: Omit<Contact, 'id' | 'company_id' | 'created_at' | 'updated_at'>
  ): Promise<{ company: Company; contact?: Contact; isDuplicate: boolean }> {
    const domain = this.cleanDomain(companyData.domain || companyData.website || companyData.company_name);
    const normName = this.normalizeCompanyName(companyData.company_name);
    let companies = await this.getCompanies();
    
    // Domain & Company Name CRM-Wide Deduplication check
    let existingCompany = companies.find(c => {
      const cDomain = this.cleanDomain(c.domain || c.website || '');
      const cName = this.normalizeCompanyName(c.company_name);
      if (domain && cDomain && cDomain === domain) return true;
      if (normName && cName && cName.length > 2 && cName === normName) return true;
      return false;
    });

    // If Supabase configured, also verify directly in database
    if (!existingCompany && isSupabaseConfigured && supabase) {
      try {
        if (domain) {
          const { data } = await supabase.from('companies').select('*, contacts(*)').eq('domain', domain).maybeSingle();
          if (data) {
            existingCompany = data as Company;
          }
        }
        if (!existingCompany && normName) {
          const { data: nameData } = await supabase.from('companies').select('*, contacts(*)').ilike('company_name', `%${companyData.company_name.trim()}%`).limit(1);
          if (nameData && nameData.length > 0) {
            existingCompany = nameData[0] as Company;
          }
        }
      } catch (e) {
        console.warn('Supabase domain/name check fallback:', e);
      }
    }

    if (existingCompany) {
      // Company already exists! Check or attach contact
      let contact: Contact | undefined;

      if (contactData && contactData.email) {
        const normEmail = this.normalizeEmail(contactData.email);
        const contacts = getLocalItem<Contact[]>(STORAGE_KEYS.CONTACTS, []);
        const existingContact = contacts.find(
          c => c.company_id === existingCompany!.id && this.normalizeEmail(c.email) === normEmail
        );

        if (existingContact) {
          contact = existingContact;
        } else {
          // Add new contact to existing company
          const contactId = `cont-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
          contact = {
            ...contactData,
            email: normEmail,
            id: contactId,
            company_id: existingCompany.id,
            is_primary_contact: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          setLocalItem(STORAGE_KEYS.CONTACTS, [contact, ...contacts]);
          if (isSupabaseConfigured && supabase) {
            try {
              await supabase.from('contacts').insert(contact);
            } catch (e) {
              console.warn('Supabase contact insert fallback:', e);
            }
          }
          await this.logActivity(
            'contact_added',
            `Added contact "${contact.full_name}" to existing company "${existingCompany.company_name}"`,
            { companyId: existingCompany.id, contactId: contact.id }
          );
        }
      }

      return { company: existingCompany, contact, isDuplicate: true };
    }

    // New Company Creation
    const companyId = `comp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const newCompany: Company = {
      ...companyData,
      domain,
      id: companyId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let newContact: Contact | undefined;
    if (contactData) {
      const contactId = `cont-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      newContact = {
        ...contactData,
        email: this.normalizeEmail(contactData.email),
        id: contactId,
        company_id: companyId,
        is_primary_contact: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      newCompany.primary_contact = newContact;

      const contacts = getLocalItem<Contact[]>(STORAGE_KEYS.CONTACTS, []);
      setLocalItem(STORAGE_KEYS.CONTACTS, [newContact, ...contacts]);
    }

    const localCompanies = getLocalItem<Company[]>(STORAGE_KEYS.COMPANIES, []);
    setLocalItem(STORAGE_KEYS.COMPANIES, [newCompany, ...localCompanies]);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('companies').insert(newCompany);
        if (newContact) {
          await supabase.from('contacts').insert(newContact);
        }
      } catch (e) {
        console.warn('Supabase createCompanyWithContact fallback:', e);
      }
    }

    return { company: newCompany, contact: newContact, isDuplicate: false };
  }

  static async addManualCompany(payload: {
    company_name: string;
    website?: string;
    domain?: string;
    industry?: string;
    country?: string;
    city?: string;
    description?: string;
    contact_name?: string;
    email?: string;
    job_title?: string;
    linkedin_url?: string;
    campaign_id?: string;
  }): Promise<{ company: Company; contact?: Contact; lead?: Lead; isDuplicate: boolean }> {
    const domain = payload.domain 
      ? this.cleanDomain(payload.domain) 
      : payload.website 
      ? this.cleanDomain(payload.website) 
      : this.cleanDomain(payload.company_name);

    const formattedWebsite = payload.website 
      ? (payload.website.startsWith('http') ? payload.website : `https://${payload.website}`) 
      : (domain ? `https://${domain}` : undefined);

    const hasContact = payload.contact_name || payload.email;
    const [firstName, ...rest] = (payload.contact_name || '').split(' ');
    const lastName = rest.join(' ');

    const { company, contact, isDuplicate } = await this.createCompanyWithContact(
      {
        company_name: payload.company_name,
        domain,
        website: formattedWebsite,
        industry: payload.industry || 'Creative / Design',
        country: payload.country || 'Worldwide',
        city: payload.city,
        description: payload.description,
        source: 'manual',
        source_reference: 'Manual OS Entry',
        qualification_status: 'unqualified',
        contact_status: 'not_contacted',
      },
      hasContact ? {
        full_name: payload.contact_name || 'Decision Maker',
        first_name: firstName || 'Decision',
        last_name: lastName || 'Maker',
        email: payload.email || undefined as any,
        job_title: payload.job_title || 'Creative Director',
        linkedin_url: payload.linkedin_url,
        email_status: payload.email ? 'unverified' : 'unverified',
        is_primary_contact: true,
      } : undefined
    );

    let lead: Lead | undefined;
    if (payload.campaign_id) {
      const existingLeads = await this.getLeads(payload.campaign_id);
      const leadExists = existingLeads.find(l => l.company_id === company.id);

      if (leadExists) {
        lead = leadExists;
      } else {
        lead = await this.createLead({
          campaign_id: payload.campaign_id,
          company_id: company.id,
          contact_id: contact?.id,
          status: 'new',
          qualification_score: 0,
          qualification_reason: 'Manually added to campaign',
          research_status: 'not_started',
          personalization_status: 'pending',
          outreach_status: 'not_started',
        });

        await this.logActivity(
          'lead_created',
          `Linked manually created company "${company.company_name}" to campaign`,
          { campaignId: payload.campaign_id, companyId: company.id }
        );
      }
    }

    await this.logActivity(
      'company_added',
      `Manually added company "${company.company_name}" (${domain})`,
      { companyId: company.id, isDuplicate }
    );

    return { company, contact, lead, isDuplicate };
  }

  // ---------------------------------------------------------------------------
  // Leads (Campaign - Company relationship)
  // ---------------------------------------------------------------------------
  static async getLeads(campaignId?: string): Promise<Lead[]> {
    let rawLeads: Lead[] = [];
    let fetchedFromDatabase = false;

    // 1. Try server REST endpoint first
    try {
      const queryParam = campaignId ? `?campaign_id=${encodeURIComponent(campaignId)}` : '';
      const response = await fetch(`/api/leads${queryParam}`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          rawLeads = data as Lead[];
          fetchedFromDatabase = true;
        }
      }
    } catch (apiErr) {
      // Fall through to direct Supabase query
    }

    // 2. Direct Supabase query fallback if API not available
    if (!fetchedFromDatabase && isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('leads').select('*').order('created_at', { ascending: false });
        if (campaignId) {
          query = query.eq('campaign_id', campaignId);
        }
        const { data, error } = await query;
        if (!error && data) {
          rawLeads = data as Lead[];
          fetchedFromDatabase = true;
        }
      } catch (e) {
        console.warn('Supabase getLeads fallback:', e);
      }
    }

    if (fetchedFromDatabase) {
      // Overwrite local storage with authoritative database records
      if (!campaignId) {
        setLocalItem(STORAGE_KEYS.LEADS, rawLeads);
      }
    } else {
      const localLeads = getLocalItem<Lead[]>(STORAGE_KEYS.LEADS, []);
      rawLeads = campaignId ? localLeads.filter(l => l.campaign_id === campaignId) : localLeads;
    }

    if (rawLeads.length === 0) {
      return [];
    }

    let companies = await this.getCompanies();
    const contacts = getLocalItem<Contact[]>(STORAGE_KEYS.CONTACTS, []);
    const campaigns = await this.getCampaigns();
    const emails = getLocalItem<EmailMessage[]>(STORAGE_KEYS.EMAIL_MESSAGES, []);

    let companiesUpdated = false;
    let leadsUpdated = false;

    const result = rawLeads.map(lead => {
      let comp = companies.find(c =>
        c.id === lead.company_id ||
        (lead.company && c.id === lead.company.id) ||
        (lead.company?.domain && this.cleanDomain(c.domain) === this.cleanDomain(lead.company.domain)) ||
        (lead.company?.company_name && c.company_name.toLowerCase() === lead.company.company_name.toLowerCase()) ||
        ((lead as any).domain && this.cleanDomain(c.domain) === this.cleanDomain((lead as any).domain)) ||
        ((lead as any).company_name && c.company_name.toLowerCase() === (lead as any).company_name.toLowerCase())
      );

      // If company was already on lead object or can be resolved from catalog
      if (!comp) {
        if (lead.company && lead.company.company_name) {
          comp = {
            ...lead.company,
            id: lead.company_id || lead.company.id || `comp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            domain: this.cleanDomain(lead.company.domain || lead.company.website || lead.company.company_name),
            source: lead.company.source || 'ai_web_research',
            qualification_status: lead.company.qualification_status || 'qualified',
            contact_status: lead.company.contact_status || 'not_contacted',
            created_at: lead.company.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          companies.push(comp);
          companiesUpdated = true;
        } else {
          const catalogMatch = findCatalogBrand(
            (lead as any).domain ||
            (lead as any).company_name ||
            lead.qualification_reason ||
            ''
          );
          if (catalogMatch) {
            comp = {
              id: lead.company_id || `comp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
              company_name: catalogMatch.company_name,
              domain: catalogMatch.domain,
              website: catalogMatch.website,
              industry: catalogMatch.industry,
              country: catalogMatch.country,
              city: catalogMatch.city,
              description: catalogMatch.description,
              source: 'ai_web_research',
              qualification_status: 'qualified',
              contact_status: 'not_contacted',
              created_at: lead.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            companies.push(comp);
            companiesUpdated = true;
          }
        }
      }

      if (comp && lead.company_id !== comp.id) {
        lead.company_id = comp.id;
        leadsUpdated = true;
      }

      const cont = contacts.find(c => c.id === lead.contact_id) || comp?.primary_contact;
      const catalogDM = comp ? findCatalogDecisionMaker(comp.domain || comp.website || comp.company_name) : undefined;
      
      const resolvedContactName = lead.contact_name || cont?.full_name || catalogDM?.full_name;
      const resolvedContactTitle = lead.contact_title || cont?.job_title || catalogDM?.job_title;
      const resolvedContactEmail = lead.contact_email || cont?.email || catalogDM?.email;
      const resolvedContactLinkedin = lead.contact_linkedin || cont?.linkedin_url || catalogDM?.linkedin_url;
      const resolvedContactSource = lead.contact_source || cont?.contact_source || (catalogDM ? catalogDM.source : undefined);
      const resolvedConfidence = lead.contact_confidence || cont?.contact_confidence || catalogDM?.confidence || (resolvedContactName ? 'MEDIUM' : 'NOT_FOUND');
      const resolvedContactStatus = lead.contact_status || cont?.contact_status || (resolvedContactName ? 'found' : 'not_found');
      const resolvedEmailVerification = lead.email_verification_status || cont?.email_verification_status || catalogDM?.email_verification || (resolvedContactEmail ? 'unverified' : 'not_found');

      return {
        ...lead,
        company: comp || lead.company,
        contact: cont || (catalogDM ? {
          id: `cont-cat-${lead.id}`,
          company_id: comp?.id || lead.company_id,
          full_name: catalogDM.full_name,
          first_name: catalogDM.first_name,
          last_name: catalogDM.last_name,
          job_title: catalogDM.job_title,
          email: catalogDM.email || '',
          email_status: (catalogDM.email_verification === 'verified' ? 'verified' : 'unverified') as 'verified' | 'unverified',
          linkedin_url: catalogDM.linkedin_url,
          contact_confidence: catalogDM.confidence,
          contact_status: 'found' as ContactStatus,
          email_verification_status: catalogDM.email_verification,
          contact_source: catalogDM.source,
          is_primary_contact: true,
          created_at: lead.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Contact : undefined),
        contact_name: resolvedContactName,
        contact_title: resolvedContactTitle,
        contact_email: resolvedContactEmail,
        contact_linkedin: resolvedContactLinkedin,
        contact_source: resolvedContactSource,
        contact_confidence: resolvedConfidence,
        contact_status: resolvedContactStatus,
        email_verification_status: resolvedEmailVerification,
        campaign: campaigns.find(c => c.id === lead.campaign_id),
        latest_email: emails.find(e => e.lead_id === lead.id),
      };
    });

    if (companiesUpdated) {
      setLocalItem(STORAGE_KEYS.COMPANIES, companies);
    }
    if (leadsUpdated) {
      setLocalItem(STORAGE_KEYS.LEADS, rawLeads.map(l => {
        const match = result.find(hl => hl.id === l.id);
        return match ? { ...l, company_id: match.company_id } : l;
      }));
    }

    return result;
  }

  /**
   * Enriches a single lead with decision-maker contact details.
   * Priority: Founder > CEO > Brand Director > Creative Director > Marketing Director > Head of Marketing > E-commerce Director > Growth Director.
   * Evidence-based email verification: HIGH/MEDIUM/LOW/NOT_FOUND.
   */
  static async enrichLeadContact(leadId: string): Promise<{
    lead: Lead | null;
    contact: Contact | null;
    status: ContactStatus;
    confidence: ContactConfidence;
    emailVerification: EmailVerificationStatus;
    details: string;
  }> {
    const lead = await this.getLeadById(leadId);
    if (!lead) {
      throw new Error(`Lead ${leadId} not found.`);
    }

    const company = await this.resolveCompanyForLead(lead);
    if (!company) {
      throw new Error(`Unable to resolve company information for lead ${leadId}.`);
    }

    const campaign = await this.resolveCampaignForLead(lead);

    let contactData: any = null;

    try {
      const response = await fetch('/api/enrichment/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          company,
          campaign,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.contact) {
          contactData = data.contact;
        }
      }
    } catch (err: any) {
      console.warn('[CRMService.enrichLeadContact] API call error:', err?.message);
    }

    // Ground-truth catalog fallback if API failed
    if (!contactData) {
      const catalogDM = findCatalogDecisionMaker(company.domain || company.website || company.company_name);
      if (catalogDM) {
        contactData = {
          full_name: catalogDM.full_name,
          first_name: catalogDM.first_name,
          last_name: catalogDM.last_name,
          job_title: catalogDM.job_title,
          email: catalogDM.email,
          linkedin_url: catalogDM.linkedin_url,
          contact_confidence: catalogDM.confidence || 'HIGH',
          contact_status: 'found',
          email_verification_status: catalogDM.email_verification || 'verified',
          contact_source: catalogDM.source || 'Executive Brand Directory',
          enriched_at: new Date().toISOString(),
          reason: `Catalog ground-truth decision-maker for ${company.company_name}.`,
        };
      } else {
        contactData = {
          full_name: null,
          first_name: null,
          last_name: null,
          job_title: null,
          email: null,
          contact_confidence: 'NOT_FOUND',
          contact_status: 'not_found',
          email_verification_status: 'not_found',
          contact_source: 'Lookup',
          enriched_at: new Date().toISOString(),
          reason: 'No decision maker identified.',
        };
      }
    }

    const confidence: ContactConfidence = contactData.contact_confidence || 'NOT_FOUND';
    const contactStatus: ContactStatus = contactData.contact_status || 'not_found';
    const emailVerification: EmailVerificationStatus = contactData.email_verification_status || 'not_found';

    let createdOrUpdatedContact: Contact | null = null;

    if (contactData.full_name) {
      const contacts = getLocalItem<Contact[]>(STORAGE_KEYS.CONTACTS, []);
      let existingContact = contacts.find(c => 
        (lead.contact_id && c.id === lead.contact_id) || 
        (c.company_id === company.id && c.is_primary_contact) ||
        (contactData.email && c.email === contactData.email)
      );

      const contactPayload: Partial<Contact> = {
        full_name: contactData.full_name,
        first_name: contactData.first_name || contactData.full_name.split(' ')[0],
        last_name: contactData.last_name || contactData.full_name.split(' ').slice(1).join(' '),
        job_title: contactData.job_title || 'Creative Director',
        email: contactData.email || '',
        linkedin_url: contactData.linkedin_url || undefined,
        company_id: company.id,
        is_primary_contact: true,
        contact_source: contactData.contact_source || 'AI Executive Discovery',
        contact_confidence: confidence,
        contact_status: contactStatus,
        email_verification_status: emailVerification,
        email_status: (emailVerification === 'verified' ? 'verified' : 'unverified') as 'verified' | 'unverified',
        enriched_at: contactData.enriched_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (existingContact) {
        const updatedContact: Contact = {
          ...existingContact,
          ...contactPayload,
        };
        const idx = contacts.findIndex(c => c.id === existingContact!.id);
        contacts[idx] = updatedContact;
        setLocalItem(STORAGE_KEYS.CONTACTS, contacts);
        createdOrUpdatedContact = updatedContact;
      } else {
        const newContact: Contact = {
          id: `cont-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          created_at: new Date().toISOString(),
          ...contactPayload,
        } as Contact;
        setLocalItem(STORAGE_KEYS.CONTACTS, [newContact, ...contacts]);
        createdOrUpdatedContact = newContact;
      }

      // Update Company primary contact
      const companies = getLocalItem<Company[]>(STORAGE_KEYS.COMPANIES, []);
      const compIdx = companies.findIndex(c => c.id === company.id);
      if (compIdx !== -1) {
        companies[compIdx].primary_contact = createdOrUpdatedContact;
        companies[compIdx].updated_at = new Date().toISOString();
        setLocalItem(STORAGE_KEYS.COMPANIES, companies);
      }
    }

    // Update Lead with denormalized enrichment fields
    await this.updateLead(leadId, {
      contact_id: createdOrUpdatedContact ? createdOrUpdatedContact.id : lead.contact_id,
      contact_name: contactData.full_name || undefined,
      contact_title: contactData.job_title || undefined,
      contact_email: contactData.email || undefined,
      contact_linkedin: contactData.linkedin_url || undefined,
      contact_source: contactData.contact_source || 'AI Executive Discovery',
      contact_confidence: confidence,
      contact_status: contactStatus,
      email_verification_status: emailVerification,
      enriched_at: contactData.enriched_at || new Date().toISOString(),
    });

    const refreshedLead = await this.getLeadById(leadId);

    await this.logActivity(
      'contact_enriched',
      contactData.full_name 
        ? `Discovered ${contactData.job_title || 'Executive'} ${contactData.full_name} for "${company.company_name}" (${confidence} confidence, ${emailVerification} email)`
        : `Contact enrichment for "${company.company_name}": No verifiable decision maker found.`,
      {
        leadId,
        companyId: company.id,
        contactName: contactData.full_name,
        contactTitle: contactData.job_title,
        contactEmail: contactData.email,
        confidence,
        contactStatus,
        emailVerification,
        reason: contactData.reason,
      }
    );

    return {
      lead: refreshedLead,
      contact: createdOrUpdatedContact,
      status: contactStatus,
      confidence,
      emailVerification,
      details: contactData.reason || (contactData.full_name ? `Identified ${contactData.full_name}` : 'No contact found'),
    };
  }

  /**
   * Batch enriches contacts for multiple leads with controlled concurrency.
   * Tracks full diagnostics: total, found, needs_review, not_found, emails_found, verified, unverified, failures.
   */
  static async batchEnrichContacts(
    leadIds: string[],
    campaignId?: string,
    onProgress?: (progress: { current: number; total: number; leadId: string; message: string }) => void
  ): Promise<{
    total: number;
    found: number;
    needsReview: number;
    notFound: number;
    emailsFound: number;
    verifiedEmails: number;
    unverifiedEmails: number;
    failures: number;
    results: Array<{
      leadId: string;
      success: boolean;
      contactName?: string;
      contactTitle?: string;
      contactEmail?: string;
      confidence: ContactConfidence;
      contactStatus: ContactStatus;
      emailVerification: EmailVerificationStatus;
      reason?: string;
    }>;
  }> {
    const leads = await this.getLeads(campaignId);
    const targetLeads = leads.filter(l => leadIds.includes(l.id));

    let total = targetLeads.length;
    let found = 0;
    let needsReview = 0;
    let notFound = 0;
    let emailsFound = 0;
    let verifiedEmails = 0;
    let unverifiedEmails = 0;
    let failures = 0;
    const results: any[] = [];

    for (let i = 0; i < targetLeads.length; i++) {
      const lead = targetLeads[i];
      if (onProgress) {
        onProgress({
          current: i + 1,
          total,
          leadId: lead.id,
          message: `Discovering decision maker for ${lead.company?.company_name || 'lead'} (${i + 1}/${total})...`,
        });
      }

      try {
        const enriched = await this.enrichLeadContact(lead.id);
        const st = enriched.status;
        const conf = enriched.confidence;
        const ev = enriched.emailVerification;

        if (st === 'found') found++;
        else if (st === 'needs_review') needsReview++;
        else notFound++;

        if (enriched.contact?.email || enriched.lead?.contact_email) {
          emailsFound++;
          if (ev === 'verified') verifiedEmails++;
          else unverifiedEmails++;
        }

        results.push({
          leadId: lead.id,
          success: true,
          contactName: enriched.contact?.full_name || enriched.lead?.contact_name,
          contactTitle: enriched.contact?.job_title || enriched.lead?.contact_title,
          contactEmail: enriched.contact?.email || enriched.lead?.contact_email,
          confidence: conf,
          contactStatus: st,
          emailVerification: ev,
          reason: enriched.details,
        });
      } catch (err: any) {
        failures++;
        notFound++;
        results.push({
          leadId: lead.id,
          success: false,
          confidence: 'NOT_FOUND',
          contactStatus: 'not_found',
          emailVerification: 'not_found',
          reason: err?.message || 'Enrichment failed',
        });
      }
    }

    await this.logActivity(
      'batch_contacts_enriched',
      `Batch contact enrichment finished: ${found} found (${verifiedEmails} verified emails), ${needsReview} needs review, ${notFound} not found across ${total} prospects.`,
      {
        total,
        found,
        needsReview,
        notFound,
        emailsFound,
        verifiedEmails,
        unverifiedEmails,
        failures,
      }
    );

    return {
      total,
      found,
      needsReview,
      notFound,
      emailsFound,
      verifiedEmails,
      unverifiedEmails,
      failures,
      results,
    };
  }

  /**
   * Resolves or repairs the company relationship for a lead.
   * Guarantees returning a valid Company object for deep research.
   */
  static async resolveCompanyForLead(lead: Lead | string): Promise<Company | null> {
    let leadObj: Lead | null = null;
    if (typeof lead === 'string') {
      leadObj = await this.getLeadById(lead);
    } else {
      leadObj = lead;
    }
    if (!leadObj) return null;

    // 1. Direct valid company attached
    if (leadObj.company && leadObj.company.company_name && (leadObj.company.id || leadObj.company_id)) {
      return leadObj.company;
    }

    let companies = await this.getCompanies();

    // 2. Lookup by lead.company_id
    if (leadObj.company_id) {
      const match = companies.find(c => c.id === leadObj!.company_id);
      if (match) return match;
    }

    const anyLead = leadObj as any;

    // 3. Lookup by alternate attributes (domain, name, companyId)
    const searchDomain = this.cleanDomain(
      leadObj.company?.domain ||
      leadObj.company?.website ||
      anyLead.domain ||
      anyLead.website ||
      ''
    );
    const searchName = (
      leadObj.company?.company_name ||
      anyLead.company_name ||
      anyLead.name ||
      ''
    ).trim().toLowerCase();

    const matchByAlt = companies.find(c => {
      if (anyLead.companyId && c.id === anyLead.companyId) return true;
      if (searchDomain && c.domain && this.cleanDomain(c.domain) === searchDomain) return true;
      if (searchName && c.company_name && c.company_name.toLowerCase() === searchName) return true;
      return false;
    });

    if (matchByAlt) {
      if (leadObj.id && leadObj.company_id !== matchByAlt.id) {
        await this.updateLead(leadObj.id, { company_id: matchByAlt.id });
      }
      return matchByAlt;
    }

    // 4. Reconstruct / repair from curated catalog or embedded reason text
    const catalogMatch = findCatalogBrand(searchDomain || searchName || leadObj.qualification_reason || '');

    const finalName = catalogMatch?.company_name || leadObj.company?.company_name || anyLead.company_name || searchName || 'Unknown Company';
    const finalDomain = catalogMatch?.domain || searchDomain || this.cleanDomain(finalName);
    const finalWebsite = catalogMatch?.website || (finalDomain ? `https://${finalDomain}` : undefined);
    const finalIndustry = catalogMatch?.industry || leadObj.company?.industry || 'Luxury Fragrance & Niche Perfumery';
    const finalCountry = catalogMatch?.country || leadObj.company?.country || 'Worldwide';
    const finalCity = catalogMatch?.city || leadObj.company?.city;
    const finalDesc = catalogMatch?.description || leadObj.company?.description || `${finalName} brand`;

    const { company: repairedCompany } = await this.createCompanyWithContact({
      company_name: finalName,
      domain: finalDomain || 'brand.com',
      website: finalWebsite,
      industry: finalIndustry,
      country: finalCountry,
      city: finalCity,
      description: finalDesc,
      source: 'ai_web_research',
      qualification_status: 'qualified',
      contact_status: 'not_contacted',
    });

    if (leadObj.id) {
      await this.updateLead(leadObj.id, { company_id: repairedCompany.id });
    }

    return repairedCompany;
  }

  static async createLead(payload: Omit<Lead, 'id' | 'created_at' | 'updated_at'>): Promise<Lead> {
    const id = `lead-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const newLead: Lead = {
      ...payload,
      id,
      research_status: payload.research_status || 'not_started',
      qualification_score: payload.qualification_score ?? 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const leads = getLocalItem<Lead[]>(STORAGE_KEYS.LEADS, []);
    setLocalItem(STORAGE_KEYS.LEADS, [newLead, ...leads]);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('leads').insert(newLead);
      } catch (e) {
        console.warn('Supabase createLead fallback:', e);
      }
    }

    return newLead;
  }

  static async updateLead(id: string, updates: Partial<Lead>): Promise<Lead | null> {
    const leads = getLocalItem<Lead[]>(STORAGE_KEYS.LEADS, []);
    const idx = leads.findIndex(l => l.id === id);
    if (idx === -1) return null;

    const updated: Lead = {
      ...leads[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    leads[idx] = updated;
    setLocalItem(STORAGE_KEYS.LEADS, leads);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('leads').update(updated).eq('id', id);
      } catch (e) {
        console.warn('Supabase updateLead fallback:', e);
      }
    }

    return updated;
  }

  static async getLeadById(id: string): Promise<Lead | null> {
    const leads = await this.getLeads();
    return leads.find(l => l.id === id) || null;
  }

  static async getContacts(): Promise<Contact[]> {
    return getLocalItem<Contact[]>(STORAGE_KEYS.CONTACTS, []);
  }

  static async getContactById(id: string): Promise<Contact | null> {
    const contacts = await this.getContacts();
    return contacts.find(c => c.id === id) || null;
  }

  static async getCompanyById(id: string): Promise<Company | null> {
    const companies = await this.getCompanies();
    return companies.find(c => c.id === id) || null;
  }

  static async updateLeadStatus(id: string, status: Lead['status'], reason?: string): Promise<Lead | null> {
    const leads = getLocalItem<Lead[]>(STORAGE_KEYS.LEADS, []);
    const current = leads.find(l => l.id === id);
    const updated = await this.updateLead(id, {
      status,
      qualification_reason: reason !== undefined ? reason : current?.qualification_reason,
    });

    if (updated) {
      await this.logActivity(
        'status_changed',
        `Lead status transitioned to "${status}"`,
        { leadId: id, status, reason }
      );
    }
    return updated;
  }

  static async qualifyLead(id: string, score: number = 85, reason?: string): Promise<Lead | null> {
    const leads = await this.getLeads();
    const lead = leads.find(l => l.id === id);
    const companyName = lead?.company?.company_name || 'Lead';

    const updated = await this.updateLead(id, {
      status: 'qualified',
      qualification_score: Math.min(100, Math.max(0, score)),
      qualification_reason: reason || 'Manually qualified based on designer ICP and storefront profile',
    });

    await this.logActivity(
      'lead_qualified',
      `Qualified prospect "${companyName}" with score ${score}/100`,
      { leadId: id, score, reason }
    );
    return updated;
  }

  static async rejectLead(id: string, reason?: string): Promise<Lead | null> {
    const leads = await this.getLeads();
    const lead = leads.find(l => l.id === id);
    const companyName = lead?.company?.company_name || 'Lead';

    const updated = await this.updateLead(id, {
      status: 'rejected',
      qualification_score: 0,
      qualification_reason: reason || 'Rejected during manual qualification review',
    });

    await this.logActivity(
      'lead_rejected',
      `Rejected prospect "${companyName}" (${reason || 'Not matching ICP'})`,
      { leadId: id, reason }
    );
    return updated;
  }

  static async deleteLead(id: string): Promise<boolean> {
    if (!id) return false;

    const leads = getLocalItem<Lead[]>(STORAGE_KEYS.LEADS, []);
    const targetLead = leads.find(l => l.id === id);
    const companyName = targetLead?.company?.company_name || 'Prospect';

    // 1. Remove from local leads list immediately
    const filteredLeads = leads.filter(l => l.id !== id);
    setLocalItem(STORAGE_KEYS.LEADS, filteredLeads);

    // 2. Remove associated local email drafts/messages
    const emails = getLocalItem<EmailMessage[]>(STORAGE_KEYS.EMAIL_MESSAGES, []);
    setLocalItem(STORAGE_KEYS.EMAIL_MESSAGES, emails.filter(e => e.lead_id !== id));

    // 3. Remove associated local research briefs
    const research = getLocalItem<LeadResearch[]>(STORAGE_KEYS.LEAD_RESEARCH, []);
    setLocalItem(STORAGE_KEYS.LEAD_RESEARCH, research.filter(r => r.lead_id !== id));

    // 4. Remove associated local lead follow up sequence cadences
    const sequences = getLocalItem<LeadFollowUpSequence[]>(STORAGE_KEYS.LEAD_SEQUENCES, []);
    setLocalItem(STORAGE_KEYS.LEAD_SEQUENCES, sequences.filter(s => s.lead_id !== id));

    // 5. Remove associated local prospect replies
    const replies = getLocalItem<ProspectReply[]>(STORAGE_KEYS.PROSPECT_REPLIES, []);
    setLocalItem(STORAGE_KEYS.PROSPECT_REPLIES, replies.filter(p => p.lead_id !== id));

    // 6. Call real server DELETE endpoint
    try {
      const res = await fetch(`/api/leads/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        console.warn(`[deleteLead API] Response status ${res.status}`);
      }
    } catch (apiErr) {
      console.warn('[deleteLead API] Backend delete error:', apiErr);
    }

    // 7. Supabase client-side deletion as backup
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('prospect_replies').delete().eq('lead_id', id);
        await supabase.from('lead_research').delete().eq('lead_id', id);
        await supabase.from('lead_follow_up_sequences').delete().eq('lead_id', id);
        await supabase.from('email_messages').delete().eq('lead_id', id);
        await supabase.from('activities').delete().eq('lead_id', id);
        await supabase.from('leads').delete().eq('id', id);
      } catch (e) {
        console.warn('Supabase deleteLead relational fallback notice:', e);
      }
    }

    await this.logActivity(
      'lead_deleted',
      `Deleted prospect "${companyName}" and all associated drafts/research`,
      { leadId: id, companyName }
    );

    return true;
  }

  static async deleteLeads(ids: string[]): Promise<{ count: number; success: boolean }> {
    if (!ids || ids.length === 0) return { count: 0, success: true };
    const idSet = new Set(ids);

    // 1. Filter local leads
    const leads = getLocalItem<Lead[]>(STORAGE_KEYS.LEADS, []);
    const remainingLeads = leads.filter(l => !idSet.has(l.id));
    setLocalItem(STORAGE_KEYS.LEADS, remainingLeads);

    // 2. Filter local email drafts/messages
    const emails = getLocalItem<EmailMessage[]>(STORAGE_KEYS.EMAIL_MESSAGES, []);
    setLocalItem(STORAGE_KEYS.EMAIL_MESSAGES, emails.filter(e => !idSet.has(e.lead_id)));

    // 3. Filter local research
    const research = getLocalItem<LeadResearch[]>(STORAGE_KEYS.LEAD_RESEARCH, []);
    setLocalItem(STORAGE_KEYS.LEAD_RESEARCH, research.filter(r => !idSet.has(r.lead_id)));

    // 4. Filter local lead follow up cadences
    const sequences = getLocalItem<LeadFollowUpSequence[]>(STORAGE_KEYS.LEAD_SEQUENCES, []);
    setLocalItem(STORAGE_KEYS.LEAD_SEQUENCES, sequences.filter(s => !idSet.has(s.lead_id)));

    // 5. Filter local prospect replies
    const replies = getLocalItem<ProspectReply[]>(STORAGE_KEYS.PROSPECT_REPLIES, []);
    setLocalItem(STORAGE_KEYS.PROSPECT_REPLIES, replies.filter(p => !idSet.has(p.lead_id)));

    // 6. Call real server batch-delete endpoint
    try {
      const res = await fetch('/api/leads/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: ids }),
      });
      if (!res.ok) {
        console.warn(`[batch-delete API] Response status ${res.status}`);
      }
    } catch (apiErr) {
      console.warn('[batch-delete API] Backend batch delete error:', apiErr);
    }

    // 7. Supabase bulk deletion in dependency-safe order
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('prospect_replies').delete().in('lead_id', ids);
        await supabase.from('lead_research').delete().in('lead_id', ids);
        await supabase.from('lead_follow_up_sequences').delete().in('lead_id', ids);
        await supabase.from('email_messages').delete().in('lead_id', ids);
        await supabase.from('activities').delete().in('lead_id', ids);
        await supabase.from('leads').delete().in('id', ids);
      } catch (e) {
        console.warn('Supabase bulk deleteLeads fallback notice:', e);
      }
    }

    await this.logActivity(
      'lead_deleted',
      `Bulk deleted ${ids.length} prospects and associated campaign records`,
      { deletedCount: ids.length, ids }
    );

    return { count: ids.length, success: true };
  }

  static async clearAllLeads(campaignId?: string): Promise<{ success: boolean; message: string }> {
    // 1. Call server API
    try {
      await fetch('/api/leads/clear-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId }),
      });
    } catch (e) {
      console.warn('Backend clear-all notice:', e);
    }

    // 2. Supabase fallback
    if (isSupabaseConfigured && supabase) {
      if (campaignId) {
        try {
          const { data: campaignLeads } = await supabase.from('leads').select('id').eq('campaign_id', campaignId);
          const leadIds = (campaignLeads || []).map(l => l.id);
          if (leadIds.length > 0) {
            await supabase.from('prospect_replies').delete().in('lead_id', leadIds);
            await supabase.from('lead_research').delete().in('lead_id', leadIds);
            await supabase.from('lead_follow_up_sequences').delete().in('lead_id', leadIds);
            await supabase.from('email_messages').delete().in('lead_id', leadIds);
            await supabase.from('activities').delete().in('lead_id', leadIds);
            await supabase.from('leads').delete().in('id', leadIds);
          }
        } catch (e) {
          console.warn('Supabase clear campaign leads notice:', e);
        }
      } else {
        try { await supabase.from('activities').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch (e) {}
        try { await supabase.from('prospect_replies').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch (e) {}
        try { await supabase.from('lead_research').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch (e) {}
        try { await supabase.from('lead_follow_up_sequences').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch (e) {}
        try { await supabase.from('email_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch (e) {}
        try { await supabase.from('leads').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch (e) {}
        try { await supabase.from('contacts').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch (e) {}
        try { await supabase.from('companies').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch (e) {}
      }
    }

    // 3. Clear Local Storage
    if (campaignId) {
      const leads = getLocalItem<Lead[]>(STORAGE_KEYS.LEADS, []);
      const campaignLeadIds = new Set(leads.filter(l => l.campaign_id === campaignId).map(l => l.id));
      setLocalItem(STORAGE_KEYS.LEADS, leads.filter(l => l.campaign_id !== campaignId));
      
      const emails = getLocalItem<EmailMessage[]>(STORAGE_KEYS.EMAIL_MESSAGES, []);
      setLocalItem(STORAGE_KEYS.EMAIL_MESSAGES, emails.filter(e => e.campaign_id !== campaignId && !campaignLeadIds.has(e.lead_id)));

      const research = getLocalItem<LeadResearch[]>(STORAGE_KEYS.LEAD_RESEARCH, []);
      setLocalItem(STORAGE_KEYS.LEAD_RESEARCH, research.filter(r => r.campaign_id !== campaignId && !campaignLeadIds.has(r.lead_id)));

      const sequences = getLocalItem<LeadFollowUpSequence[]>(STORAGE_KEYS.LEAD_SEQUENCES, []);
      setLocalItem(STORAGE_KEYS.LEAD_SEQUENCES, sequences.filter(s => s.campaign_id !== campaignId && !campaignLeadIds.has(s.lead_id)));

      const replies = getLocalItem<ProspectReply[]>(STORAGE_KEYS.PROSPECT_REPLIES, []);
      setLocalItem(STORAGE_KEYS.PROSPECT_REPLIES, replies.filter(p => !campaignLeadIds.has(p.lead_id)));
    } else {
      setLocalItem(STORAGE_KEYS.LEADS, []);
      setLocalItem(STORAGE_KEYS.COMPANIES, []);
      setLocalItem(STORAGE_KEYS.CONTACTS, []);
      setLocalItem(STORAGE_KEYS.EMAIL_MESSAGES, []);
      setLocalItem(STORAGE_KEYS.LEAD_SEQUENCES, []);
      setLocalItem(STORAGE_KEYS.PROSPECT_REPLIES, []);
      setLocalItem(STORAGE_KEYS.ACTIVITIES, []);
      setLocalItem(STORAGE_KEYS.LEAD_RESEARCH, []);
    }

    return { success: true, message: 'Leads cleared successfully.' };
  }

  // ---------------------------------------------------------------------------
  // Email Messages & Queue (Build 04 Personalization Pipeline)
  // ---------------------------------------------------------------------------
  static async getEmailMessages(campaignId?: string): Promise<EmailMessage[]> {
    let rawEmails: EmailMessage[] = [];

    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('email_messages').select('*').order('created_at', { ascending: false });
        if (campaignId) {
          query = query.eq('campaign_id', campaignId);
        }
        const { data, error } = await query;
        if (!error && data) {
          rawEmails = data as EmailMessage[];
        }
      } catch (e) {
        console.warn('Supabase getEmailMessages fallback:', e);
      }
    }

    if (rawEmails.length === 0) {
      rawEmails = getLocalItem<EmailMessage[]>(STORAGE_KEYS.EMAIL_MESSAGES, []);
      if (campaignId) {
        rawEmails = rawEmails.filter(e => e.campaign_id === campaignId);
      }
    }

    const leads = await this.getLeads();
    const caseStudies = await this.getCaseStudies();
    const campaigns = await this.getCampaigns();
    const contacts = getLocalItem<Contact[]>(STORAGE_KEYS.CONTACTS, []);

    return rawEmails.map(e => {
      const lead = leads.find(l => l.id === e.lead_id);
      const contact = contacts.find(c => c.id === e.contact_id) || lead?.contact || lead?.company?.primary_contact;
      return {
        ...e,
        lead,
        contact,
        case_study: caseStudies.find(cs => cs.id === e.case_study_id) || lead?.campaign?.case_study,
        campaign: campaigns.find(c => c.id === e.campaign_id) || lead?.campaign,
      };
    });
  }

  static async getEmailMessageById(id: string): Promise<EmailMessage | null> {
    const all = await this.getEmailMessages();
    return all.find(e => e.id === id) || null;
  }

  static async getEmailByLeadId(leadId: string): Promise<EmailMessage | null> {
    const all = await this.getEmailMessages();
    return all.find(e => e.lead_id === leadId) || null;
  }

  static async saveEmailMessage(payload: Omit<EmailMessage, 'created_at' | 'updated_at'> & { created_at?: string; updated_at?: string }): Promise<EmailMessage> {
    const now = new Date().toISOString();
    const messageId = isValidUuid(payload.id) ? payload.id : (payload.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`);

    const newEmail: EmailMessage = {
      ...payload,
      id: messageId,
      status: payload.status || 'draft',
      created_at: payload.created_at || now,
      updated_at: now,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const dbPayload: any = {
          subject: newEmail.subject,
          body: newEmail.body,
          status: newEmail.status,
          message_type: newEmail.message_type || 'initial_outreach',
          personalization_metadata: newEmail.personalization_metadata || {},
          updated_at: now,
        };

        if (isValidUuid(newEmail.id)) dbPayload.id = newEmail.id;
        if (newEmail.campaign_id && isValidUuid(newEmail.campaign_id)) dbPayload.campaign_id = newEmail.campaign_id;
        if (newEmail.lead_id && isValidUuid(newEmail.lead_id)) dbPayload.lead_id = newEmail.lead_id;
        if (newEmail.contact_id && isValidUuid(newEmail.contact_id)) dbPayload.contact_id = newEmail.contact_id;
        if (newEmail.case_study_id && isValidUuid(newEmail.case_study_id)) dbPayload.case_study_id = newEmail.case_study_id;

        const { data, error } = await supabase
          .from('email_messages')
          .upsert(dbPayload, { onConflict: 'lead_id' })
          .select()
          .maybeSingle();

        if (!error && data) {
          newEmail.id = data.id;
        }
      } catch (e) {
        console.warn('Supabase saveEmailMessage fallback:', e);
      }
    }

    const localList = getLocalItem<EmailMessage[]>(STORAGE_KEYS.EMAIL_MESSAGES, []);
    const idx = localList.findIndex(e => e.id === newEmail.id || (e.lead_id && e.lead_id === newEmail.lead_id));
    if (idx >= 0) {
      localList[idx] = newEmail;
    } else {
      localList.unshift(newEmail);
    }
    setLocalItem(STORAGE_KEYS.EMAIL_MESSAGES, localList);

    // Update lead's personalization_status
    if (newEmail.lead_id) {
      let pStatus = 'drafted';
      if (newEmail.status === 'approved') pStatus = 'approved';
      if (newEmail.status === 'rejected') pStatus = 'rejected';
      if (newEmail.status === 'queued') pStatus = 'queued';
      await this.updateLead(newEmail.lead_id, { personalization_status: pStatus });
    }

    return newEmail;
  }

  static async updateEmailMessage(id: string, updates: Partial<EmailMessage>): Promise<EmailMessage | null> {
    const emails = getLocalItem<EmailMessage[]>(STORAGE_KEYS.EMAIL_MESSAGES, []);
    const idx = emails.findIndex(e => e.id === id);
    if (idx === -1) return null;

    const updated: EmailMessage = {
      ...emails[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    emails[idx] = updated;
    setLocalItem(STORAGE_KEYS.EMAIL_MESSAGES, emails);

    if (isSupabaseConfigured && supabase && isValidUuid(id)) {
      try {
        await supabase.from('email_messages').update({
          subject: updated.subject,
          body: updated.body,
          status: updated.status,
          personalization_metadata: updated.personalization_metadata,
          updated_at: updated.updated_at,
        }).eq('id', id);
      } catch (e) {
        console.warn('Supabase updateEmailMessage fallback:', e);
      }
    }

    if (updated.lead_id && updates.status) {
      let pStatus = 'drafted';
      if (updates.status === 'approved') pStatus = 'approved';
      if (updates.status === 'rejected') pStatus = 'rejected';
      if (updates.status === 'queued') pStatus = 'queued';
      await this.updateLead(updated.lead_id, { personalization_status: pStatus });
    }

    return updated;
  }

  static async updateEmailStatus(id: string, status: EmailMessage['status'], rejectionReason?: string): Promise<EmailMessage | null> {
    const emails = getLocalItem<EmailMessage[]>(STORAGE_KEYS.EMAIL_MESSAGES, []);
    const current = emails.find(e => e.id === id);
    if (!current) return null;

    const metadata = {
      ...(current.personalization_metadata || {}),
      ...(rejectionReason ? { rejection_reason: rejectionReason } : {}),
    };

    const updated = await this.updateEmailMessage(id, {
      status,
      personalization_metadata: metadata,
    });

    if (updated) {
      if (status === 'approved') {
        await this.logActivity('email_approved', `Approved email draft: "${updated.subject}"`, { emailId: id, leadId: updated.lead_id });
      } else if (status === 'rejected') {
        await this.logActivity('email_rejected', `Rejected email draft: "${updated.subject}" (${rejectionReason || 'Manual rejection'})`, { emailId: id, leadId: updated.lead_id, reason: rejectionReason });
      } else if (status === 'queued') {
        await this.logActivity('email_queued', `Queued approved email for dispatch: "${updated.subject}"`, { emailId: id, leadId: updated.lead_id });
      }
    }

    return updated;
  }

  static async batchUpdateEmailStatus(ids: string[], status: EmailMessage['status']): Promise<void> {
    for (const id of ids) {
      await this.updateEmailStatus(id, status);
    }
  }

  static async deleteEmailMessage(id: string): Promise<boolean> {
    const emails = getLocalItem<EmailMessage[]>(STORAGE_KEYS.EMAIL_MESSAGES, []);
    const filtered = emails.filter(e => e.id !== id);
    setLocalItem(STORAGE_KEYS.EMAIL_MESSAGES, filtered);

    if (isSupabaseConfigured && supabase && isValidUuid(id)) {
      try {
        await supabase.from('email_messages').delete().eq('id', id);
      } catch (e) {
        console.warn('Supabase deleteEmailMessage fallback:', e);
      }
    }
    return true;
  }

  // ---------------------------------------------------------------------------
  // Build 05: Delivery Engine & Settings
  // ---------------------------------------------------------------------------
  static async getDeliverySettings(): Promise<DeliverySettings> {
    return getLocalItem<DeliverySettings>(STORAGE_KEYS.DELIVERY_SETTINGS, DEFAULT_DELIVERY_SETTINGS);
  }

  static async updateDeliverySettings(updates: Partial<DeliverySettings>): Promise<DeliverySettings> {
    const current = await this.getDeliverySettings();
    const updated: DeliverySettings = {
      ...current,
      ...updates,
    };
    setLocalItem(STORAGE_KEYS.DELIVERY_SETTINGS, updated);
    await this.logActivity('settings_updated', 'Updated Gmail delivery engine and rate-limiting settings');
    return updated;
  }

  static async getTodaySentCount(): Promise<number> {
    const emails = await this.getEmailMessages();
    const todayStr = new Date().toISOString().slice(0, 10);
    return emails.filter(e => e.status === 'sent' && e.sent_at && e.sent_at.startsWith(todayStr)).length;
  }

  static async sendApprovedEmail(emailId: string): Promise<{ success: boolean; result?: SendEmailResult; error?: string }> {
    const emails = await this.getEmailMessages();
    const email = emails.find(e => e.id === emailId);

    if (!email) {
      throw new Error(`Email with ID ${emailId} not found.`);
    }

    // STRICT APPROVAL CHECK
    if (email.status !== 'approved' && email.status !== 'queued') {
      throw new Error(`Cannot send email in status "${email.status}". Only approved or queued emails can be sent.`);
    }

    const leads = await this.getLeads();
    const lead = leads.find(l => l.id === email.lead_id);
    const companies = await this.getCompanies();
    const company = companies.find(c => c.id === lead?.company_id);
    const contact = email.contact || lead?.contact || company?.primary_contact;

    const recipientEmail = contact?.email || lead?.company?.primary_contact?.email;
    if (!recipientEmail) {
      throw new Error(`No recipient email address found for lead "${company?.company_name || email.lead_id}".`);
    }

    const recipientName = contact?.first_name 
      ? `${contact.first_name} ${contact.last_name || ''}`.trim()
      : (company?.company_name || 'Founder');

    const profile = await this.getProfile();
    const senderEmail = profile.email || 'big.nssien@gmail.com';
    const senderName = profile.display_name || 'UI Dani';

    // Call Gmail delivery engine provider
    const sendResult = await gmailProvider.sendEmail({
      to: recipientEmail,
      recipientName,
      from: senderEmail,
      fromName: senderName,
      subject: email.subject,
      body: email.body,
      replyTo: senderEmail,
      emailId: email.id,
      leadId: email.lead_id,
      campaignId: email.campaign_id,
      isApproved: true,
    });

    const now = new Date().toISOString();

    if (sendResult.success) {
      // 1. Update Email status to 'sent'
      const updatedMetadata = {
        ...(email.personalization_metadata || {}),
        sent_timestamp: now,
        provider_message_id: sendResult.providerMessageId,
        simulated_delivery: sendResult.simulated,
      };

      await this.updateEmailMessage(email.id, {
        status: 'sent',
        sent_at: now,
        provider: 'gmail',
        provider_message_id: sendResult.providerMessageId,
        personalization_metadata: updatedMetadata,
      });

      // 2. Update Lead status to 'contacted'
      if (email.lead_id) {
        await this.updateLead(email.lead_id, {
          status: 'contacted',
          outreach_status: 'sent',
          first_contacted_at: now,
          last_contacted_at: now,
        });
      }

      // 3. Log Activity
      await this.logActivity(
        'email_sent',
        `Dispatched ${email.message_type === 'follow_up' ? `Follow-up Step #${email.sequence_step || 1}` : 'cold outreach'} to "${company?.company_name || recipientName}" (${recipientEmail}) via Gmail`,
        {
          emailId: email.id,
          leadId: email.lead_id,
          campaignId: email.campaign_id,
          recipient: recipientEmail,
          messageId: sendResult.providerMessageId,
          simulated: sendResult.simulated,
        }
      );

      // 4. Build 06: If initial email, automatically initiate Follow-Up Sequence (Day 3, 7, 14)
      if ((!email.sequence_step || email.sequence_step === 0) && email.lead_id) {
        try {
          await this.createOrStartLeadSequence({
            leadId: email.lead_id,
            campaignId: email.campaign_id,
            initialEmailId: email.id,
            initialSentAt: now,
          });
        } catch (seqErr) {
          console.warn('[CRMService] Could not auto-initiate follow-up sequence:', seqErr);
        }
      }

      return { success: true, result: sendResult };
    } else {
      // Record failure
      const updatedMetadata = {
        ...(email.personalization_metadata || {}),
        last_send_error: sendResult.error,
        last_send_attempt: now,
      };

      await this.updateEmailMessage(email.id, {
        personalization_metadata: updatedMetadata,
      });

      await this.logActivity(
        'email_failed',
        `Gmail delivery failed for "${company?.company_name || recipientName}" (${recipientEmail}): ${sendResult.error}`,
        {
          emailId: email.id,
          leadId: email.lead_id,
          error: sendResult.error,
        }
      );

      return { success: false, error: sendResult.error, result: sendResult };
    }
  }


  // ---------------------------------------------------------------------------
  // Build 06: Follow Up Sequences & Execution Engine
  // ---------------------------------------------------------------------------
  static async getFollowUpSequences(): Promise<FollowUpSequence[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const queryPromise = supabase
          .from('follow_up_sequences')
          .select(`
            *,
            steps:follow_up_steps(*)
          `)
          .order('created_at', { ascending: true });

        const { data, error } = await withTimeout<any>(queryPromise, 10000, { data: null, error: null }, 'Supabase getFollowUpSequences');

        if (!error && data && data.length > 0) {
          const sequences = (data as any[]).map(seq => ({
            ...seq,
            steps: Array.isArray(seq.steps)
              ? [...seq.steps].sort((a, b) => (a.step_number ?? 0) - (b.step_number ?? 0))
              : []
          }));
          setLocalItem(STORAGE_KEYS.FOLLOW_UPS, sequences);
          return sequences as FollowUpSequence[];
        } else if (error) {
          console.warn('Supabase getFollowUpSequences error/timeout:', error);
        }
      } catch (e) {
        console.warn('Supabase getFollowUpSequences fallback:', e);
      }
    }
    return getLocalItem<FollowUpSequence[]>(STORAGE_KEYS.FOLLOW_UPS, [DEFAULT_FOLLOW_UP_SEQUENCE]);
  }

  static async saveFollowUpSequence(sequence: FollowUpSequence): Promise<FollowUpSequence> {
    if (isSupabaseConfigured && supabase) {
      try {
        if (isValidUuid(sequence.id)) {
          await supabase.from('follow_up_sequences').update({
            name: sequence.name,
            status: sequence.status,
            updated_at: new Date().toISOString(),
          }).eq('id', sequence.id);

          if (sequence.steps && sequence.steps.length > 0) {
            for (const step of sequence.steps) {
              if (isValidUuid(step.id)) {
                await supabase.from('follow_up_steps').update({
                  step_number: step.step_number,
                  delay_days: step.delay_days,
                  subject_template: step.subject_template,
                  body_template: step.body_template,
                  active: step.active,
                  updated_at: new Date().toISOString(),
                }).eq('id', step.id);
              }
            }
          }
        }
      } catch (e) {
        console.warn('Supabase saveFollowUpSequence fallback:', e);
      }
    }

    const list = getLocalItem<FollowUpSequence[]>(STORAGE_KEYS.FOLLOW_UPS, [DEFAULT_FOLLOW_UP_SEQUENCE]);
    const idx = list.findIndex(s => s.id === sequence.id);
    if (idx >= 0) {
      list[idx] = sequence;
    } else {
      list.push(sequence);
    }
    setLocalItem(STORAGE_KEYS.FOLLOW_UPS, list);
    return sequence;
  }

  /**
   * Get all prospect-level active/historical follow-up sequences
   */
  static async getLeadFollowUpSequences(): Promise<LeadFollowUpSequence[]> {
    let list: LeadFollowUpSequence[] = [];
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('lead_follow_up_sequences')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          list = data as LeadFollowUpSequence[];
          setLocalItem(STORAGE_KEYS.LEAD_SEQUENCES, list);
        }
      } catch (e) {
        console.warn('Supabase getLeadFollowUpSequences fallback:', e);
      }
    }

    if (list.length === 0) {
      list = getLocalItem<LeadFollowUpSequence[]>(STORAGE_KEYS.LEAD_SEQUENCES, []);
    }

    // Attach relational joins
    const leads = await this.getLeads();
    const companies = await this.getCompanies();
    const campaigns = await this.getCampaigns();
    const templates = await this.getFollowUpSequences();

    return list.map(seq => {
      const lead = leads.find(l => l.id === seq.lead_id);
      const company = companies.find(c => c.id === seq.company_id || c.id === lead?.company_id);
      const campaign = campaigns.find(camp => camp.id === seq.campaign_id || camp.id === lead?.campaign_id);
      const template = templates.find(t => t.id === seq.follow_up_sequence_id || t.id === campaign?.follow_up_sequence_id);

      return {
        ...seq,
        lead,
        company,
        contact: lead?.contact || company?.primary_contact,
        campaign,
        sequence_template: template,
      };
    });
  }

  /**
   * Save or update a LeadFollowUpSequence
   */
  static async saveLeadFollowUpSequence(seq: LeadFollowUpSequence): Promise<LeadFollowUpSequence> {
    const list = getLocalItem<LeadFollowUpSequence[]>(STORAGE_KEYS.LEAD_SEQUENCES, []);
    const idx = list.findIndex(s => s.id === seq.id || (s.lead_id === seq.lead_id && s.campaign_id === seq.campaign_id));
    
    const updatedRecord = {
      ...seq,
      updated_at: new Date().toISOString(),
    };

    if (idx >= 0) {
      list[idx] = updatedRecord;
    } else {
      list.unshift(updatedRecord);
    }
    setLocalItem(STORAGE_KEYS.LEAD_SEQUENCES, list);

    if (isSupabaseConfigured && supabase && isValidUuid(seq.id)) {
      try {
        await supabase.from('lead_follow_up_sequences').upsert({
          id: seq.id,
          lead_id: seq.lead_id,
          contact_id: seq.contact_id,
          company_id: seq.company_id,
          campaign_id: seq.campaign_id,
          follow_up_sequence_id: seq.follow_up_sequence_id,
          current_step: seq.current_step,
          status: seq.status,
          initial_email_id: seq.initial_email_id,
          initial_email_sent_at: seq.initial_email_sent_at,
          next_follow_up_at: seq.next_follow_up_at,
          last_follow_up_sent_at: seq.last_follow_up_sent_at,
          last_follow_up_email_id: seq.last_follow_up_email_id,
          reply_detected_at: seq.reply_detected_at,
          completed_at: seq.completed_at,
          stopped_at: seq.stopped_at,
          stop_reason: seq.stop_reason,
          created_at: seq.created_at,
          updated_at: updatedRecord.updated_at,
        });
      } catch (e) {
        console.warn('Supabase saveLeadFollowUpSequence fallback:', e);
      }
    }

    return updatedRecord;
  }

  /**
   * Initiate automated 4-step sequence (Day 0 -> Day 3 -> Day 7 -> Day 14) for a contacted lead
   */
  static async createOrStartLeadSequence(params: {
    leadId: string;
    campaignId?: string;
    initialEmailId?: string;
    initialSentAt?: string;
  }): Promise<LeadFollowUpSequence | null> {
    const leads = await this.getLeads();
    const lead = leads.find(l => l.id === params.leadId);
    if (!lead) return null;

    const campaignId = params.campaignId || lead.campaign_id;
    const campaigns = await this.getCampaigns();
    const campaign = campaigns.find(c => c.id === campaignId);

    // Check if automated follow-ups are disabled for this campaign
    if (campaign && campaign.automated_follow_ups === false) {
      console.log(`[Follow-Up Engine] Automated follow-ups disabled for campaign ${campaign.name}. Skipping.`);
      return null;
    }

    const now = params.initialSentAt || new Date().toISOString();
    // Follow-up #1 scheduled for Day 3 (+3 days = 3 * 86,400,000 ms)
    const day3ScheduledTime = new Date(new Date(now).getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();

    const existingList = await this.getLeadFollowUpSequences();
    const existing = existingList.find(s => s.lead_id === params.leadId);

    const seqId = existing?.id || `seq-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const newSeq: LeadFollowUpSequence = {
      id: seqId,
      lead_id: params.leadId,
      campaign_id: campaignId,
      company_id: lead.company_id,
      contact_id: lead.contact_id || lead.company?.primary_contact?.id,
      follow_up_sequence_id: campaign?.follow_up_sequence_id || DEFAULT_FOLLOW_UP_SEQUENCE.id,
      current_step: 0, // Step 0 = Initial Email Sent
      status: 'active',
      initial_email_id: params.initialEmailId,
      initial_email_sent_at: now,
      next_follow_up_at: day3ScheduledTime,
      created_at: existing?.created_at || now,
      updated_at: now,
    };

    const saved = await this.saveLeadFollowUpSequence(newSeq);

    await this.logActivity(
      'sequence_started',
      `Activated automated follow-up cadence for "${lead.company?.company_name || 'Prospect'}": Follow-Up #1 scheduled for Day 3`,
      {
        leadId: params.leadId,
        campaignId,
        sequenceId: saved.id,
        nextFollowUpAt: day3ScheduledTime,
      }
    );

    return saved;
  }

  /**
   * Pause an active follow-up sequence
   */
  static async pauseLeadSequence(sequenceId: string, reason = 'manual_paused'): Promise<LeadFollowUpSequence | null> {
    const list = await this.getLeadFollowUpSequences();
    const seq = list.find(s => s.id === sequenceId);
    if (!seq) return null;

    seq.status = 'paused';
    seq.stopped_at = new Date().toISOString();
    seq.stop_reason = reason;

    const saved = await this.saveLeadFollowUpSequence(seq);
    await this.logActivity(
      'sequence_paused',
      `Paused follow-up sequence for "${seq.company?.company_name || 'Prospect'}" (${reason})`,
      { sequenceId, leadId: seq.lead_id }
    );
    return saved;
  }

  /**
   * Resume a paused follow-up sequence
   */
  static async resumeLeadSequence(sequenceId: string): Promise<LeadFollowUpSequence | null> {
    const list = await this.getLeadFollowUpSequences();
    const seq = list.find(s => s.id === sequenceId);
    if (!seq) return null;

    seq.status = 'active';
    seq.stopped_at = undefined;
    seq.stop_reason = undefined;

    // If next_follow_up_at expired while paused, set next follow-up to now or appropriately
    if (!seq.next_follow_up_at || new Date(seq.next_follow_up_at).getTime() < Date.now()) {
      seq.next_follow_up_at = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min from now
    }

    const saved = await this.saveLeadFollowUpSequence(seq);
    await this.logActivity(
      'sequence_resumed',
      `Resumed follow-up sequence for "${seq.company?.company_name || 'Prospect'}": Next follow-up at ${new Date(saved.next_follow_up_at!).toLocaleString()}`,
      { sequenceId, leadId: seq.lead_id }
    );
    return saved;
  }

  /**
   * Stop / cancel a follow-up sequence permanently
   */
  static async stopLeadSequence(sequenceId: string, reason = 'manual_cancelled'): Promise<LeadFollowUpSequence | null> {
    const list = await this.getLeadFollowUpSequences();
    const seq = list.find(s => s.id === sequenceId);
    if (!seq) return null;

    seq.status = 'cancelled';
    seq.stopped_at = new Date().toISOString();
    seq.stop_reason = reason;
    seq.next_follow_up_at = undefined;

    const saved = await this.saveLeadFollowUpSequence(seq);
    await this.logActivity(
      'sequence_cancelled',
      `Cancelled follow-up sequence for "${seq.company?.company_name || 'Prospect'}" (${reason})`,
      { sequenceId, leadId: seq.lead_id }
    );
    return saved;
  }

  /**
   * Check if a prospect has replied via Gmail thread/inbox
   */
  static async checkReplyForLead(leadId: string, contactEmail?: string, threadId?: string): Promise<{ replied: boolean; details?: any }> {
    try {
      const emailQuery = contactEmail ? `email=${encodeURIComponent(contactEmail)}` : '';
      const leadQuery = leadId ? `leadId=${encodeURIComponent(leadId)}` : '';
      const threadQuery = threadId ? `threadId=${encodeURIComponent(threadId)}` : '';
      const queryParams = [emailQuery, leadQuery, threadQuery].filter(Boolean).join('&');

      const resp = await fetch(`/api/email/check-reply?${queryParams}`);
      if (!resp.ok) return { replied: false };
      const data = await resp.json();

      if (data.replied) {
        // Prospect has replied! Immediately mark sequence as replied and stop future follow-ups
        const sequences = await this.getLeadFollowUpSequences();
        const seq = sequences.find(s => s.lead_id === leadId);

        if (seq && seq.status !== 'replied') {
          seq.status = 'replied';
          seq.reply_detected_at = data.replyDate || new Date().toISOString();
          seq.stop_reason = 'prospect_replied';
          seq.next_follow_up_at = undefined;
          await this.saveLeadFollowUpSequence(seq);

          // Update lead status to 'replied'
          await this.updateLead(leadId, {
            status: 'replied',
            outreach_status: 'replied',
          });

          await this.logActivity(
            'reply_received',
            `Prospect replied! Follow-up cadence automatically stopped for "${seq.company?.company_name || contactEmail}".`,
            {
              leadId,
              sequenceId: seq.id,
              replySnippet: data.snippet,
            }
          );
        }

        return { replied: true, details: data };
      }

      return { replied: false };
    } catch (err) {
      console.warn('[CRMService] checkReplyForLead error:', err);
      return { replied: false };
    }
  }

  /**
   * Process all due follow-up sequences with strict safety & reply checks
   */
  static async processDueFollowUpSequences(): Promise<{
    processed: number;
    sent: number;
    replied: number;
    skipped: number;
    errors: string[];
  }> {
    const results = {
      processed: 0,
      sent: 0,
      replied: 0,
      skipped: 0,
      errors: [] as string[],
    };

    const sequences = await this.getLeadFollowUpSequences();
    const now = Date.now();

    // Filter sequences that are active and due
    const dueSequences = sequences.filter(s => {
      if (s.status !== 'active') return false;
      if (!s.next_follow_up_at) return false;
      return new Date(s.next_follow_up_at).getTime() <= now;
    });

    const campaigns = await this.getCampaigns();
    const templates = await this.getFollowUpSequences();
    const caseStudies = await this.getCaseStudies();

    for (const seq of dueSequences) {
      results.processed++;

      // SAFETY CHECK 1: Sequence status
      if (seq.status !== 'active') {
        results.skipped++;
        continue;
      }

      const campaign = campaigns.find(c => c.id === seq.campaign_id);
      // SAFETY CHECK 2: Campaign active
      if (campaign && campaign.status === 'completed') {
        console.log(`[Follow-Up Engine] Campaign ${campaign.name} is completed. Skipping.`);
        results.skipped++;
        continue;
      }

      const contactEmail = seq.contact?.email || seq.lead?.company?.primary_contact?.email;

      // SAFETY CHECK 3: Reply Detection - Verify prospect hasn't replied
      const replyCheck = await this.checkReplyForLead(seq.lead_id, contactEmail);
      if (replyCheck.replied) {
        console.log(`[Follow-Up Engine] Reply detected from ${contactEmail}. Halting sequence.`);
        results.replied++;
        continue;
      }

      // Determine next step number (Step 1 = Day 3, Step 2 = Day 7, Step 3 = Day 14)
      const nextStepNumber = seq.current_step + 1;

      // SAFETY CHECK 4: Check if sequence reached final step
      if (nextStepNumber > 3) {
        seq.status = 'completed';
        seq.completed_at = new Date().toISOString();
        seq.stop_reason = 'max_steps_completed';
        seq.next_follow_up_at = undefined;
        await this.saveLeadFollowUpSequence(seq);
        results.skipped++;
        continue;
      }

      // Retrieve sequence template & step definition
      const sequenceTemplate = templates.find(t => t.id === seq.follow_up_sequence_id || t.id === campaign?.follow_up_sequence_id) || DEFAULT_FOLLOW_UP_SEQUENCE;
      const stepDef = sequenceTemplate.steps?.find(st => st.step_number === nextStepNumber) || DEFAULT_FOLLOW_UP_SEQUENCE.steps?.find(st => st.step_number === nextStepNumber);

      if (!stepDef) {
        results.errors.push(`Step definition not found for step #${nextStepNumber}`);
        results.skipped++;
        continue;
      }

      // Variable interpolation
      const firstName = seq.contact?.first_name || 'there';
      const companyName = seq.company?.company_name || 'your team';
      const caseStudy = caseStudies.find(cs => cs.id === campaign?.case_study_id) || caseStudies[0];
      const caseStudyUrl = caseStudy?.video_url || caseStudy?.portfolio_url || 'https://bignssien.wixstudio.com/uidani';

      const subject = stepDef.subject_template
        .replace(/\{\{first_name\}\}/g, firstName)
        .replace(/\{\{company_name\}\}/g, companyName);

      const body = stepDef.body_template
        .replace(/\{\{first_name\}\}/g, firstName)
        .replace(/\{\{company_name\}\}/g, companyName)
        .replace(/\{\{case_study_url\}\}/g, caseStudyUrl)
        .replace(/\{\{case_study_name\}\}/g, caseStudy?.name || 'Creative Video Teardown');

      // IDEMPOTENCY CHECK: Check if email for this sequence step was already sent
      const existingEmails = await this.getEmailMessages();
      const duplicate = existingEmails.find(e => 
        e.lead_id === seq.lead_id && 
        e.sequence_step === nextStepNumber && 
        (e.status === 'sent' || e.status === 'queued')
      );

      if (duplicate && duplicate.status === 'sent') {
        // Step was already dispatched; advance step without sending again
        seq.current_step = nextStepNumber;
        await this.saveLeadFollowUpSequence(seq);
        results.skipped++;
        continue;
      }

      // Create new EmailMessage in queue for this follow up
      const emailId = duplicate?.id || `email-fu-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const followUpEmail: EmailMessage = {
        id: emailId,
        campaign_id: seq.campaign_id,
        lead_id: seq.lead_id,
        contact_id: seq.contact_id,
        case_study_id: campaign?.case_study_id,
        sequence_id: seq.id,
        sequence_step: nextStepNumber,
        subject,
        body,
        status: 'queued',
        message_type: 'follow_up',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await this.saveEmailMessage(followUpEmail);

      // Dispatch via existing Gmail email delivery system
      const sendResult = await this.sendApprovedEmail(followUpEmail.id);

      if (sendResult.success) {
        const sentNow = new Date().toISOString();
        seq.current_step = nextStepNumber;
        seq.last_follow_up_sent_at = sentNow;
        seq.last_follow_up_email_id = followUpEmail.id;

        // Schedule next step:
        // Initial = Day 0
        // Step 1 = Day 3
        // Step 2 = Day 7 (+4 days after Day 3)
        // Step 3 = Day 14 (+7 days after Day 7)
        if (nextStepNumber === 1) {
          // Schedule Step 2 for Day 7 (initial + 7 days)
          const initialTime = new Date(seq.initial_email_sent_at).getTime();
          seq.next_follow_up_at = new Date(initialTime + 7 * 24 * 60 * 60 * 1000).toISOString();
        } else if (nextStepNumber === 2) {
          // Schedule Step 3 for Day 14 (initial + 14 days)
          const initialTime = new Date(seq.initial_email_sent_at).getTime();
          seq.next_follow_up_at = new Date(initialTime + 14 * 24 * 60 * 60 * 1000).toISOString();
        } else if (nextStepNumber === 3) {
          // Final follow-up sent! Mark completed
          seq.status = 'completed';
          seq.completed_at = sentNow;
          seq.next_follow_up_at = undefined;
          seq.stop_reason = 'max_steps_completed';
        }

        await this.saveLeadFollowUpSequence(seq);
        results.sent++;
      } else {
        results.errors.push(`Failed to send follow up step #${nextStepNumber} to ${contactEmail}: ${sendResult.error}`);
      }
    }

    return results;
  }

  /**
   * Fast-forward sequence for sandbox/development testing (simulates Day 3, 7, 14 expiry)
   */
  static async fastForwardSequence(sequenceId: string, daysForward = 3): Promise<LeadFollowUpSequence | null> {
    const list = await this.getLeadFollowUpSequences();
    const seq = list.find(s => s.id === sequenceId);
    if (!seq) return null;

    // Shift timestamps back by `daysForward` days so next_follow_up_at becomes immediately due
    const initialTime = new Date(seq.initial_email_sent_at).getTime() - daysForward * 24 * 60 * 60 * 1000;
    seq.initial_email_sent_at = new Date(initialTime).toISOString();
    seq.next_follow_up_at = new Date(Date.now() - 1000).toISOString(); // Due now!

    const saved = await this.saveLeadFollowUpSequence(seq);
    await this.logActivity(
      'sequence_resumed',
      `[Test Mode] Fast-forwarded cadence by ${daysForward} days for "${seq.company?.company_name || 'Prospect'}". Sequence step is now due for dispatch.`,
      { sequenceId, leadId: seq.lead_id }
    );
    return saved;
  }

  /**
   * Test tool: simulate prospect reply to verify that follow-ups stop
   */
  static async simulateProspectReply(sequenceId: string): Promise<boolean> {
    const list = await this.getLeadFollowUpSequences();
    const seq = list.find(s => s.id === sequenceId);
    if (!seq) return false;

    const prospectEmail = seq.contact?.email || 'prospect@brand.com';

    await fetch('/api/email/simulate-reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: prospectEmail,
        leadId: seq.lead_id,
        sequenceId: seq.id,
      }),
    });

    // Run reply check to apply stopping
    await this.checkReplyForLead(seq.lead_id, prospectEmail);
    return true;
  }


  // ---------------------------------------------------------------------------
  // Activities / Permanent Audit Trail
  // ---------------------------------------------------------------------------
  static async getActivities(limit = 40): Promise<Activity[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('activities')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);
        if (!error && data) {
          return data as Activity[];
        }
      } catch (e) {
        console.warn('Supabase getActivities fallback:', e);
      }
    }
    const activities = getLocalItem<Activity[]>(STORAGE_KEYS.ACTIVITIES, []);
    return activities.slice(0, limit);
  }

  static async logActivity(
    type: Activity['activity_type'],
    description: string,
    metadata?: Record<string, any>
  ): Promise<Activity> {
    const id = `act-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const newActivity: Activity = {
      id,
      activity_type: type,
      description,
      metadata,
      created_at: new Date().toISOString(),
    };

    const activities = getLocalItem<Activity[]>(STORAGE_KEYS.ACTIVITIES, []);
    const updated = [newActivity, ...activities.slice(0, 200)];
    setLocalItem(STORAGE_KEYS.ACTIVITIES, updated);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('activities').insert(newActivity);
      } catch (e) {
        console.warn('Supabase logActivity fallback:', e);
      }
    }

    return newActivity;
  }

  // ---------------------------------------------------------------------------
  // Lead Qualitative Research (Build 03 Campaign Research Briefs)
  // ---------------------------------------------------------------------------
  static async getLeadResearch(leadId: string, campaignId?: string): Promise<LeadResearch | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('lead_research').select('*').eq('lead_id', leadId);
        if (campaignId) {
          query = query.eq('campaign_id', campaignId);
        }
        const { data, error } = await query.maybeSingle();
        if (!error && data) {
          return data as LeadResearch;
        }
      } catch (e) {
        console.warn('Supabase getLeadResearch fallback:', e);
      }
    }

    const all = getLocalItem<LeadResearch[]>(STORAGE_KEYS.LEAD_RESEARCH, []);
    return all.find(r => r.lead_id === leadId && (!campaignId || r.campaign_id === campaignId)) || null;
  }

  static async getAllLeadResearch(campaignId?: string): Promise<LeadResearch[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('lead_research').select('*');
        if (campaignId) {
          query = query.eq('campaign_id', campaignId);
        }
        const { data, error } = await query;
        if (!error && data) {
          return data as LeadResearch[];
        }
      } catch (e) {
        console.warn('Supabase getAllLeadResearch fallback:', e);
      }
    }

    const all = getLocalItem<LeadResearch[]>(STORAGE_KEYS.LEAD_RESEARCH, []);
    return campaignId ? all.filter(r => r.campaign_id === campaignId) : all;
  }

  static async saveLeadResearch(research: LeadResearch): Promise<LeadResearch> {
    const researchId = isValidUuid(research.id) ? research.id : undefined;
    const now = new Date().toISOString();

    const recordToSave: LeadResearch = {
      ...research,
      id: researchId || `res-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      created_at: research.created_at || now,
      updated_at: now,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const payload: any = {
          lead_id: research.lead_id,
          campaign_id: research.campaign_id,
          company_name: research.company_name,
          website: research.website,
          domain: research.domain,
          industry: research.industry,
          country: research.country,
          city: research.city,
          company_overview: research.company_overview,
          products: research.products || [],
          target_audience: research.target_audience,
          brand_positioning: research.brand_positioning,
          visual_style: research.visual_style,
          marketing_channels: research.marketing_channels || [],
          product_marketing_observations: research.product_marketing_observations,
          content_observations: research.content_observations,
          potential_animation_opportunity: research.potential_animation_opportunity,
          personalization_angle: research.personalization_angle,
          language_signal: research.language_signal,
          research_confidence: research.research_confidence || 85,
          research_status: research.research_status || 'completed',
          raw_research_metadata: research.raw_research_metadata || {},
          updated_at: now,
        };

        if (researchId) {
          payload.id = researchId;
        }

        const { data, error } = await supabase
          .from('lead_research')
          .upsert(payload, { onConflict: 'lead_id, campaign_id' })
          .select()
          .single();

        if (!error && data) {
          recordToSave.id = data.id;
        }
      } catch (e) {
        console.warn('Supabase saveLeadResearch fallback:', e);
      }
    }

    // Save to local storage cache
    const list = getLocalItem<LeadResearch[]>(STORAGE_KEYS.LEAD_RESEARCH, []);
    const idx = list.findIndex(r => r.lead_id === recordToSave.lead_id && r.campaign_id === recordToSave.campaign_id);
    if (idx >= 0) {
      list[idx] = recordToSave;
    } else {
      list.push(recordToSave);
    }
    setLocalItem(STORAGE_KEYS.LEAD_RESEARCH, list);

    // Also update lead's research_status in leads table
    await this.updateLead(recordToSave.lead_id, {
      research_status: recordToSave.research_status,
      personalization_status: 'ready',
    });

    return recordToSave;
  }

  // ---------------------------------------------------------------------------
  // Build 07: Reply Intelligence & Conversation Management Methods
  // ---------------------------------------------------------------------------

  /**
   * Get all prospect replies, optionally filtered by campaign
   */
  static async getReplies(campaignId?: string): Promise<ProspectReply[]> {
    let rawReplies: ProspectReply[] = [];

    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('prospect_replies').select('*');
        if (campaignId && isValidUuid(campaignId)) {
          query = query.eq('campaign_id', campaignId);
        }
        const { data, error } = await query.order('received_at', { ascending: false });
        if (!error && data) {
          rawReplies = data as ProspectReply[];
        }
      } catch (err) {
        console.warn('Supabase getReplies fallback:', err);
      }
    }

    if (rawReplies.length === 0) {
      rawReplies = getLocalItem<ProspectReply[]>(STORAGE_KEYS.PROSPECT_REPLIES, []);
      if (campaignId) {
        rawReplies = rawReplies.filter(r => r.campaign_id === campaignId);
      }
    }

    // Join with leads, contacts, companies, campaigns
    const leads = await this.getLeads();
    const contacts = await this.getContacts();
    const companies = await this.getCompanies();
    const campaigns = await this.getCampaigns();

    const enriched = rawReplies.map(reply => {
      const lead = leads.find(l => l.id === reply.lead_id);
      const contact = contacts.find(c => c.id === (reply.contact_id || lead?.contact_id));
      const company = companies.find(c => c.id === (reply.company_id || lead?.company_id || contact?.company_id));
      const campaign = campaigns.find(c => c.id === (reply.campaign_id || lead?.campaign_id));

      return {
        ...reply,
        lead,
        contact,
        company,
        campaign,
      };
    });

    return enriched.sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime());
  }

  /**
   * Get a single reply by ID
   */
  static async getReplyById(id: string): Promise<ProspectReply | null> {
    const replies = await this.getReplies();
    return replies.find(r => r.id === id) || null;
  }

  /**
   * Get all replies for a specific lead
   */
  static async getRepliesByLeadId(leadId: string): Promise<ProspectReply[]> {
    const replies = await this.getReplies();
    return replies.filter(r => r.lead_id === leadId);
  }

  /**
   * Save or update a prospect reply
   */
  static async saveReply(reply: ProspectReply): Promise<ProspectReply> {
    const now = new Date().toISOString();
    const isRealUuid = isValidUuid(reply.id);

    const recordToSave: ProspectReply = {
      ...reply,
      id: isRealUuid ? reply.id : (reply.id || `reply-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`),
      created_at: reply.created_at || now,
      updated_at: now,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const payload: any = {
          lead_id: recordToSave.lead_id,
          contact_id: recordToSave.contact_id,
          company_id: recordToSave.company_id,
          campaign_id: recordToSave.campaign_id,
          sequence_id: recordToSave.sequence_id,
          thread_id: recordToSave.thread_id,
          gmail_message_id: recordToSave.gmail_message_id,
          from_email: recordToSave.from_email,
          from_name: recordToSave.from_name,
          to_email: recordToSave.to_email,
          subject: recordToSave.subject,
          body: recordToSave.body,
          snippet: recordToSave.snippet,
          received_at: recordToSave.received_at,
          status: recordToSave.status,
          classification: recordToSave.classification,
          intent: recordToSave.intent,
          priority: recordToSave.priority,
          detected_questions: recordToSave.detected_questions || [],
          detected_objections: recordToSave.detected_objections || [],
          suggested_action: recordToSave.suggested_action,
          recommended_pipeline_status: recordToSave.recommended_pipeline_status,
          response_draft: recordToSave.response_draft,
          responded_email_id: recordToSave.responded_email_id,
          responded_at: recordToSave.responded_at,
          updated_at: now,
        };

        if (isRealUuid) {
          payload.id = recordToSave.id;
        }

        const { data, error } = await supabase
          .from('prospect_replies')
          .upsert(payload, { onConflict: 'id' })
          .select()
          .single();

        if (!error && data) {
          recordToSave.id = data.id;
        }
      } catch (err) {
        console.warn('Supabase saveReply fallback:', err);
      }
    }

    // Local storage save
    const list = getLocalItem<ProspectReply[]>(STORAGE_KEYS.PROSPECT_REPLIES, []);
    const idx = list.findIndex(r => r.id === recordToSave.id || (r.gmail_message_id && r.gmail_message_id === recordToSave.gmail_message_id));
    if (idx >= 0) {
      list[idx] = recordToSave;
    } else {
      list.unshift(recordToSave);
    }
    setLocalItem(STORAGE_KEYS.PROSPECT_REPLIES, list);

    return recordToSave;
  }

  /**
   * Analyze a prospect reply using the Gemini Reply Intelligence Engine
   */
  static async analyzeReply(replyId: string, customText?: string): Promise<ProspectReply | null> {
    const reply = await this.getReplyById(replyId);
    if (!reply) return null;

    const lead = reply.lead || (await this.getLeadById(reply.lead_id));
    const emails = await this.getEmailMessages();
    const initialEmail = emails.find(e => e.lead_id === reply.lead_id && (e.message_type === 'initial_outreach' || !e.sequence_step));

    const response = await fetch('/api/replies/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        replyText: customText || reply.body || reply.snippet,
        fromEmail: reply.from_email,
        fromName: reply.from_name,
        subject: reply.subject,
        leadName: lead?.contact?.full_name,
        companyName: lead?.company?.company_name,
        campaignOffer: lead?.campaign?.offer || lead?.campaign?.niche || '3D Product Animation Teardown',
        initialOutreachSubject: initialEmail?.subject,
        initialOutreachBody: initialEmail?.body,
      }),
    });

    if (!response.ok) {
      console.warn('[CRMService] Reply analysis request failed:', response.statusText);
      return reply;
    }

    const data = await response.json();
    if (data.success && data.analysis) {
      const analysis: ReplyAnalysisResult = data.analysis;

      reply.classification = analysis.classification;
      reply.intent = analysis.intent;
      reply.priority = analysis.priority;
      reply.detected_questions = analysis.detected_questions;
      reply.detected_objections = analysis.detected_objections;
      reply.suggested_action = analysis.suggested_action;
      reply.recommended_pipeline_status = analysis.recommended_pipeline_status;
      if (reply.status === 'unread') {
        reply.status = 'needs_response';
      }

      await this.saveReply(reply);

      await this.logActivity(
        'reply_analyzed',
        `AI analyzed reply from "${reply.from_name || reply.from_email}": Classified as "${reply.classification}" (${reply.priority} priority).`,
        {
          replyId: reply.id,
          leadId: reply.lead_id,
          classification: reply.classification,
          priority: reply.priority,
          intent: reply.intent,
        }
      );
    }

    return reply;
  }

  /**
   * Generate an AI response draft for a prospect reply for Daniel's review & approval
   */
  static async generateResponseDraft(replyId: string): Promise<ResponseDraft | null> {
    const reply = await this.getReplyById(replyId);
    if (!reply) return null;

    const lead = reply.lead || (await this.getLeadById(reply.lead_id));
    const caseStudies = await this.getCaseStudies();
    const caseStudy = caseStudies.find(c => c.id === lead?.campaign?.case_study_id) || caseStudies[0];

    const response = await fetch('/api/replies/generate-response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        replyText: reply.body || reply.snippet,
        replyAnalysis: {
          intent: reply.intent,
          detected_questions: reply.detected_questions,
          detected_objections: reply.detected_objections,
        },
        fromName: reply.from_name,
        companyName: lead?.company?.company_name,
        campaignOffer: lead?.campaign?.offer || lead?.campaign?.niche || '3D Product Animation Teardown',
        caseStudyName: caseStudy?.title || caseStudy?.name || '3D Motion Teardown',
        caseStudyUrl: caseStudy?.portfolio_url || caseStudy?.url || 'https://bignssien.wixstudio.com/uidani',
      }),
    });

    if (!response.ok) {
      console.warn('[CRMService] Response generation failed:', response.statusText);
      return null;
    }

    const data = await response.json();
    if (data.success && data.draft) {
      reply.response_draft = data.draft;
      await this.saveReply(reply);

      await this.logActivity(
        'reply_response_generated',
        `AI drafted response for reply from "${reply.from_name || reply.from_email}". Ready for Daniel's approval.`,
        {
          replyId: reply.id,
          leadId: reply.lead_id,
          subject: data.draft.subject,
        }
      );

      return data.draft;
    }

    return null;
  }

  /**
   * Send an approved response to a prospect reply
   * CRITICAL GATE: Only explicitly approved response drafts are dispatched.
   */
  static async sendApprovedResponse(
    replyId: string,
    approvedDraft: { subject: string; body: string },
    options: { updatePipelineStatus?: LeadStatus } = {}
  ): Promise<SendEmailResult> {
    const reply = await this.getReplyById(replyId);
    if (!reply) {
      throw new Error('Reply record not found.');
    }

    const lead = reply.lead || (await this.getLeadById(reply.lead_id));
    const contact = reply.contact || (lead?.contact_id ? await this.getContactById(lead.contact_id) : null);
    const company = reply.company || (lead?.company_id ? await this.getCompanyById(lead.company_id) : null);

    const recipientEmail = reply.from_email || contact?.email;
    if (!recipientEmail) {
      throw new Error('No recipient email address available for this reply.');
    }

    // 1. Create approved EmailMessage record in the system
    const emailMessage: EmailMessage = {
      id: `msg-resp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      lead_id: reply.lead_id,
      campaign_id: reply.campaign_id || lead?.campaign_id || '',
      subject: approvedDraft.subject,
      body: approvedDraft.body,
      status: 'approved',
      message_type: 'custom',
      gmail_thread_id: reply.thread_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await this.saveEmailMessage(emailMessage);

    // 2. Dispatch the approved email via Gmail API
    const sendResp = await this.sendApprovedEmail(emailMessage.id);

    const now = new Date().toISOString();

    if (sendResp.success) {
      // 3. Update Reply status to 'responded'
      reply.status = 'responded';
      reply.responded_at = now;
      reply.responded_email_id = emailMessage.id;
      await this.saveReply(reply);

      // 4. Update Lead status if requested or default to interested/replied
      const nextStatus = options.updatePipelineStatus || (reply.recommended_pipeline_status === 'meeting' ? 'meeting' : 'interested');
      await this.updateLead(reply.lead_id, {
        status: nextStatus,
        outreach_status: 'replied',
      });

      // 5. Log activity
      await this.logActivity(
        'reply_responded',
        `Approved response dispatched to "${reply.from_name || recipientEmail}" at ${company?.company_name || 'brand'}.`,
        {
          replyId: reply.id,
          leadId: reply.lead_id,
          emailMessageId: emailMessage.id,
          providerMessageId: sendResp.result?.providerMessageId,
          subject: approvedDraft.subject,
        }
      );

      return {
        success: true,
        providerMessageId: sendResp.result?.providerMessageId,
        timestamp: now,
        simulated: sendResp.result?.simulated,
      };
    }

    return {
      success: false,
      error: sendResp.error || 'Failed to send approved response email',
      timestamp: now,
    };
  }

  /**
   * Update reply status (unread, read, needs_response, responded, archived)
   */
  static async updateReplyStatus(replyId: string, status: ReplyStatus): Promise<ProspectReply | null> {
    const reply = await this.getReplyById(replyId);
    if (!reply) return null;

    reply.status = status;
    return await this.saveReply(reply);
  }

  /**
   * Update lead pipeline status from conversation / reply context
   */
  static async updateLeadPipelineStatus(leadId: string, status: LeadStatus): Promise<Lead | null> {
    const lead = await this.getLeadById(leadId);
    if (!lead) return null;

    const updated = await this.updateLead(leadId, { status });

    await this.logActivity(
      'status_changed',
      `Pipeline status for "${lead.contact?.full_name || lead.company?.company_name}" changed to "${status}".`,
      {
        leadId,
        newStatus: status,
      }
    );

    return updated;
  }

  /**
   * Simulate an incoming prospect reply for testing stopping logic and intelligence
   */
  static async simulateInboundReply(
    leadId: string,
    customOptions: {
      fromName?: string;
      email?: string;
      subject?: string;
      replyText?: string;
    } = {}
  ): Promise<ProspectReply> {
    const lead = await this.getLeadById(leadId);
    if (!lead) {
      throw new Error(`Lead ${leadId} not found.`);
    }

    const contactName = customOptions.fromName || lead.contact?.full_name || 'Marketing Lead';
    const contactEmail = customOptions.email || lead.contact?.email || 'prospect@brand.com';
    const companyName = lead.company?.company_name || 'Brand';
    const subject = customOptions.subject || `Re: 3D Animation Teardown for ${companyName}`;
    const replyText = customOptions.replyText || `Hey Daniel,\n\nThanks for reaching out! We really liked the 3D breakdown you sent over. What is your pricing for a 30-second product animation and could you share your calendar for a quick 15-min chat next Tuesday?\n\nBest,\n${contactName.split(' ')[0]}`;

    // 1. Register with backend simulation endpoint
    await fetch('/api/email/simulate-reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId,
        email: contactEmail,
        fromName: contactName,
        companyName,
        subject,
        replyText,
      }),
    });

    // 2. Halt any active sequence for this lead immediately
    const sequences = await this.getLeadFollowUpSequences();
    const activeSeq = sequences.find(s => s.lead_id === leadId);
    if (activeSeq && activeSeq.status !== 'replied') {
      activeSeq.status = 'replied';
      activeSeq.stop_reason = 'prospect_replied';
      activeSeq.reply_detected_at = new Date().toISOString();
      activeSeq.next_follow_up_at = undefined;
      await this.saveLeadFollowUpSequence(activeSeq);
    }

    // 3. Update lead status to 'replied'
    await this.updateLead(leadId, {
      status: 'replied',
      outreach_status: 'replied',
    });

    // 4. Create and save ProspectReply record
    const newReply: ProspectReply = {
      id: `reply-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      lead_id: leadId,
      contact_id: lead.contact_id,
      company_id: lead.company_id,
      campaign_id: lead.campaign_id,
      sequence_id: activeSeq?.id,
      thread_id: `thread-sim-${leadId.slice(0, 8)}`,
      gmail_message_id: `msg-sim-${Date.now()}`,
      from_email: contactEmail,
      from_name: contactName,
      to_email: 'big.nssien@gmail.com',
      subject,
      body: replyText,
      snippet: replyText.slice(0, 140),
      received_at: new Date().toISOString(),
      status: 'unread',
      classification: 'Interested',
      intent: 'Prospect is asking for pricing and requesting a 15-min call',
      priority: 'high',
      detected_questions: ['3D product animation pricing and timeline'],
      detected_objections: [],
      suggested_action: 'Send pricing range and offer 2-3 calendar slots for next Tuesday.',
      recommended_pipeline_status: 'meeting',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const saved = await this.saveReply(newReply);

    // 5. Automatically run AI analysis and draft generation in background
    try {
      await this.analyzeReply(saved.id, replyText);
      await this.generateResponseDraft(saved.id);
    } catch (e) {
      console.warn('Simulate reply analysis error:', e);
    }

    await this.logActivity(
      'reply_received',
      `Inbound reply received from ${contactName} (${companyName})! Follow-up sequences halted.`,
      {
        leadId,
        replyId: saved.id,
        snippet: newReply.snippet,
      }
    );

    return saved;
  }

  /**
   * Sync Gmail Inbox for new incoming replies across all active prospects
   */
  static async syncGmailReplies(): Promise<{ newRepliesCount: number; errors: string[] }> {
    const leads = await this.getLeads();
    const contactedLeads = leads.filter(l => l.contact?.email && (l.outreach_status === 'sent' || l.outreach_status === 'follow_up' || l.outreach_status === 'replied'));
    const emailsToCheck = contactedLeads.map(l => l.contact!.email).filter(Boolean);

    if (emailsToCheck.length === 0) {
      return { newRepliesCount: 0, errors: [] };
    }

    try {
      const resp = await fetch('/api/replies/sync-inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospectEmails: emailsToCheck }),
      });

      if (!resp.ok) {
        return { newRepliesCount: 0, errors: ['Failed to query Gmail sync endpoint.'] };
      }

      const data = await resp.json();
      const existingReplies = await this.getReplies();
      let newCount = 0;

      if (data.success && Array.isArray(data.replies)) {
        for (const r of data.replies) {
          const matchingLead = contactedLeads.find(l => l.contact?.email.toLowerCase() === r.from_email.toLowerCase());
          if (!matchingLead) continue;

          const exists = existingReplies.some(
            ex => (ex.gmail_message_id && ex.gmail_message_id === r.gmail_message_id) ||
                  (ex.from_email === r.from_email && ex.subject === r.subject && Math.abs(new Date(ex.received_at).getTime() - new Date(r.received_at).getTime()) < 60000)
          );

          if (!exists) {
            const newReply: ProspectReply = {
              id: `reply-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
              lead_id: matchingLead.id,
              contact_id: matchingLead.contact_id,
              company_id: matchingLead.company_id,
              campaign_id: matchingLead.campaign_id,
              thread_id: r.thread_id,
              gmail_message_id: r.gmail_message_id,
              from_email: r.from_email,
              from_name: r.from_name,
              to_email: r.to_email,
              subject: r.subject,
              body: r.body,
              snippet: r.snippet,
              received_at: r.received_at || new Date().toISOString(),
              status: 'unread',
              classification: 'Interested',
              intent: 'Inbound prospect response',
              priority: 'medium',
              detected_questions: [],
              detected_objections: [],
              suggested_action: 'Analyze reply and draft a personalized response.',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            const saved = await this.saveReply(newReply);
            newCount++;

            // Halt follow-up sequence
            const sequences = await this.getLeadFollowUpSequences();
            const seq = sequences.find(s => s.lead_id === matchingLead.id);
            if (seq && seq.status !== 'replied') {
              seq.status = 'replied';
              seq.stop_reason = 'prospect_replied';
              seq.reply_detected_at = newReply.received_at;
              seq.next_follow_up_at = undefined;
              await this.saveLeadFollowUpSequence(seq);
            }

            // Update lead status
            await this.updateLead(matchingLead.id, {
              status: 'replied',
              outreach_status: 'replied',
            });

            // Analyze asynchronously
            this.analyzeReply(saved.id).catch(e => console.warn('Async analyze error:', e));

            await this.logActivity(
              'reply_received',
              `New reply detected from "${r.from_name || r.from_email}" via Gmail! Sequence halted.`,
              {
                leadId: matchingLead.id,
                replyId: saved.id,
                gmailMessageId: r.gmail_message_id,
              }
            );
          }
        }
      }

      return { newRepliesCount: newCount, errors: [] };
    } catch (err: any) {
      console.warn('[CRMService] syncGmailReplies error:', err);
      return { newRepliesCount: 0, errors: [err.message || 'Error syncing Gmail replies'] };
    }
  }

  /**
   * Get complete chronological conversation thread for a lead
   */
  static async getConversationThread(leadId: string): Promise<ConversationMessageItem[]> {
    const emails = await this.getEmailMessages();
    const replies = await this.getRepliesByLeadId(leadId);
    const lead = await this.getLeadById(leadId);
    const contact = lead?.contact;

    const leadEmails = emails.filter(e => e.lead_id === leadId);
    const threadItems: ConversationMessageItem[] = [];

    // Outbound & follow-up emails
    for (const email of leadEmails) {
      let type: 'outbound' | 'follow_up' | 'manual_response' = 'outbound';
      if (email.message_type === 'follow_up' || (email.sequence_step && email.sequence_step > 0)) {
        type = 'follow_up';
      } else if (email.message_type === 'custom') {
        type = 'manual_response';
      }

      threadItems.push({
        id: email.id,
        type,
        sender_name: 'UI Dani',
        sender_email: 'big.nssien@gmail.com',
        recipient_name: contact?.full_name || 'Prospect',
        recipient_email: contact?.email || '',
        timestamp: email.sent_at || email.created_at,
        subject: email.subject,
        body: email.body,
        status: email.status,
        step_number: email.sequence_step,
        gmail_message_id: email.provider_message_id,
        thread_id: email.gmail_thread_id,
      });
    }

    // Inbound prospect replies
    for (const reply of replies) {
      threadItems.push({
        id: reply.id,
        type: 'reply',
        sender_name: reply.from_name || contact?.full_name || 'Prospect',
        sender_email: reply.from_email || contact?.email || '',
        recipient_name: 'UI Dani',
        recipient_email: reply.to_email || 'big.nssien@gmail.com',
        timestamp: reply.received_at,
        subject: reply.subject,
        body: reply.body || reply.snippet,
        status: reply.status,
        gmail_message_id: reply.gmail_message_id,
        thread_id: reply.thread_id,
      });
    }

    // Sort chronologically ascending
    return threadItems.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  // ---------------------------------------------------------------------------
  // Dashboard & Campaign Metrics
  // ---------------------------------------------------------------------------
  static async getDashboardMetrics(activeCampaignId?: string): Promise<DashboardMetrics> {
    const campaigns = await this.getCampaigns();
    const activeCampaign = activeCampaignId 
      ? campaigns.find(c => c.id === activeCampaignId) 
      : campaigns.find(c => c.status === 'active' || c.status === 'ready') || campaigns[0];

    const allLeads = await this.getLeads();
    const leads = activeCampaign ? allLeads.filter(l => l.campaign_id === activeCampaign.id) : allLeads;
    const emails = await this.getEmailMessages();
    const campaignEmails = activeCampaign 
      ? emails.filter(e => e.campaign_id === activeCampaign.id)
      : emails;

    const sequences = await this.getLeadFollowUpSequences();
    const campaignSequences = activeCampaign
      ? sequences.filter(s => s.campaign_id === activeCampaign.id)
      : sequences;

    const allReplies = await this.getReplies();
    const campaignReplies = activeCampaign
      ? allReplies.filter(r => r.campaign_id === activeCampaign.id || leads.some(l => l.id === r.lead_id))
      : allReplies;

    const followUpsSent = campaignEmails.filter(e => e.status === 'sent' && (e.message_type === 'follow_up' || (e.sequence_step && e.sequence_step > 0))).length;
    const activeSequencesCount = campaignSequences.filter(s => s.status === 'active').length;
    const followUpsScheduled = campaignSequences.filter(s => s.status === 'active' && Boolean(s.next_follow_up_at)).length;
    const sequencesCompletedCount = campaignSequences.filter(s => s.status === 'completed' || s.status === 'replied').length;

    const sentEmailsCount = campaignEmails.filter(e => e.status === 'sent' || e.status === 'delivered').length;
    const repliesCount = campaignReplies.length > 0 
      ? campaignReplies.length 
      : leads.filter(l => l.status === 'replied' || l.status === 'interested' || l.status === 'meeting').length;
    
    const interestedReplies = campaignReplies.filter(r => r.classification === 'interested' || r.classification === 'meeting_request');
    const interestedCount = interestedReplies.length > 0
      ? interestedReplies.length
      : leads.filter(l => l.status === 'interested' || l.status === 'meeting').length;

    const highPriorityReplies = campaignReplies.filter(r => r.priority === 'high').length;
    const meetingsCount = leads.filter(l => l.status === 'meeting').length + campaignReplies.filter(r => r.classification === 'meeting_request').length;
    const wonCount = leads.filter(l => l.status === 'won').length;

    const replyRate = sentEmailsCount > 0 ? Math.round((repliesCount / sentEmailsCount) * 100) : 0;
    const interestedRate = repliesCount > 0 ? Math.round((interestedCount / repliesCount) * 100) : 0;

    return {
      today_campaign_name: activeCampaign ? activeCampaign.name : null,
      total_prospects: allLeads.length,
      active_campaigns: campaigns.filter(c => c.status === 'active' || c.status === 'ready').length,
      prospects_target: activeCampaign ? activeCampaign.daily_target : 50,
      prospects_found: leads.length,
      emails_ready: campaignEmails.filter(e => e.status === 'needs_review' || e.status === 'approved').length,
      emails_queued: campaignEmails.filter(e => e.status === 'queued').length,
      emails_sent: sentEmailsCount,
      follow_ups_sent: followUpsSent,
      follow_ups_scheduled: followUpsScheduled,
      active_sequences: activeSequencesCount,
      sequences_completed: sequencesCompletedCount,
      replies: repliesCount,
      interested: interestedCount,
      high_priority_replies: highPriorityReplies,
      meetings: meetingsCount,
      won_leads: wonCount,
      reply_rate_percent: replyRate,
      interested_rate_percent: interestedRate,
    };
  }

  // ---------------------------------------------------------------------------
  // Factory Reset / Clear Outreach Data
  // ---------------------------------------------------------------------------
  static async clearOutreachData(): Promise<{ success: boolean; clearedTables: string[]; preservedTables: string[] }> {
    const clearedTables = [
      'activities',
      'prospect_replies',
      'lead_research',
      'lead_follow_up_sequences',
      'email_messages',
      'leads',
      'contacts',
      'companies',
      'campaigns',
    ];

    const preservedTables = [
      'profiles',
      'case_studies',
      'follow_up_sequences',
      'follow_up_steps',
      'email_templates',
      'gmail_oauth_connections',
    ];

    // 1. Client-side Supabase clearing in dependency-safe order (if connected)
    if (isSupabaseConfigured && supabase) {
      try { await supabase.from('activities').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch (e) { console.warn('Supabase clear activities notice:', e); }
      try { await supabase.from('prospect_replies').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch (e) { console.warn('Supabase clear prospect_replies notice:', e); }
      try { await supabase.from('lead_research').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch (e) { console.warn('Supabase clear lead_research notice:', e); }
      try { await supabase.from('lead_follow_up_sequences').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch (e) { console.warn('Supabase clear lead_follow_up_sequences notice:', e); }
      try { await supabase.from('email_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch (e) { console.warn('Supabase clear email_messages notice:', e); }
      try { await supabase.from('leads').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch (e) { console.warn('Supabase clear leads notice:', e); }
      try { await supabase.from('contacts').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch (e) { console.warn('Supabase clear contacts notice:', e); }
      try { await supabase.from('companies').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch (e) { console.warn('Supabase clear companies notice:', e); }
      try { await supabase.from('campaigns').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch (e) { console.warn('Supabase clear campaigns notice:', e); }
    }

    // 2. Clear Local Storage Outreach State (reset to empty arrays)
    setLocalItem(STORAGE_KEYS.CAMPAIGNS, []);
    setLocalItem(STORAGE_KEYS.COMPANIES, []);
    setLocalItem(STORAGE_KEYS.CONTACTS, []);
    setLocalItem(STORAGE_KEYS.LEADS, []);
    setLocalItem(STORAGE_KEYS.EMAIL_MESSAGES, []);
    setLocalItem(STORAGE_KEYS.LEAD_SEQUENCES, []);
    setLocalItem(STORAGE_KEYS.PROSPECT_REPLIES, []);
    setLocalItem(STORAGE_KEYS.ACTIVITIES, []);
    setLocalItem(STORAGE_KEYS.LEAD_RESEARCH, []);

    // 3. Clear server-side simulation ledger & server database records if reachable
    try {
      await fetch('/api/data/reset-outreach', { method: 'POST' });
    } catch (e) {
      console.warn('Notice calling /api/data/reset-outreach:', e);
    }

    return {
      success: true,
      clearedTables,
      preservedTables,
    };
  }

  // ---------------------------------------------------------------------------
  // Factory Reset / Reset Application to Defaults
  // ---------------------------------------------------------------------------
  static async resetToDefaults(options?: { preserveOAuth?: boolean }): Promise<{ success: boolean; message: string }> {
    // 1. First clear all outreach campaigns and prospect data
    await this.clearOutreachData();

    // 2. Reset Profile to Default
    setLocalItem(STORAGE_KEYS.PROFILE, DEFAULT_PROFILE);
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('profiles').upsert({
          id: DEFAULT_PROFILE.id,
          display_name: DEFAULT_PROFILE.display_name,
          business_name: DEFAULT_PROFILE.business_name,
          email: DEFAULT_PROFILE.email,
          website: DEFAULT_PROFILE.website,
          updated_at: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Supabase reset profile notice:', e);
      }
    }

    // 3. Reset Delivery Settings to Default
    setLocalItem(STORAGE_KEYS.DELIVERY_SETTINGS, DEFAULT_DELIVERY_SETTINGS);

    // 4. Reset Follow-Up Sequences to Master 4-Step Sequence
    setLocalItem(STORAGE_KEYS.FOLLOW_UPS, [DEFAULT_FOLLOW_UP_SEQUENCE]);
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('follow_up_steps').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('follow_up_sequences').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('follow_up_sequences').insert({
          id: DEFAULT_FOLLOW_UP_SEQUENCE.id,
          name: DEFAULT_FOLLOW_UP_SEQUENCE.name,
          status: DEFAULT_FOLLOW_UP_SEQUENCE.status,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        if (DEFAULT_FOLLOW_UP_SEQUENCE.steps && DEFAULT_FOLLOW_UP_SEQUENCE.steps.length > 0) {
          await supabase.from('follow_up_steps').insert(
            DEFAULT_FOLLOW_UP_SEQUENCE.steps.map(s => ({
              id: s.id,
              sequence_id: DEFAULT_FOLLOW_UP_SEQUENCE.id,
              step_number: s.step_number,
              delay_days: s.delay_days,
              subject_template: s.subject_template,
              body_template: s.body_template,
              active: s.active,
            }))
          );
        }
      } catch (e) {
        console.warn('Supabase reset follow-up sequence notice:', e);
      }
    }

    // 5. Reset Case Studies to Default Starter Portfolio
    setLocalItem(STORAGE_KEYS.CASE_STUDIES, DEFAULT_CASE_STUDIES);
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('case_studies').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        for (const cs of DEFAULT_CASE_STUDIES) {
          await supabase.from('case_studies').insert({
            id: cs.id,
            name: cs.name,
            description: cs.description,
            niche: cs.niche,
            offer: cs.offer,
            portfolio_url: cs.portfolio_url,
            video_url: cs.video_url,
            thumbnail_url: cs.thumbnail_url,
            status: cs.status,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      } catch (e) {
        console.warn('Supabase reset case studies notice:', e);
      }
    }

    await this.logActivity(
      'system_reset',
      'Reset application to default configuration, profile, and starter templates',
      { timestamp: new Date().toISOString() }
    );

    return {
      success: true,
      message: 'Application has been successfully reset to default settings and clean state.',
    };
  }

  static clearLocalData(): void {
    this.clearOutreachData();
  }
}
