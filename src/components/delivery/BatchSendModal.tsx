import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ShieldCheck, 
  Square,
  Building,
  UserCheck
} from 'lucide-react';
import { useCRM } from '../../context/CRMContext';

interface BatchSendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BatchSendModal: React.FC<BatchSendModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { batchProgress, abortBatchSending, deliverySettings, gmailStatus } = useCRM();

  if (!isOpen || !batchProgress) return null;

  const percent = batchProgress.total > 0 
    ? Math.round((batchProgress.current / batchProgress.total) * 100) 
    : 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/60">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-zinc-100">
                  Gmail Batch Delivery Dispatcher
                </h3>
                <p className="text-xs text-zinc-400">
                  Sender: <span className="text-amber-400 font-medium">{gmailStatus.email || 'big.nssien@gmail.com'}</span> • Rate-limited queue
                </p>
              </div>
            </div>
            {!batchProgress.isSending && (
              <button
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-5">
            {/* Progress Card */}
            <div className="p-4 bg-zinc-950/80 border border-zinc-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {batchProgress.isSending ? (
                    <div className="flex items-center gap-2 text-amber-400 font-medium">
                      <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                      <span>Dispatching Email {batchProgress.current} of {batchProgress.total}...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Batch Dispatch Completed</span>
                    </div>
                  )}
                </div>
                <span className="text-zinc-400 font-mono text-xs">{percent}%</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2.5 bg-zinc-800/80 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Status Stats */}
              <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
                <div className="p-2 bg-zinc-900/60 border border-zinc-800/60 rounded-lg">
                  <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Success</span>
                  <span className="text-emerald-400 font-bold text-sm">{batchProgress.successCount}</span>
                </div>
                <div className="p-2 bg-zinc-900/60 border border-zinc-800/60 rounded-lg">
                  <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Failed</span>
                  <span className="text-red-400 font-bold text-sm">{batchProgress.failedCount}</span>
                </div>
                <div className="p-2 bg-zinc-900/60 border border-zinc-800/60 rounded-lg">
                  <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Remaining</span>
                  <span className="text-zinc-300 font-bold text-sm">
                    {Math.max(0, batchProgress.total - batchProgress.current)}
                  </span>
                </div>
              </div>
            </div>

            {/* Active Sending Feedback & Rate Limit Cooldown */}
            {batchProgress.isSending && (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-zinc-200">
                    <Building className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-semibold">{batchProgress.currentLeadName || 'Prospect'}</span>
                    <span className="text-zinc-400">({batchProgress.currentRecipient || ''})</span>
                  </div>
                  {batchProgress.countdownSeconds > 0 && (
                    <div className="flex items-center gap-1.5 text-amber-400 font-medium">
                      <Clock className="w-3.5 h-3.5 animate-pulse" />
                      <span>Cooldown: {batchProgress.countdownSeconds}s</span>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400">
                  Enforcing controlled delay ({deliverySettings.delayBetweenSendsSec}s) between dispatches to maintain mailbox reputation and prevent spam filters.
                </p>
              </div>
            )}

            {/* Live Logs */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
                Dispatch History ({batchProgress.logs.length})
              </span>
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {batchProgress.logs.length === 0 ? (
                  <div className="p-4 text-center text-xs text-zinc-500 bg-zinc-950/40 rounded-xl border border-zinc-800/40">
                    Starting dispatch pipeline...
                  </div>
                ) : (
                  batchProgress.logs.map(log => (
                    <div
                      key={log.id}
                      className="p-2.5 bg-zinc-950/60 border border-zinc-800/70 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        {log.status === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        ) : log.status === 'failed' ? (
                          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                        )}
                        <span className="text-zinc-200 font-medium">{log.leadName}</span>
                        {log.recipient && (
                          <span className="text-zinc-500 text-[11px]">({log.recipient})</span>
                        )}
                      </div>
                      <span className="text-zinc-400 text-[11px] font-mono">
                        {log.message || log.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-950/60">
            {batchProgress.isSending ? (
              <>
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Approved emails dispatching via Gmail</span>
                </div>
                <button
                  onClick={abortBatchSending}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold rounded-xl transition"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Stop Batch Dispatch</span>
                </button>
              </>
            ) : (
              <div className="w-full flex items-center justify-between">
                <div className="text-xs text-zinc-400 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span>Finished {batchProgress.successCount} of {batchProgress.total} emails</span>
                </div>
                <button
                  onClick={onClose}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs rounded-xl transition shadow-lg shadow-amber-500/20"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
