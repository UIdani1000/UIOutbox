import React, { useState } from 'react';
import { X, Building2, User, Globe, Mail, ExternalLink, ShieldCheck, Clock, CheckCircle2, AlertCircle, Sparkles, BookOpen, Send, ThumbsUp, Edit3, RefreshCw, Check, AlertTriangle, Trash2 } from 'lucide-react';
import { Lead, LeadStatus, ContactConfidence, ContactStatus, EmailVerificationStatus } from '../../types';
import { useCRM } from '../../context/CRMContext';

interface LeadDetailModalProps {
  lead: Lead | null;
  onClose: () => void;
  onOpenResearchBrief?: (lead: Lead) => void;
  onOpenPersonalization?: (lead: Lead) => void;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({ 
  lead, 
  onClose, 
  onOpenResearchBrief,
  onOpenPersonalization 
}) => {
  const { updateLeadStatus, emailMessages, enrichContact, deleteLead } = useCRM();
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichMessage, setEnrichMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!lead) return null;

  const company = lead.company;
  const contact = lead.contact;
  const emailDraft = emailMessages.find(e => e.lead_id === lead.id);

  const contactName = lead.contact_name || contact?.full_name || contact?.contact_name;
  const contactTitle = lead.contact_title || contact?.job_title || contact?.contact_title;
  const contactEmail = lead.contact_email || contact?.email || contact?.contact_email;
  const contactLinkedin = lead.contact_linkedin || contact?.linkedin_url || contact?.contact_linkedin;
  const contactConfidence = lead.contact_confidence || contact?.contact_confidence || (contactName ? 'MEDIUM' : 'NOT_FOUND');
  const contactStatus = lead.contact_status || contact?.contact_status || (contactName ? 'found' : 'not_found');
  const emailVerification = lead.email_verification_status || contact?.email_verification_status || (contactEmail ? 'unverified' : 'not_found');
  const contactSource = lead.contact_source || contact?.contact_source || 'AI Executive Discovery';
  const enrichedAt = lead.enriched_at || contact?.enriched_at;

  const handleStatusChange = async (newStatus: LeadStatus) => {
    await updateLeadStatus(lead.id, newStatus);
  };

  const handleEnrichDecisionMaker = async () => {
    setIsEnriching(true);
    setEnrichMessage(null);
    try {
      const res = await enrichContact(lead.id);
      setEnrichMessage(res.details || 'Decision maker details updated successfully');
    } catch (err: any) {
      setEnrichMessage(`Enrichment failed: ${err.message || 'Error occurred'}`);
    } finally {
      setIsEnriching(false);
    }
  };

  const statusList: { value: LeadStatus; label: string }[] = [
    { value: 'new', label: 'New' },
    { value: 'researching', label: 'Researching' },
    { value: 'qualified', label: 'Qualified' },
    { value: 'ready', label: 'Ready' },
    { value: 'approved', label: 'Approved' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'follow_up', label: 'Follow-up' },
    { value: 'replied', label: 'Replied' },
    { value: 'interested', label: 'Interested' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'won', label: 'Won' },
    { value: 'lost', label: 'Lost' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'do_not_contact', label: 'Do Not Contact' },
  ];

