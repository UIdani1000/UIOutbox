import React, { useState, useEffect } from 'react';
import { X, Send, Sparkles, Layers, Info, Check, AlertCircle } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { Campaign, LanguageStrategy, CampaignStatus } from '../../types';
import { isValidUuid } from '../../services/crmService';

interface CampaignBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (campaign: Campaign) => void;
}

export const CampaignBuilderModal: React.FC<CampaignBuilderModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const { caseStudies, followUpSequences, createCampaign } = useCRM();

  const [name, setName] = useState('');
  const [niche, setNiche] = useState('D2C Cosmetics & Skincare');
  const [offer, setOffer] = useState('Product Ad Video Animation');
  const [targetMarket, setTargetMarket] = useState('Worldwide');
  const [targetCompanyType, setTargetCompanyType] = useState('Consumer product brands with physical packaging');
  const [dailyTarget, setDailyTarget] = useState<number>(50);
  const [languageStrategy, setLanguageStrategy] = useState<LanguageStrategy>('Adaptive');
  const [caseStudyId, setCaseStudyId] = useState<string>('');
  const [followUpSequenceId, setFollowUpSequenceId] = useState<string>('');
  const [automatedFollowUps, setAutomatedFollowUps] = useState<boolean>(true);
  const [status, setStatus] = useState<CampaignStatus>('draft');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize defaults on open or when sequences/caseStudies load
  useEffect(() => {
    if (isOpen) {
      if (!name) {
        setName('Beauty Product Animation — ' + new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      }
      setErrorMessage(null);
    }
  }, [isOpen]);

  // Set sequence from database records when available
  useEffect(() => {
    if (followUpSequences.length > 0 && !followUpSequenceId) {
      const defaultSeq = followUpSequences.find(s => 
        s.name.toLowerCase().includes('standard') || s.status === 'active'
      ) || followUpSequences[0];
      
      if (defaultSeq && isValidUuid(defaultSeq.id)) {
        setFollowUpSequenceId(defaultSeq.id);
      }
    }
  }, [followUpSequences, followUpSequenceId]);

  // Set case study from database records when available
  useEffect(() => {
    if (caseStudies.length > 0 && !caseStudyId) {
      const activeCs = caseStudies.find(cs => cs.status === 'active') || caseStudies[0];
      if (activeCs) {
        setCaseStudyId(activeCs.id);
      }
    }
  }, [caseStudies, caseStudyId]);

  if (!isOpen) return null;

  const handleSave = async (andContinue = false) => {
    if (!name.trim()) {
      setErrorMessage('Campaign name is required');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const created = await createCampaign({
        name: name.trim(),
        niche: niche.trim(),
        offer: offer.trim(),
        target_market: targetMarket.trim(),
        target_company_type: targetCompanyType.trim(),
        daily_target: Number(dailyTarget) || 50,
        language_strategy: languageStrategy,
        case_study_id: caseStudyId || undefined,
        follow_up_sequence_id: followUpSequenceId || undefined,
        automated_follow_ups: automatedFollowUps,
        status: andContinue ? 'ready' : status,
      });

      if (onSaved) {
        onSaved(created);
      }
      onClose();
    } catch (err: any) {
      console.error('Failed to create campaign:', err);
      setErrorMessage(err?.message || 'Failed to save campaign to database. Please check connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      id="campaign-builder-modal-overlay"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <div 
        id="campaign-builder-modal-container"
        className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col my-8"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100">Create Outreach Campaign</h2>
              <p className="text-xs text-zinc-400">Define your niche, offer, creative asset, and daily prospect target</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-red-950/50 border border-red-800/80 rounded-lg flex items-center space-x-2 text-xs text-red-200">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Campaign Name */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Campaign Name <span className="text-amber-400">*</span>
            </label>
            <input
              id="campaign-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Beauty Product Animation — Aug 19"
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-amber-500/80"
              required
            />
          </div>

          {/* Niche & Offer Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Target Niche
              </label>
              <input
                id="campaign-niche-input"
                type="text"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="e.g. D2C Cosmetics, SaaS, 3D Brand Design"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-amber-500/80"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Creative Offer
              </label>
              <input
                id="campaign-offer-input"
                type="text"
                value={offer}
                onChange={(e) => setOffer(e.target.value)}
                placeholder="e.g. Product Ad Video Animation"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-amber-500/80"
              />
            </div>
          </div>

          {/* Target Market & Company Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Target Market
              </label>
              <input
                id="campaign-market-input"
                type="text"
                value={targetMarket}
                onChange={(e) => setTargetMarket(e.target.value)}
                placeholder="e.g. Worldwide, US, Europe"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-amber-500/80"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Target Company Type
              </label>
              <input
                id="campaign-company-type-input"
                type="text"
                value={targetCompanyType}
                onChange={(e) => setTargetCompanyType(e.target.value)}
                placeholder="e.g. Consumer product brands"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-amber-500/80"
              />
            </div>
          </div>

          {/* Daily Target & Language Strategy */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Daily Prospect Target
              </label>
              <input
                id="campaign-daily-target-input"
                type="number"
                min="5"
                max="500"
                value={dailyTarget}
                onChange={(e) => setDailyTarget(Number(e.target.value))}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-amber-500/80"
              />
              <span className="text-[11px] text-zinc-400 mt-1 block">Default: 50 prospects per day</span>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Language Strategy
              </label>
              <select
                id="campaign-language-strategy-select"
                value={languageStrategy}
                onChange={(e) => setLanguageStrategy(e.target.value as LanguageStrategy)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-100 focus:outline-none focus:border-amber-500/80"
              >
                <option value="Adaptive">Adaptive (Match Prospect Language)</option>
                <option value="English">English</option>
                <option value="French">French</option>
                <option value="Spanish">Spanish</option>
                <option value="German">German</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Case Study & Follow-up Sequence Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-zinc-800/80">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center justify-between">
                <span>Associated Case Study</span>
                <span className="text-[11px] text-amber-400/90 font-normal">Video & Portfolio Asset</span>
              </label>
              <select
                id="campaign-case-study-select"
                value={caseStudyId}
                onChange={(e) => setCaseStudyId(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-100 focus:outline-none focus:border-amber-500/80"
              >
                <option value="">-- Select or link later --</option>
                {caseStudies.map((cs) => (
                  <option key={cs.id} value={cs.id}>
                    {cs.name} ({cs.niche})
                  </option>
                ))}
              </select>
              {caseStudies.length === 0 && (
                <p className="text-[11px] text-zinc-400 mt-1">
                  Tip: You can add case study videos in the Case Studies tab anytime.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center justify-between">
                <span>Follow-up Sequence</span>
                <span className="text-[11px] text-zinc-400 font-normal">Multi-step cadence</span>
              </label>
              <select
                id="campaign-sequence-select"
                value={followUpSequenceId}
                onChange={(e) => setFollowUpSequenceId(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-100 focus:outline-none focus:border-amber-500/80"
              >
                <option value="">-- No sequence / Select later --</option>
                {followUpSequences.map((seq) => (
                  <option key={seq.id} value={seq.id}>
                    {seq.name} ({seq.steps?.length || 4} steps)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Build 06: Automated Follow-Up Sequences Option */}
          <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <label htmlFor="campaign-automated-follow-ups-toggle" className="text-xs font-semibold text-zinc-200 cursor-pointer flex items-center space-x-1.5">
                <span>Automated Follow-Up Sequences (Day 3, 7, 14)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">Build 06</span>
              </label>
              <p className="text-[11px] text-zinc-400">
                Automatically schedule non-spammy follow-ups after initial send and instantly halt sequence upon prospect reply.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                id="campaign-automated-follow-ups-toggle"
                type="checkbox"
                checked={automatedFollowUps}
                onChange={(e) => setAutomatedFollowUps(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          {/* Informational Callout */}
          <div className="p-3 bg-zinc-950/80 rounded-lg border border-zinc-800/80 flex items-start space-x-2.5 text-xs text-zinc-400">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p>
              Sourcing pipelines are decoupled in UIOutbox. Saving this campaign creates your target parameters and establishes the relationship layer for lead qualification and personalized email generation.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950/70 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            id="btn-save-campaign"
            type="button"
            disabled={isSubmitting || !name.trim()}
            onClick={() => handleSave(false)}
            className="px-4 py-2 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save Campaign'}
          </button>
          <button
            id="btn-save-and-continue-campaign"
            type="button"
            disabled={isSubmitting || !name.trim()}
            onClick={() => handleSave(true)}
            className="px-4 py-2 rounded-md text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-zinc-950 transition-colors shadow-sm disabled:opacity-50 flex items-center space-x-1.5"
          >
            <span>{isSubmitting ? 'Saving...' : 'Save & Continue'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
