import React from 'react';
import { 
  LayoutDashboard, 
  Send, 
  Users, 
  Database, 
  Sparkles, 
  Film, 
  Inbox, 
  MessageSquare, 
  Clock, 
  BarChart3, 
  Settings,
  ChevronRight,
  ShieldCheck,
  Circle,
  X
} from 'lucide-react';
import { useCRM } from '../../context/CRMContext';

export type NavigationPage = 
  | 'dashboard'
  | 'campaigns'
  | 'leads'
  | 'lead_sources'
  | 'research'
  | 'case_studies'
  | 'email_queue'
  | 'conversations'
  | 'follow_ups'
  | 'analytics'
  | 'settings';

interface SidebarProps {
  currentPage: NavigationPage;
  onSelectPage: (page: NavigationPage) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentPage, 
  onSelectPage,
  isMobileOpen = false,
  onCloseMobile
}) => {
  const { profile, supabaseStatus, emailMessages, leads, replies } = useCRM();

  const pendingRepliesCount = replies.filter(r => r.status === 'unread' || r.status === 'needs_response').length;
  const pendingReviewCount = emailMessages.filter(e => e.status === 'needs_review').length;

  const navItems = [
    { id: 'dashboard' as NavigationPage, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'campaigns' as NavigationPage, label: 'Campaigns', icon: Send },
    { id: 'leads' as NavigationPage, label: 'Leads', icon: Users, badge: leads.length > 0 ? leads.length : undefined },
    { id: 'lead_sources' as NavigationPage, label: 'Lead Sources', icon: Database },
    { id: 'research' as NavigationPage, label: 'Research', icon: Sparkles },
    { id: 'case_studies' as NavigationPage, label: 'Case Studies', icon: Film },
    { 
      id: 'email_queue' as NavigationPage, 
      label: 'Email Queue', 
      icon: Inbox,
      badge: pendingReviewCount > 0 ? pendingReviewCount : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    },
    { 
      id: 'conversations' as NavigationPage, 
      label: 'Replies & Inbox', 
      icon: MessageSquare,
      badge: pendingRepliesCount > 0 ? pendingRepliesCount : undefined,
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
    },
    { id: 'follow_ups' as NavigationPage, label: 'Follow-ups', icon: Clock },
    { id: 'analytics' as NavigationPage, label: 'Analytics', icon: BarChart3 },
    { id: 'settings' as NavigationPage, label: 'Settings', icon: Settings },
  ];

  const handleItemClick = (page: NavigationPage) => {
    onSelectPage(page);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full bg-zinc-950">
      {/* Brand & Identity Header */}
      <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700/80 flex items-center justify-center font-bold text-sm tracking-wider text-amber-400 shadow-inner">
            UO
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-semibold text-sm tracking-tight text-zinc-100">UIOutbox</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">v1.0</span>
            </div>
            <p className="text-xs text-zinc-400 font-normal truncate max-w-[130px]">For {profile.business_name || 'UIDani'}</p>
          </div>
        </div>

        {/* Mobile Close Button */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-zinc-800 transition-colors"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[11px] font-medium tracking-wider text-zinc-400 uppercase">
          Operating System
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              id={`nav-item-${item.id}`}
              onClick={() => handleItemClick(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors group text-left touch-manipulation ${
                isActive
                  ? 'bg-zinc-900 text-zinc-100 border border-zinc-800 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-amber-400' : 'text-zinc-400 group-hover:text-zinc-300'}`} />
                <span>{item.label}</span>
              </div>
              <div className="flex items-center space-x-1.5">
                {item.badge !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono border ${item.badgeColor || 'bg-zinc-800 text-zinc-300 border-zinc-700'}`}>
                    {item.badge}
                  </span>
                )}
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer Profile & Infrastructure Status */}
      <div className="p-3 border-t border-zinc-800/80 space-y-2 bg-zinc-950">
        <div className="px-2 py-1.5 rounded-md bg-zinc-900/60 border border-zinc-800/60 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <Circle className={`w-2 h-2 fill-current ${supabaseStatus.connected ? 'text-emerald-400' : 'text-zinc-500'}`} />
            <span className="text-zinc-400 text-[11px] truncate">
              {supabaseStatus.connected ? 'Supabase Connected' : 'Local Storage Engine'}
            </span>
          </div>
          <ShieldCheck className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
        </div>

        <button
          id="sidebar-profile-card"
          onClick={() => handleItemClick('settings')}
          className="w-full flex items-center space-x-3 p-2 rounded-lg hover:bg-zinc-900 text-left transition-colors border border-transparent hover:border-zinc-800 touch-manipulation"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500/30 to-amber-300/30 border border-amber-500/40 flex items-center justify-center text-xs font-semibold text-amber-200 shrink-0">
            {profile.display_name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-zinc-200 truncate">{profile.display_name}</p>
            <p className="text-[11px] text-zinc-400 truncate">{profile.email}</p>
          </div>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside 
        id="main-sidebar"
        className="hidden lg:flex w-64 bg-zinc-950 border-r border-zinc-800/80 flex-col justify-between shrink-0 h-screen sticky top-0 z-20"
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 lg:hidden flex transition-opacity"
          onClick={onCloseMobile}
        >
          <aside
            id="mobile-sidebar-drawer"
            className="w-72 max-w-[85vw] h-full bg-zinc-950 border-r border-zinc-800 shadow-2xl flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
