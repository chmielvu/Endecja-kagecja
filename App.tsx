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
import { useStore } from './store';
import { X, CheckCircle, AlertCircle, Info, PanelLeftOpen, PanelRightOpen } from 'lucide-react';

function App() {
  const { initGraph, toasts, removeToast, toggleSidebar, isSidebarOpen, isRightSidebarOpen, toggleRightSidebar } = useStore();

  useEffect(() => {
    initGraph();
  }, [initGraph]);

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden selection:bg-owp-green selection:text-white">
      {/* Floating Toggle Button Left (Visible only when Sidebar is closed) */}
      {!isSidebarOpen && (
        <button 
          onClick={toggleSidebar}
          className="absolute top-4 left-4 z-50 p-2 bg-surface border border-owp-green/50 text-owp-green rounded shadow-lg hover:bg-owp-green hover:text-white transition-all duration-300"
          title="Open Sidebar"
        >
          <PanelLeftOpen size={20} />
        </button>
      )}

      {/* Floating Toggle Button Right (Visible only when Chat is closed) */}
      {!isRightSidebarOpen && (
        <button 
          onClick={toggleRightSidebar}
          className="absolute top-4 right-4 z-50 p-2 bg-surface border border-archival-gold/50 text-archival-gold rounded shadow-lg hover:bg-archival-gold hover:text-white transition-all duration-300"
          title="Open Dmowski Chat"
        >
          <PanelRightOpen size={20} />
        </button>
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

      <div className="fixed bottom-20 right-4 flex flex-col gap-2 z-50 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className="w-80 bg-zinc-900 border border-owp-green/50 rounded-sm shadow-2xl p-4 pointer-events-auto flex items-start gap-3 animate-slide-up">
            <div className="mt-1">
              {toast.type === 'success' && <CheckCircle size={16} className="text-owp-green" />}
              {toast.type === 'error' && <AlertCircle size={16} className="text-crimson" />}
              {(toast.type === 'info' || !toast.type) && <Info size={16} className="text-owp-green" />}
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-white font-spectral">{toast.title}</h4>
              <p className="text-xs text-zinc-400 mt-1">{toast.description}</p>
            </div>
            <button onClick={() => removeToast(toast.id)} className="text-zinc-500 hover:text-white"><X size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;