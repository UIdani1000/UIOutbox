import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Send, 
  Target, 
  Film, 
  Users, 
  Plus, 
  FileSpreadsheet, 
  Sparkles, 
  Copy, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ExternalLink, 
  MoreVertical,
  PlayCircle,
  PauseCircle,
  Filter,
  Search,
  Eye,
  ShieldCheck
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { Campaign, CampaignStatus, Lead } from '../types';
import { QualifyLeadModal } from '../components/leads/QualifyLeadModal';
import { AddCompanyModal } from '../components/leads/AddCompanyModal';
import { CsvImportModal } from '../components/leads/CsvImportModal';
import { LeadDetailModal } from '../components/leads/LeadDetailModal';
import { EmailPersonalizationModal } from '../components/personalization/EmailPersonalizationModal';
import { LeadResearchBriefModal } from '../components/research/LeadResearchBriefModal';
import { Mail, BookOpen } from 'lucide-react';

interface CampaignDetailPageProps {
  campaignId: string;
  onBack: () => void;
}

export const CampaignDetailPage: React.FC<CampaignDetailPageProps> = ({
  campaignId,
  onBack,
}) => {
  const { 
    campaigns, 
    leads, 
    caseStudies, 
    emailMessages,
    updateCampaign, 
    duplicateCampaign, 
    deleteCampaign,
    qualifyLead,
    rejectLead,
    deleteLead,
    batchGenerateEmails
  } = useCRM();

  const campaign = campaigns.find((c) => c.id === campaignId);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [qualifyingLead, setQualifyingLead] = useState<Lead | null>(null);
  const [inspectingLead, setInspectingLead] = useState<Lead | null>(null);
  const [personalizingLead, setPersonalizingLead] = useState<Lead | null>(null);
  const [briefLead, setBriefLead] = useState<Lead | null>(null);
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);
  const [isEditingAsset, setIsEditingAsset] = useState(false);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);

  if (!campaign) {
    return (
      <div className="p-8 text-center space-y-4 max-w-lg mx-auto">
        <h2 className="text-base font-semibold text-zinc-100">Campaign Not Found</h2>
        <p className="text-xs text-zinc-400">The requested campaign might have been removed.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-lg bg-amber-400 text-zinc-950 font-semibold text-xs"
        >
          Return to Campaigns
        </button>
      </div>
    );
  }

  const campaignLeads = leads.filter((l) => l.campaign_id === campaign.id);
  const qualifiedCount = campaignLeads.filter((l) => l.status === 'qualified').length;
  const rejectedCount = campaignLeads.filter((l) => l.status === 'rejected').length;
  const newCount = campaignLeads.filter((l) => l.status === 'new').length;
  const contactedCount = campaignLeads.filter((l) => l.status === 'contacted' || l.status === 'replied').length;
  const repliedCount = campaignLeads.filter((l) => l.status === 'replied' || l.status === 'interested' || l.status === 'meeting').length;

  const progressPercent = Math.min(100, Math.round((campaignLeads.length / (campaign.daily_target || 50)) * 100));

  const filteredLeads = campaignLeads.filter((lead) => {
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesSearch = 
      (lead.company?.company_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.company?.domain || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.contact?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.contact?.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const associatedCaseStudy = caseStudies.find((cs) => cs.id === campaign.case_study_id);

  const handleStatusChange = async (newStatus: CampaignStatus) => {
    await updateCampaign(campaign.id, { status: newStatus });
  };

  const handleBatchPersonalize = async () => {
    const qualifiedLeads = filteredLeads.filter(l => l.status === 'qualified');
    if (qualifiedLeads.length === 0) {
      alert('No qualified leads in this campaign to personalize. Qualify leads first.');
      return;
    }

    setIsBatchGenerating(true);
    try {
      const results = await batchGenerateEmails(qualifiedLeads.map(l => l.id), campaign.id);
      const generated = results.filter(r => r.email && !r.isExisting).length;
      const existing = results.filter(r => r.isExisting).length;
      const failed = results.filter(r => r.error).length;

      let summaryMsg = `Campaign Batch Personalization Complete:\nGenerated ${generated} of ${qualifiedLeads.length} emails.`;
      if (existing > 0) summaryMsg += `\n• ${existing} existing draft(s) preserved.`;
      if (failed > 0) summaryMsg += `\n• ${failed} lead(s) failed/skipped.`;
      alert(summaryMsg);
    } catch (e: any) {
      console.error('Campaign batch email generation error:', e);
      alert(`Campaign batch personalization error: ${e?.message || 'Unknown error'}`);
    } finally {
      setIsBatchGenerating(false);
    }
  };

  const handleDuplicate = async () => {
    const copy = await duplicateCampaign(campaign.id);
    if (copy) {
      alert(`Campaign duplicated as "${copy.name}".`);
    }
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete campaign "${campaign.name}"?`)) {
      await deleteCampaign(campaign.id);
      onBack();
    }
  };

  const handleLinkCaseStudy = async (csId: string) => {
    await updateCampaign(campaign.id, { case_study_id: csId || undefined });
    setIsEditingAsset(false);
  };

  return (
    <div id="campaign-detail-page" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            id="btn-back-to-campaigns"
            onClick={onBack}
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-xl font-bold text-zinc-100">{campaign.name}</h1>
              <select
                value={campaign.status}
                onChange={(e) => handleStatusChange(e.target.value as CampaignStatus)}
                className="px-2.5 py-1 rounded text-xs font-semibold bg-zinc-900 border border-zinc-700 text-zinc-200 focus:outline-none focus:border-amber-500"
              >
                <option value="draft">Draft</option>
                <option value="ready">Ready</option>
                <option value="researching">Researching</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Campaign context & prospect operating system
            </p>
          </div>
        </div>

        {/* Global Sourcing Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            id="btn-campaign-import-csv"
            onClick={() => setIsCsvImportOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-medium border border-zinc-800 transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Import CSV</span>
          </button>

          <button
            id="btn-campaign-add-company"
            onClick={() => setIsAddCompanyOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-medium border border-zinc-800 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>Add Prospect</span>
          </button>

          <button
            onClick={handleDuplicate}
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            title="Duplicate Campaign"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleDelete}
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
            title="Delete Campaign"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Grid: Left Context & Metrics, Right Case Study Asset */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Campaign Parameters Card */}
        <div className="lg:col-span-2 p-5 bg-zinc-900/70 border border-zinc-800/80 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
              Strategy & Target Parameters
            </h3>
            <span className="text-xs text-zinc-400 font-mono">
              Created: {new Date(campaign.created_at).toLocaleDateString()}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-zinc-950/70 rounded-lg border border-zinc-800/60">
              <span className="text-zinc-400 text-[10px] uppercase block">Target Niche</span>
              <span className="font-semibold text-zinc-100 mt-0.5 block truncate">{campaign.niche}</span>
            </div>
            <div className="p-3 bg-zinc-950/70 rounded-lg border border-zinc-800/60">
              <span className="text-zinc-400 text-[10px] uppercase block">Creative Offer</span>
              <span className="font-semibold text-zinc-100 mt-0.5 block truncate">{campaign.offer}</span>
            </div>
            <div className="p-3 bg-zinc-950/70 rounded-lg border border-zinc-800/60">
              <span className="text-zinc-400 text-[10px] uppercase block">Target Market</span>
              <span className="font-semibold text-zinc-100 mt-0.5 block truncate">{campaign.target_market || 'Worldwide'}</span>
            </div>
            <div className="p-3 bg-zinc-950/70 rounded-lg border border-zinc-800/60">
              <span className="text-zinc-400 text-[10px] uppercase block">Language Strategy</span>
              <span className="font-semibold text-amber-400 mt-0.5 block">{campaign.language_strategy}</span>
            </div>
          </div>

          {/* Daily Goal & Progress Bar */}
          <div className="p-4 bg-zinc-950/80 rounded-xl border border-zinc-800/80 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-zinc-200">
                Daily Prospect Target: <strong className="text-zinc-100">{campaign.daily_target} companies</strong>
              </span>
              <span className="text-zinc-400 font-mono">
                {campaignLeads.length} / {campaign.daily_target} Sourced ({progressPercent}%)
              </span>
            </div>

            <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-800">
              <div
                className="bg-amber-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 text-center text-xs">
              <div className="p-2 bg-zinc-900/80 rounded border border-zinc-800">
                <span className="text-[10px] text-zinc-400 block uppercase">Total Sourced</span>
                <span className="font-mono font-bold text-zinc-100">{campaignLeads.length}</span>
              </div>
              <div className="p-2 bg-zinc-900/80 rounded border border-zinc-800">
                <span className="text-[10px] text-zinc-400 block uppercase">Qualified</span>
                <span className="font-mono font-bold text-emerald-400">{qualifiedCount}</span>
              </div>
              <div className="p-2 bg-zinc-900/80 rounded border border-zinc-800">
                <span className="text-[10px] text-zinc-400 block uppercase">Unreviewed</span>
                <span className="font-mono font-bold text-zinc-300">{newCount}</span>
              </div>
              <div className="p-2 bg-zinc-900/80 rounded border border-zinc-800">
                <span className="text-[10px] text-zinc-400 block uppercase">Contacted</span>
                <span className="font-mono font-bold text-sky-400">{contactedCount}</span>
              </div>
              <div className="p-2 bg-zinc-900/80 rounded border border-zinc-800">
                <span className="text-[10px] text-zinc-400 block uppercase">Replies</span>
                <span className="font-mono font-bold text-amber-400">{repliedCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Associated Case Study Asset */}
        <div className="p-5 bg-zinc-900/70 border border-zinc-800/80 rounded-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div className="flex items-center space-x-2">
                <Film className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
                  Associated Case Study
                </h3>
              </div>
              <button
                onClick={() => setIsEditingAsset(!isEditingAsset)}
                className="text-xs text-amber-400 hover:underline"
              >
                {isEditingAsset ? 'Cancel' : 'Change Asset'}
              </button>
            </div>

            {isEditingAsset ? (
              <div className="mt-4 space-y-3">
                <label className="block text-xs font-medium text-zinc-300">
                  Select Case Study Portfolio Video
                </label>
                <select
                  value={campaign.case_study_id || ''}
                  onChange={(e) => handleLinkCaseStudy(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- No Case Study Linked --</option>
                  {caseStudies.map((cs) => (
                    <option key={cs.id} value={cs.id}>
                      {cs.name} ({cs.niche} - {cs.offer})
                    </option>
                  ))}
                </select>
              </div>
            ) : associatedCaseStudy ? (
              <div className="mt-4 space-y-3">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-100">{associatedCaseStudy.name}</h4>
                  <p className="text-xs text-zinc-400 mt-0.5">{associatedCaseStudy.offer}</p>
                </div>

                <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800/80 space-y-2 text-xs">
                  {associatedCaseStudy.video_url && (
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Video Asset:</span>
                      <a
                        href={associatedCaseStudy.video_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-400 hover:underline flex items-center space-x-1 truncate max-w-[180px]"
                      >
                        <span className="truncate">{associatedCaseStudy.video_url}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>
                  )}
                  {associatedCaseStudy.portfolio_url && (
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Portfolio:</span>
                      <a
                        href={associatedCaseStudy.portfolio_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-zinc-300 hover:underline flex items-center space-x-1 truncate max-w-[180px]"
                      >
                        <span className="truncate">{associatedCaseStudy.portfolio_url}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-4 p-4 text-center bg-zinc-950/40 rounded-lg border border-dashed border-zinc-800 text-xs text-zinc-400">
                <p>No creative case study video linked yet.</p>
                <button
                  onClick={() => setIsEditingAsset(true)}
                  className="mt-2 text-amber-400 hover:underline text-xs"
                >
                  + Link Case Study Asset
                </button>
              </div>
            )}
          </div>

          <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800/60 text-[11px] text-zinc-400 flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Asset URL will be injected into personalized email follow-ups.</span>
          </div>
        </div>
      </div>

      {/* Sourced Leads for this Campaign Table */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-zinc-100">
              Campaign Prospects ({campaignLeads.length})
            </h2>
            <p className="text-xs text-zinc-400">
              Prospects sourced and linked specifically to this campaign
            </p>
          </div>

          {/* Filters & Search */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleBatchPersonalize}
              disabled={isBatchGenerating}
              className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
              title="Generate tailored email drafts for all qualified leads in this campaign"
            >
              <Sparkles className={`w-3.5 h-3.5 text-amber-400 ${isBatchGenerating ? 'animate-spin' : ''}`} />
              <span>{isBatchGenerating ? 'Drafting Emails...' : 'Batch Personalize Qualified'}</span>
            </button>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search leads, domains..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-md text-xs text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-amber-500 w-52"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-md text-xs text-zinc-300 focus:outline-none focus:border-amber-500"
            >
              <option value="all">All Statuses</option>
              <option value="new">Unreviewed (New)</option>
              <option value="qualified">Qualified</option>
              <option value="rejected">Rejected</option>
              <option value="contacted">Contacted</option>
              <option value="replied">Replied</option>
            </select>
          </div>
        </div>

        {filteredLeads.length === 0 ? (
          <div className="p-12 text-center bg-zinc-900/40 border border-dashed border-zinc-800 rounded-xl space-y-4">
            <Users className="w-10 h-10 text-zinc-400 mx-auto" />
            <div>
              <h3 className="text-sm font-semibold text-zinc-200">No prospects in this campaign yet</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                Source leads via CSV import, manual entry, or AI web research to fill this campaign's daily target.
              </p>
            </div>
            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                onClick={() => setIsCsvImportOpen(true)}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs border border-zinc-700 transition-colors"
              >
                Import CSV File
              </button>
              <button
                onClick={() => setIsAddCompanyOpen(true)}
                className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 font-semibold text-xs transition-colors shadow-sm"
              >
                Add Prospect Manually
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto border border-zinc-800/80 rounded-xl bg-zinc-950">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-900/80 text-zinc-400 border-b border-zinc-800 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Company & Domain</th>
                  <th className="py-3 px-4">Decision Maker</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Qualification Fit</th>
                  <th className="py-3 px-4">Research</th>
                  <th className="py-3 px-4">Email Outreach</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-normal">
                {filteredLeads.map((lead) => {
                  const comp = lead.company;
                  const cont = lead.contact;
                  const emailDraft = emailMessages.find(e => e.lead_id === lead.id);

                  return (
                    <tr key={lead.id} className="hover:bg-zinc-900/50 transition-colors">
                      {/* Company & Domain */}
                      <td className="py-3 px-4">
                        <div>
                          <span className="font-semibold text-zinc-100 block">
                            {comp?.company_name || 'Unnamed Company'}
                          </span>
                          <span className="text-zinc-400 font-mono text-[11px] block">
                            {comp?.domain || comp?.website || '—'}
                          </span>
                        </div>
                      </td>

                      {/* Decision Maker */}
                      <td className="py-3 px-4">
                        {cont ? (
                          <div>
                            <span className="text-zinc-200 font-medium block">{cont.full_name}</span>
                            <span className="text-zinc-400 text-[11px] block">{cont.job_title}</span>
                            {cont.email && (
                              <span className="text-amber-400/90 font-mono text-[10px] block truncate max-w-[160px]">
                                {cont.email}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-zinc-400 italic">No contact</span>
                        )}
                      </td>

                      {/* Source */}
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-400 capitalize">
                          {comp?.source?.replace('_', ' ') || 'direct'}
                        </span>
                      </td>

                      {/* Qualification */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-1.5">
                            <span className={`text-[11px] font-mono font-bold px-1.5 py-0.2 rounded ${
                              lead.qualification_score >= 70 
                                ? 'bg-emerald-500/20 text-emerald-300' 
                                : lead.qualification_score >= 40 
                                ? 'bg-amber-500/20 text-amber-300' 
                                : 'bg-zinc-800 text-zinc-400'
                            }`}>
                              {lead.qualification_score}/100
                            </span>
                            <span className="text-[11px] capitalize text-zinc-400">
                              {lead.status}
                            </span>
                          </div>
                          {lead.qualification_reason && (
                            <p className="text-[10px] text-zinc-400 truncate max-w-[200px]" title={lead.qualification_reason}>
                              {lead.qualification_reason}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Research Status */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setBriefLead(lead)}
                          className="hover:opacity-80 transition-opacity"
                          title="View Research Dossier"
                        >
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium capitalize ${
                            lead.research_status === 'completed'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : lead.research_status === 'researching'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                          }`}>
                            {lead.research_status || 'not_started'}
                          </span>
                        </button>
                      </td>

                      {/* Email Outreach Status */}
                      <td className="py-3 px-4">
                        {emailDraft ? (
                          <button
                            onClick={() => setPersonalizingLead(lead)}
                            className="hover:opacity-80 transition-opacity"
                            title={`Email Draft: ${emailDraft.subject} (${emailDraft.personalization_metadata?.personalization_score || 90}%)`}
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
                            className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-zinc-800 text-[10px] font-semibold flex items-center space-x-1"
                          >
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            <span>Compose</span>
                          </button>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                          lead.status === 'qualified'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : lead.status === 'rejected'
                            ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            : lead.status === 'contacted'
                            ? 'bg-sky-500/15 text-sky-300'
                            : 'bg-zinc-800 text-zinc-300'
                        }`}>
                          {lead.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => setPersonalizingLead(lead)}
                            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-amber-400 transition-colors"
                            title="Compose / Review Email Draft"
                          >
                            <Mail className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setBriefLead(lead)}
                            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-purple-400 transition-colors"
                            title="View Research Dossier"
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
                            onClick={() => setInspectingLead(lead)}
                            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-amber-400 transition-colors"
                            title="View Prospect Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => deleteLead(lead.id)}
                            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 transition-colors"
                            title="Remove from Campaign"
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
        )}
      </div>

      {/* Modals */}
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

      {inspectingLead && (
        <LeadDetailModal
          lead={inspectingLead}
          isOpen={!!inspectingLead}
          onClose={() => setInspectingLead(null)}
          onOpenResearchBrief={(l) => {
            setInspectingLead(null);
            setBriefLead(l);
          }}
          onOpenPersonalization={(l) => {
            setInspectingLead(null);
            setPersonalizingLead(l);
          }}
        />
      )}

      {briefLead && briefLead.company && (
        <LeadResearchBriefModal
          isOpen={!!briefLead}
          lead={briefLead}
          company={briefLead.company}
          campaign={campaign}
          onClose={() => setBriefLead(null)}
        />
      )}

      {personalizingLead && (
        <EmailPersonalizationModal
          lead={personalizingLead}
          campaign={campaign}
          onClose={() => setPersonalizingLead(null)}
        />
      )}

      {isAddCompanyOpen && (
        <AddCompanyModal
          isOpen={isAddCompanyOpen}
          defaultCampaignId={campaign.id}
          onClose={() => setIsAddCompanyOpen(false)}
        />
      )}

      {isCsvImportOpen && (
        <CsvImportModal
          isOpen={isCsvImportOpen}
          defaultCampaignId={campaign.id}
          onClose={() => setIsCsvImportOpen(false)}
        />
      )}
    </div>
  );
};
