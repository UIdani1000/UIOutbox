// =============================================================================
// UIOutbox - TypeScript Definitions
// Private Outbound-Sales CRM & Outreach Operating System for UI Dani
// =============================================================================

export type CampaignStatus = 
  | 'draft' 
  | 'researching' 
  | 'ready' 
  | 'active' 
  | 'paused' 
  | 'completed';

export type LeadStatus = 
  | 'new' 
  | 'researching' 
  | 'qualified' 
  | 'rejected' 
  | 'ready' 
  | 'approved' 
  | 'contacted' 
  | 'follow_up' 
  | 'replied' 
  | 'interested' 
  | 'meeting' 
  | 'won' 
  | 'lost' 
  | 'do_not_contact';

export type CaseStudyStatus = 
  | 'draft' 
  | 'active' 
  | 'archived';

export type EmailStatus = 
  | 'unverified' 
  | 'verified' 
  | 'bounced' 
  | 'catchall';

export type EmailMessageStatus = 
  | 'draft' 
  | 'reviewing'
  | 'approved' 
  | 'rejected'
  | 'queued'
  | 'ai_generated' 
  | 'needs_review' 
  | 'scheduled' 
  | 'sent' 
  | 'delivered' 
  | 'bounced' 
  | 'replied' 
  | 'cancelled'
  | 'failed';

export type LanguageStrategy = 
  | 'Adaptive' 
  | 'English' 
  | 'French' 
  | 'Spanish' 
  | 'German' 
  | 'Other';

export interface Profile {
  id: string;
  user_id?: string;
  display_name: string;
  business_name: string;
  email: string;
  website: string;
  created_at: string;
  updated_at: string;
}

export interface CaseStudy {
  id: string;
  user_id?: string;
  name: string;
  title?: string;
  description: string;
  niche: string;
  offer: string;
  portfolio_url: string;
  url?: string;
  video_url: string;
  thumbnail_url: string;
  status: CaseStudyStatus;
  created_at: string;
  updated_at: string;
}

