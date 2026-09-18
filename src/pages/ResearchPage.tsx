import React, { useState } from 'react';
import { 
  Sparkles, 
  Search, 
  CheckCircle2, 
  Building2, 
  ExternalLink, 
  ArrowRight, 
  ShieldCheck, 
  RefreshCw, 
  BookOpen, 
  Target,
  FileText,
  AlertCircle,
  Clock,
  XCircle,
  RotateCcw
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { Lead } from '../types';
import { LeadResearchBriefModal } from '../components/research/LeadResearchBriefModal';
import { NavigationPage } from '../components/layout/Sidebar';

interface ResearchPageProps {
  onNavigate: (page: NavigationPage) => void;
}

export const ResearchPage: React.FC<ResearchPageProps> = ({ onNavigate }) => {
  const { leads, campaigns, activeCampaignId, researchLead, leadResearches } = useCRM();

  const [campaignFilter, setCampaignFilter] = useState<string>(activeCampaignId || 'all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBriefLead, setSelectedBriefLead] = useState<Lead | null>(null);
  const [researchingLeadId, setResearchingLeadId] = useState<string | null>(null);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
    currentCompany?: string;
    completed: number;
    failed: number;
  } | null>(null);
  const [batchSummary, setBatchSummary] = useState<{
    completed: number;
    failed: number;
    total: number;
  } | null>(null);

  const activeCampaign = campaigns.find(c => c.id === (campaignFilter !== 'all' ? campaignFilter : activeCampaignId)) || campaigns[0];

  const filteredLeads = leads.filter((lead) => {
    const matchesCampaign = campaignFilter === 'all' || lead.campaign_id === campaignFilter;
    const researchStatus = lead.research_status || 'not_started';
    const matchesStatus = statusFilter === 'all' || researchStatus === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      !searchQuery ||
      (lead.company?.company_name || '').toLowerCase().includes(q) ||
      (lead.company?.domain || '').toLowerCase().includes(q) ||
      (lead.contact?.full_name || '').toLowerCase().includes(q);

    return matchesCampaign && matchesStatus && matchesSearch;
  });

  const completedCount = filteredLeads.filter(l => l.research_status === 'completed').length;
  const failedCount = filteredLeads.filter(l => l.research_status === 'failed').length;
  const pendingCount = filteredLeads.filter(l => l.research_status !== 'completed' && l.research_status !== 'failed').length;

  const handleRunSingle = async (lead: Lead) => {
    if (isBatchRunning) return;
    setResearchingLeadId(lead.id);
    try {
      await researchLead(lead.id, lead.campaign_id);
    } catch (e: any) {
      console.warn('[ResearchPage] Single research notice:', e?.message || e);
    } finally {
      setResearchingLeadId(null);
    }
  };

  const handleRunBatch = async (retryFailedOnly: boolean = false) => {
    if (isBatchRunning) return;

    let targets: Lead[];
    if (retryFailedOnly) {
      targets = filteredLeads.filter(l => l.research_status === 'failed');
    } else {
      targets = filteredLeads.filter(l => l.research_status !== 'completed' && l.status === 'qualified');
    }

    if (targets.length === 0) {
      return;
    }

    setIsBatchRunning(true);
    setBatchSummary(null);
    let completed = 0;
    let failed = 0;

    setBatchProgress({
      current: 0,
      total: targets.length,
      currentCompany: targets[0].company?.company_name || 'Prospect',
      completed: 0,
      failed: 0,
    });

    for (let i = 0; i < targets.length; i++) {
      const lead = targets[i];
      setResearchingLeadId(lead.id);
      setBatchProgress({
        current: i + 1,
        total: targets.length,
        currentCompany: lead.company?.company_name || 'Prospect',
        completed,
        failed,
      });

      try {
        await researchLead(lead.id, lead.campaign_id);
        completed++;
      } catch (err: any) {
        console.warn(`[ResearchPage] Batch item ${i + 1}/${targets.length} notice for ${lead.company?.company_name}:`, err?.message || err);
        failed++;
      } finally {
        setBatchProgress((prev) => prev ? { ...prev, completed, failed } : null);
      }
    }

    setResearchingLeadId(null);
    setIsBatchRunning(false);
    setBatchSummary({
      completed,
      failed,
      total: targets.length,
    });
  };

  return (
    <div id="research-page" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">AI Prospect Research & Intelligence</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Deep brand positioning analysis, creative critiques, store teardowns, and verified outreach hooks
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          {failedCount > 0 && !isBatchRunning && (
            <button
              id="btn-retry-failed-research"
              onClick={() => handleRunBatch(true)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-amber-500/30 font-semibold text-xs transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry Failed ({failedCount})</span>
            </button>
          )}

          <button
            id="btn-batch-research-all"
            disabled={isBatchRunning || (pendingCount === 0 && failedCount === 0)}
            onClick={() => handleRunBatch(false)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
          >
            {isBatchRunning ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Researching ({batchProgress?.current || 0}/{batchProgress?.total || 0})...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Research All Qualified ({pendingCount + failedCount} targets)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Batch Active Progress Bar */}
      {isBatchRunning && batchProgress && (
        <div className="p-4 bg-zinc-900 border border-emerald-500/30 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-zinc-200">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              <span className="font-semibold">Researching {batchProgress.current} of {batchProgress.total}</span>
              <span className="text-zinc-400 font-mono">({Math.round((batchProgress.current / batchProgress.total) * 100)}%)</span>
              {batchProgress.currentCompany && (
                <span className="text-emerald-300 font-medium truncate max-w-xs">
                  — Analyzing {batchProgress.currentCompany}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-3 text-[11px] font-mono">
              <span className="text-emerald-400">{batchProgress.completed} ready</span>
              {batchProgress.failed > 0 && <span className="text-rose-400">{batchProgress.failed} failed</span>}
            </div>
          </div>
          <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-800">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.round((batchProgress.current / batchProgress.total) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Terminal Batch Summary Banner */}
      {batchSummary && !isBatchRunning && (
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs ${
          batchSummary.failed === 0 
            ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200' 
            : 'bg-zinc-900 border-amber-500/30 text-zinc-200'
        }`}>
          <div className="flex items-center space-x-2.5">
            {batchSummary.failed === 0 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            )}
            <span>
              Batch deep research complete: <strong>{batchSummary.completed}</strong> briefs synthesized
              {batchSummary.failed > 0 ? `, ${batchSummary.failed} failed/timed out.` : '.'}
            </span>
          </div>
          {batchSummary.failed > 0 && (
            <button
              onClick={() => handleRunBatch(true)}
              className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center space-x-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Retry {batchSummary.failed} Failed</span>
            </button>
          )}
        </div>
      )}

      {/* Target Campaign Context Bar */}
      <div className="p-4 bg-zinc-900/70 border border-zinc-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] text-zinc-400 uppercase tracking-wider block font-medium">
              Active Strategy Context
            </span>
            <p className="text-sm font-semibold text-zinc-100">{activeCampaign ? activeCampaign.name : 'All Campaigns'}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded bg-zinc-950 text-zinc-300 border border-zinc-800 font-mono">
            Niche: {activeCampaign?.niche || 'E-Commerce Brands'}
          </span>
          <span className="text-xs px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-semibold">
            {completedCount} Briefs Synthesized
          </span>
          {failedCount > 0 && (
            <span className="text-xs px-2.5 py-1 rounded bg-rose-500/10 text-rose-300 border border-rose-500/30 font-semibold">
              {failedCount} Need Retry
            </span>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-3.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search researched brands, domains..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-md text-xs text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-amber-500/80"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
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

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-md text-xs text-zinc-200 focus:outline-none focus:border-amber-500/80"
          >
            <option value="all">All Research Statuses</option>
            <option value="completed">Brief Completed</option>
            <option value="not_started">Pending Research</option>
            <option value="failed">Failed / Needs Retry</option>
            <option value="researching">Currently Researching</option>
          </select>
        </div>
      </div>

      {/* Research Cards Grid or Empty State */}
      {filteredLeads.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900/40 border border-dashed border-zinc-800 rounded-xl space-y-4">
          <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-purple-400 mx-auto">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-sm font-semibold text-zinc-200">No prospects matched</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Source prospects through AI Prospect Discovery or CSV import to begin deep qualitative research.
            </p>
          </div>
          <button
            onClick={() => onNavigate('lead_sources')}
            className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 font-semibold text-xs transition-colors shadow-sm"
          >
            Open Lead Sources
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredLeads.map((lead) => {
            const research = leadResearches.find(r => r.lead_id === lead.id);
            const isCompleted = lead.research_status === 'completed' || !!research;
            const isFailed = lead.research_status === 'failed';
            const isCurrentRunning = researchingLeadId === lead.id;

            return (
              <div
                key={lead.id}
                className={`p-5 bg-zinc-900/70 border rounded-xl flex flex-col justify-between space-y-4 shadow-sm transition-all ${
                  isCompleted 
                    ? 'border-zinc-800 hover:border-emerald-500/50' 
                    : isFailed 
                      ? 'border-rose-900/50 hover:border-rose-500/50'
                      : 'border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                {/* Top: Company Header */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-zinc-200">
                        {lead.company?.company_name.charAt(0) || 'C'}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-semibold text-zinc-100">{lead.company?.company_name}</h3>
                          <a
                            href={`https://${lead.company?.domain}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-zinc-400 hover:text-amber-400 font-mono flex items-center space-x-0.5"
                          >
                            <span>{lead.company?.domain}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                        <p className="text-[11px] text-zinc-400">
                          {lead.contact?.full_name ? `${lead.contact.full_name} (${lead.contact.job_title || 'Decision Maker'})` : 'Decision maker pending'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      {isCurrentRunning ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center space-x-1">
                          <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                          <span>Researching...</span>
                        </span>
                      ) : isCompleted ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          Brief Ready
                        </span>
                      ) : isFailed ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                          Research Failed
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
                          Unresearched
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Research Content Snippet */}
                  {research ? (
                    <div className="space-y-2">
                      <div className="p-3 bg-zinc-950/80 rounded-lg border border-zinc-800/80 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-purple-400">
                            Primary Creative Angle
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            {lead.company?.industry || 'D2C'}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-200 line-clamp-2">
                          {research.verified_angles && research.verified_angles.length > 0
                            ? research.verified_angles[0]
                            : research.company_summary || research.personalization_angle || research.potential_animation_opportunity || 'Brand intelligence analyzed.'}
                        </p>
                      </div>

                      {/* Hooks Preview */}
                      {research.custom_hooks && research.custom_hooks.length > 0 && (
                        <div className="p-2.5 bg-emerald-950/20 rounded border border-emerald-500/20 text-xs">
                          <span className="text-[10px] font-medium text-emerald-400 uppercase tracking-wider block">
                            Hook Concept:
                          </span>
                          <p className="text-[11px] text-emerald-200 italic line-clamp-1">
                            "{research.custom_hooks[0]}"
                          </p>
                        </div>
                      )}
                    </div>
                  ) : isFailed ? (
                    <div className="p-3.5 bg-rose-950/20 rounded-lg border border-rose-800/40 text-xs text-zinc-300 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                        <span className="text-rose-200">Previous AI research attempt timed out or failed.</span>
                      </div>
                      <button
                        disabled={isCurrentRunning || isBatchRunning}
                        onClick={() => handleRunSingle(lead)}
                        className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-semibold text-xs flex items-center space-x-1 transition-colors"
                      >
                        <RotateCcw className={`w-3 h-3 ${isCurrentRunning ? 'animate-spin' : ''}`} />
                        <span>{isCurrentRunning ? 'Retrying...' : 'Retry Research'}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-zinc-950/40 rounded-lg border border-dashed border-zinc-800 text-xs text-zinc-400 flex items-center justify-between">
                      <span>No deep qualitative research conducted yet.</span>
                      <button
                        disabled={isCurrentRunning || isBatchRunning}
                        onClick={() => handleRunSingle(lead)}
                        className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-emerald-400 font-semibold text-xs flex items-center space-x-1 transition-colors"
                      >
                        <Sparkles className={`w-3 h-3 ${isCurrentRunning ? 'animate-spin' : ''}`} />
                        <span>{isCurrentRunning ? 'Analyzing...' : 'Run Deep AI Research'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Bottom Footer Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-xs">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setSelectedBriefLead(lead)}
                      className="text-zinc-300 hover:text-emerald-400 font-semibold flex items-center space-x-1.5 transition-colors"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{isCompleted ? 'Open Intelligence Dossier' : 'Configure & Run Research'}</span>
                    </button>
                  </div>

                  <button
                    onClick={() => onNavigate('leads')}
                    className="text-zinc-400 hover:text-zinc-200 flex items-center space-x-1 text-[11px]"
                  >
                    <span>Inspect in Leads</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Research Dossier Modal */}
      {selectedBriefLead && selectedBriefLead.company && (
        <LeadResearchBriefModal
          isOpen={!!selectedBriefLead}
          lead={selectedBriefLead}
          company={selectedBriefLead.company}
          campaign={campaigns.find(c => c.id === selectedBriefLead.campaign_id)}
          onClose={() => setSelectedBriefLead(null)}
        />
      )}
    </div>
  );
};
