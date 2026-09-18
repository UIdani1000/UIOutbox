import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { 
  Profile, 
  Campaign, 
  CaseStudy, 
  Company, 
  Contact, 
  Lead, 
  LeadStatus,
  EmailMessage, 
  FollowUpSequence, 
  LeadFollowUpSequence,
  Activity, 
  DashboardMetrics,
  LeadResearch,
  DiscoveryCandidate,
  GmailAuthStatus,
  DeliverySettings,
  SendEmailResult,
  BatchSendProgress,
  ProspectReply,
  ReplyClassification,
  ReplyPriority,
  ReplyStatus,
  ResponseDraft,
  ConversationMessageItem,
} from '../types';
import { CRMService, DEFAULT_PROFILE, DEFAULT_FOLLOW_UP_SEQUENCE, DEFAULT_DELIVERY_SETTINGS } from '../services/crmService';
import { testSupabaseConnection } from '../services/supabase';
import { LeadSourceManager, SourcingResult } from '../services/leadSourceManager';
import { GeminiAIResearchProvider } from '../services/providers/geminiResearchProvider';
import { GeminiAIPersonalizationProvider } from '../services/providers/geminiPersonalizationProvider';
import { PersonalizationInput } from '../services/interfaces/aiPersonalization';
import { gmailProvider } from '../services/providers/gmailEmailProvider';
import { withTimeout } from '../services/safeFetch';

interface CRMContextType {
  profile: Profile;
  campaigns: Campaign[];
  caseStudies: CaseStudy[];
  companies: Company[];
  leads: Lead[];
  emailMessages: EmailMessage[];
  followUpSequences: FollowUpSequence[];
  leadFollowUpSequences: LeadFollowUpSequence[];
  activities: Activity[];
  leadResearches: LeadResearch[];
  replies: ProspectReply[];
  selectedReplyId: string | null;
  metrics: DashboardMetrics;
  activeCampaignId: string | null;
  isLoading: boolean;
  supabaseStatus: { connected: boolean; message: string };
  gmailStatus: GmailAuthStatus;
  deliverySettings: DeliverySettings;
  todaySentCount: number;
  batchProgress: BatchSendProgress | null;
  setActiveCampaignId: (id: string | null) => void;
  setSelectedReplyId: (id: string | null) => void;
  refreshData: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<Profile>;
  createCampaign: (data: Omit<Campaign, 'id' | 'created_at' | 'updated_at'>) => Promise<Campaign>;
  updateCampaign: (id: string, data: Partial<Campaign>) => Promise<Campaign | null>;
  duplicateCampaign: (id: string) => Promise<Campaign | null>;
  deleteCampaign: (id: string) => Promise<boolean>;
  createCaseStudy: (data: Omit<CaseStudy, 'id' | 'created_at' | 'updated_at'>) => Promise<CaseStudy>;
  updateCaseStudy: (id: string, data: Partial<CaseStudy>) => Promise<CaseStudy | null>;
  deleteCaseStudy: (id: string) => Promise<boolean>;
  createCompanyAndLead: (
    campaignId: string,
    company: Omit<Company, 'id' | 'created_at' | 'updated_at'>,
    contact?: Omit<Contact, 'id' | 'company_id' | 'created_at' | 'updated_at'>,
    qualificationScore?: number
  ) => Promise<{ company: Company; lead: Lead; isDuplicate: boolean }>;
  addManualCompany: (payload: {
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
  }) => Promise<{ company: Company; contact?: Contact; lead?: Lead; isDuplicate: boolean }>;
  updateLeadStatus: (id: string, status: Lead['status'], reason?: string) => Promise<void>;
  qualifyLead: (id: string, score?: number, reason?: string) => Promise<void>;
  rejectLead: (id: string, reason?: string) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  deleteLeads: (ids: string[]) => Promise<{ count: number; success: boolean }>;
  updateEmailStatus: (id: string, status: EmailMessage['status'], rejectionReason?: string) => Promise<void>;
  saveEmailDraft: (email: EmailMessage) => Promise<EmailMessage>;
  updateEmailMessage: (id: string, updates: Partial<EmailMessage>) => Promise<EmailMessage | null>;
  approveEmail: (id: string) => Promise<void>;
  rejectEmail: (id: string, reason?: string) => Promise<void>;
  queueEmail: (id: string) => Promise<void>;
  batchApproveEmails: (ids: string[]) => Promise<void>;
  batchQueueEmails: (ids: string[]) => Promise<void>;
  batchRejectEmails: (ids: string[], reason?: string) => Promise<void>;
  deleteEmailMessage: (id: string) => Promise<void>;
  generateEmailForLead: (leadId: string, campaignId?: string, customInstructions?: string) => Promise<EmailMessage>;
  batchGenerateEmails: (
    leadIds: string[],
    campaignId?: string,
    options?: { forceRegenerate?: boolean; customInstructions?: string }
  ) => Promise<Array<{ leadId: string; email?: EmailMessage; error?: string; isExisting?: boolean }>>;
  saveFollowUpSequence: (sequence: FollowUpSequence) => Promise<void>;
  logActivity: (type: Activity['activity_type'], description: string, metadata?: any) => Promise<void>;
  getLeadResearch: (leadId: string, campaignId?: string) => Promise<LeadResearch | null>;
  saveLeadResearch: (research: LeadResearch) => Promise<LeadResearch>;
  researchLead: (leadId: string, campaignId: string) => Promise<LeadResearch>;
  enrichContact: (leadId: string) => Promise<any>;
  batchEnrichContacts: (
    leadIds?: string[],
    campaignId?: string,
    onProgress?: (progress: { current: number; total: number; leadId: string; message: string }) => void
  ) => Promise<any>;
  ingestApprovedCandidates: (campaignId: string, candidates: DiscoveryCandidate[]) => Promise<SourcingResult>;
  clearAllLeads: (campaignId?: string) => Promise<{ success: boolean; message: string }>;
  clearDatabase: () => Promise<{ success: boolean; clearedTables: string[]; preservedTables: string[] }>;
  resetToDefaults: (options?: { preserveOAuth?: boolean }) => Promise<{ success: boolean; message: string }>;
  // Build 05: Gmail and Delivery Engine actions
  checkGmailStatus: () => Promise<GmailAuthStatus>;
  connectGmail: () => Promise<{ success: boolean; email?: string; error?: string }>;
  disconnectGmail: () => Promise<boolean>;
  sendTestEmail: (recipient?: string) => Promise<SendEmailResult>;
  updateDeliverySettings: (settings: Partial<DeliverySettings>) => Promise<DeliverySettings>;
  sendApprovedEmail: (emailId: string) => Promise<{ success: boolean; result?: SendEmailResult; error?: string }>;
  batchSendQueuedEmails: (emailIds?: string[]) => Promise<BatchSendProgress>;
  abortBatchSending: () => void;
  // Build 06: Automated Follow-Up Sequences actions
  pauseLeadSequence: (sequenceId: string, reason?: string) => Promise<void>;
  resumeLeadSequence: (sequenceId: string) => Promise<void>;
  stopLeadSequence: (sequenceId: string, reason?: string) => Promise<void>;
  checkProspectReply: (leadId: string, email?: string, threadId?: string) => Promise<{ replied: boolean; details?: any }>;
  processDueFollowUpSequences: () => Promise<{ processed: number; sent: number; replied: number; skipped: number; errors: string[] }>;
  fastForwardSequence: (sequenceId: string, days?: number) => Promise<void>;
  simulateProspectReply: (sequenceId: string) => Promise<void>;
  // Build 07: Reply Intelligence & Conversation Management actions
  analyzeReply: (replyId: string, customText?: string) => Promise<ProspectReply | null>;
  generateResponseDraft: (replyId: string) => Promise<ResponseDraft | null>;
  sendApprovedResponse: (replyId: string, draft: { subject: string; body: string }, options?: { updatePipelineStatus?: LeadStatus }) => Promise<SendEmailResult>;
  updateReplyStatus: (replyId: string, status: ReplyStatus) => Promise<void>;
  updateLeadPipelineStatus: (leadId: string, status: LeadStatus) => Promise<void>;
  simulateInboundReply: (leadId: string, customOptions?: { fromName?: string; email?: string; subject?: string; replyText?: string }) => Promise<ProspectReply>;
  syncGmailReplies: () => Promise<{ newRepliesCount: number; errors: string[] }>;
  getConversationThread: (leadId: string) => Promise<ConversationMessageItem[]>;
}


