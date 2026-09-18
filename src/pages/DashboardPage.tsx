import React, { useState } from 'react';
import { 
  Send, 
  Target, 
  Users, 
  Inbox, 
  Mail, 
  MessageSquare, 
  Star, 
  CalendarCheck,
  Plus,
  ArrowUpRight,
  Sparkles,
  Layers,
  Clock,
  ShieldCheck,
  Activity as ActivityIcon,
  CheckCircle2,
  AlertCircle,
  Filter,
  Zap,
  RefreshCw,
  TrendingUp,
  FileSpreadsheet,
  Film
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { NavigationPage } from '../components/layout/Sidebar';

interface DashboardPageProps {
  onNavigate: (page: NavigationPage) => void;
  onOpenNewCampaign: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  onOpenNewCampaign,
}) => {
  const { 
    profile, 
    campaigns, 
    activeCampaignId, 
    metrics, 
    activities, 
    leads, 
    emailMessages, 
    replies, 
    leadFollowUpSequences,
    gmailStatus,
    supabaseStatus,
    syncGmailReplies 
  } = useCRM();

  const [activityFilter, setActivityFilter] = useState<'all' | 'emails' | 'replies' | 'campaigns' | 'leads'>('all');
  const [isSyncing, setIsSyncing] = useState(false);

  const activeCampaign = campaigns.find(c => c.id === activeCampaignId) || campaigns[0];
  const activeSequencesCount = leadFollowUpSequences.filter(s => s.status === 'active').length;
  const repliedSequencesCount = leadFollowUpSequences.filter(s => s.status === 'replied').length;
  const pendingReviewCount = emailMessages.filter(e => e.status === 'needs_review').length;
  const queuedCount = emailMessages.filter(e => e.status === 'queued').length;
  const unreadRepliesCount = replies.filter(r => r.status === 'unread' || r.status === 'needs_response').length;

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncGmailReplies();
    } finally {
      setIsSyncing(false);
    }
  };

  const metricCards = [
    {
      id: 'metric-campaign',
      label: "Active Campaign",
      value: activeCampaign ? activeCampaign.name : 'None active',
      subtext: activeCampaign ? `${activeCampaign.niche} • ${activeCampaign.daily_target}/day` : 'Create your campaign',
      icon: Target,
      highlight: Boolean(activeCampaign),
      isText: true,
      onClick: () => onNavigate('campaigns'),
    },
    {
      id: 'metric-target',
      label: 'Prospects Sourced',
      value: `${leads.length} / ${metrics.prospects_target}`,
      subtext: `${leads.filter(l => l.status === 'qualified').length} qualified for outreach`,
      icon: Users,
      onClick: () => onNavigate('leads'),
    },
    {
      id: 'metric-ready',
      label: 'Email Review Queue',
      value: pendingReviewCount > 0 ? `${pendingReviewCount} Needs Review` : (queuedCount > 0 ? `${queuedCount} Queued` : 'All Clear'),
      subtext: queuedCount > 0 ? `${queuedCount} queued for dispatch` : 'Strict human approval',
      icon: Inbox,
      badgeColor: pendingReviewCount > 0 ? 'text-amber-400 font-bold' : 'text-zinc-400',
      onClick: () => onNavigate('email_queue'),
    },
    {
      id: 'metric-sent',
      label: 'Emails Sent',
      value: metrics.emails_sent,
      subtext: `${metrics.follow_ups_sent || 0} follow-up steps sent`,
      icon: Mail,
      onClick: () => onNavigate('analytics'),
    },
    {
      id: 'metric-replies',
      label: 'Inbound Replies',
      value: metrics.replies,
      subtext: unreadRepliesCount > 0 ? `${unreadRepliesCount} action needed` : 'All responses reviewed',
      icon: MessageSquare,
      badgeColor: unreadRepliesCount > 0 ? 'text-emerald-400' : 'text-zinc-400',
      onClick: () => onNavigate('conversations'),
    },
    {
      id: 'metric-interested',
      label: 'Interested Leads',
      value: metrics.interested,
      subtext: `${metrics.interested_rate_percent || 0}% positive response rate`,
      icon: Star,
      onClick: () => onNavigate('conversations'),
    },
    {
      id: 'metric-meetings',
      label: 'Calls & Meetings',
      value: metrics.meetings,
      subtext: 'High-ticket deals booked',
      icon: CalendarCheck,
      onClick: () => onNavigate('conversations'),
    },
    {
      id: 'metric-followups',
      label: 'Cadence Progressing',
      value: activeSequencesCount,
      subtext: `${repliedSequencesCount} stopped on reply`,
      icon: Clock,
      onClick: () => onNavigate('follow_ups'),
    },
  ];

  // Filter activities
  const filteredActivities = activities.filter(act => {
    if (activityFilter === 'all') return true;
    if (activityFilter === 'emails') {
      return act.activity_type.startsWith('email_') || act.activity_type.startsWith('follow_up_');
    }
    if (activityFilter === 'replies') {
      return act.activity_type.startsWith('reply_');
    }
    if (activityFilter === 'campaigns') {
      return act.activity_type.startsWith('campaign_');
    }
    if (activityFilter === 'leads') {
      return act.activity_type.startsWith('lead_') || act.activity_type.startsWith('company_') || act.activity_type.startsWith('candidate_');
    }
    return true;
  });

  return (
    <div id="dashboard-page" className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Greeting & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            Good morning, {profile.display_name || 'UI Dani'}
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Outreach operating system for {profile.business_name || 'UIDani'} • Sourcing & closing bespoke design and 3D animation partnerships
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            id="dashboard-btn-sync"
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-medium transition-colors shadow-sm"
            title="Scan inbox for new prospect replies"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : 'text-zinc-400'}`} />
            <span>{isSyncing ? 'Scanning...' : 'Sync Replies'}</span>
          </button>

          <button
            id="dashboard-btn-new-campaign"
            onClick={onOpenNewCampaign}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 font-semibold text-xs transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create Campaign</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              id={card.id}
              onClick={card.onClick}
              className="p-4 bg-zinc-900/70 border border-zinc-800/80 rounded-xl hover:border-zinc-700 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-xs font-medium truncate">{card.label}</span>
                <Icon className="w-4 h-4 text-zinc-400 group-hover:text-amber-400 transition-colors shrink-0" />
              </div>
              <div>
                <div className={`text-xl font-bold tracking-tight ${card.isText ? 'text-sm text-zinc-200 truncate' : (card.badgeColor || 'text-zinc-100')}`}>
                  {card.value}
                </div>
                <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                  {card.subtext}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Prominent Active Campaign Section */}
      {!activeCampaign ? (
        <div 
          id="dashboard-empty-campaign-state"
          className="p-8 bg-zinc-900/40 border border-dashed border-zinc-800 rounded-xl text-center flex flex-col items-center justify-center space-y-4"
        >
          <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-amber-400">
            <Send className="w-5 h-5" />
          </div>
          <div className="max-w-md">
            <h3 className="text-base font-semibold text-zinc-100">No active campaign</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Create today's campaign to begin sourcing and personalizing high-ticket creative outreach.
            </p>
          </div>
          <button
            id="btn-create-campaign-hero"
            onClick={onOpenNewCampaign}
            className="px-5 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 font-semibold text-xs transition-colors shadow-sm flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Campaign</span>
          </button>
        </div>
      ) : (
        <div 
          id="dashboard-active-campaign-card"
          className="p-6 bg-zinc-900/80 border border-zinc-800 rounded-xl shadow-sm space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2.5">
                <span className="text-[10px] px-2 py-0.5 rounded uppercase font-semibold tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {activeCampaign.status}
                </span>
                <h3 className="text-base font-semibold text-zinc-100">{activeCampaign.name}</h3>
              </div>
              <p className="text-xs text-zinc-400">
                Targeting: <span className="text-zinc-200">{activeCampaign.target_company_type || activeCampaign.niche}</span> • Offer: <span className="text-zinc-200">{activeCampaign.offer}</span>
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => onNavigate('lead_sources')}
                className="px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition-colors flex items-center space-x-1"
              >
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span>Source Prospects</span>
              </button>
              <button
                onClick={() => onNavigate('email_queue')}
                className="px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition-colors flex items-center space-x-1"
              >
                <Inbox className="w-3.5 h-3.5 text-amber-400" />
                <span>Review Queue ({pendingReviewCount})</span>
              </button>
              <button
                onClick={() => onNavigate('campaigns')}
                className="px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition-colors flex items-center space-x-1"
              >
                <span>Campaign Hub</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-4 border-t border-zinc-800/80 text-xs">
            <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800/60">
              <span className="text-zinc-400 block mb-0.5 text-[11px]">Target Market</span>
              <span className="text-zinc-200 font-medium">{activeCampaign.target_market || 'Worldwide'}</span>
            </div>
            <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800/60">
              <span className="text-zinc-400 block mb-0.5 text-[11px]">Language Strategy</span>
              <span className="text-zinc-200 font-medium">{activeCampaign.language_strategy}</span>
            </div>
            <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800/60">
              <span className="text-zinc-400 block mb-0.5 text-[11px]">Daily Goal Progress</span>
              <span className="text-zinc-200 font-medium">{leads.filter(l => l.campaign_id === activeCampaign.id).length} / {activeCampaign.daily_target} prospects</span>
            </div>
            <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800/60">
              <span className="text-zinc-400 block mb-0.5 text-[11px]">Reply Rate</span>
              <span className="text-amber-400 font-medium font-mono">{metrics.reply_rate_percent || 0}% conversion</span>
            </div>
          </div>
        </div>
      )}

      {/* Follow-Up Sequences Cadence Banner */}
      <div 
        onClick={() => onNavigate('follow_ups')}
        className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-xs font-semibold text-zinc-100 group-hover:text-amber-400 transition-colors">
                Automated Follow-Up Sequences Cadence
              </h4>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono">
                Day 3 • Day 7 • Day 14
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {activeSequencesCount} prospects progressing in cadence • {repliedSequencesCount} prospect replies detected (sequences halted)
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNavigate('follow_ups');
            }}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition-colors flex items-center space-x-1.5"
          >
            <span>View Cadence Pipeline</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400" />
          </button>
        </div>
      </div>

      {/* Bottom Grid: Activity Audit Trail & System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Activity Trail */}
        <div className="lg:col-span-2 p-6 bg-zinc-900/70 border border-zinc-800 rounded-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800/80 pb-3 gap-2">
            <div className="flex items-center space-x-2">
              <ActivityIcon className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Outreach Audit Trail</h3>
            </div>
            {/* Filter Pills */}
            <div className="flex items-center space-x-1 text-[11px]">
              {(['all', 'emails', 'replies', 'campaigns', 'leads'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActivityFilter(tab)}
                  className={`px-2 py-0.5 rounded capitalize font-medium transition-colors ${
                    activityFilter === tab 
                      ? 'bg-zinc-800 text-amber-400 border border-zinc-700' 
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {filteredActivities.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-400 space-y-1">
              <p>No outreach activities logged for this filter.</p>
              <p className="text-[11px]">UIOutbox records every campaign creation, qualification, approval, dispatch, and reply automatically.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {filteredActivities.map((act) => (
                <div key={act.id} className="flex items-start space-x-3 text-xs p-2.5 rounded-lg bg-zinc-950/50 border border-zinc-800/60">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    act.activity_type.startsWith('reply_') ? 'bg-emerald-400' :
                    act.activity_type.startsWith('email_sent') || act.activity_type.startsWith('follow_up_sent') ? 'bg-sky-400' :
                    act.activity_type.startsWith('email_approved') ? 'bg-amber-400' :
                    'bg-zinc-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-200 font-medium">{act.description}</p>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(act.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Operating System Status & Mental Model */}
        <div className="p-6 bg-zinc-900/70 border border-zinc-800 rounded-xl space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center space-x-2 border-b border-zinc-800/80 pb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">System Readiness</h3>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/60 flex items-center justify-between">
                <span className="text-zinc-400">Gmail Delivery Engine</span>
                <span className={`text-[11px] font-semibold font-mono ${gmailStatus.connected ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {gmailStatus.connected ? 'OAuth Connected' : 'Sandbox Ready'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/60 flex items-center justify-between">
                <span className="text-zinc-400">AI Intelligence Engine</span>
                <span className="text-[11px] font-semibold text-amber-400 font-mono">
                  Gemini Flash 2.5 Active
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/60 flex items-center justify-between">
                <span className="text-zinc-400">Database Persistence</span>
                <span className="text-[11px] font-semibold text-emerald-400 font-mono">
                  {supabaseStatus.connected ? 'Supabase Cloud' : 'Local Storage Engine'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/60 flex items-center justify-between">
                <span className="text-zinc-400">Approval Gate Security</span>
                <span className="text-[11px] font-semibold text-emerald-400 font-mono">
                  100% Enforced
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-800/80 text-[11px] text-zinc-400">
            Creative assets, video strategy, and final closing calls are personally orchestrated by UI Dani.
          </div>
        </div>
      </div>
    </div>
  );
};
