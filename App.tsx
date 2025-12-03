
import React, { useEffect } from 'react';
import { SidebarLeft } from './components/SidebarLeft';
import { SidebarRight } from './components/SidebarRight';
import { GraphCanvas } from './components/GraphCanvas';
import { Timeline } from './components/Timeline';
import { NodeEditorModal } from './components/NodeEditorModal';
import { StatsPanel } from './components/StatsPanel';
import { SemanticSearch } from './components/SemanticSearch';
import { PatchReviewModal } from './components/PatchReviewModal';
import { ResearchDashboard } from './components/ResearchDashboard';
import { AnalysisConsole } from './components/AnalysisConsole'; // NEW IMPORT
import { BakeliteCard } from './components/BakeliteCard'; // NEW IMPORT for demo
import { BakeliteButton } from './components/BakeliteButton'; // NEW IMPORT for toggle buttons
import { useStore } from './store';
import { X, CheckCircle, AlertCircle, Info, PanelLeftOpen, PanelRightOpen, Terminal } from 'lucide-react';
import { cn } from './services/utils'; // Assuming cn utility

function App() {
  const { initGraph, toasts, removeToast, toggleSidebar, isSidebarOpen, isRightSidebarOpen, toggleRightSidebar, isAnalysisOpen } = useStore(); // isAnalysisOpen added

  useEffect(() => {
    initGraph();
  }, [initGraph]);

  return (
    <div className="flex flex-col h-screen w-screen bg-deco-navy text-deco-paper font-sans overflow-hidden selection:bg-deco-green selection:text-deco-paper">
      {/* Floating Toggle Button Left (Visible only when Sidebar is closed) */}
      {!isSidebarOpen && (
        <BakeliteButton 
          onClick={toggleSidebar}
          className="absolute top-4 left-4 z-50 !p-2 rounded-full"
          variant="secondary"
          icon={<PanelLeftOpen size={20} />}
          title="Open Sidebar"
        >
          <span className="sr-only">Open Sidebar</span>
        </BakeliteButton>
      )}

      {/* Floating Toggle Button Right (Visible only when Chat is closed) */}
      {!isRightSidebarOpen && (
        <BakeliteButton 
          onClick={toggleRightSidebar}
          className="absolute top-4 right-4 z-50 !p-2 rounded-full"
          variant="secondary"
          icon={<PanelRightOpen size={20} />}
          title="Open Dmowski Chat"
        >
          <span className="sr-only">Open Dmowski Chat</span>
        </BakeliteButton>
      )}

      <div className="flex-1 flex overflow-hidden relative z-10">
        <SidebarLeft />
        <main className="flex-1 relative flex flex-col min-w-0">
          <div className="flex-1 relative">
            <GraphCanvas />
          </div>
          <Timeline />
        </main>
        <SidebarRight />
      </div>

      <NodeEditorModal />
      <StatsPanel />
      <SemanticSearch />
      <PatchReviewModal />
      <ResearchDashboard />
      {isAnalysisOpen && <AnalysisConsole />} {/* Render AnalysisConsole if open */}

      {/* DEMO BakeliteCard - Remove in production */}
      {/*
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
        <BakeliteCard title="Test Card" icon={<Terminal size={20} />} className="w-80">
          <p className="text-deco-paper text-sm">This is a demonstration of the Bakelite Card component.</p>
          <BakeliteButton className="mt-4 w-full" variant="secondary">Action</BakeliteButton>
        </BakeliteCard>
      </div>
      */}

      <div className="fixed bottom-20 right-4 flex flex-col gap-2 z-50 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className="w-80 bg-deco-panel border border-deco-green/50 rounded-sm shadow-2xl p-4 pointer-events-auto flex items-start gap-3 animate-slide-up">
            <div className="mt-1">
              {toast.type === 'success' && <CheckCircle size={16} className="text-deco-green" />}
              {toast.type === 'error' && <AlertCircle size={16} className="text-deco-crimson" />}
              {(toast.type === 'info' || !toast.type) && <Info size={16} className="text-deco-green" />}
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-deco-paper font-spectral">{toast.title}</h4>
              <p className="text-xs text-zinc-400 mt-1">{toast.description}</p>
            </div>
            <button onClick={() => removeToast(toast.id)} className="text-zinc-500 hover:text-deco-paper"><X size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
