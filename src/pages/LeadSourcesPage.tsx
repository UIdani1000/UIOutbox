import React, { useState } from 'react';
import { 
  Sparkles, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Database,
  ArrowRight,
  ShieldCheck,
  Building2,
  Clock,
  Plus,
  Zap,
  RotateCw,
  Search
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { NavigationPage } from '../components/layout/Sidebar';
import { CsvImportModal } from '../components/leads/CsvImportModal';
import { AddCompanyModal } from '../components/leads/AddCompanyModal';
import { AIDiscoveryModal } from '../components/discovery/AIDiscoveryModal';
import { parseCsvString, detectColumnMapping, convertRowsToPayloads } from '../lib/csvParser';
import { LeadSourceManager, SourcingResult } from '../services/leadSourceManager';

interface LeadSourcesPageProps {
  onNavigate: (page: NavigationPage) => void;
}

export const LeadSourcesPage: React.FC<LeadSourcesPageProps> = ({ onNavigate }) => {
  const { campaigns, activeCampaignId, setActiveCampaignId, refreshData, activities } = useCRM();
  
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(activeCampaignId || campaigns[0]?.id || '');
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
  const [isAIDiscoveryOpen, setIsAIDiscoveryOpen] = useState(false);

  // Quick In-Page CSV Engine
  const [csvContent, setCsvContent] = useState<string>('');
  const [isParsing, setIsParsing] = useState(false);
  const [quickResult, setQuickResult] = useState<SourcingResult | null>(null);

  const activeCampaign = campaigns.find((c) => c.id === selectedCampaignId) || campaigns[0];

  const handleSampleCsv = () => {
    const sample = `Company,Domain,Contact Name,Job Title,Email,Industry,Country
Glow Botanics,glowbotanics.com,Elena Vance,Head of Brand Marketing,elena@glowbotanics.com,D2C Cosmetics,USA
Aether Labs,aetherlabs.io,Marcus Thorne,Product VP,marcus@aetherlabs.io,Consumer Tech,United Kingdom
Nova Skincare,novaskincare.co,Sophia Lin,Creative Director,sophia@novaskincare.co,Luxury Beauty,Canada
Orbit Audio,orbitaudio.design,James Miller,Head of Design,james@orbitaudio.design,Hardware,Germany
Lumina Fashion,luminafashion.com,Claire Dupont,Ecommerce Director,claire@luminafashion.com,Apparel & Fashion,France`;
    
    setCsvContent(sample);
    setQuickResult(null);
  };

  const handleExecuteQuickCsv = async () => {
    if (!activeCampaign) {
      alert('Please select a target campaign first.');
      return;
    }
    if (!csvContent.trim()) return;

    setIsParsing(true);
    try {
      const { headers, rows } = parseCsvString(csvContent);
      const mapping = detectColumnMapping(headers);
      const payloads = convertRowsToPayloads(rows, mapping);

      const result = await LeadSourceManager.ingestSourcedLeads(
        activeCampaign.id,
        payloads,
        75,
        'Quick CSV Ingestion Engine'
      );

      setQuickResult(result);
      await refreshData();
    } catch (e: any) {
      console.error('Quick CSV ingestion failed:', e);
      alert(`Import error: ${e.message || e}`);
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setCsvContent(text);
        setQuickResult(null);
      };
      reader.readAsText(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setCsvContent(text);
        setQuickResult(null);
      };
      reader.readAsText(file);
    }
  };

  const sourcingActivities = activities.filter((a) => 
    a.activity_type.includes('import') || a.activity_type.includes('company') || a.activity_type.includes('sourced')
  );

  return (
    <div id="lead-sources-page" className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">Lead Sources & Prospect Ingestion</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Ingest prospect companies and decision makers with automated domain deduplication into your target campaign
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            id="launch-ai-discovery-header-btn"
            onClick={() => setIsAIDiscoveryOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold text-xs border border-emerald-500/40 transition-colors shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>AI Prospect Discovery</span>
          </button>

          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-medium text-xs border border-zinc-800 transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-zinc-300" />
            <span>CSV Wizard</span>
          </button>

          <button
            onClick={() => setIsAddCompanyOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 font-semibold text-xs transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Single</span>
          </button>
        </div>
      </div>

      {/* Target Campaign Selector Banner */}
      <div className="p-4 bg-zinc-900/70 border border-zinc-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs text-zinc-400 block">Target Sourcing Destination:</span>
            <div className="flex items-center space-x-2 mt-0.5">
              <select
                value={selectedCampaignId}
                onChange={(e) => {
                  setSelectedCampaignId(e.target.value);
                  setActiveCampaignId(e.target.value);
                }}
                className="bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1 text-xs font-semibold text-zinc-100 focus:outline-none focus:border-amber-500"
              >
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.niche} — Target: {c.daily_target}/day)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {activeCampaign && (
          <div className="flex items-center space-x-3 text-xs text-zinc-300">
            <span className="px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 font-mono">
              Niche: <strong className="text-zinc-100">{activeCampaign.niche}</strong>
            </span>
            <span className="px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 font-mono">
              Target: <strong className="text-amber-400">{activeCampaign.daily_target} prospects</strong>
            </span>
          </div>
        )}
      </div>

      {/* Sourcing Engines Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source 1: CSV Direct Ingestion Engine */}
        <div 
          id="source-csv-import-card"
          className="p-6 bg-zinc-900/70 border border-zinc-800 rounded-xl flex flex-col justify-between space-y-4 shadow-sm"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-zinc-100">CSV Ingestion Pipeline</h2>
                  <span className="text-[10px] text-emerald-400 font-mono">Deduplicated Pipeline</span>
                </div>
              </div>
              <button
                onClick={handleSampleCsv}
                className="text-[11px] text-amber-400 hover:underline flex items-center space-x-1"
              >
                <Download className="w-3 h-3" />
                <span>Load Sample ICP List</span>
              </button>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Upload spreadsheets from Apollo, Sales Navigator, or manual lead research. Normalized domains prevent duplicate outreach across campaigns.
            </p>
          </div>

          {/* Drag & Drop Upload Zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            className="p-6 bg-zinc-950/70 border border-dashed border-zinc-800 rounded-lg text-center hover:border-zinc-700 transition-colors flex flex-col items-center justify-center space-y-2"
          >
            <Upload className="w-6 h-6 text-zinc-400" />
            <div className="text-xs text-zinc-300">
              <label className="text-amber-400 hover:underline cursor-pointer font-medium">
                Click to browse CSV file
                <input 
                  type="file" 
                  accept=".csv,text/csv" 
                  onChange={handleFileInput} 
                  className="hidden" 
                />
              </label>
              <span className="text-zinc-400"> or drag and drop</span>
            </div>
            <span className="text-[10px] text-zinc-400">
              Auto-detects: Company, Website/Domain, Contact Name, Email, Job Title, Industry, Country
            </span>
          </div>

          {/* CSV Raw Text View & Trigger */}
          {csvContent.trim() && (
            <div className="space-y-2">
              <textarea
                rows={3}
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                className="w-full p-2 bg-zinc-950 border border-zinc-800 rounded font-mono text-[10px] text-zinc-300 focus:outline-none"
              />
            </div>
          )}

          {quickResult ? (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg space-y-2 text-xs">
              <div className="flex items-center justify-between text-emerald-300 font-semibold">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Ingestion Completed Successfully</span>
                </div>
                <button
                  onClick={() => onNavigate('leads')}
                  className="underline hover:text-white"
                >
                  View in Leads Table →
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-[11px] pt-1">
                <div className="p-1.5 bg-zinc-950 rounded border border-zinc-800">
                  <span className="text-zinc-400 block text-[9px] uppercase">Processed</span>
                  <span className="font-bold text-zinc-200">{quickResult.totalProcessed}</span>
                </div>
                <div className="p-1.5 bg-zinc-950 rounded border border-zinc-800">
                  <span className="text-zinc-400 block text-[9px] uppercase">New Companies</span>
                  <span className="font-bold text-emerald-400">{quickResult.companiesCreated}</span>
                </div>
                <div className="p-1.5 bg-zinc-950 rounded border border-zinc-800">
                  <span className="text-zinc-400 block text-[9px] uppercase">Deduplicated</span>
                  <span className="font-bold text-amber-400">{quickResult.companiesReused}</span>
                </div>
                <div className="p-1.5 bg-zinc-950 rounded border border-zinc-800">
                  <span className="text-zinc-400 block text-[9px] uppercase">Leads Added</span>
                  <span className="font-bold text-sky-400">{quickResult.leadsCreated}</span>
                </div>
              </div>
            </div>
          ) : (
            <button
              id="btn-execute-csv-import"
              disabled={!csvContent.trim() || isParsing}
              onClick={handleExecuteQuickCsv}
              className="w-full py-2.5 px-4 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm flex items-center justify-center space-x-2"
            >
              {isParsing ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Ingesting & Deduplicating...</span>
                </>
              ) : (
                <>
                  <span>Ingest Prospects to {activeCampaign ? activeCampaign.name : 'Campaign'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          )}
        </div>

        {/* Source 2: AI Web Research Engine (Clean Architecture & Next Build Roadmap) */}
        <div 
          id="source-ai-web-research-card"
          className="p-6 bg-zinc-900/70 border border-zinc-800 rounded-xl flex flex-col justify-between space-y-5 relative overflow-hidden"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-zinc-100">AI Web Research Engine</h2>
                  <span className="text-[10px] text-purple-400 font-mono">Autonomous Discovery</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/30">
                Connected Provider
              </span>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Configured with UI Dani's design parameters. Autonomous search discovers design-forward D2C stores and SaaS brands matching <strong className="text-zinc-200 font-normal">"{activeCampaign?.niche || 'D2C Creative'}"</strong>.
            </p>
          </div>

          {/* AI Pipeline Architecture Blueprint */}
          <div className="space-y-2 text-xs">
            <div className="p-3 bg-zinc-950/80 rounded-lg border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-zinc-300 text-[11px]">
                <span className="font-semibold">Discovery Context</span>
                <span className="text-amber-400 font-mono">{activeCampaign?.target_market || 'Worldwide'}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400 pt-1">
                <div>
                  <span className="text-zinc-400 block text-[10px]">Target Profile:</span>
                  <span className="text-zinc-200">{activeCampaign?.target_company_type || 'Active Web Storefront'}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px]">Creative Pitch:</span>
                  <span className="text-zinc-200">{activeCampaign?.offer || '3D Product Ad Video'}</span>
                </div>
              </div>
            </div>

            <div className="p-2.5 bg-zinc-950/40 rounded border border-zinc-800/80 text-[11px] text-zinc-400 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
              <span>AI Provider generates structured payloads conforming to ILeadSourceProvider.</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              id="btn-launch-ai-discovery-card"
              onClick={() => setIsAIDiscoveryOpen(true)}
              className="w-full py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Launch AI Prospect Discovery ({activeCampaign?.niche || 'Campaign'})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sourcing History / Audit Trail */}
      <div className="p-5 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-zinc-400" />
            <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
              Recent Lead Ingestion Activity
            </h3>
          </div>
          <span className="text-xs text-zinc-400 font-mono">
            {sourcingActivities.length} sourcing records
          </span>
        </div>

        {sourcingActivities.length === 0 ? (
          <p className="text-xs text-zinc-400 py-3 text-center">
            No sourcing activities recorded yet. Run AI Discovery or a CSV import to populate this log.
          </p>
        ) : (
          <div className="divide-y divide-zinc-800/60 font-mono text-xs max-h-48 overflow-y-auto">
            {sourcingActivities.slice(0, 10).map((act) => (
              <div key={act.id} className="py-2 flex items-center justify-between text-zinc-400">
                <div className="flex items-center space-x-2 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span className="text-zinc-200 truncate">{act.description}</span>
                </div>
                <span className="text-[11px] text-zinc-400 shrink-0 ml-4">
                  {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {isAIDiscoveryOpen && activeCampaign && (
        <AIDiscoveryModal
          isOpen={isAIDiscoveryOpen}
          campaign={activeCampaign}
          onClose={() => setIsAIDiscoveryOpen(false)}
          onComplete={() => {
            refreshData();
          }}
        />
      )}

      {isCsvModalOpen && (
        <CsvImportModal
          isOpen={isCsvModalOpen}
          defaultCampaignId={selectedCampaignId}
          onClose={() => setIsCsvModalOpen(false)}
        />
      )}

      {isAddCompanyOpen && (
        <AddCompanyModal
          isOpen={isAddCompanyOpen}
          defaultCampaignId={selectedCampaignId}
          onClose={() => setIsAddCompanyOpen(false)}
        />
      )}
    </div>
  );
};
