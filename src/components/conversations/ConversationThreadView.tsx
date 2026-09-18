import React, { useState, useEffect } from 'react';
import { 
  ProspectReply, 
  ConversationMessageItem, 
  Lead, 
  LeadStatus, 
  ResponseDraft, 
  ReplyClassification,
  ReplyPriority,
  ReplyStatus
} from '../../types';
import { 
  Sparkles, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  User, 
  Building2, 
  Mail, 
  ArrowUpRight, 
  RefreshCw, 
  ExternalLink,
  ShieldCheck,
  ChevronDown,
  MessageSquare,
  HelpCircle,
  ThumbsUp,
  XCircle,
  Video,
  Calendar,
  Layers,
  Inbox,
  ArrowLeft
} from 'lucide-react';

interface ConversationThreadViewProps {
  reply: ProspectReply;
  lead?: Lead;
  messages: ConversationMessageItem[];
  isLoadingThread: boolean;
  onBackToList?: () => void;
  onRefreshThread: () => Promise<void>;
  onAnalyzeReply: (replyId: string) => Promise<ProspectReply | null>;
  onGenerateDraft: (replyId: string) => Promise<ResponseDraft | null>;
  onSendApprovedResponse: (replyId: string, draft: { subject: string; body: string }, options?: { updatePipelineStatus?: LeadStatus }) => Promise<any>;
  onUpdateReplyStatus: (replyId: string, status: ReplyStatus) => Promise<void>;
  onUpdateLeadPipelineStatus: (leadId: string, status: LeadStatus) => Promise<void>;
}

