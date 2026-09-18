import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Sparkles, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ExternalLink, 
  Layers, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw, 
  ArrowRight,
  Filter,
  Building2,
  Globe,
  ShieldCheck,
  Zap,
  Info,
  CheckCheck
} from 'lucide-react';
import { Campaign, DiscoveryCandidate, DiscoveryProgress } from '../../types';
import { AIWebResearchProvider } from '../../services/providers/aiWebResearchProvider';
import { useCRM } from '../../context/CRMContext';

interface AIDiscoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: Campaign;
  onComplete?: () => void;
}

export const AIDiscoveryModal: React.FC<AIDiscoveryModalProps> = ({
  isOpen,
  onClose,
  campaign,
  onComplete,
}) => {
  const { ingestApprovedCandidates } = useCRM();

  // Configuration Step State
  const [step, setStep] = useState<'config' | 'running' | 'review' | 'ingested'>('config');
  const [targetCount, setTargetCount] = useState<number>(campaign.daily_target || 50);
  const [bufferMultiplier, setBufferMultiplier] = useState<number>(1.5);
  const [excludeExisting, setExcludeExisting] = useState<boolean>(true);

  // Running State
  const [progress, setProgress] = useState<DiscoveryProgress>({
    state: 'idle',
    totalTarget: campaign.daily_target || 50,
    bufferCount: Math.round((campaign.daily_target || 50) * 1.5),
    discoveredCount: 0,
    validCount: 0,
    duplicateCount: 0,
    qualifiedCount: 0,
    currentMessage: 'Ready to launch discovery pipeline.',
  });

  // Review State
  const [candidates, setCandidates] = useState<DiscoveryCandidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [fitFilter, setFitFilter] = useState<'all' | 'high_fit' | 'medium_fit' | 'low_fit' | 'duplicates' | 'approved'>('all');
  const [isIngesting, setIsIngesting] = useState<boolean>(false);
  const [ingestionResult, setIngestionResult] = useState<{
    leadsCreated: number;
    companiesCreated: number;
    companiesReused: number;
    duplicateLeadsSkipped: number;
  } | null>(null);

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setStep('config');
      setTargetCount(campaign.daily_target || 50);
      setCandidates([]);
      setSelectedIds(new Set());
      setIngestionResult(null);
    }
  }, [isOpen, campaign]);

  // Launch AI Discovery Pipeline
  const handleStartDiscovery = async () => {
    setStep('running');
    const provider = new AIWebResearchProvider();
    const jobId = `discovery_${campaign.id}_${Date.now()}`;

    try {
      const results = await provider.runDiscoveryPipeline(
        campaign,
        targetCount,
        bufferMultiplier,
        (p) => setProgress(p),
        jobId
      );

      // Auto-select high_fit valid candidates by default
      const autoApprovedIds = new Set<string>();
      results.forEach((c) => {
        if (c.validation_status === 'valid' && c.icp_qualification?.classification === 'high_fit') {
          c.approval_status = 'approved';
          autoApprovedIds.add(c.id);
        } else if (c.validation_status === 'duplicate' || c.validation_status === 'blocked') {
          c.approval_status = 'rejected';
        }
      });

      setCandidates(results);
      setSelectedIds(autoApprovedIds);
      setStep('review');
    } catch (err: any) {
      console.error('Discovery execution error:', err);
      // Keep state as running but with failed state and friendly message
      setProgress((prev) => ({
        ...prev,
        state: 'failed',
        currentMessage: 'AI research is temporarily unavailable. No prospects were lost. Try again shortly.',
        errorMessage: 'AI research is temporarily unavailable. No prospects were lost. Try again shortly.',
      }));
    }
  };

  // Toggle approval on a candidate
  const toggleCandidateApproval = (id: string) => {
    setCandidates((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const nextStatus = c.approval_status === 'approved' ? 'pending' : 'approved';
          return { ...c, approval_status: nextStatus };
        }
        return c;
      })
    );

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Bulk actions
  const handleApproveAllHighFit = () => {
    const nextSelected = new Set(selectedIds);
    setCandidates((prev) =>
      prev.map((c) => {
        if (c.validation_status === 'valid' && c.icp_qualification?.classification === 'high_fit') {
          nextSelected.add(c.id);
          return { ...c, approval_status: 'approved' };
        }
        return c;
      })
    );
    setSelectedIds(nextSelected);
  };

  const handleSelectAllVisible = () => {
    const nextSelected = new Set(selectedIds);
    filteredCandidates.forEach((c) => {
      if (c.validation_status === 'valid') {
        nextSelected.add(c.id);
      }
    });
    setCandidates((prev) =>
      prev.map((c) => (nextSelected.has(c.id) ? { ...c, approval_status: 'approved' } : c))
    );
    setSelectedIds(nextSelected);
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
    setCandidates((prev) => prev.map((c) => ({ ...c, approval_status: 'pending' })));
  };

  // Ingest approved candidates into Supabase / CRM
  const handleIngestApproved = async () => {
    const approvedCandidates = candidates.filter(
      (c) => c.approval_status === 'approved' && selectedIds.has(c.id)
    );

    if (approvedCandidates.length === 0) return;

    setIsIngesting(true);
    try {
      const res = await ingestApprovedCandidates(campaign.id, approvedCandidates);
      setIngestionResult({
        leadsCreated: res.leadsCreated,
        companiesCreated: res.companiesCreated,
        companiesReused: res.companiesReused,
        duplicateLeadsSkipped: res.duplicateLeadsSkipped,
      });
      setStep('ingested');
      if (onComplete) {
        onComplete();
      }
    } catch (err: any) {
      console.error('Failed to ingest approved candidates:', err);
    } finally {
      setIsIngesting(false);
    }
  };

  // Filtered list of candidates
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      // Search filter
      const matchesSearch =
        !searchQuery ||
        c.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.country.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Fit filter
      if (fitFilter === 'all') return true;
      if (fitFilter === 'high_fit') return c.icp_qualification?.classification === 'high_fit';
      if (fitFilter === 'medium_fit') return c.icp_qualification?.classification === 'medium_fit';
      if (fitFilter === 'low_fit') return c.icp_qualification?.classification === 'low_fit';
      if (fitFilter === 'duplicates') return c.is_duplicate;
      if (fitFilter === 'approved') return c.approval_status === 'approved';

      return true;
    });
  }, [candidates, searchQuery, fitFilter]);

  const highFitCount = candidates.filter((c) => c.icp_qualification?.classification === 'high_fit').length;
  const approvedCount = candidates.filter((c) => c.approval_status === 'approved' && selectedIds.has(c.id)).length;

  if (!isOpen) return null;

  return (
    <div id="ai-discovery-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div 
        id="ai-discovery-modal-container" 
        className="bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden text-zinc-100 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-zinc-100">AI Prospect Discovery Engine</h2>
                <span className="px-2 py-0.5 text-xs font-mono rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Gemini AI Engine
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Campaign: <span className="text-zinc-200 font-medium">{campaign.name}</span> • Target: <span className="text-zinc-200">{campaign.niche}</span>
              </p>
            </div>
          </div>
          <button
            id="close-ai-discovery-btn"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100 p-2 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* STEP 1: CONFIGURATION & CONFIRMATION */}
          {step === 'config' && (
            <div className="space-y-6">
              {/* Campaign Context Overview */}
              <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Active Campaign Strategy</span>
                  <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" /> Strategy Locked
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-zinc-400 block">Target Niche</span>
                    <span className="font-medium text-zinc-200">{campaign.niche || 'Not specified'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-400 block">Creative Offer</span>
                    <span className="font-medium text-zinc-200">{campaign.offer || 'Not specified'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-400 block">Target Market</span>
                    <span className="font-medium text-zinc-200">{campaign.target_market || 'Worldwide'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-400 block">Target Company Type</span>
                    <span className="font-medium text-zinc-200">{campaign.target_company_type || 'Consumer Brands'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-400 block">Language Strategy</span>
                    <span className="font-medium text-zinc-200">{campaign.language_strategy || 'Adaptive'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-400 block">Daily Target</span>
                    <span className="font-medium text-zinc-200">{campaign.daily_target} prospects / day</span>
                  </div>
                </div>
              </div>

              {/* Discovery Parameters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-4">
                  <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-400" /> Sourcing Parameters
                  </h3>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs text-zinc-300">Target Prospect Count</label>
                      <span className="text-sm font-mono font-bold text-emerald-400">
                        {targetCount} prospects
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={10}
                        max={100}
                        step={5}
                        value={targetCount}
                        onChange={(e) => setTargetCount(Number(e.target.value))}
                        className="flex-1 accent-emerald-500"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="text-[11px] text-zinc-500 mr-1">Presets:</span>
                      {[25, 50, 75, 100].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setTargetCount(preset)}
                          className={`px-2 py-0.5 text-xs font-mono rounded transition-colors ${
                            targetCount === preset
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                              : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700/60'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                    <span className="text-xs text-zinc-400 block mt-1.5">
                      Final number of validated, unique prospects desired for this campaign.
                    </span>
                  </div>

                  <div>
                    <label className="text-xs text-zinc-300 block mb-1">Buffer Multiplier</label>
                    <div className="flex gap-2">
                      {[1.2, 1.5, 2.0].map((mult) => (
                        <button
                          key={mult}
                          onClick={() => setBufferMultiplier(mult)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                            bufferMultiplier === mult
                              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                              : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          {mult}x ({Math.round(targetCount * mult)} raw queries)
                        </button>
                      ))}
                    </div>
                    <span className="text-xs text-zinc-400 block mt-1">
                      Queries extra candidates to account for deduplication and quality filtering.
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-4">
                  <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" /> Automated Pipeline Filters
                  </h3>

                  <div className="space-y-2.5 text-xs text-zinc-300">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={excludeExisting}
                        onChange={(e) => setExcludeExisting(e.target.checked)}
                        className="rounded accent-emerald-500"
                      />
                      <span>Strict Domain Deduplication (Exclude existing DB companies)</span>
                    </label>

                    <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1 text-zinc-400">
                      <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
                        <Info className="w-3.5 h-3.5 text-emerald-400" /> Multi-Stage Pipeline:
                      </div>
                      <p>1. <strong>Discovery:</strong> Gemini AI scans for active real consumer product companies.</p>
                      <p>2. <strong>Normalization:</strong> Strips subdomains, protocols, and standardizes domains.</p>
                      <p>3. <strong>Deduplication:</strong> Prevents duplicate domain ingestion across all campaigns.</p>
                      <p>4. <strong>ICP Evaluation:</strong> Scores product relevance, visual marketing signals, and risks.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  id="cancel-discovery-btn"
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="launch-ai-discovery-btn"
                  onClick={handleStartDiscovery}
                  className="px-6 py-2.5 text-sm font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" /> Launch AI Discovery ({Math.round(targetCount * bufferMultiplier)} Candidates)
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: RUNNING PIPELINE ANIMATION OR CLEAN FAILURE */}
          {step === 'running' && (
            <div className="py-12 px-6 flex flex-col items-center justify-center text-center space-y-6">
              {progress.state === 'failed' ? (
                <div className="max-w-md p-6 rounded-xl bg-zinc-900 border border-zinc-800 space-y-4">
                  <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-zinc-100">Temporary Service Notice</h3>
                    <p className="text-sm text-zinc-300">
                      AI research is temporarily unavailable. No prospects were lost. Try again shortly.
                    </p>
                  </div>
                  <div className="flex justify-center gap-3 pt-2">
                    <button
                      onClick={() => setStep('config')}
                      className="px-4 py-2 text-xs font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
                    >
                      Back to Settings
                    </button>
                    <button
                      onClick={handleStartDiscovery}
                      className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-colors flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Try Again
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center animate-pulse">
                      <Sparkles className="w-10 h-10 text-emerald-400 animate-spin" style={{ animationDuration: '4s' }} />
                    </div>
                  </div>

                  <div className="space-y-2 max-w-md">
                    <h3 className="text-lg font-semibold text-zinc-100 capitalize">
                      {progress.state.replace('_', ' ')} Stage
                    </h3>
                    <p className="text-sm text-zinc-400 font-mono">
                      {progress.currentMessage}
                    </p>
                  </div>

                  {/* Progress Counters */}
                  <div className="grid grid-cols-4 gap-4 w-full max-w-xl p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                    <div className="text-center">
                      <span className="text-xs text-zinc-400 block">Discovered</span>
                      <span className="text-xl font-bold text-zinc-100">{progress.discoveredCount}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-xs text-zinc-400 block">Valid Domains</span>
                      <span className="text-xl font-bold text-emerald-400">{progress.validCount}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-xs text-zinc-400 block">Deduplicated</span>
                      <span className="text-xl font-bold text-amber-400">{progress.duplicateCount}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-xs text-zinc-400 block">High ICP Fit</span>
                      <span className="text-xl font-bold text-cyan-400">{progress.qualifiedCount}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 3: CANDIDATE REVIEW & APPROVAL TABLE */}
          {step === 'review' && (
            <div className="space-y-4">
              {/* Summary Metrics Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-zinc-900/90 border border-zinc-800">
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <div className="px-2.5 py-1 rounded-md bg-zinc-800/80 border border-zinc-700/50">
                    <span className="text-zinc-400">Target:</span>{' '}
                    <strong className="text-zinc-100">{targetCount}</strong>
                  </div>
                  <div className="px-2.5 py-1 rounded-md bg-zinc-800/80 border border-zinc-700/50">
                    <span className="text-zinc-400">Sourced:</span>{' '}
                    <strong className="text-zinc-100">{candidates.length}</strong>
                  </div>
                  <div className="px-2.5 py-1 rounded-md bg-emerald-950/40 border border-emerald-800/40">
                    <span className="text-emerald-400/80">Valid New:</span>{' '}
                    <strong className="text-emerald-300">{candidates.filter(c => c.validation_status === 'valid' && !c.is_duplicate).length}</strong>
                  </div>
                  {candidates.filter(c => c.is_duplicate || c.validation_status === 'duplicate').length > 0 && (
                    <div className="px-2.5 py-1 rounded-md bg-amber-950/40 border border-amber-800/40">
                      <span className="text-amber-400/80">Deduplicated:</span>{' '}
                      <strong className="text-amber-300">{candidates.filter(c => c.is_duplicate || c.validation_status === 'duplicate').length}</strong>
                    </div>
                  )}
                  <div className="px-2.5 py-1 rounded-md bg-cyan-950/40 border border-cyan-800/40">
                    <span className="text-cyan-400/80">High ICP Fit:</span>{' '}
                    <strong className="text-cyan-300">{highFitCount}</strong>
                  </div>
                  <div className="px-2.5 py-1 rounded-md bg-purple-950/40 border border-purple-800/40">
                    <span className="text-purple-300/80">Approved:</span>{' '}
                    <strong className="text-purple-200">{approvedCount}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleApproveAllHighFit}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition-colors flex items-center gap-1.5"
                  >
                    <CheckCheck className="w-3.5 h-3.5" /> Approve High-Fit ({highFitCount})
                  </button>
                  <button
                    onClick={handleSelectAllVisible}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    onClick={handleDeselectAll}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Filters and Search Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search candidate company, domain, country..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-zinc-600"
                  />
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'approved', label: `Approved (${approvedCount})` },
                    { id: 'high_fit', label: 'High Fit (80%+)' },
                    { id: 'medium_fit', label: 'Medium Fit' },
                    { id: 'duplicates', label: 'Duplicates' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFitFilter(f.id as any)}
                      className={`px-2.5 py-1 text-xs rounded-md transition-colors whitespace-nowrap ${
                        fitFilter === f.id
                          ? 'bg-zinc-800 text-zinc-100 font-medium'
                          : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-900'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Candidate Table */}
              <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/30">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-zinc-900/90 text-zinc-400 font-semibold border-b border-zinc-800">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">Import</th>
                      <th className="py-3 px-4">Company & Website</th>
                      <th className="py-3 px-4">Industry / Market</th>
                      <th className="py-3 px-4">ICP Qualification Fit</th>
                      <th className="py-3 px-4">Validation / Status</th>
                      <th className="py-3 px-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-sans">
                    {filteredCandidates.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-zinc-400">
                          No candidate prospects match the selected filter.
                        </td>
                      </tr>
                    ) : (
                      filteredCandidates.map((candidate) => {
                        const isApproved = candidate.approval_status === 'approved';
                        const isExpanded = expandedId === candidate.id;
                        const score = candidate.icp_qualification?.score ?? 0;
                        const isHighFit = candidate.icp_qualification?.classification === 'high_fit';

                        return (
                          <React.Fragment key={candidate.id}>
                            <tr
                              className={`hover:bg-zinc-900/50 transition-colors ${
                                isApproved ? 'bg-emerald-950/10' : candidate.is_duplicate ? 'opacity-60' : ''
                              }`}
                            >
                              <td className="py-3 px-4 text-center">
                                <input
                                  type="checkbox"
                                  disabled={candidate.validation_status === 'blocked'}
                                  checked={isApproved}
                                  onChange={() => toggleCandidateApproval(candidate.id)}
                                  className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                                />
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-medium text-zinc-100 flex items-center gap-1.5">
                                  <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                                  <span>{candidate.company_name}</span>
                                </div>
                                <a
                                  href={candidate.website}
                                  target="_blank"
                                  rel="noreferrer noopener"
                                  className="text-xs text-zinc-400 hover:text-emerald-400 flex items-center gap-1 mt-0.5"
                                >
                                  <Globe className="w-3 h-3" />
                                  <span>{candidate.domain}</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              </td>
                              <td className="py-3 px-4">
                                <span className="text-zinc-200">{candidate.industry}</span>
                                <span className="text-zinc-400 block text-[11px]">{candidate.country}</span>
                              </td>
                              <td className="py-3 px-4">
                                {candidate.icp_qualification ? (
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                                          isHighFit
                                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                            : score >= 50
                                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                            : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                                        }`}
                                      >
                                        {score}% {candidate.icp_qualification.classification.replace('_', ' ').toUpperCase()}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-zinc-400 line-clamp-1 max-w-xs">
                                      {candidate.icp_qualification.reason}
                                    </p>
                                  </div>
                                ) : (
                                  <span className="text-zinc-400">Pending evaluation</span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                {candidate.is_duplicate ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-amber-950/40 text-amber-400 border border-amber-800/50">
                                    <AlertTriangle className="w-3 h-3" /> Duplicate Domain
                                  </span>
                                ) : candidate.validation_status === 'blocked' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-red-950/40 text-red-400 border border-red-800/50">
                                    <XCircle className="w-3 h-3" /> Do Not Contact
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-950/40 text-emerald-400 border border-emerald-800/50">
                                    <CheckCircle2 className="w-3 h-3" /> Verified Candidate
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  onClick={() => setExpandedId(isExpanded ? null : candidate.id)}
                                  className="text-zinc-400 hover:text-zinc-200 p-1 rounded hover:bg-zinc-800 transition-colors"
                                >
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                              </td>
                            </tr>

                            {/* Expandable Details Drawer */}
                            {isExpanded && (
                              <tr className="bg-zinc-900/90 border-b border-zinc-800">
                                <td colSpan={6} className="p-4 space-y-3">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                                        Company Description
                                      </h4>
                                      <p className="text-xs text-zinc-300">{candidate.description}</p>
                                    </div>
                                    <div>
                                      <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                                        ICP Evaluation Rationale
                                      </h4>
                                      <p className="text-xs text-zinc-300">
                                        {candidate.icp_qualification?.reason || 'No specific rationale recorded.'}
                                      </p>
                                    </div>
                                  </div>

                                  {candidate.icp_qualification && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-zinc-800/80">
                                      {candidate.icp_qualification.signals?.length > 0 && (
                                        <div>
                                          <span className="text-[11px] font-medium text-emerald-400 block mb-1">
                                            Positive Fit Signals
                                          </span>
                                          <ul className="space-y-0.5 text-xs text-zinc-300">
                                            {candidate.icp_qualification.signals.map((sig, i) => (
                                              <li key={i} className="flex items-center gap-1.5">
                                                <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                                                <span>{sig}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}

                                      {candidate.icp_qualification.risks?.length > 0 && (
                                        <div>
                                          <span className="text-[11px] font-medium text-amber-400 block mb-1">
                                            Risk Considerations
                                          </span>
                                          <ul className="space-y-0.5 text-xs text-zinc-300">
                                            {candidate.icp_qualification.risks.map((risk, i) => (
                                              <li key={i} className="flex items-center gap-1.5">
                                                <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                                                <span>{risk}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bottom Ingest Action Bar */}
              <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                <button
                  onClick={() => setStep('config')}
                  className="px-4 py-2 text-xs text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Reconfigure Query
                </button>

                <button
                  id="ingest-approved-leads-btn"
                  disabled={approvedCount === 0 || isIngesting}
                  onClick={handleIngestApproved}
                  className="px-6 py-2.5 text-sm font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
                >
                  {isIngesting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Ingesting Leads...
                    </>
                  ) : (
                    <>
                      <CheckCheck className="w-4 h-4" /> Ingest {approvedCount} Approved Prospects into Campaign
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: SUCCESS / INGESTION COMPLETE */}
          {step === 'ingested' && ingestionResult && (
            <div className="py-12 px-6 flex flex-col items-center justify-center text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-zinc-100">Prospects Ingested Successfully</h3>
                <p className="text-sm text-zinc-400 max-w-md">
                  {ingestionResult.leadsCreated} new qualified leads have been created and linked to{' '}
                  <span className="text-zinc-200 font-medium">{campaign.name}</span>.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 w-full max-w-lg p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
                <div>
                  <span className="text-zinc-400 block">Leads Created</span>
                  <span className="text-lg font-bold text-emerald-400">{ingestionResult.leadsCreated}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block">New Companies</span>
                  <span className="text-lg font-bold text-zinc-100">{ingestionResult.companiesCreated}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block">Existing Reused</span>
                  <span className="text-lg font-bold text-cyan-400">{ingestionResult.companiesReused}</span>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  id="done-discovery-btn"
                  onClick={onClose}
                  className="px-6 py-2.5 text-sm font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-lg transition-all"
                >
                  View Campaign Leads
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
