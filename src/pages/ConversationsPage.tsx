import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Sparkles, 
  Search, 
  Filter, 
  RefreshCw, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  ThumbsUp, 
  HelpCircle, 
  Clock, 
  Building2, 
  User, 
  ArrowRight,
  Send,
  Plus,
  ArrowLeft
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { 
  ProspectReply, 
  ReplyClassification, 
  ReplyStatus, 
  ConversationMessageItem,
  LeadStatus 
} from '../types';
import { ConversationThreadView } from '../components/conversations/ConversationThreadView';
import { SimulateReplyModal } from '../components/conversations/SimulateReplyModal';

export const ConversationsPage: React.FC = () => {
  const { 
    replies, 
    leads, 
    selectedReplyId, 
    setSelectedReplyId, 
    refreshData,
    analyzeReply,
    generateResponseDraft,
    sendApprovedResponse,
    updateReplyStatus,
    updateLeadPipelineStatus,
    simulateInboundReply,
    syncGmailReplies,
    getConversationThread
  } = useCRM();

  const [classificationFilter, setClassificationFilter] = useState<'all' | ReplyClassification>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ReplyStatus>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<{ message?: string; type?: 'success' | 'error' } | null>(null);
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState<boolean>(false);
  const [activeThreadMessages, setActiveThreadMessages] = useState<ConversationMessageItem[]>([]);
  const [isLoadingThread, setIsLoadingThread] = useState<boolean>(false);
  const [mobileView, setMobileView] = useState<'list' | 'thread'>('list');

  // Auto-select first reply if none selected on desktop
  useEffect(() => {
    if (!selectedReplyId && replies.length > 0) {
      setSelectedReplyId(replies[0].id);
    }
  }, [replies, selectedReplyId, setSelectedReplyId]);

  // Load thread messages when selected reply changes
  useEffect(() => {
    const loadThread = async () => {
      const activeReply = replies.find(r => r.id === selectedReplyId);
      if (activeReply?.lead_id) {
        setIsLoadingThread(true);
        try {
          const msgs = await getConversationThread(activeReply.lead_id);
          setActiveThreadMessages(msgs);
        } catch (e) {
          console.error('Error loading thread messages:', e);
        } finally {
          setIsLoadingThread(false);
        }
      } else {
        setActiveThreadMessages([]);
      }
    };

    if (selectedReplyId) {
      loadThread();
    }
  }, [selectedReplyId, replies, getConversationThread]);

  const handleRefreshThread = async () => {
    const activeReply = replies.find(r => r.id === selectedReplyId);
    if (activeReply?.lead_id) {
      setIsLoadingThread(true);
      try {
        const msgs = await getConversationThread(activeReply.lead_id);
        setActiveThreadMessages(msgs);
      } finally {
        setIsLoadingThread(false);
      }
    }
  };

  const handleSyncGmail = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const res = await syncGmailReplies();
      if (res.newRepliesCount > 0) {
        setSyncStatus({ message: `Synced ${res.newRepliesCount} new reply from Gmail!`, type: 'success' });
      } else {
        setSyncStatus({ message: 'Inbox is up to date. No new unread replies.', type: 'success' });
      }
    } catch (err: any) {
      setSyncStatus({ message: err.message || 'Error checking Gmail for replies', type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  // Filter replies
  const filteredReplies = replies.filter((reply) => {
    if (classificationFilter !== 'all' && reply.classification !== classificationFilter) {
      return false;
    }

    if (statusFilter !== 'all' && reply.status !== statusFilter) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = reply.prospect_name.toLowerCase().includes(q);
      const matchEmail = reply.prospect_email.toLowerCase().includes(q);
      const matchSnippet = reply.reply_snippet.toLowerCase().includes(q);
      const matchSubject = (reply.subject || '').toLowerCase().includes(q);
      const matchIntent = (reply.intent_summary || '').toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchSnippet && !matchSubject && !matchIntent) {
        return false;
      }
    }

    return true;
  });

  const activeReply = replies.find(r => r.id === selectedReplyId);
  const activeLead = leads.find(l => l.id === activeReply?.lead_id);

  // Metrics
  const totalRepliesCount = replies.length;
  const needsResponseCount = replies.filter(r => r.status === 'unread' || r.status === 'needs_response').length;
  const interestedCount = replies.filter(r => r.classification === 'interested' || r.classification === 'meeting_request').length;
  const objectionsCount = replies.filter(r => r.classification === 'question' || r.classification === 'objection').length;

  const getClassificationBadgeMini = (classification?: ReplyClassification) => {
    switch (classification) {
      case 'interested':
        return { label: 'Interested', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' };
      case 'meeting_request':
        return { label: 'Meeting Req', color: 'bg-amber-500/10 text-amber-300 border-amber-500/30' };
      case 'question':
        return { label: 'Question', color: 'bg-sky-500/10 text-sky-300 border-sky-500/30' };
      case 'objection':
        return { label: 'Objection', color: 'bg-orange-500/10 text-orange-300 border-orange-500/30' };
      case 'out_of_office':
        return { label: 'OOO', color: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
      case 'not_interested':
        return { label: 'Not Interested', color: 'bg-rose-500/10 text-rose-400 border-rose-500/30' };
      default:
        return { label: 'Inbound', color: 'bg-zinc-800 text-zinc-300 border-zinc-700' };
    }
  };

  const handleSelectReply = (id: string) => {
    setSelectedReplyId(id);
    setMobileView('thread');
  };

  return (
    <div id="conversations-page" className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto flex flex-col h-[calc(100vh-4rem)]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-100">Reply Intelligence & Inbox</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Build 07 Live Engine
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Automated sentiment analysis, objection categorization, and personalized response drafts in UI Dani's voice
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex items-center space-x-2">
          <button
            id="btn-sync-gmail-replies"
            onClick={handleSyncGmail}
            disabled={isSyncing}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-semibold transition-all flex items-center space-x-1.5 shadow-sm touch-manipulation"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : 'text-zinc-400'}`} />
            <span>{isSyncing ? 'Scanning Gmail...' : 'Sync Gmail'}</span>
          </button>

          <button
            id="btn-open-simulate-reply"
            onClick={() => setIsSimulateModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm touch-manipulation"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Simulate Reply</span>
          </button>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncStatus && (
        <div className={`p-2.5 px-4 rounded-lg border text-xs flex items-center justify-between shrink-0 ${
          syncStatus.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{syncStatus.message}</span>
          </div>
          <button onClick={() => setSyncStatus(null)} className="text-[11px] hover:underline font-mono">
            Dismiss
          </button>
        </div>
      )}

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 shrink-0">
        <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg flex items-center justify-between">
          <div>
            <div className="text-[10px] sm:text-[11px] text-zinc-400 font-medium">Total Replies</div>
            <div className="text-base sm:text-lg font-bold text-zinc-100 font-mono mt-0.5">{totalRepliesCount}</div>
          </div>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-zinc-800 flex items-center justify-center text-zinc-300 shrink-0">
            <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>

        <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg flex items-center justify-between">
          <div>
            <div className="text-[10px] sm:text-[11px] text-amber-400 font-medium">Action Needed</div>
            <div className="text-base sm:text-lg font-bold text-amber-400 font-mono mt-0.5">{needsResponseCount}</div>
          </div>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>

        <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg flex items-center justify-between">
          <div>
            <div className="text-[10px] sm:text-[11px] text-emerald-400 font-medium">Interested / Calls</div>
            <div className="text-base sm:text-lg font-bold text-emerald-400 font-mono mt-0.5">{interestedCount}</div>
          </div>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <ThumbsUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>

        <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg flex items-center justify-between">
          <div>
            <div className="text-[10px] sm:text-[11px] text-sky-400 font-medium">Questions</div>
            <div className="text-base sm:text-lg font-bold text-sky-400 font-mono mt-0.5">{objectionsCount}</div>
          </div>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
            <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
      </div>

      {/* Master-Detail Split Workspace */}
      <div className="flex-1 flex border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950 shadow-sm min-h-0">
        {/* Left Side: Inbox List & Filter Bar */}
        <div className={`${mobileView === 'thread' ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 border-r border-zinc-800 flex-col h-full bg-zinc-900/40 shrink-0`}>
          {/* Search Box */}
          <div className="p-3 border-b border-zinc-800 space-y-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search prospect, company, snippet..."
                className="w-full pl-8.5 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-md text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            {/* Classification Filter Chips */}
            <div className="flex items-center space-x-1 overflow-x-auto pb-1 scrollbar-none text-[11px]">
              {(['all', 'interested', 'meeting_request', 'question', 'objection', 'out_of_office', 'not_interested'] as const).map((cls) => {
                const isSelected = classificationFilter === cls;
                return (
                  <button
                    key={cls}
                    onClick={() => setClassificationFilter(cls)}
                    className={`px-2 py-0.5 rounded-full capitalize whitespace-nowrap transition-colors touch-manipulation ${
                      isSelected
                        ? 'bg-amber-400 text-zinc-950 font-bold'
                        : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {cls.replace('_', ' ')}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reply List */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/60">
            {filteredReplies.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 mx-auto">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div className="text-xs text-zinc-400">
                  {replies.length === 0 ? (
                    <>
                      No replies logged yet. Launch a campaign and use <strong>Simulate Reply</strong> to test intent analysis.
                    </>
                  ) : (
                    'No replies match the current filter.'
                  )}
                </div>
              </div>
            ) : (
              filteredReplies.map((r) => {
                const isSelected = r.id === selectedReplyId;
                const badge = getClassificationBadgeMini(r.classification);
                const isUnread = r.status === 'unread' || r.status === 'needs_response';

                return (
                  <button
                    key={r.id}
                    onClick={() => handleSelectReply(r.id)}
                    className={`w-full p-3.5 text-left transition-colors flex flex-col space-y-1.5 relative touch-manipulation ${
                      isSelected
                        ? 'bg-zinc-800/90 border-l-2 border-amber-400'
                        : 'hover:bg-zinc-800/40'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                        )}
                        <span className="font-semibold text-xs text-zinc-100 truncate max-w-[150px]">
                          {r.prospect_name}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {new Date(r.received_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    {/* Subject / Snippet */}
                    <p className="text-xs text-zinc-300 font-medium truncate">
                      {r.subject || 'Re: Outreach'}
                    </p>
                    <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                      {r.reply_snippet || 'Inbound reply received from prospect.'}
                    </p>

                    {/* Badges */}
                    <div className="flex items-center justify-between pt-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${badge.color}`}>
                        {badge.label}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono uppercase">
                        {r.status.replace('_', ' ')}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Conversation Thread View & Composer */}
        <div className={`${mobileView === 'list' ? 'hidden md:flex' : 'flex'} flex-1 flex-col h-full bg-zinc-950 overflow-hidden`}>
          {activeReply ? (
            <ConversationThreadView
              reply={activeReply}
              lead={activeLead}
              messages={activeThreadMessages}
              isLoadingThread={isLoadingThread}
              onBackToList={() => setMobileView('list')}
              onRefreshThread={handleRefreshThread}
              onAnalyzeReply={analyzeReply}
              onGenerateDraft={generateResponseDraft}
              onSendApprovedResponse={sendApprovedResponse}
              onUpdateReplyStatus={updateReplyStatus}
              onUpdateLeadPipelineStatus={updateLeadPipelineStatus}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center">
              <div className="max-w-md space-y-3">
                <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-400 mx-auto">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-zinc-200">Select a Prospect Conversation</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Click on an inbound reply from the left panel to review sentiment classification, detected objections, and approve AI response drafts in UI Dani's voice.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Simulate Reply Testing Modal */}
      <SimulateReplyModal
        isOpen={isSimulateModalOpen}
        onClose={() => setIsSimulateModalOpen(false)}
        leads={leads}
        selectedLeadId={activeLead?.id}
        onSimulate={async (leadId, options) => {
          const newReply = await simulateInboundReply(leadId, options);
          if (newReply?.id) {
            handleSelectReply(newReply.id);
          }
        }}
      />
    </div>
  );
};