export interface FollowUpStep {
  id: string;
  sequence_id: string;
  step_number: number;
  delay_days: number;
  subject_template: string;
  body_template: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FollowUpSequence {
  id: string;
  user_id?: string;
  campaign_id?: string;
  name: string;
  status: 'active' | 'paused' | 'archived';
  steps?: FollowUpStep[];
  created_at: string;
  updated_at: string;
}

export type SequenceStatus = 'active' | 'paused' | 'replied' | 'completed' | 'cancelled';

export interface LeadFollowUpSequence {
  id: string;
  user_id?: string;
  lead_id: string;
  contact_id?: string;
  company_id?: string;
  campaign_id: string;
  follow_up_sequence_id?: string;
  current_step: number; // 0 = initial sent, 1 = follow-up #1 sent, 2 = follow-up #2 sent, 3 = final follow-up sent
  status: SequenceStatus;
  initial_email_id?: string;
  initial_email_sent_at: string;
  next_follow_up_at?: string;
  last_follow_up_sent_at?: string;
  last_follow_up_email_id?: string;
  reply_detected_at?: string;
  completed_at?: string;
  stopped_at?: string;
  stop_reason?: string;
  created_at: string;
  updated_at: string;
  // Joins
  lead?: Lead;
  company?: Company;
  contact?: Contact;
  campaign?: Campaign;
  sequence_template?: FollowUpSequence;
}

export interface Campaign {
  id: string;
  user_id?: string;
  name: string;
  status: CampaignStatus;
  niche: string;
  offer: string;
  target_market: string;
  target_company_type: string;
  daily_target: number;
  language_strategy: LanguageStrategy;
  case_study_id?: string;
  follow_up_sequence_id?: string;
  automated_follow_ups?: boolean;
  custom_sequence_steps?: FollowUpStep[];
  case_study?: CaseStudy;
  follow_up_sequence?: FollowUpSequence;
  created_at: string;
  updated_at: string;
  launched_at?: string;
  completed_at?: string;
  // Computed / aggregated fields for UI
  stats?: {
    prospects_found: number;
    qualified: number;
    emails_ready: number;
    emails_sent: number;
    replies: number;
    interested: number;
    meetings: number;
  };
}

export interface Company {
  id: string;
  user_id?: string;
  company_name: string;
  website?: string;
  domain: string;
  industry?: string;
  country?: string;
  city?: string;
  company_size?: string;
  description?: string;
  source: string;
  source_reference?: string;
  qualification_status: string;
  contact_status: string;
  first_contacted_at?: string;
  last_contacted_at?: string;
  created_at: string;
  updated_at: string;
  // Primary contact join
  primary_contact?: Contact;
}

export type ContactConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'NOT_FOUND';
export type ContactStatus = 'found' | 'needs_review' | 'not_found';
export type EmailVerificationStatus = 'verified' | 'unverified' | 'not_found';

export interface Contact {
  id: string;
  company_id: string;
  user_id?: string;
  first_name: string;
  last_name: string;
  full_name: string;
  job_title: string;
  email: string;
  email_status: 'unverified' | 'verified' | 'bounced' | 'catchall';
  linkedin_url?: string;
  other_profile_url?: string;
  is_primary_contact: boolean;
  contact_source?: string;
  contact_confidence?: ContactConfidence;
  contact_status?: ContactStatus;
  email_verification_status?: EmailVerificationStatus;
  enriched_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  campaign_id: string;
  company_id: string;
  contact_id?: string;
  status: LeadStatus;
  qualification_score: number;
  qualification_reason?: string;
  research_status: string;
  personalization_status: string;
  outreach_status: string;
  first_contacted_at?: string;
  last_contacted_at?: string;
  created_at: string;
  updated_at: string;
  // Contact Enrichment denormalized fields
  contact_name?: string;
  contact_title?: string;
  contact_email?: string;
  contact_linkedin?: string;
  contact_source?: string;
  contact_confidence?: ContactConfidence;
  contact_status?: ContactStatus;
  email_verification_status?: EmailVerificationStatus;
  enriched_at?: string;
  // Relational joins
  company?: Company;
  contact?: Contact;
  campaign?: Campaign;
  latest_email?: EmailMessage;
}

export interface EmailTemplate {
  id: string;
  user_id?: string;
  name: string;
  subject_template: string;
  body_template: string;
  purpose: string;
  created_at: string;
  updated_at: string;
}

export interface PersonalizationCreativeUsed {
  case_study_id?: string;
  case_study_name?: string;
  video_url?: string;
  portfolio_url?: string;
  thumbnail_url?: string;
}

export interface PersonalizationMetadata {
  observation_used?: string;
  product_used?: string;
  opportunity_used?: string;
  creative_used?: PersonalizationCreativeUsed;
  language_selected?: string;
  language_reason?: string;
  language_confidence?: number;
  personalization_score?: number;
  personalization_reason?: string;
  alternative_subjects?: string[];
  ai_generated_body?: string;
  final_body?: string;
  model_used?: string;
  generation_timestamp?: string;
  rejection_reason?: string;
  [key: string]: any;
}

export interface EmailMessage {
  id: string;
  user_id?: string;
  campaign_id?: string;
  lead_id?: string;
  contact_id?: string;
  template_id?: string;
  case_study_id?: string;
  sequence_id?: string;
  sequence_step?: number;
  thread_id?: string;
  gmail_thread_id?: string;
  gmail_message_id?: string;
  subject: string;
  body: string;
  status: EmailMessageStatus;
  message_type?: 'initial_outreach' | 'follow_up' | 'custom';
  personalization_metadata?: PersonalizationMetadata;
  provider?: string;
  provider_message_id?: string;
  scheduled_at?: string;
  sent_at?: string;
  opened_at?: string;
  replied_at?: string;
  created_at: string;
  updated_at: string;
  // Joins
  lead?: Lead;
  contact?: Contact;
  case_study?: CaseStudy;
  campaign?: Campaign;
}

export interface Activity {
  id: string;
  user_id?: string;
  company_id?: string;
  contact_id?: string;
  lead_id?: string;
  campaign_id?: string;
  activity_type: 
    | 'campaign_created' 
    | 'campaign_updated' 
    | 'campaign_started' 
    | 'campaign_paused' 
    | 'campaign_deleted'
    | 'company_added' 
    | 'company_imported' 
    | 'duplicate_detected' 
    | 'contact_added' 
    | 'lead_created' 
    | 'lead_qualified' 
    | 'lead_rejected' 
    | 'lead_deleted'
    | 'system_reset'
    | 'case_study_assigned'
    | 'case_study_added'
    | 'case_study_updated'
    | 'case_study_deleted'
    | 'lead_sourced' 
    | 'discovery_started'
    | 'discovery_completed'
    | 'candidate_found'
    | 'candidate_approved'
    | 'candidate_rejected'
    | 'qualification_completed'
    | 'research_started'
    | 'research_completed' 
    | 'research_failed'
    | 'contact_enriched'
    | 'batch_contacts_enriched'
    | 'contact_verified'
    | 'email_generated' 
    | 'email_approved' 
    | 'email_rejected'
    | 'email_queued'
    | 'email_edited'
    | 'batch_emails_generated'
    | 'email_sent' 
    | 'email_failed'
    | 'sequence_started'
    | 'sequence_paused'
    | 'sequence_resumed'
    | 'sequence_cancelled'
    | 'sequence_completed'
    | 'sequence_replied'
    | 'follow_up_queued'
    | 'follow_up_sent'
    | 'follow_up_failed'
    | 'reply_received'
    | 'reply_analyzed'
    | 'reply_response_generated'
    | 'reply_responded'
    | 'reply_status_updated'
    | 'status_changed' 
    | 'settings_updated';
  description: string;
  metadata?: Record<string, any>;
  created_at: string;
  company_name?: string;
}

export interface DashboardMetrics {
  today_campaign_name: string | null;
  total_prospects?: number;
  active_campaigns?: number;
  prospects_target: number;
  prospects_found: number;
  emails_ready: number;
  emails_queued?: number;
  emails_sent: number;
  follow_ups_sent?: number;
  follow_ups_scheduled?: number;
  active_sequences?: number;
  sequences_completed?: number;
  replies: number;
  interested: number;
  high_priority_replies?: number;
  meetings: number;
  won_leads?: number;
  reply_rate_percent?: number;
  interested_rate_percent?: number;
}

// -----------------------------------------------------------------------------
// Build 03: AI Discovery & Research Types
// -----------------------------------------------------------------------------

export type CandidateValidationStatus = 'valid' | 'invalid' | 'duplicate' | 'blocked';

export type ICPClassification = 'high_fit' | 'medium_fit' | 'low_fit';

export interface ICPQualification {
  score: number; // 0-100
  classification: ICPClassification;
  reason: string;
  signals: string[];
  risks: string[];
}

export interface DiscoveryCandidate {
  id: string;
  company_name: string;
  website: string;
  domain: string;
  industry: string;
  country: string;
  city?: string;
  description: string;
  source: string;
  source_reference: string;
  validation_status: CandidateValidationStatus;
  validation_message?: string;
  is_duplicate: boolean;
  duplicate_reason?: string;
  icp_qualification?: ICPQualification;
  approval_status: 'pending' | 'approved' | 'rejected';
}

export type DiscoveryJobState = 
  | 'idle' 
  | 'queued' 
  | 'discovering' 
  | 'normalizing' 
  | 'deduplicating' 
  | 'validating' 
  | 'qualifying' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export interface DiscoveryProgress {
  state: DiscoveryJobState;
  totalTarget: number;
  bufferCount: number;
  discoveredCount: number;
  validCount: number;
  duplicateCount: number;
  qualifiedCount: number;
  currentMessage: string;
  errorMessage?: string;
}

export interface LeadResearch {
  id: string;
  user_id?: string;
  lead_id: string;
  campaign_id: string;
  company_name: string;
  website?: string;
  domain: string;
  industry?: string;
  country?: string;
  city?: string;
  company_overview: string;
  products: string[];
  target_audience: string;
  brand_positioning: string;
  visual_style: string;
  marketing_channels: string[];
  product_marketing_observations: string;
  content_observations: string;
  potential_animation_opportunity: string;
  personalization_angle: string;
  language_signal: string;
  research_confidence: number;
  research_status: 'not_started' | 'queued' | 'researching' | 'completed' | 'failed';
  raw_research_metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface PersonalizationContract {
  company: string;
  product: string;
  observation: string;
  opportunity: string;
  personalization_angle: string;
  language: string;
  confidence: number;
}

// -----------------------------------------------------------------------------
// Build 05: Gmail Delivery Engine & Sending System Types
// -----------------------------------------------------------------------------

export interface GmailAuthStatus {
  connected: boolean;
  configured: boolean;
  email?: string;
  senderEmail?: string;
  senderName?: string;
  scopes?: string[];
  expiresAt?: number;
  lastChecked?: string;
  simulated?: boolean;
  tokenStatus?: 'valid' | 'expired' | 'refresh_required' | 'not_connected';
  deliveryMode?: string;
  connectedAt?: string;
  missingFields?: string[];
  redirectUri?: string;
}

export interface DeliverySettings {
  dailySendLimit: number;
  delayBetweenSendsSec: number;
  enableTracking: boolean;
  testRecipientEmail: string;
}

export interface SendEmailPayload {
  to: string;
  recipientName: string;
  from: string;
  fromName: string;
  subject: string;
  body: string;
  replyTo?: string;
  trackingId?: string;
  emailId?: string;
  leadId?: string;
  campaignId?: string;
  isApproved?: boolean;
  metadata?: Record<string, any>;
}

export interface SendEmailResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
  timestamp: string;
  simulated?: boolean;
}

export interface BatchSendProgress {
  total: number;
  current: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  isSending: boolean;
  isPaused: boolean;
  currentLeadName?: string;
  currentRecipient?: string;
  countdownSeconds: number;
  logs: Array<{
    id: string;
    leadName: string;
    recipient: string;
    status: 'success' | 'failed' | 'skipped';
    message?: string;
    timestamp: string;
  }>;
}

// -----------------------------------------------------------------------------
// Build 07: Reply Intelligence & Conversation Management Types
// -----------------------------------------------------------------------------

export type ReplyClassification = 
  | 'Interested'
  | 'Positive / Curious'
  | 'Question'
  | 'Objection'
  | 'Not Interested'
  | 'Referral'
  | 'Out of Office'
  | 'Unsubscribe'
  | 'Wrong Person'
  | 'Already Has Provider'
  | 'Needs More Information'
  | 'Meeting Request'
  | 'Other'
  | 'interested'
  | 'positive'
  | 'question'
  | 'objection'
  | 'not_interested'
  | 'out_of_office'
  | 'meeting_request'
  | 'referral'
  | 'other';

export type ReplyPriority = 'high' | 'medium' | 'low' | 'HIGH' | 'MEDIUM' | 'LOW';

export type ReplyStatus = 'unread' | 'read' | 'needs_response' | 'responded' | 'archived';

export interface ResponseDraft {
  subject: string;
  body: string;
  generated_at: string;
  model?: string;
}

export interface ProspectReply {
  id: string;
  user_id?: string;
  lead_id: string;
  contact_id?: string;
  company_id?: string;
  campaign_id?: string;
  sequence_id?: string;
  thread_id?: string;
  gmail_message_id?: string;
  from_email: string;
  from_name: string;
  to_email: string;
  subject: string;
  body: string;
  snippet: string;
  received_at: string;
  status: ReplyStatus;
  classification: ReplyClassification;
  intent: string;
  priority: ReplyPriority;
  detected_questions: string[];
  detected_objections: string[];
  suggested_action: string;
  recommended_pipeline_status?: LeadStatus;
  response_draft?: ResponseDraft;
  responded_email_id?: string;
  responded_at?: string;
  created_at: string;
  updated_at: string;
  // Aliases for convenience
  prospect_name?: string;
  prospect_email?: string;
  reply_snippet?: string;
  intent_summary?: string;
  suggested_draft?: ResponseDraft;
  suggested_action_name?: string;
  // Joins
  lead?: Lead;
  contact?: Contact;
  company?: Company;
  campaign?: Campaign;
}

export interface ReplyAnalysisResult {
  classification: ReplyClassification;
  intent: string;
  priority: ReplyPriority;
  detected_questions: string[];
  detected_objections: string[];
  suggested_action: string;
  recommended_pipeline_status: LeadStatus;
  confidence?: number;
}

export interface ConversationMessageItem {
  id: string;
  type: 'outbound' | 'follow_up' | 'reply' | 'manual_response';
  sender_name: string;
  sender_email: string;
  recipient_name: string;
  recipient_email: string;
  timestamp: string;
  subject: string;
  body: string;
  status?: string;
  step_number?: number;
  gmail_message_id?: string;
  thread_id?: string;
  // Aliases
  sender?: string;
  sent_at?: string;
  direction?: 'inbound' | 'outbound';
  step?: number;
}



