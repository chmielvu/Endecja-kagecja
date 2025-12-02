
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { Play, Search, Scissors, Undo2, Redo2, FileJson, PanelLeftClose, LayoutGrid, Group, Eye, Lock, Activity, Map } from 'lucide-react';
import { generateGraphExpansion } from '../services/geminiService';
import { detectDuplicates } from '../services/metrics';
import { MieczykLoader } from './MieczykLoader';
import { IngestionZone } from './IngestionZone';

export const SidebarLeft: React.FC = () => {
  const { 
    graph, 
    recalculateGraph,
    selectedNodeIds, 
    activeCommunityColoring, 
    setCommunityColoring, 
    showCertainty,
    setCertaintyMode,
    isSecurityMode,
    setSecurityMode,
    activeLayout,
    setLayout,
    setThinking,
    isThinking,
    addToast,
    isSidebarOpen,
    toggleSidebar,
    undo, redo, canUndo, canRedo,
    setPendingPatch,
    addResearchTask,
    updateResearchTask
  } = useStore();

  const [sidebarWidth, setSidebarWidth] = useState(380);

  const handleExpand = async () => {
    const topic = prompt("Target Topic for Expansion:");
    if (!topic) return;
    setThinking(true);
    const taskId = Date.now().toString();
    addResearchTask({ id: taskId, type: 'expansion', target: topic, status: 'running', reasoning: 'Deploying agents...' });

    try {
      const result = await generateGraphExpansion(graph, topic);
      setPendingPatch({
        type: 'expansion',
        reasoning: result.thoughtProcess,
        nodes: result.newNodes,
        edges: result.newEdges
      });
      updateResearchTask(taskId, { status: 'complete', reasoning: result.thoughtProcess });
    } catch (e) {
      updateResearchTask(taskId, { status: 'failed', reasoning: 'Operation compromised.' });
    } finally {
      setThinking(false);
    }
  };

  return (
    <div 
      className={`${isSidebarOpen ? 'border-r' : 'border-r-0'} bg-bunker-dark border-antique-brass/30 overflow-hidden flex-shrink-0 relative shadow-2xl z-20 transition-all duration-300`}
      style={{ width: isSidebarOpen ? sidebarWidth : 0 }}
    >
      <div style={{ width: sidebarWidth }} className="h-full flex flex-col p-5 overflow-y-auto bg-noise">
        
        {/* Header */}
        <div className="flex items-start justify-between mb-8 border-b border-antique-brass/20 pb-4">
          <div className="flex items-center gap-3">
              {isThinking ? (
                 <MieczykLoader size={40} className="text-antique-brass" />
              ) : (
                 <div className="w-10 h-10 border-2 border-antique-brass rounded-full flex items-center justify-center bg-forest-uniform/20">
                    <span className="font-spectral font-bold text-xl text-parchment">E</span>
                 </div>
              )}
              <div>
                  <h1 className="font-spectral font-bold text-2xl text-parchment tracking-wide leading-none uppercase">
                    Endecja<span className="text-antique-brass">KG</span>
                  </h1>
                  <span className="text-[10px] text-forest-uniform font-mono tracking-widest border border-forest-uniform/30 px-1 rounded bg-parchment/10">
                    HQ 1934
                  </span>
              </div>
          </div>
          
          <div className="flex items-center gap-1">
             <button onClick={undo} disabled={!canUndo()} className="p-1 text-zinc-500 hover:text-parchment disabled:opacity-20"><Undo2 size={16}/></button>
             <button onClick={redo} disabled={!canRedo()} className="p-1 text-zinc-500 hover:text-parchment disabled:opacity-20"><Redo2 size={16}/></button>
             <button onClick={toggleSidebar} className="text-zinc-600 hover:text-antique-brass ml-2"><PanelLeftClose size={20}/></button>
          </div>
        </div>

        <div className="space-y-8">
          
          {/* Ingestion Zone */}
          <div className="space-y-2">
             <label className="text-[10px] font-bold text-antique-brass uppercase tracking-[0.2em] font-spectral pl-1">Document Intelligence</label>
             <IngestionZone />
          </div>

          {/* Operations */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-antique-brass uppercase tracking-[0.2em] font-spectral pl-1">Field Operations</label>
            <div className="grid grid-cols-2 gap-2">
               <button onClick={handleExpand} className="btn-archival justify-center flex-col h-16 gap-1">
                  <Search size={18}/> 
                  <span className="text-[10px]">Expand Context</span>
               </button>
               <button onClick={() => recalculateGraph()} className="btn-archival justify-center flex-col h-16 gap-1">
                  <Activity size={18}/> 
                  <span className="text-[10px]">Update Metrics</span>
               </button>
            </div>
          </div>

          {/* Visualization Controls */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-antique-brass uppercase tracking-[0.2em] font-spectral pl-1">Map Layers</label>
            
            <button onClick={() => setSecurityMode(!isSecurityMode)} className={`w-full btn-archival justify-between ${isSecurityMode ? 'border-crimson-alert text-crimson-alert bg-crimson-alert/10' : ''}`}>
               <div className="flex items-center gap-2"><Lock size={14}/> Clandestine Risk</div>
               <div className={`w-2 h-2 rounded-full ${isSecurityMode ? 'bg-crimson-alert' : 'bg-zinc-700'}`}></div>
            </button>

            <button onClick={() => setCommunityColoring(!activeCommunityColoring)} className="w-full btn-archival justify-between">
               <div className="flex items-center gap-2"><Group size={14}/> Faction Colors</div>
               <div className={`w-2 h-2 rounded-full ${activeCommunityColoring ? 'bg-antique-brass' : 'bg-zinc-700'}`}></div>
            </button>
          </div>

          {/* Selected Intelligence */}
          {selectedNodeIds.length > 0 && (
            <div className="p-4 bg-forest-uniform/10 border border-forest-uniform/30 rounded-sm relative overflow-hidden">
               <div className="absolute top-0 right-0 p-1">
                  <div className="text-[9px] font-mono text-antique-brass border border-antique-brass px-1">CONFIDENTIAL</div>
               </div>
               <h3 className="font-spectral font-bold text-parchment text-lg">{selectedNodeIds.length} Targets Selected</h3>
               <p className="text-xs text-zinc-400 mt-1 italic">Awaiting orders.</p>
            </div>
          )}

        </div>
        
        <div className="mt-auto pt-6 border-t border-antique-brass/20 text-center">
          <span className="text-[10px] text-zinc-600 font-mono">Bunker Terminal v4.2.0</span>
        </div>
      </div>
    </div>
  );
};
