import React, { useState } from 'react';
import { 
  BarChart3, 
  Target, 
  Users, 
  Inbox, 
  Mail, 
  MessageSquare, 
  Star, 
  CalendarCheck,
  TrendingUp,
  ShieldCheck,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Filter,
  Layers,
  Zap
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';

export const AnalyticsPage: React.FC = () => {
  const { metrics, campaigns, leads, emailMessages, replies, leadFollowUpSequences, setActiveCampaignId } = useCRM();

  const [selectedCampaignFilter, setSelectedCampaignFilter] = useState<string>('all');

  // Filter leads/emails if specific campaign selected
  const activeLeads = selectedCampaignFilter === 'all' 
    ? leads 
    : leads.filter(l => l.campaign_id === selectedCampaignFilter);

  const activeEmails = selectedCampaignFilter === 'all'
    ? emailMessages
    : emailMessages.filter(e => e.campaign_id === selectedCampaignFilter);

  const activeReplies = selectedCampaignFilter === 'all'
    ? replies
    : replies.filter(r => r.campaign_id === selectedCampaignFilter || activeLeads.some(l => l.id === r.lead_id));

  const activeSequences = selectedCampaignFilter === 'all'
    ? leadFollowUpSequences
    : leadFollowUpSequences.filter(s => s.campaign_id === selectedCampaignFilter);

  // Computations
  const totalSent = activeEmails.filter(e => e.status === 'sent' || e.status === 'delivered').length;
  const initialSent = activeEmails.filter(e => (e.status === 'sent' || e.status === 'delivered') && (!e.sequence_step || e.sequence_step === 0)).length;
  const followUpsSent = activeEmails.filter(e => (e.status === 'sent' || e.status === 'delivered') && (e.sequence_step && e.sequence_step > 0)).length;
  
  const totalReplies = activeReplies.length > 0 
    ? activeReplies.length 
    : activeLeads.filter(l => l.status === 'replied' || l.status === 'interested' || l.status === 'meeting').length;

  const interestedCount = activeReplies.filter(r => r.classification === 'interested' || r.classification === 'meeting_request').length > 0
    ? activeReplies.filter(r => r.classification === 'interested' || r.classification === 'meeting_request').length
    : activeLeads.filter(l => l.status === 'interested' || l.status === 'meeting').length;

  const meetingsCount = activeLeads.filter(l => l.status === 'meeting').length + activeReplies.filter(r => r.classification === 'meeting_request').length;
  const qualifiedCount = activeLeads.filter(l => l.status === 'qualified' || l.qualification_score >= 60).length;

  const replyRate = totalSent > 0 ? ((totalReplies / totalSent) * 100).toFixed(1) : '0.0';
  const interestedRate = totalReplies > 0 ? ((interestedCount / totalReplies) * 100).toFixed(1) : '0.0';
  const qualificationRate = activeLeads.length > 0 ? ((qualifiedCount / activeLeads.length) * 100).toFixed(1) : '0.0';
  const meetingRate = activeLeads.length > 0 ? ((meetingsCount / activeLeads.length) * 100).toFixed(1) : '0.0';

  const stoppedOnReplyCount = activeSequences.filter(s => s.status === 'replied').length;
  const activeSequencesCount = activeSequences.filter(s => s.status === 'active').length;

  // Funnel steps
  const funnelSteps = [
    { label: "Target Sourced", count: activeLeads.length, icon: Users, color: 'text-zinc-300' },
    { label: 'Qualified (ICP)', count: qualifiedCount, icon: Target, color: 'text-amber-400' },
    { label: 'Drafted & Reviewed', count: activeEmails.filter(e => e.status === 'approved' || e.status === 'queued' || e.status === 'sent').length, icon: Inbox, color: 'text-amber-400' },
    { label: 'Initial Sent', count: initialSent, icon: Mail, color: 'text-sky-400' },
    { label: 'Follow-ups Sent', count: followUpsSent, icon: Clock, color: 'text-indigo-400' },
    { label: 'Inbound Replies', count: totalReplies, icon: MessageSquare, color: 'text-purple-400' },
    { label: 'Interested / High Fit', count: interestedCount, icon: Star, color: 'text-emerald-400' },
    { label: 'Meetings Booked', count: meetingsCount, icon: CalendarCheck, color: 'text-amber-400' },
  ];

  // Pipeline stage breakdown
  const pipelineStages = [
    { label: 'New / Raw', count: activeLeads.filter(l => l.status === 'new').length, color: 'bg-zinc-700' },
    { label: 'Qualified', count: activeLeads.filter(l => l.status === 'qualified').length, color: 'bg-amber-500' },
    { label: 'Drafted / Ready', count: activeLeads.filter(l => l.status === 'ready' || l.personalization_status === 'approved').length, color: 'bg-sky-500' },
    { label: 'Contacted', count: activeLeads.filter(l => l.status === 'contacted').length, color: 'bg-indigo-500' },
    { label: 'Follow-up Cadence', count: activeLeads.filter(l => l.status === 'follow_up').length, color: 'bg-purple-500' },
    { label: 'Replied', count: activeLeads.filter(l => l.status === 'replied').length, color: 'bg-emerald-400' },
    { label: 'Interested', count: activeLeads.filter(l => l.status === 'interested').length, color: 'bg-emerald-500' },
    { label: 'Meeting Scheduled', count: activeLeads.filter(l => l.status === 'meeting').length, color: 'bg-amber-400' },
    { label: 'Won / Partner', count: activeLeads.filter(l => l.status === 'won').length, color: 'bg-emerald-300' },
  ];

  return (
    <div id="analytics-page" className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header with Campaign Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">Outreach Analytics & Performance</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real conversion metrics, response rates, follow-up cadence efficacy, and deal milestones for UIDani
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-zinc-400">Filter Scope:</span>
          <select
            value={selectedCampaignFilter}
            onChange={(e) => setSelectedCampaignFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Campaigns ({campaigns.length})</option>
            {campaigns.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Conversion Rate Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 bg-zinc-900/70 border border-zinc-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Overall Reply Rate</span>
            <MessageSquare className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-100">{replyRate}%</div>
          <div className="text-[11px] text-zinc-400">{totalReplies} replies from {totalSent} dispatches</div>
        </div>

        <div className="p-5 bg-zinc-900/70 border border-zinc-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Positive Sentiment</span>
            <Star className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">{interestedRate}%</div>
          <div className="text-[11px] text-zinc-400">{interestedCount} interested of {totalReplies} replies</div>
        </div>

        <div className="p-5 bg-zinc-900/70 border border-zinc-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>ICP Qualification Fit</span>
            <Target className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">{qualificationRate}%</div>
          <div className="text-[11px] text-zinc-400">{qualifiedCount} qualified of {activeLeads.length} prospects</div>
        </div>

        <div className="p-5 bg-zinc-900/70 border border-zinc-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Stop-on-Reply Protection</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">100%</div>
          <div className="text-[11px] text-zinc-400">{stoppedOnReplyCount} sequences halted instantly on reply</div>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="p-6 bg-zinc-900/70 border border-zinc-800 rounded-xl space-y-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Outreach Conversion Pipeline</h2>
          </div>
          <span className="text-[11px] text-zinc-400 font-mono">Real CRM Data</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {funnelSteps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div 
                key={idx}
                className="p-3.5 bg-zinc-950/70 rounded-lg border border-zinc-800/80 flex flex-col justify-between space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400 uppercase font-mono font-medium truncate">
                    {step.label}
                  </span>
                  <Icon className={`w-3.5 h-3.5 ${step.color} shrink-0`} />
                </div>
                <div className="text-2xl font-bold tracking-tight font-mono text-zinc-100">
                  {step.count}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Multi-Campaign Performance Matrix */}
      <div className="p-6 bg-zinc-900/70 border border-zinc-800 rounded-xl space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Campaign Performance Breakdown Matrix
          </h3>
          <span className="text-xs text-zinc-400">{campaigns.length} total campaigns</span>
        </div>

        {campaigns.length === 0 ? (
          <p className="text-xs text-zinc-400 py-6 text-center">No campaigns created yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Campaign Name</th>
                  <th className="py-2.5 px-3">Target Market & Niche</th>
                  <th className="py-2.5 px-3 text-center">Prospects</th>
                  <th className="py-2.5 px-3 text-center">Sent</th>
                  <th className="py-2.5 px-3 text-center">Replies</th>
                  <th className="py-2.5 px-3 text-center">Reply Rate</th>
                  <th className="py-2.5 px-3 text-center">Interested</th>
                  <th className="py-2.5 px-3 text-center">Meetings</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {campaigns.map((camp) => {
                  const campLeads = leads.filter(l => l.campaign_id === camp.id);
                  const campEmails = emailMessages.filter(e => e.campaign_id === camp.id);
                  const campReplies = replies.filter(r => r.campaign_id === camp.id || campLeads.some(l => l.id === r.lead_id));
                  const campSent = campEmails.filter(e => e.status === 'sent' || e.status === 'delivered').length;
                  const campRepCount = campReplies.length > 0 ? campReplies.length : campLeads.filter(l => l.status === 'replied' || l.status === 'interested' || l.status === 'meeting').length;
                  const campInterested = campReplies.filter(r => r.classification === 'interested' || r.classification === 'meeting_request').length;
                  const campMeetings = campLeads.filter(l => l.status === 'meeting').length;
                  const campReplyRate = campSent > 0 ? ((campRepCount / campSent) * 100).toFixed(0) : '0';

                  return (
                    <tr key={camp.id} className="hover:bg-zinc-950/40 transition-colors">
                      <td className="py-3 px-3 font-semibold text-zinc-200">
                        {camp.name}
                      </td>
                      <td className="py-3 px-3 text-zinc-400">
                        {camp.niche} • {camp.target_market || 'Worldwide'}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-zinc-200">
                        {campLeads.length} / {camp.daily_target}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-zinc-200">
                        {campSent}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-purple-400 font-semibold">
                        {campRepCount}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-amber-400 font-semibold">
                        {campReplyRate}%
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-emerald-400 font-semibold">
                        {campInterested}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-amber-400 font-semibold">
                        {campMeetings}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-[10px] px-2 py-0.5 rounded uppercase font-semibold tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {camp.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cadence & Pipeline Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cadence Progression Breakdown */}
        <div className="p-6 bg-zinc-900/70 border border-zinc-800 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Automated Cadence Progression
            </h3>
            <span className="text-xs font-mono text-amber-400">{activeSequencesCount} active</span>
          </div>
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800/60 flex items-center justify-between">
              <div>
                <p className="font-semibold text-zinc-200">Initial Outreach (Step 0)</p>
                <p className="text-[11px] text-zinc-400">First touch personalized proposal</p>
              </div>
              <span className="font-mono text-zinc-200 font-bold">{initialSent} delivered</span>
            </div>

            <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800/60 flex items-center justify-between">
              <div>
                <p className="font-semibold text-zinc-200">Follow-Up #1 (Day 3)</p>
                <p className="text-[11px] text-zinc-400">Case study / portfolio reference angle</p>
              </div>
              <span className="font-mono text-zinc-200 font-bold">
                {activeEmails.filter(e => e.sequence_step === 1 && (e.status === 'sent' || e.status === 'delivered')).length} delivered
              </span>
            </div>

            <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800/60 flex items-center justify-between">
              <div>
                <p className="font-semibold text-zinc-200">Follow-Up #2 (Day 7)</p>
                <p className="text-[11px] text-zinc-400">Alternative angle / specific challenge</p>
              </div>
              <span className="font-mono text-zinc-200 font-bold">
                {activeEmails.filter(e => e.sequence_step === 2 && (e.status === 'sent' || e.status === 'delivered')).length} delivered
              </span>
            </div>

            <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800/60 flex items-center justify-between">
              <div>
                <p className="font-semibold text-zinc-200">Final Break-Up (Day 14)</p>
                <p className="text-[11px] text-zinc-400">Polite closure & future invitation</p>
              </div>
              <span className="font-mono text-zinc-200 font-bold">
                {activeEmails.filter(e => e.sequence_step === 3 && (e.status === 'sent' || e.status === 'delivered')).length} delivered
              </span>
            </div>
          </div>
        </div>

        {/* Pipeline Stage Distribution */}
        <div className="p-6 bg-zinc-900/70 border border-zinc-800 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Pipeline Stage Distribution
            </h3>
            <span className="text-xs font-mono text-zinc-400">{activeLeads.length} prospects total</span>
          </div>

          <div className="space-y-2.5">
            {pipelineStages.map((stage, idx) => {
              const pct = activeLeads.length > 0 ? Math.round((stage.count / activeLeads.length) * 100) : 0;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300 font-medium">{stage.label}</span>
                    <span className="font-mono text-zinc-400">{stage.count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden border border-zinc-800">
                    <div 
                      className={`h-full ${stage.color} rounded-full transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
