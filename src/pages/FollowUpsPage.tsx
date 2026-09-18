import React, { useState } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  Edit3, 
  ShieldCheck, 
  Mail, 
  Send, 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  FastForward, 
  MessageSquare, 
  Search, 
  Filter, 
  AlertCircle, 
  Sparkles,
  RefreshCw,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { FollowUpSequence, FollowUpStep, LeadFollowUpSequence } from '../types';

export const FollowUpsPage: React.FC = () => {
  const { 
    followUpSequences, 
    leadFollowUpSequences,
    saveFollowUpSequence,
    pauseLeadSequence,
    resumeLeadSequence,
    stopLeadSequence,
    processDueFollowUpSequences,
    fastForwardSequence,
    simulateProspectReply,
    refreshData
  } = useCRM();

  const [activeTab, setActiveTab] = useState<'pipeline' | 'templates'>('pipeline');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processResult, setProcessResult] = useState<{
    processed: number;
    sent: number;
    replied: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  // Template editing state
  const [activeSequence, setActiveSequence] = useState<FollowUpSequence>(followUpSequences[0] || {
    id: 'seq-default',
    name: 'Standard Creative Video Cadence (Day 3, 7, 14)',
    status: 'active',
    steps: []
  });
  const [isEditing, setIsEditing] = useState(false);
  const [steps, setSteps] = useState<FollowUpStep[]>(activeSequence?.steps || []);

  const handleUpdateStep = (idx: number, updates: Partial<FollowUpStep>) => {
    const nextSteps = [...steps];
    nextSteps[idx] = { ...nextSteps[idx], ...updates, updated_at: new Date().toISOString() };
    setSteps(nextSteps);
  };

  const handleSave = async () => {
    const updatedSeq: FollowUpSequence = {
      ...activeSequence,
      steps,
      updated_at: new Date().toISOString(),
    };
    await saveFollowUpSequence(updatedSeq);
    setIsEditing(false);
  };

  const handleTriggerDueSequences = async () => {
    setIsProcessing(true);
    setProcessResult(null);
    try {
      const res = await processDueFollowUpSequences();
      setProcessResult(res);
      await refreshData();
    } catch (err: any) {
      console.error('Trigger due sequences failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Filtered active lead sequences
  const filteredSequences = leadFollowUpSequences.filter((seq) => {
    if (statusFilter !== 'all' && seq.status !== statusFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const companyName = seq.company?.company_name?.toLowerCase() || '';
      const contactName = `${seq.contact?.first_name || ''} ${seq.contact?.last_name || ''}`.toLowerCase();
      const contactEmail = seq.contact?.email?.toLowerCase() || '';
      const campaignName = seq.campaign?.name?.toLowerCase() || '';
      return companyName.includes(q) || contactName.includes(q) || contactEmail.includes(q) || campaignName.includes(q);
    }
    return true;
  });

  const activeCount = leadFollowUpSequences.filter(s => s.status === 'active').length;
  const repliedCount = leadFollowUpSequences.filter(s => s.status === 'replied').length;
  const completedCount = leadFollowUpSequences.filter(s => s.status === 'completed').length;
  const pausedCount = leadFollowUpSequences.filter(s => s.status === 'paused').length;

  const formatScheduleDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs <= 0) {
      return <span className="text-amber-400 font-semibold animate-pulse">Due now</span>;
    } else if (diffDays === 1) {
      return <span className="text-amber-300">Due tomorrow</span>;
    } else {
      return <span className="text-zinc-300">{`In ${diffDays} days (${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`}</span>;
    }
  };

  return (
    <div id="follow-ups-page" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold tracking-tight text-zinc-100">Follow-up Sequences</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
              Build 06 Automated Cadence
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Automated 4-touchpoint engine (Day 0, Day 3, Day 7, Day 14) with real-time Gmail reply detection safety stopping.
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex items-center space-x-2">
          <button
            id="btn-process-due-followups"
            disabled={isProcessing}
            onClick={handleTriggerDueSequences}
            className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs transition-colors shadow-sm flex items-center space-x-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
            <span>{isProcessing ? 'Checking & Dispatching...' : 'Trigger Due Follow-Ups'}</span>
          </button>
        </div>
      </div>

      {/* Safety & Execution Metrics Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>In Cadence</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-zinc-100 font-mono">{activeCount}</p>
          <p className="text-[11px] text-zinc-400">Actively progressing touchpoints</p>
        </div>

        <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Replies Detected</span>
            <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-blue-400 font-mono">{repliedCount}</p>
          <p className="text-[11px] text-zinc-400">Cadence halted automatically</p>
        </div>

        <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Completed (All 4)</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 font-mono">{completedCount}</p>
          <p className="text-[11px] text-zinc-400">Finished Day 14 exit note</p>
        </div>

        <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Paused / On Hold</span>
            <Pause className="w-3.5 h-3.5 text-amber-400/80" />
          </div>
          <p className="text-2xl font-bold text-zinc-300 font-mono">{pausedCount}</p>
          <p className="text-[11px] text-zinc-400">Manual review or hold</p>
        </div>
      </div>

      {/* Dispatch Engine Feedback Banner */}
      {processResult && (
        <div className="p-4 bg-zinc-900/90 border border-amber-500/40 rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="text-xs">
              <span className="font-semibold text-zinc-100">Follow-Up Engine Execution Report: </span>
              <span className="text-zinc-300">
                {processResult.processed} cadence checked • <strong className="text-emerald-400">{processResult.sent} emails sent</strong> • <strong className="text-blue-400">{processResult.replied} replies intercepted & stopped</strong> • {processResult.skipped} not yet due
              </span>
            </div>
          </div>
          <button 
            onClick={() => setProcessResult(null)}
            className="text-xs text-zinc-400 hover:text-zinc-200"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-zinc-800 space-x-6">
        <button
          onClick={() => setActiveTab('pipeline')}
          className={`pb-3 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-colors ${
            activeTab === 'pipeline'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Active Prospect Cadences ({leadFollowUpSequences.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`pb-3 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-colors ${
            activeTab === 'templates'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Cadence Steps & Templates (Day 3, 7, 14)</span>
        </button>
      </div>

      {/* TAB 1: ACTIVE PIPELINE VIEW */}
      {activeTab === 'pipeline' && (
        <div className="space-y-4">
          {/* Controls Bar: Search & Status Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search prospect, company, campaign..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-amber-500/80"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center space-x-1.5 w-full sm:w-auto overflow-x-auto">
              {[
                { id: 'all', label: 'All' },
                { id: 'active', label: 'Active', count: activeCount },
                { id: 'replied', label: 'Replied (Halted)', count: repliedCount },
                { id: 'completed', label: 'Completed', count: completedCount },
                { id: 'paused', label: 'Paused', count: pausedCount },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setStatusFilter(filter.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors ${
                    statusFilter === filter.id
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-zinc-950 text-zinc-400 border border-zinc-800/80 hover:text-zinc-200'
                  }`}
                >
                  {filter.label} {filter.count !== undefined && `(${filter.count})`}
                </button>
              ))}
            </div>
          </div>

          {/* Prospects in Sequence Table */}
          {filteredSequences.length === 0 ? (
            <div className="p-12 text-center bg-zinc-900/30 border border-zinc-800 rounded-xl space-y-3">
              <div className="w-10 h-10 rounded-full bg-zinc-800 mx-auto flex items-center justify-center text-zinc-400">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200">No follow-up sequences found</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                Follow-up sequences automatically activate as soon as an approved outreach email is dispatched to a prospect.
              </p>
            </div>
          ) : (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-800/80 shadow-sm">
              <div className="grid grid-cols-12 px-4 py-2.5 bg-zinc-950/60 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                <div className="col-span-4">Prospect & Campaign</div>
                <div className="col-span-3">Cadence Progress</div>
                <div className="col-span-2">Next Run</div>
                <div className="col-span-1">Status</div>
                <div className="col-span-2 text-right">Cadence Actions</div>
              </div>

              {filteredSequences.map((seq) => {
                const companyName = seq.company?.company_name || 'Prospect Company';
                const contactName = `${seq.contact?.first_name || ''} ${seq.contact?.last_name || ''}`.trim() || 'Key Contact';
                const contactEmail = seq.contact?.email || 'email@brand.com';
                const campaignName = seq.campaign?.name || 'Cold Outreach';

                return (
                  <div key={seq.id} className="grid grid-cols-12 px-4 py-3.5 items-center hover:bg-zinc-800/30 transition-colors text-xs">
                    {/* Prospect Info */}
                    <div className="col-span-4 space-y-0.5 pr-2">
                      <div className="font-semibold text-zinc-100 flex items-center space-x-1.5">
                        <span>{companyName}</span>
                        <span className="text-[10px] text-zinc-400 font-normal">({contactName})</span>
                      </div>
                      <div className="text-[11px] text-zinc-400 flex items-center space-x-2">
                        <span>{contactEmail}</span>
                        <span>•</span>
                        <span className="text-amber-400/90 truncate max-w-[140px]">{campaignName}</span>
                      </div>
                    </div>

                    {/* Cadence Progress Steps Bar */}
                    <div className="col-span-3 space-y-1.5">
                      <div className="flex items-center space-x-1">
                        {[0, 1, 2, 3].map((stepIdx) => {
                          const isPast = seq.current_step >= stepIdx;
                          const isCurrent = seq.current_step === stepIdx;
                          return (
                            <div key={stepIdx} className="flex-1 flex flex-col items-center">
                              <div
                                className={`h-1.5 w-full rounded-full ${
                                  seq.status === 'replied'
                                    ? isPast ? 'bg-blue-400' : 'bg-zinc-800'
                                    : isPast
                                    ? 'bg-amber-400'
                                    : 'bg-zinc-800'
                                }`}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                        <span>Day 0</span>
                        <span>Day 3</span>
                        <span>Day 7</span>
                        <span>Day 14</span>
                      </div>
                      <div className="text-[11px] text-zinc-300">
                        {seq.status === 'replied' ? (
                          <span className="text-blue-400 font-semibold">Reply Received — Halted</span>
                        ) : seq.status === 'completed' ? (
                          <span className="text-emerald-400 font-semibold">Completed (Step 3 sent)</span>
                        ) : (
                          <span>Current: <strong>Step {seq.current_step} of 3</strong></span>
                        )}
                      </div>
                    </div>

                    {/* Next Run Date */}
                    <div className="col-span-2 text-xs">
                      {seq.status === 'active' ? (
                        formatScheduleDate(seq.next_follow_up_at)
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div className="col-span-1">
                      {seq.status === 'active' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          Active
                        </span>
                      )}
                      {seq.status === 'replied' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                          Replied
                        </span>
                      )}
                      {seq.status === 'completed' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30">
                          Finished
                        </span>
                      )}
                      {seq.status === 'paused' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          Paused
                        </span>
                      )}
                      {seq.status === 'cancelled' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-800 text-zinc-400">
                          Cancelled
                        </span>
                      )}
                    </div>

                    {/* Actions & Sandbox Testing Controls */}
                    <div className="col-span-2 flex items-center justify-end space-x-1">
                      {seq.status === 'active' && (
                        <>
                          <button
                            title="Pause Cadence"
                            onClick={() => pauseLeadSequence(seq.id)}
                            className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                          >
                            <Pause className="w-3.5 h-3.5" />
                          </button>

                          {/* Sandbox Test Action 1: Fast-forward 3 days */}
                          <button
                            title="Sandbox Test: Fast-Forward 3 Days (Make Next Step Due Now)"
                            onClick={() => fastForwardSequence(seq.id, 3)}
                            className="p-1.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-colors flex items-center space-x-1"
                          >
                            <FastForward className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-mono font-semibold">+3d</span>
                          </button>

                          {/* Sandbox Test Action 2: Simulate reply */}
                          <button
                            title="Sandbox Test: Simulate Prospect Reply (Verifies Instant Halting)"
                            onClick={() => simulateProspectReply(seq.id)}
                            className="p-1.5 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 transition-colors"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}

                      {seq.status === 'paused' && (
                        <button
                          title="Resume Cadence"
                          onClick={() => resumeLeadSequence(seq.id)}
                          className="px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold text-[11px] flex items-center space-x-1"
                        >
                          <Play className="w-3 h-3" />
                          <span>Resume</span>
                        </button>
                      )}

                      {(seq.status === 'active' || seq.status === 'paused') && (
                        <button
                          title="Cancel Cadence Permanently"
                          onClick={() => stopLeadSequence(seq.id, 'manual_cancelled')}
                          className="p-1.5 rounded bg-zinc-800/80 hover:bg-rose-500/20 hover:text-rose-400 text-zinc-400 transition-colors"
                        >
                          <Square className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SEQUENCE TEMPLATES & COPY CONFIGURATION */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Outreach Cadence Timing & Copy</h2>
              <p className="text-xs text-zinc-400">
                Templates used by the automated follow-up engine when triggering touchpoints.
              </p>
            </div>

            {isEditing ? (
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 font-semibold text-xs transition-colors shadow-sm"
              >
                Save Sequence Steps
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-semibold transition-colors flex items-center space-x-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Cadence Steps</span>
              </button>
            )}
          </div>

          {/* Sequence Overview Card */}
          <div className="p-5 bg-zinc-900/70 border border-zinc-800 rounded-xl space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-zinc-100">{activeSequence.name}</h2>
                  <span className="text-[11px] text-zinc-400">Default designer outreach cadence • 4 touchpoints (Day 0, Day 3, Day 7, Day 14)</span>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded uppercase font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                {activeSequence.status}
              </span>
            </div>

            {/* Steps Timeline Visualizer */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
              {steps.map((step, idx) => (
                <div 
                  key={step.id || idx}
                  className="p-3 bg-zinc-950/70 rounded-lg border border-zinc-800/80 space-y-2 relative"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-amber-400 font-semibold">
                      {idx === 0 ? 'Day 0 (Initial)' : `Day ${step.delay_days}`}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">Touchpoint {idx + 1}</span>
                  </div>
                  <p className="text-xs font-semibold text-zinc-200 truncate">{step.subject_template}</p>
                  <p className="text-[11px] text-zinc-400 line-clamp-2">{step.body_template}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Step Detail Editor */}
          <div className="space-y-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Sequence Step Configuration
            </div>

            <div className="space-y-4">
              {steps.map((step, idx) => (
                <div
                  key={step.id || idx}
                  className="p-5 bg-zinc-900/70 border border-zinc-800 rounded-xl space-y-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-6 h-6 rounded bg-zinc-800 border border-zinc-700 text-amber-400 flex items-center justify-center font-mono text-xs font-bold">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-zinc-200">
                        Touchpoint {idx + 1} ({idx === 0 ? 'Initial Cold Outreach' : `Follow-up #${idx}`})
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <label className="text-xs text-zinc-400">Delay from initial send:</label>
                      <div className="flex items-center space-x-1">
                        <input
                          type="number"
                          disabled={!isEditing}
                          value={step.delay_days}
                          onChange={(e) => handleUpdateStep(idx, { delay_days: Number(e.target.value) })}
                          className="w-16 px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-100 font-mono text-center focus:outline-none focus:border-amber-500/80 disabled:opacity-70"
                        />
                        <span className="text-xs text-zinc-400">days</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1">
                      Subject Template
                    </label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={step.subject_template}
                      onChange={(e) => handleUpdateStep(idx, { subject_template: e.target.value })}
                      className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-100 focus:outline-none focus:border-amber-500/80 disabled:opacity-70"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1">
                      Message Body Template
                    </label>
                    <textarea
                      rows={4}
                      disabled={!isEditing}
                      value={step.body_template}
                      onChange={(e) => handleUpdateStep(idx, { body_template: e.target.value })}
                      className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-200 font-mono leading-relaxed focus:outline-none focus:border-amber-500/80 disabled:opacity-70 resize-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
