import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Check, 
  Copy, 
  RefreshCw, 
  ThumbsUp, 
  ThumbsDown, 
  Send, 
  Play, 
  ExternalLink, 
  AlertCircle, 
  CheckCircle2, 
  Globe, 
  Layers, 
  Eye, 
  Edit3, 
  Save, 
  Video, 
  FileText,
  Clock
} from 'lucide-react';
import { Lead, Campaign, EmailMessage, CaseStudy } from '../../types';
import { useCRM } from '../../context/CRMContext';
import { SendConfirmationModal } from '../delivery/SendConfirmationModal';

interface EmailPersonalizationModalProps {
  lead: Lead | null;
  campaign?: Campaign | null;
  onClose: () => void;
}

export const EmailPersonalizationModal: React.FC<EmailPersonalizationModalProps> = ({
  lead,
  campaign,
  onClose,
}) => {
  const { 
    emailMessages, 
    generateEmailForLead, 
    updateEmailMessage, 
    approveEmail, 
    rejectEmail, 
    queueEmail 
  } = useCRM();

  const [existingEmail, setExistingEmail] = useState<EmailMessage | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Editable fields
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [showInstructionInput, setShowInstructionInput] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);

  const activeCampaign = campaign || lead?.campaign;
  const company = lead?.company;
  const contact = lead?.contact || company?.primary_contact;

  useEffect(() => {
    if (!lead) return;
    const found = emailMessages.find(e => e.lead_id === lead.id);
    if (found) {
      setExistingEmail(found);
      setSubject(found.subject);
      setBody(found.body);
    } else {
      setExistingEmail(null);
      setSubject('');
      setBody('');
    }
  }, [lead, emailMessages]);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleGenerate = async (instructions?: string) => {
    if (!lead || !activeCampaign) return;
    setIsGenerating(true);
    setError(null);
    try {
      const generated = await generateEmailForLead(lead.id, activeCampaign.id, instructions || customInstructions);
      setExistingEmail(generated);
      setSubject(generated.subject);
      setBody(generated.body);
      showToast('Personalized email draft generated successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to generate personalized email draft.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!existingEmail) return;
    setIsSaving(true);
    try {
      const updated = await updateEmailMessage(existingEmail.id, {
        subject,
        body,
        personalization_metadata: {
          ...(existingEmail.personalization_metadata || {}),
          final_body: body,
        },
      });
      if (updated) {
        setExistingEmail(updated);
        showToast('Changes saved to draft');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!existingEmail) return;
    try {
      await handleSaveChanges();
      await approveEmail(existingEmail.id);
      showToast('Draft approved by Daniel');
    } catch (err: any) {
      setError(err.message || 'Approval failed.');
    }
  };

  const handleQueue = async () => {
    if (!existingEmail) return;
    try {
      await handleSaveChanges();
      await queueEmail(existingEmail.id);
      showToast('Email queued for outbound review pipeline');
    } catch (err: any) {
      setError(err.message || 'Queueing failed.');
    }
  };

  const handleRejectConfirm = async () => {
    if (!existingEmail) return;
    try {
      await rejectEmail(existingEmail.id, rejectReason || 'Operator rejected draft');
      setShowRejectDialog(false);
      setRejectReason('');
      showToast('Draft marked as rejected');
    } catch (err: any) {
      setError(err.message || 'Rejection failed.');
    }
  };

  const handleCopy = () => {
    const fullText = `Subject: ${subject}\n\n${body}`;
    navigator.clipboard.writeText(fullText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!lead) return null;

  const metadata = existingEmail?.personalization_metadata;
  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;
  const charCount = body.length;
  const creativeAsset = metadata?.creative_used;

  return (
    <div 
      id="email-personalization-modal-overlay"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
    >
      <div 
        id="email-personalization-modal-container"
        className="w-full max-w-5xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-semibold text-zinc-100">AI Cold Email Personalization</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono">
                  UI Dani Voice
                </span>
                {existingEmail && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                    existingEmail.status === 'approved' 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : existingEmail.status === 'queued'
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      : existingEmail.status === 'rejected'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}>
                    {existingEmail.status.toUpperCase()}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">
                Target: <span className="text-zinc-200 font-medium">{company?.company_name}</span> ({contact?.full_name || 'Creative Lead'}) · Campaign: {activeCampaign?.name}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-200 p-2 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notification / Toast Banner */}
        {successToast && (
          <div className="bg-emerald-500/15 border-b border-emerald-500/30 px-6 py-2 flex items-center justify-between text-xs text-emerald-300">
            <span className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{successToast}</span>
            </span>
          </div>
        )}

        {error && (
          <div className="bg-rose-500/15 border-b border-rose-500/30 px-6 py-2.5 flex items-center justify-between text-xs text-rose-300">
            <span className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </span>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-zinc-800">
          
          {/* Left Column: Email Composer & Subject Selector (7 cols) */}
          <div className="lg:col-span-7 p-6 space-y-5">
            
            {/* If no email exists yet, prompt to generate */}
            {!existingEmail && !isGenerating && (
              <div className="p-8 border border-dashed border-zinc-800 rounded-xl text-center space-y-4 bg-zinc-900/30 my-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-zinc-200">Ready to Compose Personalized Draft</h3>
                  <p className="text-xs text-zinc-400 max-w-md mx-auto">
                    The engine will combine campaign offer, verified qualitative research on {company?.company_name}, creative case study links, and adaptive language strategy.
                  </p>
                </div>
                <button
                  onClick={() => handleGenerate()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-semibold text-xs shadow-lg shadow-amber-500/20 inline-flex items-center space-x-2 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Personalized Draft</span>
                </button>
              </div>
            )}

            {/* Generating State */}
            {isGenerating && (
              <div className="p-12 border border-zinc-800 rounded-xl text-center space-y-3 bg-zinc-900/40 animate-pulse my-4">
                <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
                <h3 className="text-sm font-semibold text-zinc-200">Synthesizing Bespoke Email Draft...</h3>
                <p className="text-xs text-zinc-400">
                  Grounding hooks in verified product observations, matching 3D motion case study, and tuning voice.
                </p>
              </div>
            )}

            {/* Existing / Generated Email UI */}
            {existingEmail && (
              <>
                {/* Subject Selector & Editor */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5">
                      <FileText className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Subject Line</span>
                    </label>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {subject.length} characters
                    </span>
                  </div>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter email subject..."
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700/80 rounded-xl text-sm font-medium text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  />

                  {/* Alternative Subject Suggestions */}
                  {metadata?.alternative_subjects && metadata.alternative_subjects.length > 0 && (
                    <div className="pt-1.5 space-y-1.5">
                      <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-400 block">
                        AI Alternative Subject Lines (Click to Apply):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {metadata.alternative_subjects.map((altSub: string, idx: number) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setSubject(altSub)}
                            className={`text-xs px-2.5 py-1 rounded-lg border text-left transition-colors ${
                              subject === altSub
                                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-medium'
                                : 'bg-zinc-900/90 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                            }`}
                          >
                            {altSub}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Email Body Editor */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5">
                      <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Email Content (Daniel Review & Edit)</span>
                    </label>
                    <div className="flex items-center space-x-2 text-[10px] text-zinc-400 font-mono">
                      <span className={wordCount > 130 ? 'text-amber-400' : 'text-emerald-400'}>
                        {wordCount} words
                      </span>
                      <span>·</span>
                      <span>{charCount} chars</span>
                    </div>
                  </div>

                  <textarea
                    rows={11}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Email content..."
                    className="w-full p-4 bg-zinc-900/90 border border-zinc-700/80 rounded-xl text-sm leading-relaxed text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 font-sans resize-none"
                  />
                </div>

                {/* Custom Instruction Toggle */}
                <div className="pt-1">
                  {!showInstructionInput ? (
                    <button
                      type="button"
                      onClick={() => setShowInstructionInput(true)}
                      className="text-xs text-amber-400 hover:underline flex items-center space-x-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Add custom regeneration instructions...</span>
                    </button>
                  ) : (
                    <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-medium text-zinc-400">
                          Custom Instructions for UI Dani Voice
                        </label>
                        <button
                          onClick={() => setShowInstructionInput(false)}
                          className="text-zinc-500 hover:text-zinc-300 text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                      <input
                        type="text"
                        value={customInstructions}
                        onChange={(e) => setCustomInstructions(e.target.value)}
                        placeholder="e.g. Focus heavily on exploded packaging teardown; keep it under 75 words"
                        className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleGenerate(customInstructions)}
                        disabled={isGenerating}
                        className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold rounded text-xs flex items-center space-x-1"
                      >
                        <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
                        <span>Regenerate with Instructions</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

          </div>

          {/* Right Column: Grounding Dossier & Creative Asset Inspector (5 cols) */}
          <div className="lg:col-span-5 p-6 bg-zinc-950/50 space-y-5 overflow-y-auto">
            
            {/* Personalization Quality Score */}
            <div className="p-4 bg-zinc-900/70 rounded-xl border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Personalization Grounding</span>
                </span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {metadata?.personalization_score || 90}/100
                </span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {metadata?.personalization_reason || 'Tailored to verified visual assets and landing page presentation.'}
              </p>
            </div>

            {/* Creative Case Study Referenced */}
            <div className="p-4 bg-zinc-900/70 rounded-xl border border-zinc-800 space-y-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5">
                <Video className="w-3.5 h-3.5 text-purple-400" />
                <span>Creative Asset / Video Referenced</span>
              </span>
              <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800/80 space-y-2">
                <p className="text-xs font-medium text-zinc-200">
                  {creativeAsset?.case_study_name || activeCampaign?.case_study?.name || 'UI Dani 3D Motion Portfolio'}
                </p>
                <div className="flex items-center justify-between text-xs pt-1">
                  <a
                    href={creativeAsset?.video_url || creativeAsset?.portfolio_url || 'https://bignssien.wixstudio.com/uidani'}
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-400 hover:underline flex items-center space-x-1 text-xs truncate max-w-[200px]"
                  >
                    <Play className="w-3 h-3 shrink-0" />
                    <span className="truncate">{creativeAsset?.video_url || 'Watch Video Demo'}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                    Verified Asset
                  </span>
                </div>
              </div>
            </div>

            {/* Specific Grounding Angles */}
            <div className="space-y-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
                Research Grounding Points
              </span>

              {/* Product */}
              <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/60 text-xs space-y-1">
                <span className="text-zinc-400 text-[10px] uppercase tracking-wider block">Featured Product</span>
                <span className="text-zinc-200 font-medium">
                  {metadata?.product_used || company?.company_name}
                </span>
              </div>

              {/* Observation */}
              <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/60 text-xs space-y-1">
                <span className="text-zinc-400 text-[10px] uppercase tracking-wider block">Visual Observation</span>
                <span className="text-zinc-300">
                  {metadata?.observation_used || 'Storefront visual styling and packaging layout.'}
                </span>
              </div>

              {/* Opportunity */}
              <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/60 text-xs space-y-1">
                <span className="text-zinc-400 text-[10px] uppercase tracking-wider block">Motion Design Angle</span>
                <span className="text-zinc-300">
                  {metadata?.opportunity_used || '3D exploded packaging animation for landing page.'}
                </span>
              </div>

              {/* Language Strategy */}
              <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/60 text-xs space-y-1 flex items-center justify-between">
                <div>
                  <span className="text-zinc-400 text-[10px] uppercase tracking-wider block">Language Strategy</span>
                  <span className="text-zinc-200 font-medium">
                    {metadata?.language_selected || activeCampaign?.language_strategy || 'English'}
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {metadata?.language_confidence || 95}% confidence
                </span>
              </div>
            </div>

          </div>

        </div>

        {/* Rejection Reason Modal Inline */}
        {showRejectDialog && (
          <div className="px-6 py-4 bg-rose-950/30 border-t border-rose-900/50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex-1 w-full">
              <label className="text-xs font-semibold text-rose-300 block mb-1">
                Specify Reason for Rejection (Optional):
              </label>
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Tone too formal; angle doesn't fit this specific SKU"
                className="w-full px-3 py-1.5 bg-zinc-900 border border-rose-800/60 rounded text-xs text-zinc-200 focus:outline-none"
              />
            </div>
            <div className="flex items-center space-x-2 self-end sm:self-auto">
              <button
                onClick={() => setShowRejectDialog(false)}
                className="px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded text-xs hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectConfirm}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded text-xs"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            {existingEmail && (
              <>
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
                  onClick={() => handleGenerate()}
                  disabled={isGenerating}
                  className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                  <span>Regenerate</span>
                </button>
              </>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {existingEmail && (
              <>
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
                  className="px-4 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>Approve Draft</span>
                </button>

                <button
                  type="button"
                  onClick={handleQueue}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold text-xs shadow-md shadow-blue-500/20 flex items-center space-x-1.5 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Queue for Outbox</span>
                </button>

                {(existingEmail?.status === 'approved' || existingEmail?.status === 'queued') && (
                  <button
                    type="button"
                    onClick={() => setShowSendModal(true)}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs shadow-md shadow-amber-500/20 flex items-center space-x-1.5 transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send via Gmail</span>
                  </button>
                )}
              </>
            )}

            {!existingEmail && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium"
              >
                Close
              </button>
            )}
          </div>
        </div>

        {/* Send Confirmation Modal */}
        {showSendModal && existingEmail && (
          <SendConfirmationModal
            isOpen={showSendModal}
            onClose={() => {
              setShowSendModal(false);
              onClose();
            }}
            email={existingEmail}
            onSuccess={() => {
              setSuccessToast('Email sent via Gmail!');
            }}
          />
        )}

      </div>
    </div>
  );
};

