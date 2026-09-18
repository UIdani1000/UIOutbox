import React, { useState } from 'react';
import { 
  Send, 
  Plus, 
  Filter, 
  Target, 
  Calendar, 
  Film, 
  Clock, 
  CheckCircle2, 
  PauseCircle, 
  PlayCircle,
  MoreVertical,
  ExternalLink,
  Users,
  Copy,
  Trash2,
  ArrowRight,
  FileSpreadsheet,
  Sparkles
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { Campaign, CampaignStatus } from '../types';
import { NavigationPage } from '../components/layout/Sidebar';
import { CsvImportModal } from '../components/leads/CsvImportModal';
import { AIDiscoveryModal } from '../components/discovery/AIDiscoveryModal';

interface CampaignsPageProps {
  onOpenNewCampaign: () => void;
  onNavigate: (page: NavigationPage) => void;
  onSelectCampaign?: (campaignId: string) => void;
}

export const CampaignsPage: React.FC<CampaignsPageProps> = ({
  onOpenNewCampaign,
  onNavigate,
  onSelectCampaign,
}) => {
  const { 
    campaigns, 
    updateCampaign, 
    setActiveCampaignId, 
    activeCampaignId, 
    leads, 
    duplicateCampaign, 
    deleteCampaign,
    refreshData 
  } = useCRM();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [csvImportCampaignId, setCsvImportCampaignId] = useState<string | null>(null);
  const [aiDiscoveryCampaign, setAiDiscoveryCampaign] = useState<Campaign | null>(null);

  const filteredCampaigns = campaigns.filter((c) => {
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesSearch = 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.niche.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.offer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleToggleStatus = async (e: React.MouseEvent, campaign: Campaign) => {
    e.stopPropagation();
    const nextStatus: CampaignStatus = campaign.status === 'active' ? 'paused' : 'active';
    await updateCampaign(campaign.id, { status: nextStatus });
  };

  const handleDuplicate = async (e: React.MouseEvent, campaignId: string) => {
    e.stopPropagation();
    await duplicateCampaign(campaignId);
  };

  const handleDelete = async (e: React.MouseEvent, campaign: Campaign) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete campaign "${campaign.name}"?`)) {
      await deleteCampaign(campaign.id);
    }
  };

  const getStatusBadge = (status: CampaignStatus) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Active</span>;
      case 'ready':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/30">Ready</span>;
      case 'researching':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30">Researching</span>;
      case 'paused':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">Paused</span>;
      case 'completed':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-700/40 text-zinc-300 border border-zinc-700">Completed</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">Draft</span>;
    }
  };

  return (
    <div id="campaigns-page" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">Outreach Campaigns</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Campaign-first outbound operating system: manage your target niches, creative offers, and daily prospect goals
          </p>
        </div>

        <button
          id="btn-campaigns-new"
          onClick={onOpenNewCampaign}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 font-semibold text-xs transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Campaign</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search campaigns, niche, offer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-md text-xs text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-amber-500/80 w-full sm:w-64"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto">
          <Filter className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          {['all', 'active', 'ready', 'draft', 'paused', 'completed'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-2.5 py-1 rounded-md text-xs capitalize whitespace-nowrap transition-colors ${
                statusFilter === status
                  ? 'bg-zinc-800 text-zinc-100 font-semibold border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Campaign Grid */}
      {filteredCampaigns.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900/40 border border-dashed border-zinc-800 rounded-xl space-y-4">
          <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-amber-400 mx-auto">
            <Send className="w-5 h-5" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-sm font-semibold text-zinc-200">No campaigns found</h3>
            <p className="text-xs text-zinc-400 mt-1">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search query or status filter.'
                : 'Create your first outreach campaign to define your daily prospect goal and creative offer.'}
            </p>
          </div>
          <button
            onClick={onOpenNewCampaign}
            className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 font-semibold text-xs transition-colors shadow-sm"
          >
            Create Campaign
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCampaigns.map((camp) => {
            const isTarget = camp.id === activeCampaignId;
            const campaignLeads = leads.filter((l) => l.campaign_id === camp.id);
            const qualifiedCount = campaignLeads.filter((l) => l.status === 'qualified').length;
            const progress = Math.min(100, Math.round((campaignLeads.length / (camp.daily_target || 50)) * 100));

            return (
              <div
                key={camp.id}
                id={`campaign-card-${camp.id}`}
                onClick={() => {
                  setActiveCampaignId(camp.id);
                  if (onSelectCampaign) onSelectCampaign(camp.id);
                }}
                className={`p-5 bg-zinc-900/70 border rounded-xl flex flex-col justify-between space-y-4 transition-all cursor-pointer group ${
                  isTarget ? 'border-amber-500/50 ring-1 ring-amber-500/20' : 'border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                {/* Card Top */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(camp.status)}
                        {isTarget && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
                            Active Campaign
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-zinc-100 mt-1.5 group-hover:text-amber-300 transition-colors">
                        {camp.name}
                      </h3>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={(e) => handleToggleStatus(e, camp)}
                        className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded hover:bg-zinc-800 transition-colors"
                        title={camp.status === 'active' ? 'Pause Campaign' : 'Activate Campaign'}
                      >
                        {camp.status === 'active' ? (
                          <PauseCircle className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <PlayCircle className="w-4 h-4 text-zinc-400" />
                        )}
                      </button>

                      <button
                        onClick={(e) => handleDuplicate(e, camp.id)}
                        className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded hover:bg-zinc-800 transition-colors"
                        title="Duplicate Campaign"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => handleDelete(e, camp)}
                        className="text-zinc-400 hover:text-rose-400 p-1.5 rounded hover:bg-zinc-800 transition-colors"
                        title="Delete Campaign"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-zinc-300 pt-1">
                    <div>
                      <span className="text-zinc-400 text-[11px] block">Target Niche</span>
                      <span className="font-medium truncate block text-zinc-200">{camp.niche || 'Not specified'}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400 text-[11px] block">Creative Offer</span>
                      <span className="font-medium truncate block text-zinc-200">{camp.offer || 'Not specified'}</span>
                    </div>
                  </div>
                </div>

                {/* Progress & Parameters */}
                <div className="space-y-2">
                  <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800/60 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <span className="text-zinc-400 text-[10px] uppercase block">Daily Target</span>
                      <span className="font-mono font-semibold text-zinc-100">{camp.daily_target}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400 text-[10px] uppercase block">Sourced</span>
                      <span className="font-mono font-semibold text-amber-400">{campaignLeads.length}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400 text-[10px] uppercase block">Qualified</span>
                      <span className="font-mono font-semibold text-emerald-400">{qualifiedCount}</span>
                    </div>
                  </div>

                  <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden border border-zinc-800">
                    <div
                      className="bg-amber-400 h-full rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-xs">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAiDiscoveryCampaign(camp);
                      }}
                      className="flex items-center space-x-1 text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                      title="Run AI Prospect Discovery"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Find Prospects</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCsvImportCampaignId(camp.id);
                      }}
                      className="flex items-center space-x-1 text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>CSV</span>
                    </button>
                  </div>

                  <div className="flex items-center space-x-1 text-amber-400 group-hover:translate-x-1 transition-transform font-medium">
                    <span>Manage</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {aiDiscoveryCampaign && (
        <AIDiscoveryModal
          isOpen={!!aiDiscoveryCampaign}
          campaign={aiDiscoveryCampaign}
          onClose={() => setAiDiscoveryCampaign(null)}
          onComplete={() => {
            refreshData();
          }}
        />
      )}

      {csvImportCampaignId && (
        <CsvImportModal
          isOpen={!!csvImportCampaignId}
          defaultCampaignId={csvImportCampaignId}
          onClose={() => setCsvImportCampaignId(null)}
        />
      )}
    </div>
  );
};
