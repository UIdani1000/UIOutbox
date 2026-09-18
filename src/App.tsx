import React, { useState } from 'react';
import { CRMProvider } from './context/CRMContext';
import { Sidebar, NavigationPage } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardPage } from './pages/DashboardPage';
import { CampaignsPage } from './pages/CampaignsPage';
import { CampaignDetailPage } from './pages/CampaignDetailPage';
import { LeadsPage } from './pages/LeadsPage';
import { LeadSourcesPage } from './pages/LeadSourcesPage';
import { ResearchPage } from './pages/ResearchPage';
import { CaseStudiesPage } from './pages/CaseStudiesPage';
import { EmailQueuePage } from './pages/EmailQueuePage';
import { ConversationsPage } from './pages/ConversationsPage';
import { FollowUpsPage } from './pages/FollowUpsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { CampaignBuilderModal } from './components/campaigns/CampaignBuilderModal';
import { CaseStudyModal } from './components/caseStudies/CaseStudyModal';

function MainApp() {
  const [currentPage, setCurrentPage] = useState<NavigationPage>(() => {
    try {
      const search = window.location.search;
      const pathname = window.location.pathname;
      if (search.includes('gmail=') || pathname.includes('settings')) {
        return 'settings';
      }
    } catch {}
    return 'dashboard';
  });
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [isCaseStudyModalOpen, setIsCaseStudyModalOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const handleNavigate = (page: NavigationPage) => {
    setSelectedCampaignId(null);
    setCurrentPage(page);
    setIsMobileNavOpen(false);
  };

  const handleSelectCampaign = (campaignId: string) => {
    setSelectedCampaignId(campaignId);
    setIsMobileNavOpen(false);
  };

  const renderCurrentPage = () => {
    // If a campaign detail view is open
    if (selectedCampaignId) {
      return (
        <CampaignDetailPage
          campaignId={selectedCampaignId}
          onBack={() => setSelectedCampaignId(null)}
        />
      );
    }

    switch (currentPage) {
      case 'dashboard':
        return (
          <DashboardPage
            onNavigate={handleNavigate}
            onOpenNewCampaign={() => setIsCampaignModalOpen(true)}
          />
        );
      case 'campaigns':
        return (
          <CampaignsPage
            onOpenNewCampaign={() => setIsCampaignModalOpen(true)}
            onNavigate={handleNavigate}
            onSelectCampaign={handleSelectCampaign}
          />
        );
      case 'leads':
        return <LeadsPage onNavigate={handleNavigate} />;
      case 'lead_sources':
        return <LeadSourcesPage onNavigate={handleNavigate} />;
      case 'research':
        return <ResearchPage onNavigate={handleNavigate} />;
      case 'case_studies':
        return <CaseStudiesPage />;
      case 'email_queue':
        return <EmailQueuePage onNavigate={handleNavigate} />;
      case 'conversations':
        return <ConversationsPage />;
      case 'follow_ups':
        return <FollowUpsPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return (
          <DashboardPage
            onNavigate={handleNavigate}
            onOpenNewCampaign={() => setIsCampaignModalOpen(true)}
          />
        );
    }
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 antialiased overflow-hidden font-sans selection:bg-amber-400 selection:text-zinc-950">
      {/* Sidebar Navigation (Desktop Persistent + Mobile Drawer) */}
      <Sidebar
        currentPage={currentPage}
        onSelectPage={handleNavigate}
        isMobileOpen={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header
          currentPage={currentPage}
          onOpenNewCampaign={() => setIsCampaignModalOpen(true)}
          onOpenNewCaseStudy={() => setIsCaseStudyModalOpen(true)}
          onToggleMobileNav={() => setIsMobileNavOpen(prev => !prev)}
        />

        <main className="flex-1 overflow-y-auto bg-zinc-950/60 pb-16">
          {renderCurrentPage()}
        </main>
      </div>

      {/* Global Modals */}
      <CampaignBuilderModal
        isOpen={isCampaignModalOpen}
        onClose={() => setIsCampaignModalOpen(false)}
        onSaved={() => {
          setSelectedCampaignId(null);
          setCurrentPage('campaigns');
        }}
      />

      <CaseStudyModal
        isOpen={isCaseStudyModalOpen}
        onClose={() => setIsCaseStudyModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <CRMProvider>
      <MainApp />
    </CRMProvider>
  );
}
