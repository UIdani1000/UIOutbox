import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  FileSpreadsheet, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Building2, 
  Mail, 
  Globe,
  MapPin,
  Eye,
  Trash2,
  CheckSquare,
  Square,
  Sparkles,
  BookOpen,
  RefreshCw,
  Zap,
  User,
  ExternalLink,
  Check,
  AlertTriangle
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { Lead, LeadStatus, Campaign, ContactConfidence, ContactStatus, EmailVerificationStatus } from '../types';
import { LeadDetailModal } from '../components/leads/LeadDetailModal';
import { QualifyLeadModal } from '../components/leads/QualifyLeadModal';
import { AddCompanyModal } from '../components/leads/AddCompanyModal';
import { CsvImportModal } from '../components/leads/CsvImportModal';
import { LeadResearchBriefModal } from '../components/research/LeadResearchBriefModal';
import { AIDiscoveryModal } from '../components/discovery/AIDiscoveryModal';
import { EmailPersonalizationModal } from '../components/personalization/EmailPersonalizationModal';
import { NavigationPage } from '../components/layout/Sidebar';

interface LeadsPageProps {
  onNavigate: (page: NavigationPage) => void;
}

export const LeadsPage: React.FC<LeadsPageProps> = ({ onNavigate }) => {
  const { 
    leads, 
    campaigns, 
    companies,
    emailMessages,
    leadFollowUpSequences,
    activeCampaignId, 
    qualifyLead, 
    rejectLead, 
    deleteLead,
    deleteLeads,
    clearAllLeads,
    researchLead,
    enrichContact,
    batchEnrichContacts,
    batchGenerateEmails,
    refreshData 
  } = useCRM();

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [qualifyingLead, setQualifyingLead] = useState<Lead | null>(null);
  const [researchingLeadId, setResearchingLeadId] = useState<string | null>(null);
  const [enrichingLeadId, setEnrichingLeadId] = useState<string | null>(null);
  const [briefLead, setBriefLead] = useState<Lead | null>(null);
  const [personalizingLead, setPersonalizingLead] = useState<Lead | null>(null);
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);
  const [isAIDiscoveryOpen, setIsAIDiscoveryOpen] = useState(false);

  // Deletion modals state
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [isDeletingSingle, setIsDeletingSingle] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [clearScope, setClearScope] = useState<'current_campaign' | 'all_campaigns'>('current_campaign');

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [campaignFilter, setCampaignFilter] = useState<string>(activeCampaignId || 'all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [researchFilter, setResearchFilter] = useState<string>('all');
  const [contactFilter, setContactFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isBatchResearching, setIsBatchResearching] = useState(false);
  const [isBatchEnriching, setIsBatchEnriching] = useState(false);
  const [isBatchPersonalizing, setIsBatchPersonalizing] = useState(false);

  const fallbackCampaign: Campaign = {
    id: 'camp_default',
    name: 'Luxury Fragrance & Niche Perfumery',
    niche: 'Luxury Fragrance & Niche Perfumery',
    offer: '3D Product Animation Teardown & Conversion Ads',
    target_market: 'Worldwide',
    target_company_type: 'Independent & niche perfume houses',
    language_strategy: 'Adaptive',
    daily_target: 50,
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const currentCampaign = campaigns.find(c => c.id === (campaignFilter !== 'all' ? campaignFilter : activeCampaignId)) || campaigns[0] || fallbackCampaign;

  const filteredLeads = leads.filter((lead) => {
    const matchesCampaign = campaignFilter === 'all' || lead.campaign_id === campaignFilter;
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesSource = sourceFilter === 'all' || lead.company?.source === sourceFilter;
    const matchesResearch = researchFilter === 'all' || (lead.research_status || 'not_started') === researchFilter;
    
    const hasContact = Boolean(lead.contact_name || lead.contact?.full_name);
    const isVerifiedEmail = lead.email_verification_status === 'verified' || lead.contact?.email_status === 'verified';
    const isHighMedConfidence = lead.contact_confidence === 'HIGH' || lead.contact_confidence === 'MEDIUM' || (hasContact && !lead.contact_confidence);
    const isNeedsReview = lead.contact_confidence === 'LOW' || lead.contact_status === 'needs_review';
    const isNotFound = !hasContact || lead.contact_confidence === 'NOT_FOUND' || lead.contact_status === 'not_found';

    const matchesContact = 
      contactFilter === 'all' ||
      (contactFilter === 'found' && isHighMedConfidence) ||
      (contactFilter === 'verified_email' && isVerifiedEmail) ||
      (contactFilter === 'needs_review' && isNeedsReview) ||
      (contactFilter === 'not_found' && isNotFound);

    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      !searchQuery ||
      (lead.company?.company_name || '').toLowerCase().includes(q) ||
      (lead.company?.domain || '').toLowerCase().includes(q) ||
      (lead.contact?.full_name || lead.contact_name || '').toLowerCase().includes(q) ||
      (lead.contact?.email || lead.contact_email || '').toLowerCase().includes(q);

    return matchesCampaign && matchesStatus && matchesSource && matchesResearch && matchesContact && matchesSearch;
  });

  const handleSelectAll = () => {
    if (selectedLeadIds.length === filteredLeads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(filteredLeads.map((l) => l.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkQualify = async () => {
    for (const id of selectedLeadIds) {
      await qualifyLead(id, 85, 'Bulk qualified from leads table');
    }
    setSelectedLeadIds([]);
  };

  const handleBulkReject = async () => {
    for (const id of selectedLeadIds) {
      await rejectLead(id, 'Bulk rejected from leads table');
    }
    setSelectedLeadIds([]);
  };

  const handleBulkDelete = () => {
    if (selectedLeadIds.length === 0) return;
    setIsBulkDeleteModalOpen(true);
  };

  const confirmBulkDelete = async () => {
    setIsBulkDeleting(true);
    try {
      await deleteLeads(selectedLeadIds);
      setSelectedLeadIds([]);
      setIsBulkDeleteModalOpen(false);
    } catch (err: any) {
      console.error('Bulk deletion error:', err);
      alert(`Error deleting leads: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleSingleLeadDelete = (lead: Lead) => {
    setLeadToDelete(lead);
  };

  const confirmSingleLeadDelete = async () => {
    if (!leadToDelete) return;
    setIsDeletingSingle(true);
    try {
      await deleteLead(leadToDelete.id);
      setSelectedLeadIds(prev => prev.filter(id => id !== leadToDelete.id));
      setLeadToDelete(null);
    } catch (err: any) {
      console.error('Lead deletion error:', err);
      alert(`Error deleting lead: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsDeletingSingle(false);
    }
  };

  const handleExecuteClearLeads = async () => {
    setIsClearingAll(true);
    try {
      const targetCampaignId = clearScope === 'current_campaign' && campaignFilter !== 'all' 
        ? campaignFilter 
        : (clearScope === 'current_campaign' && activeCampaignId ? activeCampaignId : undefined);
      
      const res = await clearAllLeads(targetCampaignId);
      setSelectedLeadIds([]);
      setIsClearAllModalOpen(false);
    } catch (err: any) {
      console.error('Clear leads error:', err);
      alert(`Error clearing leads: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsClearingAll(false);
    }
  };

  // Run contact enrichment on a single lead
  const handleSingleLeadEnrich = async (lead: Lead) => {
    setEnrichingLeadId(lead.id);
    try {
      const res = await enrichContact(lead.id);
      if (res.contact || res.lead?.contact_name) {
        // Enriched
      }
    } catch (err: any) {
      console.error('Contact enrichment error:', err);
      alert(`Contact enrichment error: ${err?.message || 'Failed'}`);
    } finally {
      setEnrichingLeadId(null);
    }
  };

  // Run batch contact enrichment on selected or filtered leads
  const handleBatchEnrich = async () => {
    const targets = selectedLeadIds.length > 0
      ? leads.filter(l => selectedLeadIds.includes(l.id))
      : filteredLeads.filter(l => !l.contact_name && (!l.contact || !l.contact.full_name));

    if (targets.length === 0) {
      alert('All selected or filtered prospects already have contact data. Select specific rows to re-enrich.');
      return;
    }

    setIsBatchEnriching(true);
    try {
      const explicitCampaignId = campaignFilter !== 'all' ? campaignFilter : (activeCampaignId || undefined);
      const res = await batchEnrichContacts(targets.map(l => l.id), explicitCampaignId);

      alert(
        `Batch Contact Enrichment Complete:\n` +
        `• Total Prospects: ${res.total}\n` +
        `• Decision Makers Found: ${res.found}\n` +
        `• Verified Direct Emails: ${res.verifiedEmails}\n` +
        `• Unverified / Role Emails: ${res.unverifiedEmails}\n` +
        `• Needs Human Review: ${res.needsReview}\n` +
        `• Not Found: ${res.notFound}`
      );
    } catch (e: any) {
      console.error('Batch contact enrichment error:', e);
      alert(`Batch contact enrichment error: ${e?.message || 'Unknown error'}`);
    } finally {
      setIsBatchEnriching(false);
      setSelectedLeadIds([]);
    }
  };

  // Run deep research on a single lead
  const handleSingleLeadResearch = async (lead: Lead) => {
    setResearchingLeadId(lead.id);
    try {
      await researchLead(lead.id, lead.campaign_id);
    } catch (err) {
      console.error('Lead research error:', err);
    } finally {
      setResearchingLeadId(null);
    }
  };

  // Run batch deep research on selected or qualified leads
  const handleBatchDeepResearch = async () => {
    const targets = selectedLeadIds.length > 0 
      ? leads.filter(l => selectedLeadIds.includes(l.id))
      : filteredLeads.filter(l => l.status === 'qualified' && l.research_status !== 'completed');

    if (targets.length === 0) {
      alert('No qualified leads need research.');
      return;
    }

    setIsBatchResearching(true);
    for (const lead of targets) {
      try {
        await researchLead(lead.id, lead.campaign_id);
      } catch (e) {
        console.error(`Batch research failed for lead ${lead.id}:`, e);
      }
    }
    setIsBatchResearching(false);
    setSelectedLeadIds([]);
  };

  // Run batch AI email personalization for selected or qualified leads
  const handleBatchPersonalize = async () => {
    const targetIds = selectedLeadIds.length > 0
      ? selectedLeadIds
      : filteredLeads.filter(l => l.status === 'qualified').map(l => l.id);

    if (targetIds.length === 0) {
      alert('No qualified leads available for email personalization. Qualify prospects first or select rows.');
      return;
    }

    setIsBatchPersonalizing(true);
    try {
      const explicitCampaignId = campaignFilter !== 'all' ? campaignFilter : (activeCampaignId || undefined);
      const results = await batchGenerateEmails(targetIds, explicitCampaignId);

      const generated = results.filter(r => r.email && !r.isExisting).length;
      const existing = results.filter(r => r.isExisting).length;
      const failed = results.filter(r => r.error).length;

      let summaryMsg = `Batch Personalization Complete:\nGenerated ${generated} of ${targetIds.length} personalized emails.`;
      if (existing > 0) summaryMsg += `\n• ${existing} existing draft(s) preserved.`;
      if (failed > 0) {
        summaryMsg += `\n• ${failed} lead(s) skipped/failed.`;
        const errorDetails = results.filter(r => r.error).map(r => `Lead ${r.leadId}: ${r.error}`).slice(0, 3).join('\n');
        summaryMsg += `\n${errorDetails}`;
      }
      alert(summaryMsg);
    } catch (e: any) {
      console.error('Batch email generation error:', e);
      alert(`Batch personalization error: ${e?.message || 'Unknown error'}`);
    } finally {
      setIsBatchPersonalizing(false);
      setSelectedLeadIds([]);
    }
  };

  const getStatusBadge = (status: LeadStatus) => {
    switch (status) {
      case 'new':
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">Unreviewed</span>;
      case 'qualified':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Qualified</span>;
      case 'ready':
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-sky-500/10 text-sky-400 border border-sky-500/30">Ready</span>;
      case 'approved':
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30">Approved</span>;
      case 'contacted':
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">Contacted</span>;
      case 'replied':
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-purple-500/10 text-purple-300 border border-purple-500/30">Replied</span>;
      case 'interested':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">Interested</span>;
      case 'meeting':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-400 text-zinc-950">Meeting</span>;
      case 'rejected':
      case 'lost':
      case 'do_not_contact':
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30">{status}</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-800 text-zinc-400">{status}</span>;
    }
  };

  const getResearchBadge = (status?: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <CheckCircle2 className="w-3 h-3" /> Brief Ready
          </span>
        );
      case 'researching':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse">
            <RefreshCw className="w-3 h-3 animate-spin" /> Researching...
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40">
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
            Not Researched
          </span>
        );
    }
  };

  return (
    <div id="leads-page" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header & Main Sourcing Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">Leads & Prospect Pipeline</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Deduplicated company profiles, ICP qualification scores, deep qualitative research briefs, contact discovery, and outreach readiness
          </p>
        </div>

        <div className="flex items-center space-x-2.5 self-start sm:self-auto">
          <button
            id="btn-leads-clear-all"
            onClick={() => setIsClearAllModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-medium text-xs border border-rose-500/30 transition-colors shadow-sm"
            title="Clear outreach leads"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Clear Leads</span>
          </button>

          <button
            id="btn-leads-ai-discovery"
            onClick={() => setIsAIDiscoveryOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold text-xs border border-emerald-500/40 transition-colors shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>AI Prospect Discovery</span>
          </button>

          <button
            id="btn-leads-import-csv"
            onClick={() => setIsCsvImportOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-medium text-xs border border-zinc-800 transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-zinc-300" />
            <span>Import CSV</span>
          </button>

          <button
            id="btn-leads-add-company"
            onClick={() => setIsAddCompanyOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 font-semibold text-xs transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Prospect</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-3.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search companies, domains, contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-md text-xs text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-amber-500/80"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Campaign Select */}
            <select
              value={campaignFilter}
              onChange={(e) => setCampaignFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-md text-xs text-zinc-200 focus:outline-none focus:border-amber-500/80"
            >
              <option value="all">All Campaigns</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Source Filter Select */}
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-md text-xs text-zinc-200 focus:outline-none focus:border-amber-500/80"
            >
              <option value="all">All Lead Sources</option>
              <option value="csv_import">CSV Import</option>
              <option value="ai_web_research">AI Web Research</option>
              <option value="manual">Manual OS Entry</option>
            </select>

            {/* Status Filter Select */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-md text-xs text-zinc-200 focus:outline-none focus:border-amber-500/80"
            >
              <option value="all">All Statuses</option>
              <option value="new">Unreviewed</option>
              <option value="qualified">Qualified</option>
              <option value="rejected">Rejected</option>
              <option value="contacted">Contacted</option>
              <option value="replied">Replied</option>
              <option value="interested">Interested</option>
              <option value="meeting">Meeting</option>
            </select>

            {/* Research Filter */}
            <select
              value={researchFilter}
              onChange={(e) => setResearchFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-md text-xs text-zinc-200 focus:outline-none focus:border-amber-500/80"
            >
              <option value="all">All Research</option>
              <option value="completed">Brief Ready</option>
              <option value="not_started">Not Researched</option>
              <option value="researching">Researching</option>
            </select>

            {/* Decision Maker & Contact Filter */}
            <select
              value={contactFilter}
              onChange={(e) => setContactFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-md text-xs text-zinc-200 focus:outline-none focus:border-amber-500/80"
            >
              <option value="all">All Contacts</option>
              <option value="found">Decision Maker Enriched</option>
              <option value="verified_email">Verified Direct Email</option>
              <option value="needs_review">Needs Review (Low Conf)</option>
              <option value="not_found">No Contact (Not Found)</option>
            </select>
          </div>
        </div>

        {/* Batch Operations Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800/80 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={handleBatchDeepResearch}
              disabled={isBatchResearching}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {isBatchResearching ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Batch Researching...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" /> Batch Research
                </>
              )}
            </button>

            <button
              onClick={handleBatchEnrich}
              disabled={isBatchEnriching}
              className="px-3 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {isBatchEnriching ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Enriching Contacts...
                </>
              ) : (
                <>
                  <User className="w-3.5 h-3.5 text-sky-400" /> Enrich Contacts
                </>
              )}
            </button>

            <button
              onClick={handleBatchPersonalize}
              disabled={isBatchPersonalizing}
              className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {isBatchPersonalizing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Batch Drafting...
                </>
              ) : (
                <>
                  <Mail className="w-3.5 h-3.5 text-amber-400" /> Batch Compose AI Emails
                </>
              )}
            </button>
          </div>

          {selectedLeadIds.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-amber-300 font-medium text-[11px]">
                {selectedLeadIds.length} selected
              </span>
              <button
                id="btn-bulk-qualify-leads"
                onClick={handleBulkQualify}
                className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded text-[11px] font-semibold"
              >
                Qualify
              </button>
              <button
                id="btn-bulk-reject-leads"
                onClick={handleBulkReject}
                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded text-[11px] font-semibold"
              >
                Reject
              </button>
              <button
                id="btn-bulk-delete-leads"
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded text-[11px] font-semibold flex items-center space-x-1 transition-colors disabled:opacity-50"
                title="Permanently delete selected prospects"
              >
                <Trash2 className="w-3 h-3 text-rose-400" />
                <span>{isBulkDeleting ? 'Deleting...' : `Delete (${selectedLeadIds.length})`}</span>
              </button>
              <button
                id="btn-clear-selection-leads"
                onClick={() => setSelectedLeadIds([])}
                className="px-2 py-1 text-zinc-400 hover:text-zinc-200 text-[11px]"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Leads Table */}
      {filteredLeads.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900/40 border border-dashed border-zinc-800 rounded-xl space-y-4">
          <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-amber-400 mx-auto">
            <Users className="w-5 h-5" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-sm font-semibold text-zinc-200">No leads found</h3>
            <p className="text-xs text-zinc-400 mt-1">
              {searchQuery || statusFilter !== 'all' || campaignFilter !== 'all' || sourceFilter !== 'all' || contactFilter !== 'all'
                ? 'Try adjusting your search or filter parameters.'
                : 'Import prospects from CSV or launch AI Prospect Discovery to begin your outreach qualification.'}
            </p>
          </div>
          <div className="flex items-center justify-center space-x-3 pt-2">
            <button
              onClick={() => setIsAIDiscoveryOpen(true)}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>Launch AI Discovery</span>
            </button>
            <button
              onClick={() => setIsCsvImportOpen(true)}
              className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs border border-zinc-700 transition-colors"
            >
              Import CSV
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 uppercase tracking-wider font-mono text-[10px]">
                <tr>
                  <th className="py-3 px-3 w-8">
                    <button onClick={handleSelectAll} className="text-zinc-400 hover:text-zinc-200">
                      {selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-4">Company & Domain</th>
                  <th className="py-3 px-4">Primary Decision Maker</th>
                  <th className="py-3 px-4">Qualification Fit</th>
                  <th className="py-3 px-4">Research Brief</th>
                  <th className="py-3 px-4">Email Outreach</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-normal">
                {filteredLeads.map((lead) => {
                  const isSelected = selectedLeadIds.includes(lead.id);
                  const isResearching = researchingLeadId === lead.id || lead.research_status === 'researching';
                  const isEnriching = enrichingLeadId === lead.id;
                  const emailDraft = emailMessages.find(e => e.lead_id === lead.id);

                  const contactName = lead.contact_name || lead.contact?.full_name;
                  const contactTitle = lead.contact_title || lead.contact?.job_title;
                  const contactEmail = lead.contact_email || lead.contact?.email;
                  const contactConfidence = lead.contact_confidence || lead.contact?.contact_confidence || (contactName ? 'MEDIUM' : 'NOT_FOUND');
                  const emailVerified = lead.email_verification_status === 'verified' || lead.contact?.email_status === 'verified';
                  const contactLinkedin = lead.contact_linkedin || lead.contact?.linkedin_url;

                  return (
                    <tr 
                      key={lead.id}
                      className={`hover:bg-zinc-800/40 transition-colors group ${
                        isSelected ? 'bg-amber-500/5' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3">
                        <button
                          onClick={() => handleToggleSelect(lead.id)}
                          className="text-zinc-400 hover:text-zinc-200"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-amber-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Company & Domain */}
                      <td className="py-3 px-4 cursor-pointer" onClick={() => setSelectedLead(lead)}>
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-[11px] text-zinc-300 shrink-0">
                            {lead.company?.company_name.charAt(0) || 'C'}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-zinc-200 group-hover:text-emerald-400 transition-colors block truncate">
                              {lead.company?.company_name}
                            </span>
                            <span className="text-[11px] text-zinc-400 font-mono block truncate">
                              {lead.company?.domain}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Primary Decision Maker (Enriched) */}
                      <td className="py-3 px-4">
                        {contactName ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-medium text-zinc-200 truncate max-w-[140px]">{contactName}</span>
                              {contactLinkedin && (
                                <a 
                                  href={contactLinkedin} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="text-zinc-500 hover:text-sky-400 transition-colors"
                                  title="LinkedIn profile"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                              <span className={`text-[9px] font-mono font-semibold px-1 rounded border ${
                                contactConfidence === 'HIGH'
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                  : contactConfidence === 'MEDIUM'
                                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                  : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                              }`}>
                                {contactConfidence === 'HIGH' ? 'HIGH' : contactConfidence === 'MEDIUM' ? 'MED' : 'LOW'}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 truncate max-w-[180px]">{contactTitle || 'Executive'}</p>
                            {contactEmail ? (
                              <div className="flex items-center space-x-1 mt-0.5">
                                <span className="text-[10px] text-zinc-300 font-mono truncate max-w-[140px]">{contactEmail}</span>
                                <span className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                                  emailVerified ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-300'
                                }`}>
                                  {emailVerified ? '✓ verified' : 'unverified'}
                                </span>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleSingleLeadEnrich(lead)}
                                disabled={isEnriching}
                                className="text-[10px] text-sky-400 hover:underline flex items-center space-x-1"
                              >
                                <span>Discover email</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <span className="text-zinc-500 italic text-[11px]">No contact</span>
                            <button
                              onClick={() => handleSingleLeadEnrich(lead)}
                              disabled={isEnriching}
                              className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-sky-300 border border-zinc-700 text-[10px] font-semibold flex items-center space-x-1 transition-colors disabled:opacity-50"
                              title="Enrich Decision Maker"
                            >
                              <User className={`w-2.5 h-2.5 text-sky-400 ${isEnriching ? 'animate-spin' : ''}`} />
                              <span>{isEnriching ? 'Finding...' : 'Enrich'}</span>
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Qualification */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <div className="w-12 bg-zinc-950 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  lead.qualification_score >= 70 ? 'bg-emerald-400' :
                                  lead.qualification_score >= 40 ? 'bg-amber-400' : 'bg-zinc-700'
                                }`}
                                style={{ width: `${lead.qualification_score || 0}%` }}
                              />
                            </div>
                            <span className="text-zinc-300 font-mono text-[11px]">
                              {lead.qualification_score || 0}%
                            </span>
                          </div>
                          {lead.qualification_reason && (
                            <p className="text-[10px] text-zinc-400 truncate max-w-[160px]" title={lead.qualification_reason}>
                              {lead.qualification_reason}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Research Brief Status & Button */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setBriefLead(lead)}
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                            title="Open Deep Qualitative Research Brief"
                          >
                            {getResearchBadge(lead.research_status)}
                          </button>

                          {lead.research_status !== 'completed' && (
                            <button
                              disabled={isResearching}
                              onClick={() => handleSingleLeadResearch(lead)}
                              className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-emerald-400 transition-colors disabled:opacity-50"
                              title="Run AI Deep Qualitative Research"
                            >
                              <Sparkles className={`w-3.5 h-3.5 ${isResearching ? 'animate-spin text-emerald-400' : ''}`} />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Email Outreach Status & Quick Trigger */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {emailDraft ? (
                            <button
                              onClick={() => setPersonalizingLead(lead)}
                              className="cursor-pointer hover:opacity-80 transition-opacity flex items-center space-x-1.5"
                              title={`Email Draft: ${emailDraft.subject} (${emailDraft.personalization_metadata?.personalization_score || 90}% fit)`}
                            >
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                emailDraft.status === 'approved'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : emailDraft.status === 'queued'
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                  : emailDraft.status === 'rejected'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              }`}>
                                {emailDraft.status === 'approved' ? '✓ Approved' : emailDraft.status === 'queued' ? '⇪ Queued' : emailDraft.status === 'rejected' ? '✗ Rejected' : 'Draft Ready'}
                              </span>
                            </button>
                          ) : (
                            <button
                              onClick={() => setPersonalizingLead(lead)}
                              className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-zinc-700 text-[10px] font-semibold flex items-center space-x-1 transition-colors"
                              title="Compose Personalized AI Outreach Draft"
                            >
                              <Sparkles className="w-3 h-3 text-amber-400" />
                              <span>Compose</span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {getStatusBadge(lead.status)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => handleSingleLeadEnrich(lead)}
                            disabled={isEnriching}
                            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-sky-400 transition-colors"
                            title="Enrich Decision Maker Contact"
                          >
                            <User className={`w-4 h-4 ${isEnriching ? 'animate-spin text-sky-400' : ''}`} />
                          </button>

                          <button
                            onClick={() => setPersonalizingLead(lead)}
                            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-amber-400 transition-colors"
                            title="AI Email Personalization Studio"
                          >
                            <Mail className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setBriefLead(lead)}
                            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 transition-colors"
                            title="View Qualitative Research Brief"
                          >
                            <BookOpen className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setQualifyingLead(lead)}
                            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 transition-colors"
                            title="Qualify / Evaluate Lead"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setSelectedLead(lead)}
                            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                            title="Inspect Prospect"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            id={`btn-delete-lead-${lead.id}`}
                            onClick={() => handleSingleLeadDelete(lead)}
                            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 transition-colors"
                            title="Delete Prospect"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onOpenResearchBrief={(l) => {
            setSelectedLead(null);
            setBriefLead(l);
          }}
          onOpenPersonalization={(l) => {
            setSelectedLead(null);
            setPersonalizingLead(l);
          }}
        />
      )}

      {personalizingLead && (
        <EmailPersonalizationModal
          lead={personalizingLead}
          campaign={campaigns.find(c => c.id === personalizingLead.campaign_id)}
          onClose={() => setPersonalizingLead(null)}
        />
      )}

      {briefLead && briefLead.company && (
        <LeadResearchBriefModal
          isOpen={!!briefLead}
          lead={briefLead}
          company={briefLead.company}
          campaign={campaigns.find(c => c.id === briefLead.campaign_id)}
          onClose={() => setBriefLead(null)}
        />
      )}

      {qualifyingLead && (
        <QualifyLeadModal
          lead={qualifyingLead}
          isOpen={!!qualifyingLead}
          onClose={() => setQualifyingLead(null)}
          onOpenResearchBrief={(l) => {
            setQualifyingLead(null);
            setBriefLead(l);
          }}
        />
      )}

      {isAIDiscoveryOpen && currentCampaign && (
        <AIDiscoveryModal
          isOpen={isAIDiscoveryOpen}
          campaign={currentCampaign}
          onClose={() => setIsAIDiscoveryOpen(false)}
          onComplete={() => {
            refreshData();
          }}
        />
      )}

      {isAddCompanyOpen && (
        <AddCompanyModal
          isOpen={isAddCompanyOpen}
          defaultCampaignId={campaignFilter !== 'all' ? campaignFilter : undefined}
          onClose={() => setIsAddCompanyOpen(false)}
        />
      )}

      {isCsvImportOpen && (
        <CsvImportModal
          isOpen={isCsvImportOpen}
          defaultCampaignId={campaignFilter !== 'all' ? campaignFilter : undefined}
          onClose={() => setIsCsvImportOpen(false)}
        />
      )}

      {/* Confirmation Modal: Single Lead Delete */}
      {leadToDelete && (
        <div 
          id="confirm-delete-lead-modal"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden p-6 space-y-5">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">Delete Prospect Record</h3>
                <p className="text-xs text-zinc-400">Permanent database deletion</p>
              </div>
            </div>

            <div className="p-3 bg-zinc-950/70 border border-zinc-800 rounded-lg space-y-1.5 text-xs text-zinc-300">
              <p className="font-semibold text-zinc-200">
                {leadToDelete.company?.company_name || 'Prospect'} ({leadToDelete.company?.domain || 'Website'})
              </p>
              <p className="text-[11px] text-zinc-400">
                This will permanently delete this lead and remove all associated research briefs, email drafts, activity logs, and follow-up sequence items.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2.5 pt-1">
              <button
                type="button"
                onClick={() => setLeadToDelete(null)}
                disabled={isDeletingSingle}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-delete-lead"
                type="button"
                onClick={confirmSingleLeadDelete}
                disabled={isDeletingSingle}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingSingle ? 'Deleting...' : 'Delete Lead'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Bulk Lead Delete */}
      {isBulkDeleteModalOpen && (
        <div 
          id="confirm-bulk-delete-modal"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden p-6 space-y-5">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">Delete {selectedLeadIds.length} Prospects</h3>
                <p className="text-xs text-zinc-400">Batch deletion</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300">
              Are you sure you want to permanently delete the <strong className="text-rose-400">{selectedLeadIds.length}</strong> selected prospects?
              All corresponding research briefs, email drafts, and follow-up sequences will also be cleaned up.
            </p>

            <div className="flex items-center justify-end space-x-2.5 pt-1">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                disabled={isBulkDeleting}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-bulk-delete"
                type="button"
                onClick={confirmBulkDelete}
                disabled={isBulkDeleting}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isBulkDeleting ? 'Deleting...' : `Delete ${selectedLeadIds.length} Leads`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Clear Leads */}
      {isClearAllModalOpen && (
        <div 
          id="confirm-clear-leads-modal"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden p-6 space-y-5">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">Clear Outreach Leads</h3>
                <p className="text-xs text-zinc-400">Reset lead pipeline data safely</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-medium text-zinc-300">
                Select Deletion Scope:
              </label>
              
              <div className="space-y-2">
                <label className="flex items-start space-x-3 p-3 rounded-lg bg-zinc-950/70 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors">
                  <input
                    type="radio"
                    name="clearScope"
                    value="current_campaign"
                    checked={clearScope === 'current_campaign'}
                    onChange={() => setClearScope('current_campaign')}
                    className="mt-0.5 text-amber-500 focus:ring-0"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-zinc-200 block">
                      Clear Active / Selected Campaign Leads Only
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      Deletes prospects linked to "{currentCampaign?.name || 'Selected Campaign'}". Other campaigns remain untouched.
                    </span>
                  </div>
                </label>

                <label className="flex items-start space-x-3 p-3 rounded-lg bg-zinc-950/70 border border-rose-950/40 cursor-pointer hover:border-rose-900/60 transition-colors">
                  <input
                    type="radio"
                    name="clearScope"
                    value="all_campaigns"
                    checked={clearScope === 'all_campaigns'}
                    onChange={() => setClearScope('all_campaigns')}
                    className="mt-0.5 text-rose-500 focus:ring-0"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-rose-300 block">
                      Clear ALL Leads Across All Campaigns ({leads.length} Total)
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      Purges all prospect records, draft emails, sequence steps, and research briefs across the entire system.
                    </span>
                  </div>
                </label>
              </div>

              <div className="p-3 bg-zinc-950/40 rounded-lg border border-zinc-800/80 text-[11px] text-zinc-400 space-y-1">
                <p className="text-emerald-400 font-medium">✓ Safe Reset Guarantee:</p>
                <p>Your user profile, case studies, Gmail OAuth connection, delivery settings, and campaign templates are strictly preserved.</p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2.5 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setIsClearAllModalOpen(false)}
                disabled={isClearingAll}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-clear-leads-execute"
                type="button"
                onClick={handleExecuteClearLeads}
                disabled={isClearingAll}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isClearingAll ? 'Clearing Leads...' : 'Clear Leads Now'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
