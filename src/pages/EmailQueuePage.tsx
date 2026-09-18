import React, { useState, useEffect } from 'react';
import { 
  Inbox, 
  Check, 
  X, 
  Edit3, 
  Send, 
  Sparkles, 
  Film, 
  User, 
  Building2, 
  ExternalLink,
  CheckCircle2,
  Clock,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Copy,
  Save,
  Search,
  Filter,
  CheckSquare,
  Square,
  AlertCircle,
  Video,
  Globe,
  Sliders,
  Trash2,
  Maximize2,
  ShieldCheck,
  Zap,
  MailCheck,
  Flame
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { EmailMessage, EmailMessageStatus, Lead, Campaign } from '../types';
import { NavigationPage } from '../components/layout/Sidebar';
import { EmailPersonalizationModal } from '../components/personalization/EmailPersonalizationModal';
import { SendConfirmationModal } from '../components/delivery/SendConfirmationModal';
import { BatchSendModal } from '../components/delivery/BatchSendModal';

interface EmailQueuePageProps {
  onNavigate: (page: NavigationPage) => void;
}

export const EmailQueuePage: React.FC<EmailQueuePageProps> = ({ onNavigate }) => {
  const { 
    emailMessages, 
    updateEmailStatus, 
    updateEmailMessage,
    deleteEmailMessage,
    batchApproveEmails,
    batchQueueEmails,
    batchRejectEmails,
    generateEmailForLead,
    campaigns, 
    leads,
    companies,
    gmailStatus,
    todaySentCount,
    deliverySettings,
    batchSendQueuedEmails,
    batchProgress
  } = useCRM();

  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [campaignFilter, setCampaignFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Selected IDs for batch operations
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Editing state for active email
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Reject reason dialog
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  
  // Modals for sending
  const [sendConfirmationEmail, setSendConfirmationEmail] = useState<EmailMessage | null>(null);
  const [isBatchSendModalOpen, setIsBatchSendModalOpen] = useState(false);
  
  // Full modal view state
  const [studioModalLead, setStudioModalLead] = useState<Lead | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filtered emails list
  const filteredEmails = emailMessages.filter((email) => {
    // Status filter
    if (statusFilter === 'needs_review') {
      if (email.status !== 'draft' && email.status !== 'reviewing' && email.status !== 'needs_review' && email.status !== 'ai_generated') {
        return false;
      }
    } else if (statusFilter !== 'all' && email.status !== statusFilter) {
      return false;
    }

    // Campaign filter
    if (campaignFilter !== 'all' && email.campaign_id !== campaignFilter) {
      return false;
    }

    // Language filter
    const lang = email.personalization_metadata?.language_selected || 'English';
    if (languageFilter !== 'all' && !lang.toLowerCase().includes(languageFilter.toLowerCase())) {
      return false;
    }

    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const compName = (email.lead?.company?.company_name || '').toLowerCase();
      const domain = (email.lead?.company?.domain || '').toLowerCase();
      const contactName = (email.contact?.full_name || email.lead?.contact?.full_name || '').toLowerCase();
      const emailAddr = (email.contact?.email || email.lead?.contact?.email || '').toLowerCase();
      const sub = (email.subject || '').toLowerCase();
      const body = (email.body || '').toLowerCase();

      return compName.includes(q) || domain.includes(q) || contactName.includes(q) || emailAddr.includes(q) || sub.includes(q) || body.includes(q);
    }

    return true;
  });

  // Selected email object
  const activeEmail = emailMessages.find(e => e.id === selectedEmailId) || (filteredEmails.length > 0 ? filteredEmails[0] : null);

  // Sync edit buffer when active email changes
  useEffect(() => {
    if (activeEmail) {
      setSelectedEmailId(activeEmail.id);
      setEditedSubject(activeEmail.subject || '');
      setEditedBody(activeEmail.body || '');
      setShowRejectDialog(false);
      setRejectReason('');
      setShowInstructions(false);
      setCustomInstructions('');
    } else {
      setSelectedEmailId(null);
      setEditedSubject('');
      setEditedBody('');
    }
  }, [activeEmail?.id]);

  // Handle select all
  const handleSelectAll = () => {
    if (selectedIds.length === filteredEmails.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredEmails.map(e => e.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Actions
  const handleSaveChanges = async () => {
    if (!activeEmail) return;
    setIsSaving(true);
    try {
      await updateEmailMessage(activeEmail.id, {
        subject: editedSubject,
        body: editedBody,
        personalization_metadata: {
          ...(activeEmail.personalization_metadata || {}),
          final_body: editedBody,
        }
      });
      showToast('Changes saved successfully');
    } catch (e: any) {
      setErrorMessage(e.message || 'Failed to save draft');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!activeEmail) return;
    try {
      await handleSaveChanges();
      await updateEmailStatus(activeEmail.id, 'approved');
      showToast(`Draft approved by Daniel for ${activeEmail.lead?.company?.company_name || 'prospect'}`);
    } catch (e: any) {
      setErrorMessage(e.message || 'Approval failed');
    }
  };

  const handleQueue = async () => {
    if (!activeEmail) return;
    try {
      await handleSaveChanges();
      await updateEmailStatus(activeEmail.id, 'queued');
      showToast(`Email queued for Gmail outreach dispatch`);
    } catch (e: any) {
      setErrorMessage(e.message || 'Queueing failed');
    }
  };

  const handleRejectConfirm = async () => {
    if (!activeEmail) return;
    try {
      await updateEmailStatus(activeEmail.id, 'rejected', rejectReason || 'Operator rejected draft');
      setShowRejectDialog(false);
      setRejectReason('');
      showToast('Draft marked as rejected');
    } catch (e: any) {
      setErrorMessage(e.message || 'Rejection failed');
    }
  };

  const handleRegenerate = async (customPrompt?: string) => {
    if (!activeEmail || !activeEmail.lead_id || !activeEmail.campaign_id) return;
    setIsRegenerating(true);
    setErrorMessage(null);
    try {
      const regenerated = await generateEmailForLead(activeEmail.lead_id, activeEmail.campaign_id, customPrompt || customInstructions);
      setEditedSubject(regenerated.subject);
      setEditedBody(regenerated.body);
      showToast('AI synthesized a fresh personalized draft');
    } catch (e: any) {
      setErrorMessage(e.message || 'Regeneration failed');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCopy = () => {
    if (!activeEmail) return;
    const fullText = `Subject: ${editedSubject}\n\n${editedBody}`;
    navigator.clipboard.writeText(fullText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Batch actions
  const handleBatchApprove = async () => {
    if (selectedIds.length === 0) return;
    await batchApproveEmails(selectedIds);
    showToast(`Approved ${selectedIds.length} emails`);
    setSelectedIds([]);
  };

  const handleBatchQueue = async () => {
    if (selectedIds.length === 0) return;
    await batchQueueEmails(selectedIds);
    showToast(`Queued ${selectedIds.length} emails for Gmail dispatch`);
    setSelectedIds([]);
  };

  const handleBatchReject = async () => {
    if (selectedIds.length === 0) return;
    await batchRejectEmails(selectedIds, 'Batch rejected during review');
    showToast(`Rejected ${selectedIds.length} emails`);
    setSelectedIds([]);
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedIds.length} draft emails?`)) {
      for (const id of selectedIds) {
        await deleteEmailMessage(id);
      }
      showToast(`Deleted ${selectedIds.length} emails`);
      setSelectedIds([]);
    }
  };

  // Trigger batch send modal
  const handleStartBatchSend = async () => {
    const queuedCount = emailMessages.filter(e => e.status === 'queued').length;
    if (queuedCount === 0) {
      showToast('No emails currently in Queued status.');
      return;
    }
    setIsBatchSendModalOpen(true);
    await batchSendQueuedEmails();
  };

  const handleBatchSendSelected = async () => {
    if (selectedIds.length === 0) return;
    // Filter to only approved/queued emails in the selection
    const eligible = emailMessages.filter(e => selectedIds.includes(e.id) && (e.status === 'approved' || e.status === 'queued'));
    if (eligible.length === 0) {
      showToast('Selected emails must be Approved or Queued to dispatch.');
      return;
    }
    setIsBatchSendModalOpen(true);
    await batchSendQueuedEmails(eligible.map(e => e.id));
    setSelectedIds([]);
  };

  // Metrics summary
  const totalCount = emailMessages.length;
  const reviewCount = emailMessages.filter(e => e.status === 'reviewing' || e.status === 'draft' || e.status === 'needs_review' || e.status === 'ai_generated').length;
  const approvedCount = emailMessages.filter(e => e.status === 'approved').length;
  const queuedCount = emailMessages.filter(e => e.status === 'queued').length;
  const sentCount = emailMessages.filter(e => e.status === 'sent' || e.status === 'delivered').length;
  const rejectedCount = emailMessages.filter(e => e.status === 'rejected').length;

  const metadata = activeEmail?.personalization_metadata;
  const wordCount = editedBody.trim() ? editedBody.trim().split(/\s+/).length : 0;
  const charCount = editedBody.length;
  const creativeAsset = metadata?.creative_used;

  const getStatusPill = (status: EmailMessageStatus) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">Approved</span>;
      case 'queued':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/40">Queued</span>;
      case 'sent':
      case 'delivered':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1"><MailCheck className="w-3 h-3" /> Dispatched</span>;
      case 'rejected':
      case 'cancelled':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40">Rejected</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">Reviewing</span>;
    }
  };

  return (
    <div id="email-queue-page" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Header with Title and Build 05 Notice Banner */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-xl font-bold tracking-tight text-zinc-100">
                Email Review & Dispatch Outbox
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                Build 05 Gmail Engine
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Review AI drafts, approve creative asset hooks, and dispatch approved emails via Gmail API with rate-limiting.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {queuedCount > 0 && (
              <button
                onClick={handleStartBatchSend}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send All Queued ({queuedCount})</span>
              </button>
            )}
            <button
              onClick={() => onNavigate('settings')}
              className="px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-medium text-xs border border-zinc-800 transition-colors shadow-sm flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>Delivery Settings</span>
            </button>
          </div>
        </div>

        {/* Build 05 Operational Policy Banner */}
        <div className="p-3.5 bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-900/80 border border-zinc-800 rounded-xl flex items-center justify-between text-xs text-zinc-300">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 font-bold text-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-zinc-100">Strict Human Approval Gate:</span>{' '}
              <span className="text-zinc-400">
                Only drafts explicitly approved by Daniel can be queued and dispatched. Sender is locked to <strong className="text-zinc-200">UI Dani &lt;big.nssien@gmail.com&gt;</strong>.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
              Today: {todaySentCount} / {deliverySettings.dailySendLimit} Sent
            </span>
          </div>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <div className="p-3.5 bg-zinc-900/70 border border-zinc-800 rounded-xl">
          <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Total</span>
          <span className="text-xl font-mono font-bold text-zinc-100 mt-0.5 block">{totalCount}</span>
        </div>
        <div className="p-3.5 bg-zinc-900/70 border border-amber-500/30 rounded-xl">
          <span className="text-[10px] text-amber-400 uppercase font-semibold block">Needs Review</span>
          <span className="text-xl font-mono font-bold text-amber-300 mt-0.5 block">{reviewCount}</span>
        </div>
        <div className="p-3.5 bg-zinc-900/70 border border-emerald-500/30 rounded-xl">
          <span className="text-[10px] text-emerald-400 uppercase font-semibold block">Approved</span>
          <span className="text-xl font-mono font-bold text-emerald-300 mt-0.5 block">{approvedCount}</span>
        </div>
        <div className="p-3.5 bg-zinc-900/70 border border-blue-500/30 rounded-xl">
          <span className="text-[10px] text-blue-400 uppercase font-semibold block">Queued Outbox</span>
          <span className="text-xl font-mono font-bold text-blue-300 mt-0.5 block">{queuedCount}</span>
        </div>
        <div className="p-3.5 bg-zinc-900/70 border border-purple-500/30 rounded-xl">
          <span className="text-[10px] text-purple-400 uppercase font-semibold block">Dispatched</span>
          <span className="text-xl font-mono font-bold text-purple-300 mt-0.5 block">{sentCount}</span>
        </div>
        <div className="p-3.5 bg-zinc-900/70 border border-rose-500/30 rounded-xl">
          <span className="text-[10px] text-rose-400 uppercase font-semibold block">Rejected</span>
          <span className="text-xl font-mono font-bold text-rose-300 mt-0.5 block">{rejectedCount}</span>
        </div>
      </div>

      {/* Toast and Error Notifications */}
      {toastMessage && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </span>
          <button onClick={() => setToastMessage(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </span>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-200">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filters and Batch Actions Toolbar */}
      <div className="p-4 bg-zinc-900/60 border border-zinc-800/80 rounded-xl space-y-3.5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center space-x-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {[
              { id: 'all', label: 'All Drafts', count: totalCount },
              { id: 'needs_review', label: 'Needs Review', count: reviewCount },
              { id: 'approved', label: 'Approved', count: approvedCount },
              { id: 'queued', label: 'Queued', count: queuedCount },
              { id: 'sent', label: 'Dispatched', count: sentCount },
              { id: 'rejected', label: 'Rejected', count: rejectedCount },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center space-x-1.5 ${
                  statusFilter === tab.id
                    ? 'bg-zinc-800 text-zinc-100 font-semibold border border-zinc-700 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  statusFilter === tab.id ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-900 text-zinc-400'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search drafts, companies, subjects..."
              className="w-full pl-8 pr-3 py-1.5 bg-zinc-950 border border-zinc-700/80 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Second Row: Campaign / Language Dropdowns & Batch Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 border-t border-zinc-800/60">
          <div className="flex items-center space-x-2.5 w-full sm:w-auto">
            {/* Campaign Select */}
            <select
              value={campaignFilter}
              onChange={(e) => setCampaignFilter(e.target.value)}
              className="px-2.5 py-1 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">All Campaigns</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Language Select */}
            <select
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              className="px-2.5 py-1 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">All Languages</option>
              <option value="English">English</option>
              <option value="French">French</option>
              <option value="Spanish">Spanish</option>
              <option value="German">German</option>
            </select>
          </div>

          {/* Batch Actions when items selected */}
          {selectedIds.length > 0 && (
            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
              <span className="text-xs text-zinc-400 font-mono">
                {selectedIds.length} selected
              </span>
              <button
                onClick={handleBatchApprove}
                className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded text-[11px] font-semibold flex items-center space-x-1"
              >
                <ThumbsUp className="w-3 h-3" />
                <span>Approve</span>
              </button>
              <button
                onClick={handleBatchQueue}
                className="px-2.5 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 rounded text-[11px] font-semibold flex items-center space-x-1"
              >
                <Send className="w-3 h-3" />
                <span>Queue</span>
              </button>
              <button
                onClick={handleBatchSendSelected}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded text-[11px] font-bold flex items-center space-x-1"
              >
                <Zap className="w-3 h-3" />
                <span>Send Selected via Gmail</span>
              </button>
              <button
                onClick={handleBatchReject}
                className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded text-[11px] font-semibold flex items-center space-x-1"
              >
                <ThumbsDown className="w-3 h-3" />
                <span>Reject</span>
              </button>
              <button
                onClick={handleBatchDelete}
                className="px-2 py-1 text-zinc-400 hover:text-rose-400 text-[11px]"
                title="Delete Selected"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="px-2 py-1 text-zinc-400 hover:text-zinc-200 text-[11px]"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Review Workplace (Split-View) */}
      {emailMessages.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900/40 border border-dashed border-zinc-800 rounded-2xl space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-amber-400 mx-auto">
            <Inbox className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-sm font-semibold text-zinc-200">Email review queue is empty</h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              When campaigns qualify leads and run AI personalization, you will review, edit hooks, inspect creative video references, and approve each draft here.
            </p>
          </div>
          <div className="flex items-center justify-center space-x-3 pt-2">
            <button
              onClick={() => onNavigate('leads')}
              className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 font-semibold text-xs transition-colors shadow-sm flex items-center space-x-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>Go to Leads Pipeline</span>
            </button>
          </div>
        </div>
      ) : filteredEmails.length === 0 ? (
        <div className="p-8 text-center bg-zinc-900/30 border border-zinc-800 rounded-xl space-y-2">
          <p className="text-xs text-zinc-400">No email drafts match your filter criteria.</p>
          <button
            onClick={() => {
              setStatusFilter('all');
              setCampaignFilter('all');
              setLanguageFilter('all');
              setSearchQuery('');
            }}
            className="text-xs text-amber-400 hover:underline"
          >
            Reset all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Email Cards List (5 Cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between text-xs px-1">
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSelectAll}
                  className="text-zinc-400 hover:text-zinc-200 flex items-center space-x-1 text-xs"
                >
                  {selectedIds.length === filteredEmails.length && filteredEmails.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  <span>Select All ({filteredEmails.length})</span>
                </button>
              </div>
              <span className="text-zinc-500 font-mono text-[11px]">
                Showing {filteredEmails.length}
              </span>
            </div>

            <div className="space-y-2.5 max-h-[750px] overflow-y-auto pr-1">
              {filteredEmails.map((email) => {
                const isSelected = selectedEmailId === email.id;
                const isChecked = selectedIds.includes(email.id);
                const lead = leads.find(l => l.id === email.lead_id);
                const company = companies.find(c => c.id === lead?.company_id);
                const compName = company?.company_name || email.lead?.company?.company_name || 'Target Prospect';
                const contact = email.contact || lead?.contact || company?.primary_contact;
                const contactName = contact?.full_name || (contact?.first_name ? `${contact.first_name} ${contact.last_name || ''}`.trim() : 'Founder');
                const meta = email.personalization_metadata;
                const asset = meta?.creative_used;

                return (
                  <div
                    key={email.id}
                    onClick={() => setSelectedEmailId(email.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-zinc-900 border-amber-500/80 shadow-md shadow-amber-500/5'
                        : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/80'
                    }`}
                  >
                    {/* Top Row: Checkbox + Company + Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start space-x-2.5 min-w-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSelect(email.id);
                          }}
                          className="mt-0.5 text-zinc-400 hover:text-zinc-200"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-amber-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold text-zinc-100 truncate flex items-center space-x-1.5">
                            <span>{compName}</span>
                          </h4>
                          <div className="flex items-center space-x-1 text-[11px] text-zinc-400 truncate mt-0.5">
                            <User className="w-3 h-3 text-zinc-500 shrink-0" />
                            <span className="truncate">{contactName}</span>
                            {contact?.job_title && (
                              <>
                                <span className="text-zinc-600">·</span>
                                <span className="text-zinc-500 truncate">{contact.job_title}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {getStatusPill(email.status)}
                      </div>
                    </div>

                    {/* Subject Line */}
                    <p className="text-xs text-zinc-300 font-medium mt-2.5 truncate">
                      {email.subject}
                    </p>

                    {/* Body Snippet */}
                    <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                      {email.body}
                    </p>

                    {/* Bottom Metadata Tags */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2.5 border-t border-zinc-800/60 text-[10px]">
                      {asset && (
                        <span className="px-2 py-0.5 rounded bg-zinc-800/80 text-amber-300 border border-zinc-700/80 flex items-center space-x-1">
                          <Video className="w-2.5 h-2.5" />
                          <span className="truncate max-w-[130px]">{asset.title}</span>
                        </span>
                      )}

                      {meta?.language_selected && (
                        <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                          {meta.language_selected}
                        </span>
                      )}

                      {meta?.word_count && (
                        <span className="text-zinc-500 font-mono">
                          {meta.word_count}w
                        </span>
                      )}

                      {email.sent_at && (
                        <span className="ml-auto text-purple-400 font-mono flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          {new Date(email.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Full Editor & Asset Reviewer (7 Cols) */}
          <div className="lg:col-span-7">
            {activeEmail ? (
              <div className="p-6 bg-zinc-900/80 border border-zinc-800 rounded-2xl space-y-6 shadow-sm">
                
                {/* Header for Active Email */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-bold text-zinc-100">
                        {activeEmail.lead?.company?.company_name || 'Target Prospect'}
                      </h3>
                      {getStatusPill(activeEmail.status)}
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      To: <span className="text-zinc-200">{activeEmail.contact?.email || activeEmail.lead?.contact?.email || 'big.nssien@gmail.com'}</span>
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Action buttons based on status */}
                    {activeEmail.status === 'approved' || activeEmail.status === 'queued' ? (
                      <button
                        onClick={() => setSendConfirmationEmail(activeEmail)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs shadow-md shadow-amber-500/20 transition"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Now via Gmail</span>
                      </button>
                    ) : activeEmail.status === 'sent' ? (
                      <div className="px-3 py-1.5 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-semibold flex items-center gap-1.5">
                        <MailCheck className="w-3.5 h-3.5" />
                        <span>Dispatched via Gmail</span>
                      </div>
                    ) : null}

                    <button
                      onClick={() => {
                        const l = leads.find(item => item.id === activeEmail.lead_id);
                        if (l) setStudioModalLead(l);
                      }}
                      className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition"
                      title="Open Full Screen Studio"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Creative Asset Grounding Card */}
                {creativeAsset && (
                  <div className="p-3.5 bg-zinc-950/70 border border-zinc-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <Film className="w-4 h-4 text-amber-400" />
                        <span className="font-semibold text-zinc-200">
                          Selected Case Study Asset:
                        </span>
                        <span className="text-amber-300 font-medium">
                          {creativeAsset.title}
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono uppercase">
                        {creativeAsset.category}
                      </span>
                    </div>

                    {creativeAsset.asset_url && (
                      <div className="flex items-center justify-between pt-1 text-[11px] text-zinc-400 border-t border-zinc-800/60">
                        <span className="truncate max-w-[340px] text-zinc-500 font-mono">
                          {creativeAsset.asset_url}
                        </span>
                        <a
                          href={creativeAsset.asset_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-amber-400 hover:underline flex items-center space-x-1 shrink-0 ml-2"
                        >
                          <span>Preview Link</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Subject Line Editor */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-300 flex items-center space-x-1.5">
                      <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Subject Line</span>
                    </label>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {editedSubject.length} chars
                    </span>
                  </div>
                  <input
                    type="text"
                    value={editedSubject}
                    onChange={(e) => setEditedSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-700/80 rounded-xl text-xs font-medium text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Body Editor */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-300">
                      Personalized Message Body
                    </label>
                    <div className="flex items-center space-x-2 text-[10px] font-mono text-zinc-400">
                      <span className={wordCount > 130 ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                        {wordCount} words
                      </span>
                      <span>·</span>
                      <span>{charCount} chars</span>
                    </div>
                  </div>

                  <textarea
                    rows={9}
                    value={editedBody}
                    onChange={(e) => setEditedBody(e.target.value)}
                    className="w-full p-4 bg-zinc-950 border border-zinc-700/80 rounded-xl text-xs leading-relaxed text-zinc-100 focus:outline-none focus:border-amber-500 resize-none font-sans"
                  />
                </div>

                {/* Custom Instruction Box Toggle for Regeneration */}
                <div className="pt-1">
                  {!showInstructions ? (
                    <button
                      type="button"
                      onClick={() => setShowInstructions(true)}
                      className="text-xs text-amber-400 hover:underline flex items-center space-x-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Give instructions to regenerate draft...</span>
                    </button>
                  ) : (
                    <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-medium text-zinc-300">
                          Custom Instructions for Gemini AI Voice
                        </label>
                        <button
                          onClick={() => setShowInstructions(false)}
                          className="text-zinc-500 hover:text-zinc-300 text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                      <input
                        type="text"
                        value={customInstructions}
                        onChange={(e) => setCustomInstructions(e.target.value)}
                        placeholder="e.g. Focus exclusively on the hero packaging rendering; shorten to 65 words"
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleRegenerate(customInstructions)}
                        disabled={isRegenerating}
                        className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold rounded-lg text-xs flex items-center space-x-1.5 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                        <span>{isRegenerating ? 'Synthesizing...' : 'Regenerate Draft'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Inline Rejection Prompt */}
                {showRejectDialog && (
                  <div className="p-4 bg-rose-950/30 border border-rose-900/60 rounded-xl space-y-3">
                    <label className="text-xs font-semibold text-rose-300 block">
                      Specify Rejection Reason (Optional):
                    </label>
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="e.g. Product fit mismatch; angle too aggressive"
                      className="w-full px-3 py-1.5 bg-zinc-950 border border-rose-800/60 rounded text-xs text-zinc-200 focus:outline-none"
                    />
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => setShowRejectDialog(false)}
                        className="px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded text-xs hover:bg-zinc-700"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleRejectConfirm}
                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded text-xs"
                      >
                        Confirm Rejection
                      </button>
                    </div>
                  </div>
                )}

                {/* Actions Toolbar */}
                <div className="pt-3 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium flex items-center space-x-1.5 transition-colors"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopied ? 'Copied' : 'Copy'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRegenerate()}
                      disabled={isRegenerating}
                      className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                      <span>Regenerate</span>
                    </button>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowRejectDialog(true)}
                      className="px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-medium flex items-center space-x-1.5 transition-colors"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveChanges}
                      disabled={isSaving}
                      className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-medium flex items-center space-x-1.5 transition-colors"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleApprove}
                      disabled={activeEmail.status === 'approved'}
                      className="px-4 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>{activeEmail.status === 'approved' ? 'Approved' : 'Approve Draft'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleQueue}
                      disabled={activeEmail.status === 'queued'}
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold text-xs shadow-md shadow-blue-500/20 flex items-center space-x-1.5 transition-all disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{activeEmail.status === 'queued' ? 'Queued' : 'Queue in Outbox'}</span>
                    </button>

                    {(activeEmail.status === 'approved' || activeEmail.status === 'queued') && (
                      <button
                        type="button"
                        onClick={() => setSendConfirmationEmail(activeEmail)}
                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs shadow-md shadow-amber-500/20 flex items-center space-x-1.5 transition-all"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Send Now</span>
                      </button>
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <div className="p-12 text-center bg-zinc-900/40 border border-zinc-800 rounded-xl text-xs text-zinc-400">
                Select an email draft on the left to review and approve.
              </div>
            )}
          </div>

        </div>
      )}

      {/* Full Modal View when requested */}
      {studioModalLead && (
        <EmailPersonalizationModal
          lead={studioModalLead}
          campaign={campaigns.find(c => c.id === studioModalLead.campaign_id)}
          onClose={() => setStudioModalLead(null)}
        />
      )}

      {/* Single Email Send Confirmation Modal */}
      {sendConfirmationEmail && (
        <SendConfirmationModal
          isOpen={Boolean(sendConfirmationEmail)}
          onClose={() => setSendConfirmationEmail(null)}
          email={sendConfirmationEmail}
          onSuccess={() => {
            showToast('Email successfully sent via Gmail!');
          }}
        />
      )}

      {/* Batch Send Modal */}
      <BatchSendModal
        isOpen={isBatchSendModalOpen}
        onClose={() => setIsBatchSendModalOpen(false)}
      />

    </div>
  );
};
