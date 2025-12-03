


import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { Play, Search, Scissors, Undo2, Redo2, FileJson, PanelLeftClose, LayoutGrid, Group, Eye, Lock, Activity, Map, BrainCircuit, X } from 'lucide-react';
import { generateGraphExpansion, runDeepAnalysis } from '../services/geminiService'; // Import runDeepAnalysis
import { detectDuplicates } from '../services/metrics';
import { MieczykLoader } from './MieczykLoader';
import { IngestionZone } from './IngestionZone';
import { DuplicateMergerModal } from './DuplicateMergerModal'; // Assuming a dedicated modal or use inline

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
    updateResearchTask,
    setAnalysisResult, // New
    setAnalysisOpen, // New
    mergeNodes // Existing merge function
  } = useStore();

  const [sidebarWidth, setSidebarWidth] = useState(380);

  // --- NEW DUPLICATE MERGER STATE ---
  const [showDupeModal, setShowDupeModal] = useState(false);
  const [dupeCandidates, setDupeCandidates] = useState<any[]>([]);

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
        // Fix: Access correct properties from GraphPatch
        reasoning: result.reasoning,
        nodes: result.nodes,
        edges: result.edges
      });
      // Fix: Access correct property from GraphPatch
      updateResearchTask(taskId, { status: 'complete', reasoning: result.reasoning });
    } catch (e: any) {
      addToast({ title: 'Operation Compromised', description: e.message || 'Intelligence gathering failed.', type: 'error' });
      updateResearchTask(taskId, { status: 'failed', reasoning: 'Operation compromised.' });
    } finally {
      setThinking(false);
    }
  };

  // --- NEW HANDLERS ---
  const handleDeepAnalysis = async () => {
    setThinking(true);
    addToast({ title: 'Establishing Link', description: 'Connecting to NetworkX Python Runtime...', type: 'info' });
    try {
      const result = await runDeepAnalysis(graph);
      setAnalysisResult(result);
      setAnalysisOpen(true);
      addToast({ title: 'Intelligence Received', description: 'Deep structural analysis complete.', type: 'success' });
    } catch (e: any) {
      addToast({ title: 'Connection Failed', description: e.message, type: 'error' });
    } finally {
      setThinking(false);
    }
  };

  const handleGrooming = () => {
    const dupes = detectDuplicates(graph, 0.85); // Using string similarity for quick check
    if (dupes.length === 0) {
      addToast({ title: 'Archives Clean', description: 'No immediate duplicates detected.', type: 'success' });
    } else {
      setDupeCandidates(dupes);
      setShowDupeModal(true);
      addToast({ title: 'Duplicate Entities', description: `${dupes.length} potential duplicates found.`, type: 'warning' });
    }
  };

  const executeMerge = (candidate: any) => {
    mergeNodes(candidate.nodeA.id, candidate.nodeB.id);
    setDupeCandidates(prev => prev.filter(c => c !== candidate)); // Remove merged from list
    if(dupeCandidates.length <= 1) setShowDupeModal(false); // Close if no more candidates
    addToast({ title: 'Merge Complete', description: `Merged '${candidate.nodeB.label}' into '${candidate.nodeA.label}'.`, type: 'success' });
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

          {/* NEW: Intelligence & Hygiene */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-antique-brass uppercase tracking-[0.2em] font-spectral pl-1">
              Intelligence & Hygiene
            </label>
            <div className="grid grid-cols-1 gap-2">
               <button onClick={handleDeepAnalysis} className="btn-archival justify-center h-10 w-full hover:bg-[#b45309]/20">
                  <BrainCircuit size={16} /> 
                  <span className="text-xs">NetworkX Analysis (Python)</span>
               </button>
               <button onClick={handleGrooming} className="btn-archival justify-center h-10 w-full hover:bg-[#b45309]/20">
                  <Scissors size={16} /> 
                  <span className="text-xs">Groom Duplicates</span>
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

      {/* NEW: Inline Duplicate Merger Modal */}
      {showDupeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-bunker-dark border border-antique-brass rounded-lg max-w-lg w-full p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-white font-spectral text-lg font-bold">Duplicate Candidates</h3>
                 <button onClick={() => setShowDupeModal(false)} className="text-zinc-500 hover:text-parchment"><X size={20}/></button>
              </div>
              <p className="text-sm text-zinc-400 mb-4 font-spectral italic">Review and merge redundant entities to cleanse the archives.</p>
              
              <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-2">
                 {dupeCandidates.length > 0 ? dupes.map((d, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-zinc-900 rounded border border-zinc-800">
                       <div className="text-sm text-zinc-300 flex-1 min-w-0">
                          <span className="text-antique-brass font-bold">{d.nodeA.label}</span> 
                          <span className="text-zinc-500 mx-1">vs</span> 
                          <span className="text-parchment font-bold">{d.nodeB.label}</span>
                          <p className="text-[10px] text-zinc-600 mt-1 italic truncate">{d.reason}</p>
                       </div>
                       <button 
                         onClick={() => executeMerge(d)} 
                         className="px-4 py-2 ml-4 bg-forest-uniform hover:bg-forest-uniform/80 text-parchment text-xs rounded border border-antique-brass/30 transition-colors"
                       >
                         Merge
                       </button>
                    </div>
                 )) : (
                   <div className="text-center text-zinc-600 py-8 text-sm italic">
                     No more duplicates to review.
                   </div>
                 )}
              </div>
              
              {dupeCandidates.length > 0 && (
                <div className="mt-6 border-t border-zinc-800 pt-4">
                  <button onClick={() => setShowDupeModal(false)} className="w-full py-2 bg-zinc-800 text-zinc-400 text-xs rounded hover:bg-zinc-700 transition-colors">
                    Close (Review Later)
                  </button>
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};