export const ConversationThreadView: React.FC<ConversationThreadViewProps> = ({
  reply,
  lead,
  messages,
  isLoadingThread,
  onBackToList,
  onRefreshThread,
  onAnalyzeReply,
  onGenerateDraft,
  onSendApprovedResponse,
  onUpdateReplyStatus,
  onUpdateLeadPipelineStatus,
}) => {
  const [draftSubject, setDraftSubject] = useState<string>(reply.suggested_draft?.subject || `Re: ${reply.subject || 'Our UI discussion'}`);
  const [draftBody, setDraftBody] = useState<string>(reply.suggested_draft?.body || '');
  const [selectedPipelineStatus, setSelectedPipelineStatus] = useState<LeadStatus>(lead?.status || 'replied');
  const [isGeneratingDraft, setIsGeneratingDraft] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sendSuccessMessage, setSendSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync draft when reply prop updates
  useEffect(() => {
    if (reply.suggested_draft?.body && !draftBody) {
      setDraftBody(reply.suggested_draft.body);
      setDraftSubject(reply.suggested_draft.subject);
    }
  }, [reply.suggested_draft]);

  useEffect(() => {
    if (lead?.status) {
      setSelectedPipelineStatus(lead.status);
    }
  }, [lead?.status]);

  const handleGenerateDraft = async () => {
    setIsGeneratingDraft(true);
    setErrorMessage(null);
    try {
      const draft = await onGenerateDraft(reply.id);
      if (draft) {
        setDraftSubject(draft.subject);
        setDraftBody(draft.body);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate AI response draft');
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setErrorMessage(null);
    try {
      await onAnalyzeReply(reply.id);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to analyze reply');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendResponse = async (pipelineStatusToSet?: LeadStatus) => {
    if (!draftBody.trim()) {
      setErrorMessage('Response body cannot be empty.');
      return;
    }

    setIsSending(true);
    setErrorMessage(null);
    setSendSuccessMessage(null);

    try {
      const res = await onSendApprovedResponse(
        reply.id,
        {
          subject: draftSubject,
          body: draftBody
        },
        {
          updatePipelineStatus: pipelineStatusToSet || selectedPipelineStatus
        }
      );

      if (res.success) {
        setSendSuccessMessage(`Response sent via Gmail successfully (Message ID: ${res.messageId || 'sent'})`);
        await onRefreshThread();
      } else {
        setErrorMessage(res.error || 'Failed to send response email');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error executing approved response');
    } finally {
      setIsSending(false);
    }
  };

  const insertSnippet = (snippet: string) => {
    setDraftBody(prev => (prev ? `${prev}\n\n${snippet}` : snippet));
  };

  const getClassificationBadge = (classification?: ReplyClassification) => {
    switch (classification) {
      case 'interested':
        return { bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300', icon: ThumbsUp, label: 'Interested' };
      case 'meeting_request':
        return { bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300', icon: Calendar, label: 'Meeting Request' };
      case 'question':
        return { bg: 'bg-sky-500/10 border-sky-500/30 text-sky-300', icon: HelpCircle, label: 'Question' };
      case 'objection':
        return { bg: 'bg-orange-500/10 border-orange-500/30 text-orange-300', icon: AlertTriangle, label: 'Objection' };
      case 'out_of_office':
        return { bg: 'bg-zinc-800 border-zinc-700 text-zinc-400', icon: Clock, label: 'Out of Office' };
      case 'not_interested':
        return { bg: 'bg-rose-500/10 border-rose-500/30 text-rose-400', icon: XCircle, label: 'Not Interested' };
      default:
        return { bg: 'bg-zinc-800 border-zinc-700 text-zinc-300', icon: MessageSquare, label: 'Unclassified' };
    }
  };

  const badge = getClassificationBadge(reply.classification);
  const BadgeIcon = badge.icon;

  const priorityColor = 
    reply.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
    reply.priority === 'MEDIUM' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
    'bg-zinc-800 text-zinc-400 border-zinc-700';

  return (
    <div id={`conversation-thread-${reply.id}`} className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-950">
      {/* Top Header */}
      <div className="p-3 sm:p-4 px-4 sm:px-6 border-b border-zinc-800 bg-zinc-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 shrink-0">
        <div className="flex items-center space-x-3">
          {onBackToList && (
            <button
              onClick={onBackToList}
              className="md:hidden p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors touch-manipulation"
              title="Back to inbox"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700/80 flex items-center justify-center font-bold text-sm text-zinc-200 shadow-sm shrink-0">
            {reply.prospect_name?.charAt(0) || lead?.company?.company_name?.charAt(0) || 'P'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-zinc-100 truncate">{reply.prospect_name}</h2>
              {lead?.company?.website && (
                <a 
                  href={lead.company.website.startsWith('http') ? lead.company.website : `https://${lead.company.website}`}
                  target="_blank" 
                  rel="noreferrer"
                  className="text-zinc-500 hover:text-zinc-300 shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
            <p className="text-xs text-zinc-400 truncate">
              {lead?.company?.company_name} • {reply.prospect_email}
            </p>
          </div>
        </div>

        {/* Pipeline & Status Controls */}
        <div className="flex items-center space-x-3">
          {/* Pipeline Status Selector */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] text-zinc-400">Pipeline:</span>
            <select
              id="lead-pipeline-status-select"
              value={selectedPipelineStatus}
              onChange={(e) => {
                const newStatus = e.target.value as LeadStatus;
                setSelectedPipelineStatus(newStatus);
                if (lead?.id) {
                  onUpdateLeadPipelineStatus(lead.id, newStatus);
                }
              }}
              className="px-2.5 py-1 bg-zinc-900 border border-zinc-700 rounded-md text-xs font-semibold text-zinc-200 capitalize focus:outline-none focus:border-amber-500/50"
            >
              <option value="lead">Lead</option>
              <option value="contacted">Contacted</option>
              <option value="replied">Replied</option>
              <option value="interested">Interested ⭐</option>
              <option value="meeting">Meeting Booked 📅</option>
              <option value="won">Won Deal 🚀</option>
              <option value="lost">Lost</option>
              <option value="do_not_contact">Do Not Contact</option>
            </select>
          </div>

          {/* Reply Status Pill */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] text-zinc-400">Inbox:</span>
            <select
              id="reply-inbox-status-select"
              value={reply.status}
              onChange={(e) => onUpdateReplyStatus(reply.id, e.target.value as ReplyStatus)}
              className="px-2.5 py-1 bg-zinc-900 border border-zinc-700 rounded-md text-xs font-medium text-zinc-300 capitalize focus:outline-none"
            >
              <option value="unread">Unread</option>
              <option value="needs_response">Needs Response</option>
              <option value="responded">Responded</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <button
            onClick={onRefreshThread}
            disabled={isLoadingThread}
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            title="Refresh Conversation Thread"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingThread ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Content Area: Thread + AI Deck + Composer */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* AI Reply Intelligence Deck */}
        <div id="ai-reply-intelligence-deck" className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4.5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-zinc-100 flex items-center space-x-2">
                  <span>AI Reply Intelligence</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono ${badge.bg} flex items-center space-x-1`}>
                    <BadgeIcon className="w-3 h-3" />
                    <span>{badge.label}</span>
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono ${priorityColor}`}>
                    Priority: {reply.priority || 'MEDIUM'}
                  </span>
                </h3>
              </div>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium transition-colors flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span>{isAnalyzing ? 'Analyzing...' : 'Re-Analyze'}</span>
            </button>
          </div>

          {/* Intelligence Highlights Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Intent Summary */}
            <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800/80 space-y-1">
              <span className="text-[11px] font-semibold text-zinc-400">Detected Intent</span>
              <p className="text-zinc-200 leading-relaxed font-normal">
                {reply.intent_summary || 'Analyzing prospect intent and questions...'}
              </p>
            </div>

            {/* Suggested Action */}
            <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800/80 space-y-1">
              <span className="text-[11px] font-semibold text-zinc-400">Suggested Action</span>
              <p className="text-amber-300 leading-relaxed font-medium">
                {reply.suggested_action || 'Review prospect response and send short customized reply.'}
              </p>
            </div>
          </div>

          {/* Questions and Objections Breakdown */}
          {((reply.detected_questions && reply.detected_questions.length > 0) || 
            (reply.detected_objections && reply.detected_objections.length > 0)) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
              {reply.detected_questions && reply.detected_questions.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-sky-400 flex items-center space-x-1">
                    <HelpCircle className="w-3 h-3" />
                    <span>Questions to Answer ({reply.detected_questions.length})</span>
                  </span>
                  <ul className="space-y-1 bg-sky-950/20 border border-sky-900/30 p-2.5 rounded-lg text-zinc-300 text-[11px]">
                    {reply.detected_questions.map((q, idx) => (
                      <li key={idx} className="flex items-start space-x-1.5">
                        <span className="text-sky-400 font-bold">•</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {reply.detected_objections && reply.detected_objections.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-orange-400 flex items-center space-x-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Objections to Address ({reply.detected_objections.length})</span>
                  </span>
                  <ul className="space-y-1 bg-orange-950/20 border border-orange-900/30 p-2.5 rounded-lg text-zinc-300 text-[11px]">
                    {reply.detected_objections.map((o, idx) => (
                      <li key={idx} className="flex items-start space-x-1.5">
                        <span className="text-orange-400 font-bold">•</span>
                        <span>{o}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chronological Message History */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-zinc-500" />
              <span>Conversation Thread History</span>
            </h3>
            <span className="text-[11px] text-zinc-500 font-mono">
              {messages.length} message{messages.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="space-y-3">
            {messages.length === 0 ? (
              <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800 text-xs text-zinc-400 text-center">
                Loading conversation thread...
              </div>
            ) : (
              messages.map((msg) => {
                const isInbound = msg.direction === 'inbound';
                return (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isInbound
                        ? 'bg-amber-500/5 border-amber-500/30 ml-2 shadow-sm'
                        : 'bg-zinc-900/60 border-zinc-800/90 mr-4'
                    }`}
                  >
                    {/* Message Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60 text-xs">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                          isInbound 
                            ? 'bg-amber-500/20 text-amber-300' 
                            : 'bg-zinc-800 text-zinc-300'
                        }`}>
                          {isInbound ? 'Prospect Inbound Reply' : (msg.step !== undefined ? `Outbound (Step ${msg.step})` : 'Outbound')}
                        </span>
                        <span className="font-semibold text-zinc-200">{msg.sender}</span>
                      </div>
                      <span className="text-[11px] text-zinc-400 font-mono">
                        {new Date(msg.sent_at).toLocaleString()}
                      </span>
                    </div>

                    {/* Subject */}
                    {msg.subject && (
                      <div className="pt-2 text-xs font-semibold text-zinc-300">
                        {msg.subject}
                      </div>
                    )}

                    {/* Body */}
                    <div className="pt-2 text-xs text-zinc-200 whitespace-pre-wrap font-sans leading-relaxed">
                      {msg.body}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* AI Response Composer & Approval Deck */}
        <div id="response-composer-deck" className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 space-y-4 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-md bg-amber-400/20 text-amber-400 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-bold text-zinc-100">
                Compose Approved Response (UI Dani Voice)
              </h3>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleGenerateDraft}
                disabled={isGeneratingDraft}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-amber-400/30 text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1.5"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isGeneratingDraft ? 'animate-spin' : ''}`} />
                <span>{isGeneratingDraft ? 'Generating Draft...' : 'Generate AI Draft'}</span>
              </button>
            </div>
          </div>

          {/* Quick Snippet Inserts */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-zinc-400 mr-1">Quick Inserts:</span>
            <button
              type="button"
              onClick={() => insertSnippet('Checked out your platform—I can record a quick 45-second teardown showing where the UX bottleneck is if that would be helpful.')}
              className="px-2 py-0.5 rounded bg-zinc-800/80 hover:bg-zinc-700 text-[11px] text-zinc-300 border border-zinc-700 transition-colors flex items-center space-x-1"
            >
              <Video className="w-3 h-3 text-amber-400" />
              <span>45s Loom Offer</span>
            </button>
            <button
              type="button"
              onClick={() => insertSnippet('You can check out my live interactive case studies & 3D interactions at https://bignssien.wixstudio.com/uidani')}
              className="px-2 py-0.5 rounded bg-zinc-800/80 hover:bg-zinc-700 text-[11px] text-zinc-300 border border-zinc-700 transition-colors flex items-center space-x-1"
            >
              <ExternalLink className="w-3 h-3 text-sky-400" />
              <span>Portfolio Link</span>
            </button>
            <button
              type="button"
              onClick={() => insertSnippet('Feel free to grab a quick 15-min slot on my calendar here: https://cal.com/uidani')}
              className="px-2 py-0.5 rounded bg-zinc-800/80 hover:bg-zinc-700 text-[11px] text-zinc-300 border border-zinc-700 transition-colors flex items-center space-x-1"
            >
              <Calendar className="w-3 h-3 text-emerald-400" />
              <span>15m Cal Link</span>
            </button>
          </div>

          {/* Editable Subject */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-zinc-400">Email Subject</label>
            <input
              id="composer-subject-input"
              type="text"
              value={draftSubject}
              onChange={(e) => setDraftSubject(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {/* Editable Body */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span className="font-semibold">Response Message</span>
              <span className="font-mono">{draftBody.split(/\s+/).filter(Boolean).length} words</span>
            </div>
            <textarea
              id="composer-body-textarea"
              value={draftBody}
              onChange={(e) => setDraftBody(e.target.value)}
              rows={7}
              placeholder="Write or edit your reply to the prospect..."
              className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 font-sans focus:outline-none focus:border-amber-500/50 leading-relaxed"
            />
          </div>

          {/* Status Feedback */}
          {sendSuccessMessage && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center space-x-2 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{sendSuccessMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-center space-x-2 text-xs text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Buttons & Human Approval Gate */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-zinc-800">
            <div className="flex items-center space-x-2 text-[11px] text-zinc-400">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Human Approval: Responses will only be dispatched when explicitly approved by Daniel.</span>
            </div>

            <div className="flex items-center space-x-2.5">
              <button
                type="button"
                onClick={() => onUpdateReplyStatus(reply.id, 'responded')}
                className="px-3 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                title="Mark as responded without sending an email"
              >
                Mark Responded
              </button>

              <button
                id="btn-approve-send-response"
                type="button"
                onClick={() => handleSendResponse()}
                disabled={isSending || !draftBody.trim()}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-zinc-950 text-xs font-bold rounded-lg transition-all flex items-center space-x-2 shadow-sm"
              >
                {isSending ? (
                  <span>Sending via Gmail...</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Approve & Send via Gmail</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