const CRMContext = createContext<CRMContextType | undefined>(undefined);

export const CRMProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [emailMessages, setEmailMessages] = useState<EmailMessage[]>([]);
  const [followUpSequences, setFollowUpSequences] = useState<FollowUpSequence[]>([DEFAULT_FOLLOW_UP_SEQUENCE]);
  const [leadFollowUpSequences, setLeadFollowUpSequences] = useState<LeadFollowUpSequence[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [leadResearches, setLeadResearches] = useState<LeadResearch[]>([]);
  const [replies, setReplies] = useState<ProspectReply[]>([]);
  const [selectedReplyId, setSelectedReplyId] = useState<string | null>(null);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [supabaseStatus, setSupabaseStatus] = useState<{ connected: boolean; message: string }>({
    connected: false,
    message: 'Testing connection...',
  });

  const [metrics, setMetrics] = useState<DashboardMetrics>({
    today_campaign_name: null,
    prospects_target: 50,
    prospects_found: 0,
    emails_ready: 0,
    emails_sent: 0,
    replies: 0,
    interested: 0,
    meetings: 0,
  });

  // Build 05: Gmail & Delivery Engine State
  const [gmailStatus, setGmailStatus] = useState<GmailAuthStatus>({
    connected: false,
    configured: false,
    email: 'big.nssien@gmail.com',
  });
  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings>(DEFAULT_DELIVERY_SETTINGS);
  const [todaySentCount, setTodaySentCount] = useState<number>(0);
  const [batchProgress, setBatchProgress] = useState<BatchSendProgress | null>(null);
  const abortBatchRef = useRef<boolean>(false);

  const checkGmailStatus = useCallback(async (): Promise<GmailAuthStatus> => {
    try {
      const health = await gmailProvider.checkHealth();
      const status: GmailAuthStatus = health.authStatus || {
        connected: health.status === 'healthy',
        configured: Boolean(health.authStatus?.configured),
        email: health.authStatus?.email || (health.status === 'healthy' ? 'big.nssien@gmail.com' : undefined),
      };
      setGmailStatus(status);
      return status;
    } catch {
      return { connected: false, configured: false };
    }
  }, []);

  const connectGmail = useCallback(async () => {
    const result = await gmailProvider.connect();
    await checkGmailStatus();
    await refreshData();
    return result;
  }, [checkGmailStatus]);

  const disconnectGmail = useCallback(async () => {
    const ok = await gmailProvider.disconnect();
    await checkGmailStatus();
    await refreshData();
    return ok;
  }, [checkGmailStatus]);

  const sendTestEmail = useCallback(async (recipient?: string) => {
    const target = recipient || deliverySettings.testRecipientEmail || 'big.nssien@gmail.com';
    const result = await gmailProvider.sendTestEmail(target);
    await refreshData();
    return result;
  }, [deliverySettings.testRecipientEmail]);

  const updateDeliverySettings = useCallback(async (updates: Partial<DeliverySettings>) => {
    const updated = await CRMService.updateDeliverySettings(updates);
    setDeliverySettings(updated);
    await refreshData();
    return updated;
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const [
        loadedProfile,
        loadedCampaigns,
        loadedCaseStudies,
        loadedCompanies,
        loadedLeads,
        loadedEmails,
        loadedSequences,
        loadedLeadSequences,
        loadedActivities,
        loadedResearches,
        loadedReplies,
        loadedSettings,
        loadedTodaySent,
      ] = await Promise.all([
        CRMService.getProfile(),
        CRMService.getCampaigns(),
        CRMService.getCaseStudies(),
        CRMService.getCompanies(),
        CRMService.getLeads(),
        CRMService.getEmailMessages(),
        CRMService.getFollowUpSequences(),
        CRMService.getLeadFollowUpSequences(),
        CRMService.getActivities(40),
        CRMService.getAllLeadResearch(),
        CRMService.getReplies(),
        CRMService.getDeliverySettings(),
        CRMService.getTodaySentCount(),
      ]);

      setProfile(loadedProfile);
      setCampaigns(loadedCampaigns);
      setCaseStudies(loadedCaseStudies);
      setCompanies(loadedCompanies);
      setLeads(loadedLeads);
      setEmailMessages(loadedEmails);
      setFollowUpSequences(loadedSequences);
      setLeadFollowUpSequences(loadedLeadSequences);
      setActivities(loadedActivities);
      setLeadResearches(loadedResearches);
      setReplies(loadedReplies);
      setDeliverySettings(loadedSettings);
      setTodaySentCount(loadedTodaySent);

      // Auto select first active or ready campaign if none selected
      if (!activeCampaignId && loadedCampaigns.length > 0) {
        const active = loadedCampaigns.find(c => c.status === 'active' || c.status === 'ready') || loadedCampaigns[0];
        setActiveCampaignId(active.id);
      }

      const calculatedMetrics = await CRMService.getDashboardMetrics(activeCampaignId || undefined);
      setMetrics(calculatedMetrics);
    } catch (error) {
      console.error('Error refreshing CRM data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activeCampaignId]);

  useEffect(() => {
    refreshData();
    checkGmailStatus();
    testSupabaseConnection().then(setSupabaseStatus);
  }, [refreshData, checkGmailStatus]);

  // Update metrics whenever active campaign or leads change
  useEffect(() => {
    CRMService.getDashboardMetrics(activeCampaignId || undefined).then(setMetrics);
  }, [activeCampaignId, campaigns, leads, emailMessages]);


  const updateProfile = async (data: Partial<Profile>): Promise<Profile> => {
    const updated = await CRMService.updateProfile(data);
    setProfile(updated);
    await refreshData();
    return updated;
  };

  const createCampaign = async (data: Omit<Campaign, 'id' | 'created_at' | 'updated_at'>): Promise<Campaign> => {
    const created = await CRMService.createCampaign(data);
    setActiveCampaignId(created.id);
    await refreshData();
    return created;
  };

  const updateCampaign = async (id: string, data: Partial<Campaign>): Promise<Campaign | null> => {
    const updated = await CRMService.updateCampaign(id, data);
    await refreshData();
    return updated;
  };

  const duplicateCampaign = async (id: string): Promise<Campaign | null> => {
    const duplicated = await CRMService.duplicateCampaign(id);
    await refreshData();
    return duplicated;
  };

  const deleteCampaign = async (id: string): Promise<boolean> => {
    const success = await CRMService.deleteCampaign(id);
    if (activeCampaignId === id) {
      setActiveCampaignId(null);
    }
    await refreshData();
    return success;
  };

  const createCaseStudy = async (data: Omit<CaseStudy, 'id' | 'created_at' | 'updated_at'>): Promise<CaseStudy> => {
    const created = await CRMService.createCaseStudy(data);
    await refreshData();
    return created;
  };

  const updateCaseStudy = async (id: string, data: Partial<CaseStudy>): Promise<CaseStudy | null> => {
    const updated = await CRMService.updateCaseStudy(id, data);
    await refreshData();
    return updated;
  };

  const deleteCaseStudy = async (id: string): Promise<boolean> => {
    const success = await CRMService.deleteCaseStudy(id);
    await refreshData();
    return success;
  };

  const createCompanyAndLead = async (
    campaignId: string,
    companyData: Omit<Company, 'id' | 'created_at' | 'updated_at'>,
    contactData?: Omit<Contact, 'id' | 'company_id' | 'created_at' | 'updated_at'>,
    qualificationScore: number = 0
  ) => {
    const { company, contact, isDuplicate } = await CRMService.createCompanyWithContact(companyData, contactData);
    
    // Check if lead already exists in this campaign
    const existingLeads = await CRMService.getLeads(campaignId);
    let lead = existingLeads.find(l => l.company_id === company.id);

    if (!lead) {
      lead = await CRMService.createLead({
        campaign_id: campaignId,
        company_id: company.id,
        contact_id: contact?.id,
        status: 'new',
        qualification_score: qualificationScore,
        qualification_reason: 'Imported into campaign',
        research_status: 'not_started',
        personalization_status: 'pending',
        outreach_status: 'not_started',
      });

      await CRMService.logActivity(
        'lead_created',
        `Linked company "${company.company_name}" (${company.domain}) to campaign`,
        { campaignId, companyId: company.id }
      );
    }

    await refreshData();
    return { company, lead, isDuplicate };
  };

  const addManualCompany = async (payload: {
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
  }) => {
    const res = await CRMService.addManualCompany(payload);
    await refreshData();
    return res;
  };

  const updateLeadStatus = async (id: string, status: Lead['status'], reason?: string) => {
    await CRMService.updateLeadStatus(id, status, reason);
    await refreshData();
  };

  const qualifyLead = async (id: string, score: number = 85, reason?: string) => {
    await CRMService.qualifyLead(id, score, reason);
    await refreshData();
  };

  const rejectLead = async (id: string, reason?: string) => {
    await CRMService.rejectLead(id, reason);
    await refreshData();
  };

  const deleteLead = async (id: string) => {
    // Optimistically update React state immediately
    setLeads(prev => prev.filter(l => l.id !== id));
    setEmailMessages(prev => prev.filter(e => e.lead_id !== id));
    setLeadResearches(prev => prev.filter(r => r.lead_id !== id));
    setLeadFollowUpSequences(prev => prev.filter(s => s.lead_id !== id));
    setReplies(prev => prev.filter(r => r.lead_id !== id));

    await CRMService.deleteLead(id);
    await refreshData();
  };

  const deleteLeads = async (ids: string[]): Promise<{ count: number; success: boolean }> => {
    const idSet = new Set(ids);
    // Optimistically update React state immediately
    setLeads(prev => prev.filter(l => !idSet.has(l.id)));
    setEmailMessages(prev => prev.filter(e => !idSet.has(e.lead_id)));
    setLeadResearches(prev => prev.filter(r => !idSet.has(r.lead_id)));
    setLeadFollowUpSequences(prev => prev.filter(s => !idSet.has(s.lead_id)));
    setReplies(prev => prev.filter(r => !idSet.has(r.lead_id)));

    const result = await CRMService.deleteLeads(ids);
    await refreshData();
    return result;
  };

  const updateEmailStatus = async (id: string, status: EmailMessage['status'], rejectionReason?: string) => {
    await CRMService.updateEmailStatus(id, status, rejectionReason);
    await refreshData();
  };

  const saveEmailDraft = async (email: EmailMessage): Promise<EmailMessage> => {
    const saved = await CRMService.saveEmailMessage(email);
    await refreshData();
    return saved;
  };

  const updateEmailMessage = async (id: string, updates: Partial<EmailMessage>): Promise<EmailMessage | null> => {
    const updated = await CRMService.updateEmailMessage(id, updates);
    await refreshData();
    return updated;
  };

  const approveEmail = async (id: string) => {
    await CRMService.updateEmailStatus(id, 'approved');
    await refreshData();
  };

  const rejectEmail = async (id: string, reason?: string) => {
    await CRMService.updateEmailStatus(id, 'rejected', reason);
    await refreshData();
  };

  const queueEmail = async (id: string) => {
    await CRMService.updateEmailStatus(id, 'queued');
    await refreshData();
  };

  const batchApproveEmails = async (ids: string[]) => {
    await CRMService.batchUpdateEmailStatus(ids, 'approved');
    await refreshData();
  };

  const batchQueueEmails = async (ids: string[]) => {
    await CRMService.batchUpdateEmailStatus(ids, 'queued');
    await refreshData();
  };

  const batchRejectEmails = async (ids: string[], reason?: string) => {
    for (const id of ids) {
      await CRMService.updateEmailStatus(id, 'rejected', reason);
    }
    await refreshData();
  };

  const deleteEmailMessage = async (id: string) => {
    await CRMService.deleteEmailMessage(id);
    await refreshData();
  };

  const generateEmailForLead = async (
    leadId: string,
    campaignId?: string,
    customInstructions?: string
  ): Promise<EmailMessage> => {
    let lead = leads.find(l => l.id === leadId) || (await CRMService.getLeadById(leadId));
    if (!lead) throw new Error(`Lead with ID ${leadId} not found.`);

    const campaign = await CRMService.resolveCampaignForLead(
      lead,
      campaignId,
      activeCampaignId || (campaigns[0]?.id)
    );
    if (!campaign) throw new Error(`Could not resolve campaign context for lead ${leadId}.`);

    let company = await CRMService.resolveCompanyForLead(lead);
    if (!company) {
      company = companies.find(c => c.id === lead.company_id || (lead.company && c.id === lead.company.id)) || null;
    }
    if (!company) throw new Error(`Company for lead ${leadId} not found.`);

    const contact = lead.contact || company.primary_contact;
    const caseStudy = campaign.case_study || caseStudies.find(cs => cs.id === campaign.case_study_id) || caseStudies[0];

    // Ensure research exists; if not completed, run research now
    let research = await CRMService.getLeadResearch(leadId, campaign.id);
    if (!research || research.research_status !== 'completed') {
      try {
        research = await researchLead(leadId, campaign.id);
      } catch (e) {
        console.warn('Auto-researching lead encountered notice, using available brief context');
      }
    }

    if (!research) {
      research = {
        id: `res-${leadId}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        lead_id: leadId,
        campaign_id: campaign.id,
        company_name: company.company_name,
        website: company.website,
        domain: company.domain,
        industry: company.industry || campaign.niche,
        country: company.country,
        city: company.city,
        company_overview: company.description || `${company.company_name} is an active brand in the ${company.industry || campaign.niche} space.`,
        products: [`${company.company_name} Core Line`],
        target_audience: 'E-commerce and modern consumer demographic.',
        brand_positioning: 'Premium direct-to-consumer presence.',
        visual_style: 'Clean packaging and high visual storefront presentation.',
        marketing_channels: ['Digital Storefront', 'Social Media'],
        product_marketing_observations: `Features storefront photography on ${company.domain || 'their website'}.`,
        content_observations: 'Strong visual baseline with high upside for conversion-focused 3D animation.',
        potential_animation_opportunity: `3D exploded teardown of ${company.company_name} hero packaging for landing page conversion.`,
        personalization_angle: `Highlighting clean visual packaging and proposing a tailored 3D motion concept.`,
        language_signal: campaign.language_strategy || 'English',
        research_confidence: 85,
        research_status: 'completed',
        raw_research_metadata: { source: 'synthesized-pipeline' },
      };
    }

    const provider = new GeminiAIPersonalizationProvider();
    const draft = await provider.generateEmailDraft({
      campaign,
      lead,
      company,
      contact,
      researchBrief: research,
      caseStudy,
      customInstructions,
    });

    const emailPayload: Omit<EmailMessage, 'created_at' | 'updated_at'> = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      campaign_id: campaign.id,
      lead_id: leadId,
      contact_id: contact?.id,
      case_study_id: caseStudy?.id,
      subject: draft.subject,
      body: draft.body,
      status: 'reviewing',
      message_type: 'initial_outreach',
      provider: draft.provider_used || draft.model_used || 'ai-router',
      personalization_metadata: {
        observation_used: draft.observation_used,
        product_used: draft.product_used,
        opportunity_used: draft.opportunity_used,
        creative_used: draft.creative_used,
        language_selected: draft.language_selected,
        language_reason: draft.language_reason,
        language_confidence: draft.language_confidence,
        personalization_score: draft.personalization_score,
        personalization_reason: draft.personalization_reason,
        alternative_subjects: draft.alternative_subjects,
        ai_generated_body: draft.body,
        final_body: draft.body,
        model_used: draft.model_used,
        provider_used: draft.provider_used,
        generation_timestamp: draft.timestamp || new Date().toISOString(),
      },
    };

    const savedEmail = await CRMService.saveEmailMessage(emailPayload);
    await CRMService.logActivity(
      'email_generated',
      `Generated AI personalized draft for "${company.company_name}" (${draft.personalization_score}% match)`,
      { leadId, companyId: company.id, campaignId: campaign.id, emailId: savedEmail.id }
    );
    await refreshData();
    return savedEmail;
  };

  const batchGenerateEmails = async (
    leadIds: string[],
    explicitCampaignId?: string,
    options?: { forceRegenerate?: boolean; customInstructions?: string }
  ): Promise<Array<{ leadId: string; email?: EmailMessage; error?: string; isExisting?: boolean }>> => {
    if (!leadIds || leadIds.length === 0) {
      return [];
    }

    const allCampaigns = campaigns.length > 0 ? campaigns : await CRMService.getCampaigns();
    const allCaseStudies = caseStudies.length > 0 ? caseStudies : await CRMService.getCaseStudies();
    const allLeads = leads.length > 0 ? leads : await CRMService.getLeads();
    const allEmails = emailMessages.length > 0 ? emailMessages : await CRMService.getEmailMessages();

    // 1. Fetch / resolve Lead objects for all requested IDs
    const leadMap = new Map<string, Lead>();
    for (const leadId of leadIds) {
      let lead = allLeads.find(l => l.id === leadId);
      if (!lead) {
        lead = (await CRMService.getLeadById(leadId)) || undefined;
      }
      if (lead) {
        leadMap.set(leadId, lead);
      }
    }

    // 2. Resolve campaign context for each lead & group by resolved campaign ID
    // Hierarchy: 1. explicitCampaignId -> 2. lead.campaign_id -> 3. activeCampaignId -> 4. first available campaign
    const campaignGroups = new Map<string, { campaign: Campaign; leads: Lead[] }>();
    const unresolvableLeads: Array<{ leadId: string; error: string }> = [];
    const missingCampaignLeadIds: string[] = [];

    for (const leadId of leadIds) {
      const lead = leadMap.get(leadId);
      if (!lead) {
        unresolvableLeads.push({ leadId, error: `Lead record with ID ${leadId} not found.` });
        continue;
      }

      const hasDirectCampaign = Boolean(lead.campaign_id || lead.campaign?.id || (lead as any).campaignId);
      if (!explicitCampaignId && !hasDirectCampaign) {
        missingCampaignLeadIds.push(leadId);
      }

      const resolvedCampaign = await CRMService.resolveCampaignForLead(
        lead,
        explicitCampaignId,
        activeCampaignId || (allCampaigns[0]?.id)
      );

      if (!resolvedCampaign) {
        unresolvableLeads.push({ leadId, error: 'Could not resolve a campaign context for this lead.' });
        continue;
      }

      const groupKey = resolvedCampaign.id;
      if (!campaignGroups.has(groupKey)) {
        campaignGroups.set(groupKey, { campaign: resolvedCampaign, leads: [] });
      }
      campaignGroups.get(groupKey)!.leads.push(lead);
    }

    // 3. Log structured diagnostics
    const primaryCampaignGroup = campaignGroups.values().next().value;
    console.info('[Batch AI Email Diagnostics]', {
      batchSize: leadIds.length,
      resolvedCampaignId: primaryCampaignGroup?.campaign.id || 'N/A',
      resolvedCampaignName: primaryCampaignGroup?.campaign.name || 'N/A',
      uniqueCampaignCount: campaignGroups.size,
      missingCampaignLeadCount: missingCampaignLeadIds.length,
      explicitCampaignIdPassed: explicitCampaignId || null,
      activeCampaignId: activeCampaignId || null,
      totalUnresolvableLeads: unresolvableLeads.length,
    });

    const finalResults: Array<{ leadId: string; email?: EmailMessage; error?: string; isExisting?: boolean }> = [
      ...unresolvableLeads,
    ];

    let totalNewDraftsGenerated = 0;
    let totalExistingDraftsKept = 0;

    // 4. Process each campaign group safely with its own campaign configuration
    for (const [campId, group] of campaignGroups.entries()) {
      const { campaign, leads: groupLeads } = group;
      const caseStudy = campaign.case_study ||
        allCaseStudies.find(cs => cs.id === campaign.case_study_id) ||
        allCaseStudies[0];

      const existingEmailsForCampaign = allEmails.filter(e => e.campaign_id === campId);
      const existingEmailLeadIds = new Set(existingEmailsForCampaign.map(e => e.lead_id));

      const inputsToGenerate: PersonalizationInput[] = [];

      for (const lead of groupLeads) {
        // Idempotency: skip already drafted/approved/queued emails unless forceRegenerate is true
        if (!options?.forceRegenerate && existingEmailLeadIds.has(lead.id)) {
          const existing = existingEmailsForCampaign.find(e => e.lead_id === lead.id);
          if (existing) {
            finalResults.push({ leadId: lead.id, email: existing, isExisting: true });
            totalExistingDraftsKept++;
            continue;
          }
        }

        let company = await CRMService.resolveCompanyForLead(lead);
        if (!company) {
          company = companies.find(c => c.id === lead.company_id || (lead.company && c.id === lead.company.id)) || null;
        }
        if (!company) {
          finalResults.push({ leadId: lead.id, error: `Company record for lead ${lead.id} could not be resolved.` });
          continue;
        }

        const contact = lead.contact || company.primary_contact;

        let research = await CRMService.getLeadResearch(lead.id, campaign.id);
        if (!research || research.research_status !== 'completed') {
          try {
            research = await researchLead(lead.id, campaign.id);
          } catch {
            // fallback to synthesized brief
          }
        }

        inputsToGenerate.push({
          campaign,
          lead,
          company,
          contact,
          researchBrief: research || {
            id: `res-${lead.id}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            lead_id: lead.id,
            campaign_id: campaign.id,
            company_name: company.company_name,
            website: company.website,
            domain: company.domain,
            industry: company.industry || campaign.niche,
            country: company.country,
            city: company.city,
            company_overview: company.description || `${company.company_name} is an active brand in ${company.industry || campaign.niche}.`,
            products: [company.company_name],
            target_audience: 'Consumer e-commerce buyers',
            brand_positioning: 'Premium direct-to-consumer brand',
            visual_style: 'Clean product packaging and modern digital storefront presentation',
            marketing_channels: ['Digital Storefront', 'Social Media'],
            product_marketing_observations: `Features storefront presentation on ${company.domain || 'their website'}.`,
            content_observations: 'Strong visual baseline with high opportunity for conversion-focused 3D animation.',
            potential_animation_opportunity: `3D exploded teardown of ${company.company_name} hero packaging for landing page conversion.`,
            personalization_angle: `Highlighting visual packaging and proposing a tailored 3D motion concept.`,
            language_signal: campaign.language_strategy || 'English',
            research_confidence: 85,
            research_status: 'completed',
            raw_research_metadata: { source: 'synthesized-pipeline' },
          },
          caseStudy,
          customInstructions: options?.customInstructions,
        });
      }

      if (inputsToGenerate.length > 0) {
        const provider = new GeminiAIPersonalizationProvider();
        const batchDrafts = await provider.batchGenerateEmailDrafts(inputsToGenerate);

        for (const item of batchDrafts) {
          const inputItem = inputsToGenerate.find(inp => inp.lead.id === item.leadId);
          if (item.draft && inputItem) {
            const draft = item.draft;
            const emailPayload: Omit<EmailMessage, 'created_at' | 'updated_at'> = {
              id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
              campaign_id: campaign.id,
              lead_id: item.leadId,
              contact_id: inputItem.contact?.id,
              case_study_id: caseStudy?.id,
              subject: draft.subject,
              body: draft.body,
              status: 'reviewing',
              message_type: 'initial_outreach',
              provider: draft.provider_used || draft.model_used || 'ai-router',
              personalization_metadata: {
                observation_used: draft.observation_used,
                product_used: draft.product_used,
                opportunity_used: draft.opportunity_used,
                creative_used: draft.creative_used,
                language_selected: draft.language_selected,
                language_reason: draft.language_reason,
                language_confidence: draft.language_confidence,
                personalization_score: draft.personalization_score,
                personalization_reason: draft.personalization_reason,
                alternative_subjects: draft.alternative_subjects,
                ai_generated_body: draft.body,
                final_body: draft.body,
                model_used: draft.model_used,
                provider_used: draft.provider_used,
                generation_timestamp: draft.timestamp || new Date().toISOString(),
              },
            };

            const savedEmail = await CRMService.saveEmailMessage(emailPayload);
            finalResults.push({ leadId: item.leadId, email: savedEmail });
            totalNewDraftsGenerated++;
          } else {
            finalResults.push({ leadId: item.leadId, error: item.error || 'Failed to generate draft' });
          }
        }
      }
    }

    if (totalNewDraftsGenerated > 0 || totalExistingDraftsKept > 0) {
      await CRMService.logActivity(
        'batch_emails_generated',
        `Batch composed ${totalNewDraftsGenerated} new AI emails (${totalExistingDraftsKept} existing drafts preserved, ${leadIds.length} requested)`,
        {
          totalRequested: leadIds.length,
          generated: totalNewDraftsGenerated,
          existing: totalExistingDraftsKept,
          failed: finalResults.filter(r => r.error).length,
          campaignCount: campaignGroups.size,
        }
      );
    }

    await refreshData();
    return finalResults;
  };

  const saveFollowUpSequence = async (seq: FollowUpSequence) => {
    await CRMService.saveFollowUpSequence(seq);
    await refreshData();
  };

  const logActivity = async (type: Activity['activity_type'], description: string, metadata?: any) => {
    await CRMService.logActivity(type, description, metadata);
    await refreshData();
  };

  const getLeadResearch = async (leadId: string, campaignId?: string): Promise<LeadResearch | null> => {
    return CRMService.getLeadResearch(leadId, campaignId);
  };

  const saveLeadResearch = async (research: LeadResearch): Promise<LeadResearch> => {
    const saved = await CRMService.saveLeadResearch(research);
    await refreshData();
    return saved;
  };

  const researchLead = async (leadId: string, campaignId: string): Promise<LeadResearch> => {
    const lead = leads.find(l => l.id === leadId) || (await CRMService.getLeads(campaignId)).find(l => l.id === leadId);
    if (!lead) throw new Error(`Lead with ID ${leadId} not found.`);

    const campaign = campaigns.find(c => c.id === campaignId) || (await CRMService.getCampaignById(campaignId));
    if (!campaign) throw new Error(`Campaign with ID ${campaignId} not found.`);

    let company = await CRMService.resolveCompanyForLead(lead);
    if (!company) {
      company = companies.find(c => c.id === lead.company_id || (lead.company && c.id === lead.company.id));
    }
    if (!company) throw new Error(`Company for lead ${leadId} not found.`);

    // Set status to researching
    await CRMService.updateLead(leadId, { research_status: 'researching' });
    await CRMService.logActivity(
      'research_started',
      `Initiated AI deep research on "${company.company_name}" for campaign "${campaign.name}"`,
      { leadId, companyId: company.id, campaignId }
    );
    await refreshData();

    try {
      const researchProvider = new GeminiAIResearchProvider();
      const researchPromise = researchProvider.researchCompany(campaign, company, leadId);
      const { research } = await withTimeout(researchPromise, 45000, undefined, `AI Research for ${company.company_name}`);
      
      const saved = await CRMService.saveLeadResearch(research);
      await CRMService.logActivity(
        'research_completed',
        `Completed deep qualitative research on "${company.company_name}" (${research.research_confidence}% confidence)`,
        { leadId, companyId: company.id, campaignId }
      );
      await refreshData();
      return saved;
    } catch (err: any) {
      await CRMService.updateLead(leadId, { research_status: 'failed' });
      await CRMService.logActivity(
        'research_failed',
        `Deep research failed for "${company.company_name}": ${err.message || err}`,
        { leadId, companyId: company.id, campaignId, error: err.message }
      );
      await refreshData();
      throw err;
    }
  };

  const enrichContact = async (leadId: string) => {
    const outcome = await CRMService.enrichLeadContact(leadId);
    await refreshData();
    return outcome;
  };

  const batchEnrichContacts = async (
    leadIds?: string[],
    campaignId?: string,
    onProgress?: (progress: { current: number; total: number; leadId: string; message: string }) => void
  ) => {
    const targetLeadIds = leadIds && leadIds.length > 0 
      ? leadIds 
      : leads.filter(l => (!campaignId || l.campaign_id === campaignId)).map(l => l.id);
    const outcome = await CRMService.batchEnrichContacts(targetLeadIds, campaignId, onProgress);
    await refreshData();
    return outcome;
  };

  const ingestApprovedCandidates = async (campaignId: string, candidates: DiscoveryCandidate[]): Promise<SourcingResult> => {
    const result = await LeadSourceManager.ingestApprovedCandidates(campaignId, candidates);
    await refreshData();
    return result;
  };

  const clearAllLeads = async (campaignId?: string): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);
    try {
      if (!campaignId) {
        // Immediate local state reset
        setLeads([]);
        setCompanies([]);
        setEmailMessages([]);
        setLeadFollowUpSequences([]);
        setReplies([]);
        setLeadResearches([]);
        setMetrics({
          today_campaign_name: null,
          prospects_target: 50,
          prospects_found: 0,
          emails_ready: 0,
          emails_sent: 0,
          replies: 0,
          interested: 0,
          meetings: 0,
        });
      } else {
        setLeads(prev => prev.filter(l => l.campaign_id !== campaignId));
        setEmailMessages(prev => prev.filter(e => e.campaign_id !== campaignId));
        setLeadFollowUpSequences(prev => prev.filter(s => s.campaign_id !== campaignId));
      }

      const result = await CRMService.clearAllLeads(campaignId);
      await refreshData();
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const clearDatabase = async (): Promise<{ success: boolean; clearedTables: string[]; preservedTables: string[] }> => {
    setIsLoading(true);
    try {
      // Immediate local state purge
      setLeads([]);
      setCompanies([]);
      setCampaigns([]);
      setEmailMessages([]);
      setLeadFollowUpSequences([]);
      setReplies([]);
      setLeadResearches([]);
      setActivities([]);
      setActiveCampaignId(null);
      setSelectedReplyId(null);
      setMetrics({
        today_campaign_name: null,
        prospects_target: 50,
        prospects_found: 0,
        emails_ready: 0,
        emails_sent: 0,
        replies: 0,
        interested: 0,
        meetings: 0,
      });

      const result = await CRMService.clearOutreachData();
      await refreshData();
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const resetToDefaults = async (options?: { preserveOAuth?: boolean }): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);
    try {
      setLeads([]);
      setCompanies([]);
      setEmailMessages([]);
      setLeadFollowUpSequences([]);
      setReplies([]);
      setLeadResearches([]);
      setActivities([]);
      setActiveCampaignId(null);
      setSelectedReplyId(null);

      const result = await CRMService.resetToDefaults(options);
      await refreshData();
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const sendApprovedEmail = async (emailId: string): Promise<{ success: boolean; result?: SendEmailResult; error?: string }> => {
    const outcome = await CRMService.sendApprovedEmail(emailId);
    await refreshData();
    return outcome;
  };

  const abortBatchSending = () => {
    abortBatchRef.current = true;
    if (batchProgress) {
      setBatchProgress(prev => prev ? { ...prev, isSending: false } : null);
    }
  };

  const batchSendQueuedEmails = async (emailIds?: string[]): Promise<BatchSendProgress> => {
    abortBatchRef.current = false;
    const allEmails = await CRMService.getEmailMessages();
    const queuedEmails = (emailIds 
      ? allEmails.filter(e => emailIds.includes(e.id))
      : allEmails.filter(e => e.status === 'queued')
    );

    const total = queuedEmails.length;
    const progress: BatchSendProgress = {
      total,
      current: 0,
      successCount: 0,
      failedCount: 0,
      skippedCount: 0,
      isSending: true,
      isPaused: false,
      countdownSeconds: 0,
      logs: [],
    };
    setBatchProgress({ ...progress });

    const delayMs = (deliverySettings.delayBetweenSendsSec || 4) * 1000;

    for (let i = 0; i < total; i++) {
      if (abortBatchRef.current) {
        progress.logs.unshift({
          id: `abort-${Date.now()}`,
          leadName: 'Batch Dispatch Queue',
          recipient: '',
          status: 'skipped',
          message: 'Sending cancelled by user.',
          timestamp: new Date().toISOString(),
        });
        break;
      }

      const email = queuedEmails[i];
      const lead = leads.find(l => l.id === email.lead_id);
      const company = companies.find(c => c.id === lead?.company_id);
      const recipient = email.contact?.email || lead?.contact?.email || company?.primary_contact?.email || 'Unknown';
      const leadName = company?.company_name || recipient;

      progress.current = i + 1;
      progress.currentLeadName = leadName;
      progress.currentRecipient = recipient;
      setBatchProgress({ ...progress });

      try {
        const result = await CRMService.sendApprovedEmail(email.id);
        if (result.success) {
          progress.successCount += 1;
          progress.logs.unshift({
            id: `log-${email.id}`,
            leadName,
            recipient,
            status: 'success',
            message: result.result?.simulated ? 'Delivered (Sandbox Mode)' : `Dispatched via Gmail (ID: ${result.result?.providerMessageId || 'OK'})`,
            timestamp: new Date().toISOString(),
          });
        } else {
          progress.failedCount += 1;
          progress.logs.unshift({
            id: `log-${email.id}`,
            leadName,
            recipient,
            status: 'failed',
            message: result.error || 'Delivery failed',
            timestamp: new Date().toISOString(),
          });
        }
      } catch (err: any) {
        progress.failedCount += 1;
        progress.logs.unshift({
          id: `log-${email.id}`,
          leadName,
          recipient,
          status: 'failed',
          message: err.message || 'Send error',
          timestamp: new Date().toISOString(),
        });
      }

      setBatchProgress({ ...progress });

      // Controlled rate limiting delay between sends
      if (i < total - 1 && !abortBatchRef.current) {
        const seconds = Math.round(delayMs / 1000);
        for (let cd = seconds; cd > 0; cd--) {
          if (abortBatchRef.current) break;
          progress.countdownSeconds = cd;
          setBatchProgress({ ...progress });
          await new Promise(r => setTimeout(r, 1000));
        }
        progress.countdownSeconds = 0;
        setBatchProgress({ ...progress });
      }
    }

    progress.isSending = false;
    setBatchProgress({ ...progress });
    await refreshData();
    return progress;
  };

  // Build 06: Follow-Up Sequence Operations
  const pauseLeadSequence = async (sequenceId: string, reason = 'manual_paused'): Promise<void> => {
    await CRMService.pauseLeadSequence(sequenceId, reason);
    await refreshData();
  };

  const resumeLeadSequence = async (sequenceId: string): Promise<void> => {
    await CRMService.resumeLeadSequence(sequenceId);
    await refreshData();
  };

  const stopLeadSequence = async (sequenceId: string, reason = 'manual_cancelled'): Promise<void> => {
    await CRMService.stopLeadSequence(sequenceId, reason);
    await refreshData();
  };

  const checkProspectReply = async (leadId: string, email?: string, threadId?: string): Promise<{ replied: boolean; details?: any }> => {
    const result = await CRMService.checkReplyForLead(leadId, email, threadId);
    if (result.replied) {
      await refreshData();
    }
    return result;
  };

  const processDueFollowUpSequences = async (): Promise<{
    processed: number;
    sent: number;
    replied: number;
    skipped: number;
    errors: string[];
  }> => {
    const results = await CRMService.processDueFollowUpSequences();
    await refreshData();
    return results;
  };

  const fastForwardSequence = async (sequenceId: string, days = 3): Promise<void> => {
    await CRMService.fastForwardSequence(sequenceId, days);
    await refreshData();
  };

  const simulateProspectReply = async (sequenceId: string): Promise<void> => {
    await CRMService.simulateProspectReply(sequenceId);
    await refreshData();
  };

  // Build 07: Reply Intelligence & Conversation Management Handlers
  const analyzeReply = async (replyId: string, customText?: string): Promise<ProspectReply | null> => {
    const result = await CRMService.analyzeReply(replyId, customText);
    await refreshData();
    return result;
  };

  const generateResponseDraft = async (replyId: string): Promise<ResponseDraft | null> => {
    const result = await CRMService.generateResponseDraft(replyId);
    await refreshData();
    return result;
  };

  const sendApprovedResponse = async (
    replyId: string,
    draft: { subject: string; body: string },
    options?: { updatePipelineStatus?: LeadStatus }
  ): Promise<SendEmailResult> => {
    const result = await CRMService.sendApprovedResponse(replyId, draft, options);
    await refreshData();
    return result;
  };

  const updateReplyStatus = async (replyId: string, status: ReplyStatus): Promise<void> => {
    await CRMService.updateReplyStatus(replyId, status);
    await refreshData();
  };

  const updateLeadPipelineStatus = async (leadId: string, status: LeadStatus): Promise<void> => {
    await CRMService.updateLeadPipelineStatus(leadId, status);
    await refreshData();
  };

  const simulateInboundReply = async (
    leadId: string,
    customOptions?: { fromName?: string; email?: string; subject?: string; replyText?: string }
  ): Promise<ProspectReply> => {
    const result = await CRMService.simulateInboundReply(leadId, customOptions);
    await refreshData();
    return result;
  };

  const syncGmailReplies = async (): Promise<{ newRepliesCount: number; errors: string[] }> => {
    const result = await CRMService.syncGmailReplies();
    if (result.newRepliesCount > 0) {
      await refreshData();
    }
    return result;
  };

  const getConversationThread = async (leadId: string): Promise<ConversationMessageItem[]> => {
    return await CRMService.getConversationThread(leadId);
  };

  // Build 06 & 07: Periodic Automated Follow-Up and Reply Sync Engine (every 45s)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await CRMService.processDueFollowUpSequences();
        if (res.processed > 0 || res.sent > 0 || res.replied > 0) {
          await refreshData();
        }
      } catch (e) {
        console.warn('Periodic follow up processor:', e);
      }
    }, 45000);

    return () => clearInterval(interval);
  }, [refreshData]);

  return (
    <CRMContext.Provider
      value={{
        profile,
        campaigns,
        caseStudies,
        companies,
        leads,
        emailMessages,
        followUpSequences,
        leadFollowUpSequences,
        activities,
        leadResearches,
        replies,
        selectedReplyId,
        metrics,
        activeCampaignId,
        isLoading,
        supabaseStatus,
        gmailStatus,
        deliverySettings,
        todaySentCount,
        batchProgress,
        setActiveCampaignId,
        setSelectedReplyId,
        refreshData,
        updateProfile,
        createCampaign,
        updateCampaign,
        duplicateCampaign,
        deleteCampaign,
        createCaseStudy,
        updateCaseStudy,
        deleteCaseStudy,
        createCompanyAndLead,
        addManualCompany,
        updateLeadStatus,
        qualifyLead,
        rejectLead,
        deleteLead,
        deleteLeads,
        updateEmailStatus,
        saveEmailDraft,
        updateEmailMessage,
        approveEmail,
        rejectEmail,
        queueEmail,
        batchApproveEmails,
        batchQueueEmails,
        batchRejectEmails,
        deleteEmailMessage,
        generateEmailForLead,
        batchGenerateEmails,
        saveFollowUpSequence,
        logActivity,
        getLeadResearch,
        saveLeadResearch,
        researchLead,
        enrichContact,
        batchEnrichContacts,
        ingestApprovedCandidates,
        clearAllLeads,
        clearDatabase,
        resetToDefaults,
        checkGmailStatus,
        connectGmail,
        disconnectGmail,
        sendTestEmail,
        updateDeliverySettings,
        sendApprovedEmail,
        batchSendQueuedEmails,
        abortBatchSending,
        pauseLeadSequence,
        resumeLeadSequence,
        stopLeadSequence,
        checkProspectReply,
        processDueFollowUpSequences,
        fastForwardSequence,
        simulateProspectReply,
        analyzeReply,
        generateResponseDraft,
        sendApprovedResponse,
        updateReplyStatus,
        updateLeadPipelineStatus,
        simulateInboundReply,
        syncGmailReplies,
        getConversationThread,
      }}
    >
      {children}
    </CRMContext.Provider>
  );

};

export const useCRM = () => {
  const context = useContext(CRMContext);
  if (!context) {
    throw new Error('useCRM must be used within a CRMProvider');
  }
  return context;
};
