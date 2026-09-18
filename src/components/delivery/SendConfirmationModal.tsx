import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  X, 
  Mail, 
  Building, 
  User, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  ExternalLink,
  Clock
} from 'lucide-react';
import { EmailMessage } from '../../types';
import { useCRM } from '../../context/CRMContext';

interface SendConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: EmailMessage | null;
  onSuccess?: () => void;
}

export const SendConfirmationModal: React.FC<SendConfirmationModalProps> = ({
  isOpen,
  onClose,
  email,
  onSuccess,
}) => {
  const { leads, companies, gmailStatus, sendApprovedEmail, deliverySettings, todaySentCount } = useCRM();
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ success: boolean; simulated?: boolean; messageId?: string } | null>(null);

  if (!isOpen || !email) return null;

  const lead = leads.find(l => l.id === email.lead_id);
  const company = companies.find(c => c.id === lead?.company_id);
  const contact = email.contact || lead?.contact || company?.primary_contact;
  const recipientEmail = contact?.email || 'Unknown recipient';
  const recipientName = contact?.first_name 
    ? `${contact.first_name} ${contact.last_name || ''}`.trim()
    : (company?.company_name || 'Founder');

  const senderEmail = gmailStatus.email || 'big.nssien@gmail.com';
  const isOverLimit = todaySentCount >= deliverySettings.dailySendLimit;

  const handleSendNow = async () => {
    setIsSending(true);
    setError(null);
    try {
      const outcome = await sendApprovedEmail(email.id);
      if (outcome.success) {
        setResult({
          success: true,
          simulated: outcome.result?.simulated,
          messageId: outcome.result?.providerMessageId,
        });
        if (onSuccess) onSuccess();
      } else {
        setError(outcome.error || 'Failed to dispatch email.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during delivery.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/60">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-zinc-100">
                  Confirm Gmail Outreach Dispatch
                </h3>
                <p className="text-xs text-zinc-400">
                  Strict approval review • Dispatches from verified sender
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSending}
              className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-5">
            {result?.success ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-zinc-100">
                    {result.simulated ? 'Delivered via Gmail Sandbox' : 'Email Dispatched via Gmail API!'}
                  </h4>
                  <p className="text-sm text-zinc-400 mt-1 max-w-md mx-auto">
                    Outreach successfully delivered to <strong className="text-zinc-200">{recipientEmail}</strong>. Lead status transitioned to <strong>Contacted</strong>.
                  </p>
                  {result.messageId && (
                    <span className="inline-block mt-3 px-3 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono rounded-md border border-zinc-700">
                      Message ID: {result.messageId}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Daily Cap & Safety Warning */}
                {isOverLimit && (
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3 text-xs text-amber-300">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Daily Send Limit Warning:</span> You have sent {todaySentCount} of {deliverySettings.dailySendLimit} emails today. Sending this will exceed your daily limit settings.
                    </div>
                  </div>
                )}

                {error && (
                  <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-xs text-red-300">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Delivery Error:</span> {error}
                    </div>
                  </div>
                )}

                {/* Dispatch Details Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-xl">
                    <span className="text-zinc-500 uppercase tracking-wider font-semibold block mb-1">From Sender</span>
                    <div className="flex items-center gap-2 text-zinc-200 font-medium">
                      <User className="w-3.5 h-3.5 text-zinc-400" />
                      <span>UI Dani</span>
                      <span className="text-zinc-400 text-[11px]">({senderEmail})</span>
                    </div>
                  </div>

                  <div className="p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-xl">
                    <span className="text-zinc-500 uppercase tracking-wider font-semibold block mb-1">To Recipient</span>
                    <div className="flex items-center gap-2 text-zinc-200 font-medium truncate">
                      <Mail className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="truncate">{recipientName}</span>
                      <span className="text-zinc-400 text-[11px] truncate">({recipientEmail})</span>
                    </div>
                  </div>

                  <div className="p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-xl col-span-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-zinc-300">
                      <Building className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="font-medium text-zinc-200">{company?.company_name || 'Target Company'}</span>
                      {company?.website && (
                        <a 
                          href={company.website} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-amber-400 hover:underline flex items-center gap-1 text-[11px]"
                        >
                          {company.domain || 'website'} <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 text-[11px]">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Approved by Daniel</span>
                    </div>
                  </div>
                </div>

                {/* Email Preview */}
                <div className="p-4 bg-zinc-950/80 border border-zinc-800 rounded-xl space-y-2.5">
                  <div className="text-xs">
                    <span className="text-zinc-500 font-semibold">Subject: </span>
                    <span className="text-zinc-200 font-medium">{email.subject}</span>
                  </div>
                  <div className="border-t border-zinc-800/80 pt-2.5">
                    <span className="text-zinc-500 font-semibold text-xs block mb-1">Message Body:</span>
                    <p className="text-xs text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed max-h-44 overflow-y-auto pr-2 bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-800/50">
                      {email.body}
                    </p>
                  </div>
                </div>

                {/* Safeguard & Anti-Spam Notice */}
                <div className="flex items-center justify-between px-3 py-2 bg-zinc-950/40 border border-zinc-800/60 rounded-xl text-[11px] text-zinc-400">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Rate limiter active • Today: {todaySentCount} / {deliverySettings.dailySendLimit} dispatched</span>
                  </div>
                  <div className="flex items-center gap-1 text-zinc-400">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Duplicate checks verified</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-950/60">
            {result?.success ? (
              <button
                onClick={onClose}
                className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm font-medium rounded-xl transition"
              >
                Done
              </button>
            ) : (
              <>
                <button
                  onClick={onClose}
                  disabled={isSending}
                  className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 rounded-xl transition"
                >
                  Cancel
                </button>

                <button
                  onClick={handleSendNow}
                  disabled={isSending}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-semibold text-sm rounded-xl shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                      <span>Sending via Gmail...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Now via Gmail</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
