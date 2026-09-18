import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Send, 
  AlertCircle, 
  CheckCircle2, 
  Building2, 
  User, 
  Mail,
  Zap
} from 'lucide-react';
import { Lead } from '../../types';

interface SimulateReplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
  selectedLeadId?: string;
  onSimulate: (leadId: string, options: { fromName?: string; email?: string; subject?: string; replyText: string }) => Promise<void>;
}

const PRESET_SCENARIOS = [
  {
    id: 'interested_teardown',
    label: 'Interested — Loves 3D / Wants Teardown',
    classification: 'interested',
    subject: 'Re: Quick UI teardown for your web app',
    text: `Hey Daniel,\n\nThanks for reaching out. Checked out your portfolio on Wix Studio—the 3D interactions and micro-animations look super crisp.\n\nWe are actually in the middle of redesigning our onboarding flow and would love to see a 45-second Loom teardown. What's your turnaround time and ballpark pricing for a 2-week sprint?\n\nBest,\nAlex`
  },
  {
    id: 'meeting_request',
    label: 'Meeting Request — Let\'s schedule a call',
    classification: 'meeting_request',
    subject: 'Re: Quick UI question',
    text: `Hi Daniel,\n\nTimely note—we were just discussing our product UI bottleneck yesterday. Are you free for a quick 15-min call this Thursday at 2pm EST to see if there's a fit? Send over your booking link or calendar invite.\n\nCheers,\nSarah`
  },
  {
    id: 'question_pricing',
    label: 'Question — Tech Stack & Pricing',
    classification: 'question',
    subject: 'Re: UI design & 3D assets',
    text: `Hey Daniel,\n\nDo you also handle the frontend implementation in React/Three.js or only design in Figma? Also, what is your standard engagement model?\n\nThanks,\nMichael`
  },
  {
    id: 'objection_inhouse',
    label: 'Objection — Already have in-house team',
    classification: 'objection',
    subject: 'Re: UI design support',
    text: `Hi Daniel,\n\nAppreciate the email. We currently have a full-time in-house design team handling our platform, so we don't have an immediate need. Feel free to check back in Q3.\n\nBest regards,\nDavid`
  },
  {
    id: 'ooo',
    label: 'Out of Office Responder',
    classification: 'out_of_office',
    subject: 'Automatic reply: Out of office until next Monday',
    text: `Thank you for your email. I am currently out of the office with limited access to email until Monday. For urgent matters, please contact support@company.com.\n\nRegards,\nJessica`
  },
  {
    id: 'not_interested',
    label: 'Not Interested / Unsubscribe',
    classification: 'not_interested',
    subject: 'Re: Quick UI teardown',
    text: `Please remove our company from your outreach list. Not interested at this time.`
  }
];

export const SimulateReplyModal: React.FC<SimulateReplyModalProps> = ({
  isOpen,
  onClose,
  leads,
  selectedLeadId: initialLeadId,
  onSimulate
}) => {
  const [selectedLeadId, setSelectedLeadId] = useState<string>(initialLeadId || (leads[0]?.id || ''));
  const [selectedScenario, setSelectedScenario] = useState<string>(PRESET_SCENARIOS[0].id);
  const [fromName, setFromName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [subject, setSubject] = useState<string>(PRESET_SCENARIOS[0].subject);
  const [replyText, setReplyText] = useState<string>(PRESET_SCENARIOS[0].text);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleScenarioChange = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    const scenario = PRESET_SCENARIOS.find(s => s.id === scenarioId);
    if (scenario) {
      setSubject(scenario.subject);
      setReplyText(scenario.text);
    }
  };

  const handleLeadChange = (leadId: string) => {
    setSelectedLeadId(leadId);
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      setFromName(lead.contact?.full_name || '');
      setEmail(lead.contact?.email || '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadId || !replyText.trim()) return;

    setIsSubmitting(true);
    try {
      await onSimulate(selectedLeadId, {
        fromName: fromName || undefined,
        email: email || undefined,
        subject: subject || undefined,
        replyText: replyText.trim()
      });
      onClose();
    } catch (err) {
      console.error('Error simulating reply:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentLead = leads.find(l => l.id === selectedLeadId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        id="simulate-reply-modal"
        className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="p-4 px-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100">Simulate Inbound Prospect Reply</h2>
              <p className="text-[11px] text-zinc-400">
                Test AI classification, objection detection, response drafting, and stop-on-reply safety
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Target Lead Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Select Target Prospect</label>
            <select
              id="simulate-lead-select"
              value={selectedLeadId}
              onChange={(e) => handleLeadChange(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-amber-500/50"
            >
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.company?.company_name} — {l.contact?.full_name || 'No Contact'} ({l.contact?.email || 'No email'}) [{l.status}]
                </option>
              ))}
            </select>
            {currentLead && (
              <div className="flex items-center space-x-3 text-[11px] text-zinc-400 bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/80">
                <span className="flex items-center space-x-1">
                  <Building2 className="w-3.5 h-3.5 text-zinc-500" />
                  <strong className="text-zinc-300">{currentLead.company?.company_name}</strong>
                </span>
                <span>•</span>
                <span className="flex items-center space-x-1">
                  <User className="w-3.5 h-3.5 text-zinc-500" />
                  <span>{currentLead.contact?.full_name || 'Alex'}</span>
                </span>
                <span>•</span>
                <span className="flex items-center space-x-1">
                  <Mail className="w-3.5 h-3.5 text-zinc-500" />
                  <span>{currentLead.contact?.email || 'contact@domain.com'}</span>
                </span>
              </div>
            )}
          </div>

          {/* Preset Scenario Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Preset Reply Scenario</label>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_SCENARIOS.map((scenario) => {
                const isSelected = selectedScenario === scenario.id;
                return (
                  <button
                    key={scenario.id}
                    type="button"
                    onClick={() => handleScenarioChange(scenario.id)}
                    className={`p-2.5 text-left rounded-lg border transition-all text-xs flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-200 shadow-sm'
                        : 'bg-zinc-900/70 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <span className="font-medium truncate">{scenario.label}</span>
                    <span className="text-[10px] text-zinc-500 font-mono mt-1 capitalize">
                      Type: {scenario.classification.replace('_', ' ')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Email Subject */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Reply Subject</label>
            <input
              id="simulate-reply-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Re: ..."
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {/* Email Body */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Inbound Reply Content</label>
            <textarea
              id="simulate-reply-body"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={6}
              placeholder="Type prospect message..."
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 font-mono focus:outline-none focus:border-amber-500/50 leading-relaxed"
            />
          </div>

          {/* Safety Notice */}
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-start space-x-2 text-[11px] text-blue-300">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />
            <p>
              Simulating this reply will immediately halt any active automated follow-up sequence for this prospect, log the reply in the conversation thread, run AI sentiment classification, and generate a draft response for your approval.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end space-x-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
            >
              Cancel
            </button>
            <button
              id="btn-confirm-simulate-reply"
              type="submit"
              disabled={isSubmitting || !selectedLeadId || !replyText.trim()}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-zinc-950 text-xs font-bold rounded-lg transition-all flex items-center space-x-2 shadow-sm"
            >
              {isSubmitting ? (
                <span>Analyzing Reply...</span>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Inject & Analyze Reply</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
