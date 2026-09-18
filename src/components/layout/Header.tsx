import React from 'react';
import { Plus, Send, Film, Target, Calendar, Menu } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { NavigationPage } from './Sidebar';

interface HeaderProps {
  currentPage: NavigationPage;
  onOpenNewCampaign: () => void;
  onOpenNewCaseStudy: () => void;
  onToggleMobileNav?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onOpenNewCampaign,
  onOpenNewCaseStudy,
  onToggleMobileNav,
}) => {
  const { campaigns, activeCampaignId, setActiveCampaignId } = useCRM();

  const getPageTitle = () => {
    switch (currentPage) {
      case 'dashboard': return 'Outreach Overview';
      case 'campaigns': return 'Outreach Campaigns';
      case 'leads': return 'Lead Database';
      case 'lead_sources': return 'Lead Sources & Ingestion';
      case 'research': return 'AI Research & Qualification';
      case 'case_studies': return 'Case Study & Asset Library';
      case 'email_queue': return 'Email Review Queue';
      case 'conversations': return 'Replies & Inbox';
      case 'follow_ups': return 'Follow-up Sequences';
      case 'analytics': return 'Outreach Analytics';
      case 'settings': return 'Operating System Settings';
      default: return 'UIOutbox';
    }
  };

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <header 
      id="main-app-header"
      className="h-16 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shrink-0"
    >
      <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
        {/* Mobile Hamburger Button */}
        {onToggleMobileNav && (
          <button
            onClick={onToggleMobileNav}
            className="lg:hidden p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-zinc-800 transition-colors touch-manipulation"
            aria-label="Open menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        <h1 className="text-sm sm:text-base font-semibold text-zinc-100 tracking-tight truncate max-w-[140px] sm:max-w-[220px] md:max-w-none">
          {getPageTitle()}
        </h1>
        
        {/* Active Campaign Indicator */}
        <div className="hidden xl:flex items-center space-x-2 pl-4 border-l border-zinc-800">
          <Target className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-xs text-zinc-400 shrink-0">Target Campaign:</span>
          {campaigns.length > 0 ? (
            <select
              id="active-campaign-selector"
              value={activeCampaignId || ''}
              onChange={(e) => setActiveCampaignId(e.target.value || null)}
              className="bg-zinc-900 border border-zinc-700/70 rounded px-2.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-amber-500/80 cursor-pointer max-w-[200px] truncate"
            >
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.daily_target}/day)
                </option>
              ))}
            </select>
          ) : (
            <span className="text-xs text-zinc-400 italic">None created yet</span>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
        {/* Date Indicator */}
        <div className="hidden lg:flex items-center space-x-2 text-xs text-zinc-400 bg-zinc-900/50 px-3 py-1.5 rounded-md border border-zinc-800/60">
          <Calendar className="w-3.5 h-3.5 text-zinc-400" />
          <span>{todayFormatted}</span>
        </div>

        {/* Quick Add Case Study */}
        <button
          id="btn-quick-case-study"
          onClick={onOpenNewCaseStudy}
          className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 hover:text-zinc-100 transition-colors"
        >
          <Film className="w-3.5 h-3.5 text-zinc-400" />
          <span>+ Case Study</span>
        </button>

        {/* Create Campaign */}
        <button
          id="btn-header-create-campaign"
          onClick={onOpenNewCampaign}
          className="flex items-center space-x-1.5 px-3 sm:px-3.5 py-1.5 rounded-md text-xs font-medium bg-amber-400 hover:bg-amber-300 text-zinc-950 font-semibold transition-colors shadow-sm touch-manipulation"
        >
          <Send className="w-3.5 h-3.5" />
          <span className="hidden xs:inline sm:inline">New Campaign</span>
          <span className="inline xs:hidden sm:hidden">New</span>
        </button>
      </div>
    </header>
  );
};
