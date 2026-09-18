import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Building2, 
  Globe, 
  ExternalLink, 
  RefreshCw, 
  CheckCircle2, 
  Layers, 
  Target, 
  Palette, 
  Video, 
  Lightbulb, 
  MessageSquare, 
  ShieldCheck,
  Zap,
  Copy,
  Check,
  Share2
} from 'lucide-react';
import { Lead, Company, Campaign, LeadResearch } from '../../types';
import { useCRM } from '../../context/CRMContext';

interface LeadResearchBriefModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  company: Company;
  campaign?: Campaign;
}

export const LeadResearchBriefModal: React.FC<LeadResearchBriefModalProps> = ({
  isOpen,
  onClose,
  lead,
  company,
  campaign,
}) => {
  const { getLeadResearch, researchLead } = useCRM();

  const [research, setResearch] = useState<LeadResearch | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isResearching, setIsResearching] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing research
  useEffect(() => {
    if (isOpen && lead) {
      setIsLoading(true);
      setError(null);
      getLeadResearch(lead.id, lead.campaign_id)
        .then((data) => {
          setResearch(data);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error('Error fetching lead research:', err);
          setError(err.message || 'Failed to load research data');
          setIsLoading(false);
        });
    }
  }, [isOpen, lead, getLeadResearch]);

  // Trigger or Re-trigger Deep Research
  const handleRunResearch = async () => {
    if (!campaign && !lead.campaign_id) return;
    const campaignId = campaign?.id || lead.campaign_id;

    setIsResearching(true);
    setError(null);
    try {
      const data = await researchLead(lead.id, campaignId);
      setResearch(data);
    } catch (err: any) {
      console.error('Failed to execute AI deep research:', err);
      setError(err.message || 'Deep research generation failed.');
    } finally {
      setIsResearching(false);
    }
  };

  const handleCopyPersonalization = () => {
    if (!research) return;
    const text = `Company: ${research.company_name}
Target Product: ${research.products[0] || 'Flagship release'}
Observation: ${research.content_observations}
Opportunity: ${research.potential_animation_opportunity}
Hook Angle: ${research.personalization_angle}`;
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div id="lead-research-brief-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div 
        id="lead-research-brief-container" 
        className="bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-zinc-100 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-semibold text-zinc-100">{company.company_name}</h2>
                {research && (
                  <span className="px-2 py-0.5 text-xs font-mono font-semibold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    {research.research_confidence}% Confidence
                  </span>
                )}
                <span className="px-2 py-0.5 text-xs font-mono rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {lead.status.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                <span>{company.industry || 'Consumer Products'}</span>
                <span>•</span>
                <span>{company.country || 'Worldwide'}</span>
                {company.website && (
                  <>
                    <span>•</span>
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <Globe className="w-3 h-3" />
                      <span>{company.domain}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="rerun-deep-research-btn"
              disabled={isResearching}
              onClick={handleRunResearch}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResearching ? 'animate-spin text-emerald-400' : ''}`} />
              <span>{research ? 'Re-run Deep Research' : 'Run Deep Research'}</span>
            </button>

            <button
              id="close-research-brief-btn"
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-100 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Loading or Researching State */}
          {(isLoading || isResearching) && (
            <div className="py-16 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center mx-auto animate-pulse">
                <Sparkles className="w-8 h-8 text-emerald-400 animate-spin" style={{ animationDuration: '3s' }} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-zinc-100">
                  {isResearching ? 'Synthesizing Qualitative Deep Research...' : 'Loading Research Brief...'}
                </h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  Gemini 3.7 Flash is analyzing {company.company_name}'s branding, product catalog, visual tone, and creative opportunity.
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {!isLoading && !isResearching && error && (
            <div className="p-4 rounded-xl bg-red-950/30 border border-red-900/50 text-red-300 text-sm space-y-2">
              <div className="font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-red-400" /> Research Retrieval Issue
              </div>
              <p className="text-xs text-zinc-300">{error}</p>
              <button
                onClick={handleRunResearch}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-800/60 hover:bg-red-700 text-white transition-colors"
              >
                Retry AI Deep Research
              </button>
            </div>
          )}

          {/* Not Started State */}
          {!isLoading && !isResearching && !research && !error && (
            <div className="py-12 text-center space-y-4 p-8 rounded-xl bg-zinc-900/40 border border-zinc-800">
              <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
                <Lightbulb className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-base font-semibold text-zinc-100">No Qualitative Research Brief Generated Yet</h3>
                <p className="text-xs text-zinc-400">
                  Execute deep research to analyze {company.company_name}'s visual aesthetic, product features, and prepare campaign-specific email personalization hooks.
                </p>
              </div>
              <button
                id="generate-deep-research-btn"
                onClick={handleRunResearch}
                className="px-6 py-2.5 text-sm font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-lg shadow-emerald-500/20 transition-all inline-flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" /> Run AI Deep Research Brief
              </button>
            </div>
          )}

          {/* Completed Research Brief View */}
          {!isLoading && !isResearching && research && (
            <div className="space-y-6">
              {/* Campaign Strategic Alignment Card */}
              <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-400" />
                  <span className="text-zinc-400">Campaign Lens:</span>
                  <span className="font-semibold text-zinc-200">{campaign?.name || 'Active Campaign'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400">Offer Focus:</span>
                  <span className="font-semibold text-emerald-400">{campaign?.offer || '3D Product Animation Teardown'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400">Tone Signal:</span>
                  <span className="font-semibold text-zinc-200">{research.language_signal}</span>
                </div>
              </div>

              {/* 1. Company Overview & Narrative */}
              <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-2">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-zinc-300" /> Company Narrative & Positioning
                </h3>
                <p className="text-sm text-zinc-200 leading-relaxed font-sans">
                  {research.company_overview}
                </p>
                <div className="pt-2 flex flex-wrap gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded bg-zinc-800/80 text-zinc-300 border border-zinc-700">
                    <strong>Audience:</strong> {research.target_audience}
                  </span>
                  <span className="px-2.5 py-1 rounded bg-zinc-800/80 text-zinc-300 border border-zinc-700">
                    <strong>Positioning:</strong> {research.brand_positioning}
                  </span>
                </div>
              </div>

              {/* 2. Key Products Discovered */}
              {research.products && research.products.length > 0 && (
                <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-2">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-zinc-300" /> Flagship Products & Lines
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {research.products.map((prod, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-1.5 rounded-lg bg-emerald-950/30 border border-emerald-800/50 text-emerald-300 text-xs font-medium flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>{prod}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Visual Identity & Creative Observations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-2">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                    <Palette className="w-3.5 h-3.5 text-cyan-400" /> Visual Identity & Style
                  </h3>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {research.visual_style}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-2">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                    <Video className="w-3.5 h-3.5 text-purple-400" /> Marketing & Video Channels
                  </h3>
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {research.marketing_channels.map((chan, i) => (
                      <span key={i} className="px-2 py-0.5 rounded text-[11px] bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {chan}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {research.content_observations}
                  </p>
                </div>
              </div>

              {/* 4. Concrete Animation Opportunity (The Core Creative Hook) */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/30 via-zinc-900 to-zinc-900 border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5" /> High-Conversion Creative Animation Opportunity
                  </h3>
                  <span className="text-[11px] font-mono text-emerald-400/80">Tailored for UI Dani</span>
                </div>
                <p className="text-xs text-zinc-200 leading-relaxed font-sans font-medium">
                  {research.potential_animation_opportunity}
                </p>
              </div>

              {/* 5. Personalization Hook Contract */}
              <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-400" /> Personalization Hook & Opening Angle
                  </h3>
                  <button
                    onClick={handleCopyPersonalization}
                    className="px-2.5 py-1 text-xs font-medium rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy Hook'}</span>
                  </button>
                </div>
                <blockquote className="text-xs italic text-zinc-200 border-l-2 border-emerald-500 pl-3 py-1 bg-zinc-900/50 rounded-r">
                  "{research.personalization_angle}"
                </blockquote>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-900/40 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span>Research Provider: <strong>Gemini 3.7 Flash</strong></span>
            {research?.updated_at && (
              <>
                <span>•</span>
                <span>Updated: {new Date(research.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors"
          >
            Close Brief
          </button>
        </div>
      </div>
    </div>
  );
};
