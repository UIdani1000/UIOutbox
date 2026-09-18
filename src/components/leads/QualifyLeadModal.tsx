import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, XCircle, RotateCcw, Target, Sparkles, Building2, BookOpen } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { Lead } from '../../types';

interface QualifyLeadModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenResearchBrief?: (lead: Lead) => void;
}

export const QualifyLeadModal: React.FC<QualifyLeadModalProps> = ({
  lead,
  isOpen,
  onClose,
  onOpenResearchBrief,
}) => {
  const { qualifyLead, rejectLead, updateLeadStatus } = useCRM();

  const [score, setScore] = useState<number>(85);
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (lead) {
      setScore(lead.qualification_score || 85);
      setReason(lead.qualification_reason || '');
    }
  }, [lead]);

  if (!isOpen || !lead) return null;

  const handleQualify = async () => {
    setIsSubmitting(true);
    try {
      await qualifyLead(
        lead.id, 
        score, 
        reason.trim() || 'Qualified: Matches creative ICP and store presence.'
      );
      onClose();
    } catch (e) {
      console.error('Failed to qualify lead:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    try {
      await rejectLead(
        lead.id, 
        reason.trim() || 'Rejected: Does not meet target criteria.'
      );
      onClose();
    } catch (e) {
      console.error('Failed to reject lead:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = async () => {
    setIsSubmitting(true);
    try {
      await updateLeadStatus(lead.id, 'new', 'Reset to new prospect status');
      onClose();
    } catch (e) {
      console.error('Failed to reset lead:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      id="qualify-lead-modal-overlay"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <div 
        id="qualify-lead-modal-container"
        className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col my-8"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100">Lead Qualification Decision</h2>
              <p className="text-xs text-zinc-400">Evaluate prospect fit against campaign parameters</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lead Context Summary */}
        <div className="p-6 space-y-5">
          <div className="p-3.5 bg-zinc-950/80 rounded-lg border border-zinc-800 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">
                  {lead.company?.company_name || 'Unnamed Company'}
                </h3>
                <span className="text-xs text-zinc-400 font-mono">
                  {lead.company?.domain || lead.company?.website || 'No domain'}
                </span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-medium capitalize">
                Status: {lead.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400 pt-1">
              <div>
                <span className="text-zinc-400 block text-[11px]">Niche / Industry</span>
                <span className="text-zinc-200">{lead.company?.industry || 'Design / Creative'}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[11px]">Decision Maker</span>
                <span className="text-zinc-200">{lead.contact?.full_name || 'Not assigned'} ({lead.contact?.job_title || 'N/A'})</span>
              </div>
            </div>

            {onOpenResearchBrief && (
              <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                <span className="text-[11px] text-zinc-400">
                  {lead.research_status === 'completed' ? 'Research Brief Available' : 'Needs Qualitative Research'}
                </span>
                <button
                  type="button"
                  onClick={() => onOpenResearchBrief(lead)}
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{lead.research_status === 'completed' ? 'View Brief' : 'Run Deep Research'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Qualification Score Slider */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-zinc-300">
                Qualification Score (0 - 100)
              </label>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                score >= 70 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                  : score >= 40 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                {score}/100
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
            <div className="flex justify-between text-[10px] text-zinc-400 mt-1">
              <span>0 (Poor Fit)</span>
              <span>50 (Moderate)</span>
              <span>85 (Strong ICP)</span>
              <span>100 (Perfect Match)</span>
            </div>
          </div>

          {/* Qualification Notes / Reason */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Qualification Reason & Observations
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Has strong packaging design on store, active D2C presence, matches 3D ad video pitch..."
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-xs text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-amber-500/80 resize-none"
            />
          </div>

          {/* Decision Buttons */}
          <div className="pt-3 border-t border-zinc-800 space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleQualify}
                className="flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition-colors shadow-sm disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark as Qualified</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleReject}
                className="flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-semibold text-xs transition-colors disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject Prospect</span>
              </button>
            </div>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleReset}
              className="w-full flex items-center justify-center space-x-2 py-1.5 px-3 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 text-xs transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Unreviewed (New)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