  return (
    <div 
      id="lead-detail-modal-overlay"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <div 
        id="lead-detail-modal-container"
        className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col my-8"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/70">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-200 font-bold">
              {company?.company_name.charAt(0) || 'C'}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-semibold text-zinc-100">{company?.company_name || 'Unnamed Company'}</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono">
                  {company?.domain}
                </span>
              </div>
              <p className="text-xs text-zinc-400">Campaign: {lead.campaign?.name || 'Unassigned'}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Status & Qualification Score */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-zinc-950/70 rounded-lg border border-zinc-800/80">
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
                Lead Status
              </label>
              <select
                id="lead-status-select"
                value={lead.status}
                onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
                className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-100 focus:outline-none focus:border-amber-500/80"
              >
                {statusList.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
                AI Qualification Score
              </label>
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-zinc-900 rounded-full h-2.5 overflow-hidden border border-zinc-800">
                  <div 
                    className={`h-full rounded-full ${
                      (lead.qualification_score || 0) >= 70 ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                    style={{ width: `${lead.qualification_score || 70}%` }}
                  />
                </div>
                <span className="text-xs font-mono font-semibold text-zinc-200">
                  {lead.qualification_score || 70}/100
                </span>
              </div>
            </div>
          </div>

          {/* Research Brief Section */}
          <div className="p-4 bg-zinc-950/70 rounded-lg border border-zinc-800 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">
                Deep Qualitative Research Brief
              </span>
              <p className="text-xs text-zinc-300">
                {lead.research_status === 'completed'
                  ? 'Comprehensive intelligence dossier and personalized talking points ready.'
                  : 'Synthesize positioning, creative critique, verified angles, and custom hooks.'}
              </p>
            </div>
            {onOpenResearchBrief && (
              <button
                onClick={() => onOpenResearchBrief(lead)}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>{lead.research_status === 'completed' ? 'View Brief' : 'Run Research'}</span>
              </button>
            )}
          </div>

          {/* AI Personalized Email Section */}
          <div className="p-4 bg-zinc-950/70 rounded-lg border border-zinc-800 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">
                  AI Personalized Email Draft
                </span>
                {emailDraft && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-medium ${
                    emailDraft.status === 'approved' 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : emailDraft.status === 'queued'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                      : emailDraft.status === 'rejected'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}>
                    {emailDraft.status.toUpperCase()}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-300">
                {emailDraft 
                  ? `Draft: "${emailDraft.subject}" (${emailDraft.personalization_metadata?.personalization_score || 90}% match)`
                  : 'Compose tailored outreach combining brand hooks, video case study, and Daniel voice.'}
              </p>
            </div>
            {onOpenPersonalization && (
              <button
                onClick={() => onOpenPersonalization(lead)}
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{emailDraft ? 'Review Draft' : 'Compose Email'}</span>
              </button>
            )}
          </div>

          {/* Company Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center space-x-1.5">
              <Building2 className="w-3.5 h-3.5 text-zinc-400" />
              <span>Company Information</span>
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-zinc-950/50 rounded border border-zinc-800/60">
                <span className="text-zinc-400 block mb-1">Website & Domain</span>
                <a 
                  href={`https://${company?.domain}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-amber-400 hover:underline flex items-center space-x-1"
                >
                  <span className="truncate">{company?.website || company?.domain}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>
              <div className="p-3 bg-zinc-950/50 rounded border border-zinc-800/60">
                <span className="text-zinc-400 block mb-1">Industry / Niche</span>
                <span className="text-zinc-200 font-medium">{company?.industry || 'Consumer Brands'}</span>
              </div>
              <div className="p-3 bg-zinc-950/50 rounded border border-zinc-800/60">
                <span className="text-zinc-400 block mb-1">Location</span>
                <span className="text-zinc-200">{company?.city ? `${company.city}, ` : ''}{company?.country || 'Worldwide'}</span>
              </div>
              <div className="p-3 bg-zinc-950/50 rounded border border-zinc-800/60">
                <span className="text-zinc-400 block mb-1">Company Size</span>
                <span className="text-zinc-200">{company?.company_size || '10-50 employees'}</span>
              </div>
            </div>
            {company?.description && (
              <p className="text-xs text-zinc-400 p-3 bg-zinc-950/30 rounded border border-zinc-800/40">
                {company.description}
              </p>
            )}
          </div>

          {/* Contact Details & Decision Maker Enrichment */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-zinc-400" />
                <span>Primary Decision Maker (Enriched)</span>
              </h3>
              <button
                onClick={handleEnrichDecisionMaker}
                disabled={isEnriching}
                className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-zinc-700 text-[11px] font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isEnriching ? 'animate-spin text-amber-400' : ''}`} />
                <span>{isEnriching ? 'Enriching...' : contactName ? 'Re-Enrich Contact' : 'Enrich Decision Maker'}</span>
              </button>
            </div>

            {enrichMessage && (
              <div className="p-2.5 rounded bg-zinc-950/80 border border-zinc-800 text-[11px] text-zinc-300 flex items-center justify-between">
                <span>{enrichMessage}</span>
                <button onClick={() => setEnrichMessage(null)} className="text-zinc-500 hover:text-zinc-300">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {contactName ? (
              <div className="p-4 bg-zinc-950/70 rounded-lg border border-zinc-800/80 space-y-3 text-xs">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-bold text-zinc-100 text-sm">{contactName}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                        contactConfidence === 'HIGH' 
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                          : contactConfidence === 'MEDIUM' 
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                          : contactConfidence === 'LOW' 
                          ? 'bg-orange-500/20 text-orange-300 border-orange-500/40' 
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                      }`}>
                        {contactConfidence} CONFIDENCE
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                        {contactStatus === 'found' ? 'Verified Profile' : contactStatus === 'needs_review' ? 'Needs Review' : 'Lookup'}
                      </span>
                    </div>
                    <p className="text-zinc-300 font-medium mt-0.5">{contactTitle || 'Creative Director'}</p>
                  </div>

                  {contactLinkedin && (
                    <a
                      href={contactLinkedin}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-700 text-[11px] text-zinc-300 hover:text-white flex items-center space-x-1 hover:border-zinc-600 transition-colors"
                    >
                      <span>LinkedIn Profile</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-800/60">
                  <div>
                    <span className="text-zinc-500 text-[10px] uppercase font-mono block">Direct Outreach Email</span>
                    {contactEmail ? (
                      <div className="flex items-center space-x-2 mt-0.5">
                        <span className="text-zinc-200 font-mono text-xs font-medium">{contactEmail}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                          emailVerification === 'verified' 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {emailVerification === 'verified' ? '✓ VERIFIED' : 'UNVERIFIED'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-zinc-500 italic text-[11px]">No direct email discovered</span>
                    )}
                  </div>

                  <div>
                    <span className="text-zinc-500 text-[10px] uppercase font-mono block">Enrichment Source & Date</span>
                    <p className="text-zinc-400 text-[11px] mt-0.5 truncate">
                      {contactSource} {enrichedAt ? `• ${new Date(enrichedAt).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-zinc-950/40 rounded-lg border border-dashed border-zinc-800 text-center space-y-2">
                <p className="text-xs text-zinc-400">
                  No decision maker identified yet. Run contact enrichment to discover the Founder, CEO, or Creative Director.
                </p>
                <button
                  onClick={handleEnrichDecisionMaker}
                  disabled={isEnriching}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold inline-flex items-center space-x-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isEnriching ? 'Searching...' : 'Discover Decision Maker Now'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950/70 flex items-center justify-between">
          <button
            id="btn-modal-delete-lead"
            onClick={async () => {
              const name = company?.company_name || 'this prospect';
              if (window.confirm(`Permanently delete prospect "${name}"?\n\nThis will remove all associated research briefs, email drafts, and follow-up sequences.`)) {
                setIsDeleting(true);
                try {
                  await deleteLead(lead.id);
                  onClose();
                } finally {
                  setIsDeleting(false);
                }
              }
            }}
            disabled={isDeleting}
            className="px-3 py-1.5 rounded-md text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors flex items-center space-x-1.5 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isDeleting ? 'Deleting...' : 'Delete Lead'}</span>
          </button>

          <button
            id="btn-modal-close-lead"
            onClick={onClose}
            className="px-4 py-2 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
